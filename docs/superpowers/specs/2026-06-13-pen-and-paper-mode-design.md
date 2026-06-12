# Pen-and-paper mode — design

**Date:** 2026-06-13
**Status:** approved for planning

## Goal

Add a second answer mode to math-quizz. Today every question is answered in
the app via the on-screen keypad. The new **pen-and-paper** mode shows each
question on screen for a fixed time (the existing per-question duration,
default 4 s), auto-advances with no input, and the child writes answers on a
sheet of paper. At the end the results screen shows every question with its
correct answer; the child self-marks each one and the score is saved to
history like an on-screen session.

The mode is chosen with a toggle on the home screen. The existing on-screen
mode is unchanged and stays the default.

### Why this shape

The 4 s per-question duration is reused as the paper display time on purpose:
it reproduces the child's actual classroom test conditions. At this age the
child writes faster with a pen than they type on a keyboard, so the same
4 s budget is, if anything, more generous on paper than on screen — no
separate setting is warranted.

## Vocabulary

The codebase already uses **`mode`** for the *arithmetic operation*
(`mul` / `div` / `mix`). That name is taken and means something else. This
feature introduces an orthogonal axis — *how the answer is collected* — under
a new name: **`answerMode`** (`screen` / `paper`).

## Data model

All changes are additive and backward-compatible. Existing stored settings
and history keep working because `loadSettings` merges stored values over
`DEFAULT_SETTINGS`, and the new `AnswerRecord` field is optional.

### `Settings` (`src/domain/session.ts`)

```ts
answerMode: 'screen' | 'paper';   // default 'screen'
```

Add `answerMode: 'screen'` to `DEFAULT_SETTINGS`.

### `SessionResult` (`src/domain/session.ts`)

```ts
answerMode: 'screen' | 'paper';
```

Carried so the results screen and history know which kind of session a record
is. Existing history entries lack the field; treat a missing value as
`'screen'` wherever it is read (they were all on-screen sessions).

### `AnswerRecord` (`src/domain/session.ts`)

```ts
selfMarkedCorrect?: boolean;   // present only for paper records
```

For on-screen records this stays `undefined` and nothing changes. For paper
records `given` is `null` and `elapsedMs` is `0` — neither is meaningful in
paper mode, and the scoring/stats guards below ensure they are never
consulted for a paper record.

## Scoring and stats — the critical guards

Both `scoring.pointsFor` and `stats.classify` currently branch on
`record.given`:

- `given === null` → timeout / 0 points
- `given !== expected` → error / 0 points
- otherwise → correct

A paper record has `given === null`, so without a guard it would be
misclassified as a **timeout**, not an answer. The guard must be the **first**
check in each function — before the `given === null` test — or self-marked
results land in the wrong bucket.

### `scoring.pointsFor` (`src/domain/scoring.ts`)

```ts
if (record.selfMarkedCorrect !== undefined) {
  return record.selfMarkedCorrect ? 1 : 0;
}
// ... existing logic unchanged
```

Paper scoring is binary: 1 for a correct self-mark, 0 otherwise. There is no
partial credit because there is no per-question timing to grade against.

### `stats.classify` (`src/domain/stats.ts`)

```ts
if (record.selfMarkedCorrect !== undefined) {
  return record.selfMarkedCorrect ? 'attempts' : 'errors';
}
// ... existing logic unchanged
```

A paper miss counts as an **error**, never a **timeout**. This keeps the
`timeouts` stat meaning strictly "ran out of time on screen", and feeds the
`errors` bucket that the planned adaptive-weighting feature
(`docs/v1.5-roadmap.md` §2) relies on. `accumulate` already increments
`attempts` for every record, so a correct paper mark needs no extra handling
beyond returning `'attempts'`.

## Home screen toggle

A second segmented toggle below the existing "Mode" (operation) section.

- Section title: **Saisie**
- Options: **📱 Sur l'écran** (`screen`) · **✏️ Sur papier** (`paper`)

New component `AnswerModeToggle` (`src/components/AnswerModeToggle.tsx`),
modeled on `ModeToggle` and reusing the existing `.mode-toggle` CSS classes
for visual consistency. Wired to `settings.answerMode` via the existing
`onChange` pattern in `HomeScreen`.

## `PaperSessionScreen` (new)

`src/screens/PaperSessionScreen.tsx`, rendered by `App` when
`screen === 'session' && settings.answerMode === 'paper'`. Props mirror
`SessionScreen`: `{ settings, onComplete }`.

Flow:

1. Generate questions with the **same** `generateQuestions(settings)` — paper
   mode changes nothing about *what* is asked.
2. **Lead-in:** a brief "Prêt ? 3 · 2 · 1" countdown before the first
   question, so the child isn't caught mid-blink. Shown once at the start of a
   run (including on replay).
3. **Per question:** render the existing `QuestionCard` with `given=''`, which
   already displays `7 × 8 = ?`. A depleting countdown bar runs for
   `settings.durationPerQuestionMs`; when it reaches zero, auto-advance to the
   next question. No keypad, no keyboard hook, no input of any kind.
