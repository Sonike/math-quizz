# Spec — "Mes résultats" progress page (Roadmap V1.5 item 3)

**Status:** approved design, ready for implementation
**Date:** 2026-06-13
**Roadmap ref:** `docs/v1.5-roadmap.md` §3

## Goal

A new screen that motivates the child by showing score evolution across
sessions and surfacing the multiplication pairs they get wrong most often.
No new runtime dependencies — inline SVG only, consistent with the
project's zero-superfluous-dependency philosophy. All data already exists
in `localStorage` (`history`, capped at 50; `errors`), collected by
`recordSession`.

## Approved decisions

1. **Progress line shows both curves**: `correct/total` (binary) and the
   partial-credit score (the exact number the Bilan screen computes). The
   gap between them = "answers right but too slow".
2. **Errors shown two ways, stacked**: a "trickiest pairs" ranked list on
   top, a times-table heat-map below.
3. **Mixed configs**: plot *all* saved sessions chronologically regardless
   of the tables/mode/count they used; a caption explains that changing
   settings shifts the score. No per-config filtering.
4. **List noise threshold**: a pair must have **≥ 3 attempts** to appear in
   the trickiest-pairs list.
5. **Home entry point**: a 📈 icon button in the home header, next to ⚙.

## Defaults chosen (open to revision)

- Heat-map always renders the full `MULTIPLICANDS × MULTIPLIERS` grid
  (14×11), including tables 15/24/25; never-practised cells get a distinct
  "no data" colour.
- The line chart renders every session in history (≤ 50). Polylines always
  draw; per-point dots render only when there are ≤ 15 points (avoids
  clutter at 50).
- UI strings are **French** (i18n is roadmap item 7). Screen title:
  "Mes résultats".
- The three chart views are separate presentational components under
  `src/components/`, fed derived data (dumb components).

## Architecture

Split into pure data derivations (no React, unit-tested) and dumb
presentational components. Mirrors the existing `domain/` ↔ `screens/`
separation.

### New module — `src/domain/progress.ts`

All functions are pure: `(history: SessionResult[]) => …`. Deterministic,
no `Date`/`Math.random`, no storage access.

```ts
export type SessionScorePoint = {
  startedAt: string;
  total: number;       // answers.length
  correctRatio: number; // binary-correct / total, 0..1
  creditRatio: number;  // partial-credit points / max, 0..1
};

export type PairStat = {
  a: number;            // lo (canonical)
  b: number;            // hi (canonical)
  attempts: number;
  errors: number;
  timeouts: number;
  errorRate: number;    // (errors + timeouts) / attempts
};

export type GridCell = {
  a: number;            // row table (MULTIPLICANDS)
  b: number;            // col multiplier (MULTIPLIERS)
  attempts: number;
  errorRate: number | null; // null = never practised
};
```

- `isCorrect(record: AnswerRecord): boolean`
  - paper: `record.selfMarkedCorrect === true`
  - screen/legacy: `record.given !== null && record.given === record.question.expected`
  - A *slow-but-correct* answer is still correct here (binary).
- `sessionScores(history): SessionScorePoint[]`
  - one point per session, order preserved.
  - `correctRatio = count(isCorrect) / total`; guard `total === 0` → 0.
  - `creditRatio = totalScore(answers, { durationPerQuestionMs, partialCreditFactor }).points / max`,
    using **the session's own** stored `durationPerQuestionMs` and
    `partialCreditFactor`; guard `max === 0` → 0.
- `trickiestPairs(history, opts?: { minAttempts?: number; limit?: number }): PairStat[]`
  - defaults `minAttempts = 3`, `limit = 8`.
  - source: existing `aggregateErrors(history)`.
  - filter `attempts >= minAttempts`; `errorRate = (errors + timeouts) / attempts`.
  - sort: `errorRate` desc, tie-break `attempts` desc, then canonical key
    asc (deterministic).
  - parse key `"loxhi"` → `{ a: lo, b: hi }`; slice to `limit`.
- `errorGrid(history): GridCell[][]`
  - rows = `MULTIPLICANDS`, cols = `MULTIPLIERS`.
  - cell stat looked up via `canonicalKey(a, b)` in `aggregateErrors`.
  - `attempts === 0` → `errorRate: null`.

### Components

- **`src/screens/ProgressScreen.tsx`** — orchestrator.
  - Props: `{ onBack: () => void }`.
  - Reads `loadHistory()` once via `useMemo(() => loadHistory(), [])`.
  - Derives the three datasets with the `progress.ts` functions.
  - Layout: header (`Mes résultats` + 🏠 back button) → mixed-config
    caption → `ScoreLineChart` → `TrickiestPairsList` → `ErrorHeatmap`.
  - Empty state: if `history.length === 0`, render only a friendly message
    ("Joue quelques sessions pour voir ta progression 📈").
