# Training mode — design

Date: 2026-06-13
Status: approved

## Goal

Add a **training mode** alongside the existing test modes. Training maximizes
learning effect through *immediate per-question feedback*: the child answers on
screen, submits, immediately sees whether it was right (and the correct answer),
then taps **Suivant** to move on. No timer, no time pressure. Still 22 questions
(whatever `questionCount` is). Training results are tracked **separately** from
test results and shown in their own dashboard view.

## Decisions (approved)

1. **Entry**: a single 3-way play selector replaces the current 2-way "Saisie"
   toggle — `Test écran` / `Test papier` / `Entraînement`. One field, three
   values, so the impossible combo "training + paper" is unrepresentable.
2. **Data model**: extend the existing `AnswerMode` enum with `'training'`
   rather than renaming to `playMode`. Minimal churn; legacy data stays valid.
3. **No retry**: feedback then advance (a future "re-key the correct answer"
   active-recall option is noted but out of scope).
4. **Dashboard**: a `Test | Entraînement` segmented toggle *inside* the existing
   `ProgressScreen`, not a new home-header button. Training view is minimal:
   trickiest pairs + error heatmap only (no trend chart).

## Data model

```ts
// src/domain/session.ts
export type AnswerMode = 'screen' | 'paper' | 'training';
```

`DEFAULT_SETTINGS.answerMode` stays `'screen'`. Absent (legacy) reads as
`'screen'`. No migration needed — every existing `SessionResult` is a test.

**Keystone reuse:** each training `AnswerRecord` sets
`selfMarkedCorrect = (given === expected)`. `pointsFor`, `stats.classify`, and
`progress.isCorrect` already honor `selfMarkedCorrect` as a binary
correct/incorrect override, so every existing analytics function treats a
training answer as "1 point if right, 0 if wrong, time irrelevant" — an untimed
mode — with no new scoring code. `elapsedMs` is recorded but never affects
training scoring once `selfMarkedCorrect` is set.

## Components / screens

### Home (`HomeScreen`, `AnswerModeToggle`)

- `AnswerModeToggle` becomes 3-way, dropping the `mode-toggle--two` modifier so
  it uses the same 3-column grid as the operations `ModeToggle`:
  `📱 Test écran` / `✏️ Test papier` / `🎓 Entraînement`.
- Panel title `home.inputTitle` reworded from "Saisie" to a play-mode label
  ("Comment jouer").
- When `answerMode === 'training'`: the summary line drops the
  "· {seconds}s par question" clause, and the start button label switches from
  `🚀 Lancer` to `🎓 S'entraîner`. Tables + operations selectors unchanged.

### Training session (`src/screens/TrainingScreen.tsx`, new)

Per-question two-phase machine, **no `Timer`**, reusing `QuestionCard`,
`NumPad`, `useNumericKeyboard`:

- `answering`: question + numpad; child keys an answer and validates.
- `feedback`: on validate, compute correct/incorrect, push an `AnswerRecord`
  `{ question, given, elapsedMs, selfMarkedCorrect }`, then show:
  - ✅ correct: the full fact, e.g. `7 × 8 = 56`.
  - ❌ wrong: `Tu as répondu 54 · la bonne réponse est 56`.
  - A `Suivant →` button (Enter/validate also triggers it, so the child can hit
    Enter twice). On the last question the button finishes the session.

On finish, calls `onComplete` with a `SessionResult` carrying
`answerMode: 'training'` and the auto-marked answers.

### End-of-training summary (`ResultsScreen`)

Add a `TrainingResults` variant mirroring the existing `ScreenResults` /
`PaperResults` split:

- Score header `X / 22` works as-is via `totalScore` (answers carry
  `selfMarkedCorrect`).
- List: ✅/❌ + operation per row, no time/credit columns.
- Buttons: `🔁 Refaire`, `🏠 Accueil`. No save step — training auto-records on
  completion (unlike paper, which defers for self-marking).

### Dashboard (`ProgressScreen`)

- A `Test | Entraînement` segmented control at the top switches which history
  feeds the panels.
- **Test** view (unchanged): score chart + trickiest pairs + heatmap from
  `history`.
- **Entraînement** view: trickiest pairs + heatmap only, from `trainingHistory`,
  with its own empty state. Reuses `TrickiestPairsList` + `ErrorHeatmap` and the
  pure functions `trickiestPairs` / `errorGrid` verbatim (they take a plain
  `history` array and don't care about the source).

## Storage (`profileStore.ts`)

- New `STORAGE_KEYS.trainingHistory` with independent `HISTORY_LIMIT` cap.
- `loadTrainingHistory()` and `recordTrainingSession(session)` — the latter just
  appends (capped). **No training errors-map** is maintained: nothing reads the
  existing `errors` map for display (dashboards recompute via
  `aggregateErrors(history)`), so replicating it would be dead code.
- `clearAll()` also removes `trainingHistory`.

## App routing (`App.tsx`)

- `Screen` state unchanged set; the `session` branch becomes three-way:
  `paper → PaperSessionScreen`, `training → TrainingScreen`,
  else `SessionScreen`.
- On completion:
  - `paper` → defer (record after self-marking) — unchanged.
  - `training` → `recordTrainingSession` immediately, then show `ResultsScreen`.
  - `screen` → `recordSession` immediately — unchanged.

## i18n + release (process)

- All new copy keys added to `fr.ts`, `de.ts`, `en.ts` (the `i18n` test enforces
  key parity across all three).
- Minor version bump **0.6.0**: `package.json` version + `CHANGELOG.md` section
  + a French `releaseNotes.ts` entry, kept in sync (the drift guard fails
  `pnpm test` otherwise).

## Testing (TDD — failing test first)

- `TrainingScreen`: answer → feedback shows the right answer → `Suivant`
  advances → completion yields answers with `selfMarkedCorrect` set; no timer
  rendered.
- `ResultsScreen` training variant: ✅/❌ list, correct `X / total` header, no
  save button, auto-record path.
- `profileStore`: `recordTrainingSession` appends to `trainingHistory` and not
  to `history`; `clearAll` clears both; `loadTrainingHistory` round-trips.
- `AnswerModeToggle`: renders 3 options, selecting `training` fires onChange.
- `ProgressScreen`: toggle switches data source; training view omits the chart;
  per-view empty state.
- App routing: selecting training → `TrainingScreen`; completing training →
  records to `trainingHistory` + shows training results.
- Release drift guard forces version + changelog + notes.

## Out of scope (noted, not built)

- Re-key-the-correct-answer active recall after a wrong answer.
- A separate cross-session "pairs you just fixed vs still struggling" panel.
- Cleaning up the vestigial persisted `errors` map (unrelated refactor).
