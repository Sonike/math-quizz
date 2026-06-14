# Exercise list mode ("Liste") — design

Date: 2026-06-14
Status: approved (pending spec review)

## Summary

Add a fourth play mode, **Liste**, alongside the existing `screen` / `paper` /
`training` modes. Instead of a timed drill, it shows one long, scrollable list
of operations and their answers. Answers are hidden by default; a single button
reveals or hides them all at once, and tapping a single row flips just that
answer. A **Nouvelle liste** button regenerates a fresh sample in place.

The mode serves two uses with one screen: a parent/teacher scrolling through to
quiz a child (reveal answers one at a time as they check), and a child using it
as a quieter, untimed way to review the tables.

## Why this shape

The mode is launched exactly like the other three: the user picks tables, a
mode (×/÷/mix) and the **📋 Liste** option in the "Comment jouer" toggle, then
presses Start. That keeps a single, consistent launch path and avoids
special-casing the home screen. The one asymmetry: the list is a *view*, not a
session — it never records a result, so its screen takes `onCancel` but no
`onComplete`.

The list reuses `generateQuestions(settings)` unchanged: a shuffled sample of
`questionCount` operations honoring `selectedTables` and `mode`. It is the same
content the drills produce, just displayed all at once instead of one at a time.
(We explicitly chose the `questionCount` sample over full combinatorial coverage
— the parent wanted parity with the drill content, not a 154-row sheet.)

## Components and changes

### `src/domain/question.ts` — extract a shared formatter
The `a × b` / `(a*b) ÷ a` operation string is currently inline in
`QuestionCard` (`renderOperation`). Move it to the domain as an exported helper
so the card and the new list row share one source of truth:

```ts
export const formatOperation = (q: Question): string =>
  q.op === 'mul' ? `${q.a} × ${q.b}` : `${q.a * q.b} ÷ ${q.a}`;
```

`generateQuestions` itself is unchanged.

### `src/components/QuestionCard.tsx`
Replace the local `renderOperation` with the imported `formatOperation`. No
behavior change.

### `src/domain/session.ts` — extend the union
```ts
export type AnswerMode = 'screen' | 'paper' | 'training' | 'list';
```
Document that `'list'` is the only `AnswerMode` that never appears in a
recorded `SessionResult` — the list screen does not call `onComplete`, so it
never reaches `recordSession` / `recordTrainingSession`. `DEFAULT_SETTINGS` is
unchanged (still `'screen'`).

### `src/components/AnswerModeToggle.tsx`
Add a fourth option to `OPTIONS`:
```ts
{ id: 'list', label: t('answerMode.list') }, // 📋 Liste
```
No other change; the existing radiogroup rendering handles four options.

### `src/screens/HomeScreen.tsx`
Add an `isList` branch alongside the existing `isTraining` logic:
- **Start button label**: `📋 ${t('home.startList')}` ("Voir la liste").
- **Summary line**: `t('home.summaryList', { count })` — no timing, since the
  list has no timer.
- `canStart` is unchanged (`selectedTables.length > 0`); an empty selection
  would make `generateQuestions` throw, so the guard still applies.

### `src/App.tsx` — route the list view
In the `screen === 'session'` block, add a `list` branch ahead of the others:
```tsx
settings.answerMode === 'list' ? (
  <ExerciseListScreen
    settings={settings}
    onCancel={() => setScreen('home')}
  />
) : settings.answerMode === 'paper' ? ( /* …unchanged… */ )
```
The list never transitions to `results`; `onCancel` returns home. No change to
`handleSessionComplete`.

### `src/screens/ExerciseListScreen.tsx` + `ExerciseListScreen.css` (new)
Mirrors `InfoScreen`: a header with the screen title and a 🏠 back button, then
a panel holding the list. State:

```ts
const [seed, setSeed] = useState(0);
const questions = useMemo(() => generateQuestions(settings), [settings, seed]);
const [revealed, setRevealed] = useState<Set<number>>(new Set());

const allRevealed = questions.length > 0 && revealed.size === questions.length;
const toggleAll = () =>
  setRevealed(allRevealed ? new Set() : new Set(questions.map((_, i) => i)));
const toggleOne = (i: number) =>
  setRevealed((prev) => {
    const next = new Set(prev);
    next.has(i) ? next.delete(i) : next.add(i);
    return next;
  });
const reshuffle = () => { setRevealed(new Set()); setSeed((s) => s + 1); };
```

Layout, top to bottom:
- **Header**: title `t('list.title')` ("Liste d'exercices") + 🏠 back button
  (`onCancel`), same markup idiom as `InfoScreen`.
- **Controls panel**: the global toggle button — label
  `t('list.hideAll')` when `allRevealed`, else `t('list.revealAll')` — and the
  `t('list.shuffle')` ("Nouvelle liste") button.
- **List panel**: a single scrollable column. Each row is a real `<button>`
  (keyboard + a11y) calling `toggleOne(i)`:
  - left: `formatOperation(q)` followed by `=`
  - right: `revealed.has(i) ? q.expected : '?'` (the `?` matches the existing
    empty-answer glyph in `QuestionCard`)
  - `aria-label`: `t('list.revealRowAria')` when hidden, `t('list.hideRowAria')`
    when revealed.

Answers are hidden on first render (`revealed` starts empty).

### i18n — new keys (all three dictionaries)
Added to `fr.ts` (the key source-of-truth) and mirrored in `en.ts` / `de.ts`,
or `i18n.test.ts` fails.

| key | fr | en | de |
|-----|----|----|----|
| `answerMode.list` | `📋 Liste` | `📋 List` | `📋 Liste` |
| `home.startList` | `Voir la liste` | `View the list` | `Liste ansehen` |
| `home.summaryList` | `{count} opérations à réviser` | `{count} operations to review` | `{count} Aufgaben zum Üben` |
| `list.title` | `Liste d'exercices` | `Exercise list` | `Aufgabenliste` |
| `list.revealAll` | `Montrer les réponses` | `Show answers` | `Antworten zeigen` |
| `list.hideAll` | `Cacher les réponses` | `Hide answers` | `Antworten verbergen` |
| `list.shuffle` | `Nouvelle liste` | `New list` | `Neue Liste` |
| `list.revealRowAria` | `montrer la réponse` | `show the answer` | `Antwort zeigen` |
| `list.hideRowAria` | `cacher la réponse` | `hide the answer` | `Antwort verbergen` |

(French copy is final-ish; en/de are first-pass translations to keep the build
green and can be refined.)

## Testing (TDD — write the failing test first)

- **`src/__tests__/exerciseListScreen.test.tsx`** (new):
  - renders `questionCount` rows for the given settings;
  - all answers hidden on first render (no expected value visible, `?` shown);
  - the global button reveals every answer, then hides them all again;
  - tapping one row reveals only that answer (others stay hidden);
  - **Nouvelle liste** re-renders rows and resets reveal state;
  - 🏠 back button calls `onCancel`.
- **App routing** (extend an existing app-flow test or add one): selecting
  `list` mode and pressing Start shows the list screen and records **no**
  session (assert `recordSession` is not called / history unchanged).
- **`AnswerModeToggle`**: extend the existing toggle test to assert the fourth
  option renders and is selectable.
- **i18n**: the new keys land in all three dictionaries; `i18n.test.ts`'s
  "same keys" assertion stays green.

## Out of scope / explicitly not doing

- No full combinatorial coverage (kept the `questionCount` sample).
- No timer, scoring, or history for the list — it is a pure view.
- No print/export, no grouping-by-table, no difficulty sorting. Rows appear in
  the shuffled generation order, same as the drills.

## Release bookkeeping (per CLAUDE.md)

This is a user-facing feature, so the version bump must touch all three in one
commit: `package.json` version, `CHANGELOG.md` (English, Keep a Changelog), and
`src/domain/releaseNotes.ts` (French, child-friendly, newest first). The drift
guard (`releaseNotes.test.ts`) enforces this. Version number to be chosen at
implementation time (a minor bump — new feature).