- **`src/components/ScoreLineChart.tsx`** — `{ points: SessionScorePoint[] }`.
  - Inline SVG: two polylines (correct = `--color-accent`, credit =
    `--color-warning`), gridlines on a **fixed 0–100% y-axis** (labels at
    0/25/50/75/100 — fixed so a bad session is never clipped),
    3 x-axis ticks (first / middle / last), legend.
  - 1 point → render single dots, no polyline. 0 points handled by the
    screen's empty state (not reached here).
- **`src/components/TrickiestPairsList.tsx`** — `{ pairs: PairStat[] }`.
  - Ranked rows: `a × b`, proportional bar (width ∝ `errorRate / maxRate`
    with `maxRate || 1` guard so all-zero rates don't divide by zero,
    colour by bucket), `errors / attempts`.
  - Empty (`pairs.length === 0`) → "Pas encore assez de données pour
    repérer les paires difficiles."
- **`src/components/ErrorHeatmap.tsx`** — `{ grid: GridCell[][] }`.
  - Table: corner + multiplier column headers; each row prefixed by its
    table number; cells coloured by `errorRate` bucket; `null` →
    "no data" colour. `title`/`aria-label` per cell = `a×b — e/att`.
- **`src/screens/ProgressScreen.css`** — all styling for the screen and the
  three sub-components (one CSS file per feature, matching project style).
  - Heat/bar colours defined as CSS variables with light + dark values
    (under `@media (prefers-color-scheme: dark)`), so the heat-map adapts
    like the rest of the app. Buckets: rare → frequent + no-data.

### Colour buckets (shared helper, in the component layer)

`errorRate` → bucket class: `< 0.08`, `< 0.18`, `< 0.30`, `>= 0.30`, plus
`null` (no data). Same scale used by the list bars and the heat-map cells.

## Navigation wiring

- `src/App.tsx`:
  - add `'progress'` to the `Screen` union;
  - render `<ProgressScreen onBack={() => setScreen('home')} />` when
    `screen === 'progress'`;
  - pass `onOpenProgress={() => setScreen('progress')}` to `HomeScreen`.
- `src/screens/HomeScreen.tsx`:
  - new prop `onOpenProgress: () => void`;
  - add a 📈 button inside `home__header` next to the ⚙ button,
    `aria-label="mes résultats"`.

## Error handling / robustness

- `loadHistory()` already guards JSON parse failures.
- Derivations guard division by zero (`total`, `max`, `attempts`).
- Legacy entries (absent `answerMode`) handled by `isCorrect` via
  `given`/`expected`; paper entries via `selfMarkedCorrect`.
- No network, no async — pure synchronous render.

## Testing (Vitest + React Testing Library)

- **`src/__tests__/progress.test.ts`** (pure derivations):
  - `isCorrect`: slow-but-correct = correct; wrong; timeout (`given: null`);
    paper self-marked true/false.
  - `sessionScores`: `creditRatio` equals `totalScore` ratio under that
    session's own settings; `correctRatio` counts slow-correct; order
    preserved; empty-answers guard.
  - `trickiestPairs`: excludes pairs with `< 3` attempts; sorts by rate
    desc with deterministic tie-break; merges `7×8`/`8×7` (via
    `aggregateErrors`); respects `limit`.
  - `errorGrid`: never-practised cell → `errorRate: null`; computed rate
    otherwise; symmetric lookup via `canonicalKey`.
- **`src/__tests__/progressScreen.test.tsx`** (render):
  - empty history → shows empty-state message, no chart SVG;
  - seeded history → renders "Mes résultats" heading, a chart `<svg>`, the
    expected top trickiest pair, heat-map cells; 🏠 back button calls
    `onBack`.
- **HomeScreen test** (extend `src/__tests__/homeScreen.test.tsx`):
  - renders the 📈 button; clicking it fires `onOpenProgress`.

## Files

New:
- `src/domain/progress.ts`
- `src/screens/ProgressScreen.tsx`
- `src/screens/ProgressScreen.css`
- `src/components/ScoreLineChart.tsx`
- `src/components/TrickiestPairsList.tsx`
- `src/components/ErrorHeatmap.tsx`
- `src/__tests__/progress.test.ts`
- `src/__tests__/progressScreen.test.tsx`

Modified:
- `src/App.tsx`
- `src/screens/HomeScreen.tsx`
- `src/__tests__/homeScreen.test.tsx`

## Out of scope

Adaptive weighting (item 2), multi-profile (item 4), i18n (item 7). The
heat-map reuses `aggregateErrors`; no change to storage schema.