4. After the last question, call `onComplete` with a **draft** result:
   `answerMode: 'paper'`, and one `AnswerRecord` per question with
   `given: null`, `elapsedMs: 0`, and `selfMarkedCorrect` unset.

### `Countdown` component (new)

`src/components/Countdown.tsx`. The existing `Timer` counts *up* for display
only and never fires a callback, so it does not fit. `Countdown` counts *down*
over a given duration and invokes an `onElapsed` callback at zero. Visual: a
depleting bar (language-neutral — works for a child who reads slowly and
survives the planned i18n work). It reuses `Timer`'s `requestAnimationFrame` +
`resetKey` pattern so the advance is driven off the same clock as the visual.

There is **no audio cue** on advance — consistent with the roadmap's "no
feedback during the session" rule, and audio is a separate roadmap item.

## Results screen — paper branch

`ResultsScreen` gains a branch on `result.answerMode`. The score header, the
list container, and `renderOperation` are shared with the on-screen path.

In the paper branch, each row:

- shows the operation **with its correct answer**, e.g. `7 × 8 = 56`;
- carries a ✓ / ✗ control the child taps;
- **defaults to ✓ (correct).** The child un-ticks only the answers they got
  wrong. Fewer taps for a child who did well. (Accepted trade-off: a forgotten
  wrong answer inflates the score; chosen over forcing a tap on every row.)
- the score in the header updates live as marks change.

The results screen holds the marks in its own state, initialized to all-✓. The
live score is computed from **that state**, not from the draft records (whose
`selfMarkedCorrect` is unset and would score 0). On save, the final
`AnswerRecord[]` is built by copying each row's current mark into
`selfMarkedCorrect`.

A **"💾 Enregistrer le résultat"** button finalizes the session: it builds the
final `AnswerRecord[]` by setting `selfMarkedCorrect` from each row's current
mark, then calls `recordSession`. Until that button is pressed, **nothing is
written to history or error stats** — abandoning a paper session leaves no
trace.

After saving, the screen behaves like the on-screen results (replay / home).
`onReplay` ("refaire la même config") re-runs whichever mode was used.

The on-screen results path is unchanged: it still records immediately on
`handleSessionComplete` and renders read-only.

## App routing and data flow

`src/App.tsx`:

- When `screen === 'session'`, render `PaperSessionScreen` if
  `settings.answerMode === 'paper'`, else the existing `SessionScreen`.
- `handleSessionComplete` branches on the result's `answerMode`:
  - `screen` → `recordSession(result)` immediately, then show results
    (current behavior).
  - `paper` → store the draft result and show results **without** recording;
    recording happens when the results screen's "Enregistrer" button fires.
- The "Enregistrer" action needs to reach `recordSession`. Pass an
  `onSave(finalResult)` callback into `ResultsScreen` (used only in the paper
  branch) that performs `recordSession` and marks the result as saved, so a
  second press cannot double-record.

The reversal of data flow is the subtle part: on screen, the session produces
the answers and results just displays them; on paper, the session produces
only the questions and the answers are produced *on the results screen*.

## Testing

- `scoring` (`src/__tests__/scoring.test.ts`): self-marked correct → 1,
  self-marked wrong → 0; existing on-screen cases unchanged.
- `stats` (`src/__tests__/stats.test.ts`): self-marked correct → `attempts`++,
  self-marked wrong → `errors`++ (and **not** `timeouts`); confirm the guard
  runs before the `given === null` check.
- `PaperSessionScreen`: with fake timers, questions auto-advance every
  `durationPerQuestionMs`, the lead-in precedes the first question, and
  `onComplete` fires once after the last question with a draft result whose
  records are unmarked and `answerMode === 'paper'`.
- `ResultsScreen` paper branch: rows default to ✓; un-ticking lowers the live
  score; "Enregistrer" calls `recordSession` exactly once with records whose
  `selfMarkedCorrect` matches the final marks; a second press does not record
  again.
- Regression: the existing on-screen session-flow test stays green
  (`src/__tests__/sessionFlow.test.tsx`).

## Out of scope

- No separate paper display-duration setting — reuses `durationPerQuestionMs`
  by decision.
- No audio cues or animations (separate roadmap item).
- No early-skip or pause during a paper session — auto-advance only, a fixed
  rhythm by design.
- No confirmation step guarding the default-✓ inflation risk — accepted.

## Files touched

New:

- `src/screens/PaperSessionScreen.tsx` (+ `.css`)
- `src/components/AnswerModeToggle.tsx`
- `src/components/Countdown.tsx` (+ `.css`)

Modified:

- `src/domain/session.ts` — `answerMode` on `Settings`/`SessionResult`,
  `selfMarkedCorrect` on `AnswerRecord`, default.
- `src/domain/scoring.ts` — paper guard.
- `src/domain/stats.ts` — paper guard.
- `src/screens/HomeScreen.tsx` — mount `AnswerModeToggle`.
- `src/screens/ResultsScreen.tsx` (+ `.css`) — paper self-marking branch.
- `src/App.tsx` — route to `PaperSessionScreen`, deferred recording.
