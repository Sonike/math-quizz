# "Mes résultats" Progress Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Mes résultats" screen that plots score-per-session (two curves) and surfaces error-prone multiplication pairs (ranked list + times-table heat-map), from data already in localStorage.

**Architecture:** Pure derivations in `src/domain/progress.ts` (unit-tested, no React) feed dumb presentational components (inline SVG / table). A new `ProgressScreen` orchestrates them; `App` adds a `'progress'` route reached from a 📈 button in the home header.

**Tech Stack:** React 18, TypeScript, Vite, Vitest + React Testing Library. Zero new runtime dependencies (inline SVG, no chart library).

**Spec:** `docs/superpowers/specs/2026-06-13-progress-screen-design.md`

---

## File structure

New:
- `src/domain/progress.ts` — pure derivations (`isCorrect`, `sessionScores`, `trickiestPairs`, `errorGrid`) + exported types.
- `src/components/rateColor.ts` — shared `rateBucket(rate|null)` → CSS bucket name.
- `src/components/ScoreLineChart.tsx` — two-line SVG chart (dumb).
- `src/components/TrickiestPairsList.tsx` — ranked bar list (dumb).
- `src/components/ErrorHeatmap.tsx` — table heat-map (dumb).
- `src/screens/ProgressScreen.tsx` — orchestrator, reads `loadHistory()`.
- `src/screens/ProgressScreen.css` — all styling + heat buckets (light + dark).
- `src/__tests__/progress.test.ts` — derivation unit tests.
- `src/__tests__/progressScreen.test.tsx` — screen render tests.

Modified:
- `src/App.tsx` — add `'progress'` route + pass `onOpenProgress`.
- `src/screens/HomeScreen.tsx` — add `onOpenProgress` prop + 📈 button.
- `src/screens/HomeScreen.css` — header-actions wrapper + progress button.
- `src/__tests__/homeScreen.test.tsx` — pass new prop + test the 📈 button.

---

## Task 1: Pure derivations (`domain/progress.ts`)

**Files:**
- Test: `src/__tests__/progress.test.ts`
- Create: `src/domain/progress.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/progress.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  isCorrect,
  sessionScores,
  trickiestPairs,
  errorGrid,
} from '../domain/progress';
import { MULTIPLICANDS, MULTIPLIERS } from '../domain/tables';
import type { SessionResult, AnswerRecord } from '../domain/session';
import type { Question } from '../domain/question';

const mkQ = (a: number, b: number, op: 'mul' | 'div' = 'mul'): Question => ({
  a,
  b,
  op,
  expected: op === 'mul' ? a * b : b,
});

const rec = (
  question: Question,
  given: number | null,
  elapsedMs: number,
  selfMarkedCorrect?: boolean,
): AnswerRecord => ({
  question,
  given,
  elapsedMs,
  ...(selfMarkedCorrect !== undefined ? { selfMarkedCorrect } : {}),
});

const mkSession = (
  answers: AnswerRecord[],
  over: Partial<SessionResult> = {},
): SessionResult => ({
  startedAt: '2026-01-01T00:00:00.000Z',
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
  questionCount: answers.length,
  selectedTables: [7],
  mode: 'mul',
  answers,
  ...over,
});

describe('isCorrect', () => {
  test('slow-but-correct still counts as correct', () => {
    expect(isCorrect(rec(mkQ(7, 8), 56, 9999))).toBe(true);
  });
  test('wrong answer is not correct', () => {
    expect(isCorrect(rec(mkQ(7, 8), 50, 1000))).toBe(false);
  });
  test('timeout (given null) is not correct', () => {
    expect(isCorrect(rec(mkQ(7, 8), null, 4000))).toBe(false);
  });
  test('paper self-marked overrides given value', () => {
    expect(isCorrect(rec(mkQ(7, 8), null, 0, true))).toBe(true);
    expect(isCorrect(rec(mkQ(7, 8), 56, 0, false))).toBe(false);
  });
});

describe('sessionScores', () => {
  test('correctRatio counts slow-correct; creditRatio applies partial credit', () => {
    const s = mkSession([
      rec(mkQ(2, 3), 6, 1000), // fast correct -> 1 pt
      rec(mkQ(2, 4), 8, 5000), // slow correct -> 0.5 pt
      rec(mkQ(2, 5), 9, 1000), // wrong -> 0 pt
    ]);
    const [p] = sessionScores([s]);
    expect(p.total).toBe(3);
    expect(p.correctRatio).toBeCloseTo(2 / 3);
    expect(p.creditRatio).toBeCloseTo(1.5 / 3);
    expect(p.startedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  test('uses each session own partialCreditFactor', () => {
    const s = mkSession([rec(mkQ(2, 4), 8, 5000)], {
      partialCreditFactor: 0.25,
    });
    const [p] = sessionScores([s]);
    expect(p.correctRatio).toBe(1);
    expect(p.creditRatio).toBeCloseTo(0.25);
  });

  test('preserves order and guards empty answers', () => {
    const a = mkSession([rec(mkQ(2, 3), 6, 1000)], { startedAt: 'A' });
    const b = mkSession([], { startedAt: 'B' });
    const pts = sessionScores([a, b]);
    expect(pts.map((p) => p.startedAt)).toEqual(['A', 'B']);
    expect(pts[1]).toMatchObject({ total: 0, correctRatio: 0, creditRatio: 0 });
  });
});

describe('trickiestPairs', () => {
  const history = [
    mkSession([
      // 7x8: 5 attempts, 3 misses (merges 7x8 and 8x7) -> rate 0.6
      rec(mkQ(7, 8), 56, 1000),
      rec(mkQ(7, 8), 50, 1000),
      rec(mkQ(7, 8), 51, 1000),
      rec(mkQ(8, 7), 56, 1000),
      rec(mkQ(8, 7), 50, 1000),
      // 2x3: 4 attempts, 1 miss -> rate 0.25
      rec(mkQ(2, 3), 6, 1000),
      rec(mkQ(2, 3), 6, 1000),
      rec(mkQ(2, 3), 6, 1000),
      rec(mkQ(2, 3), 5, 1000),
      // 6x9: 2 attempts, 2 misses -> rate 1.0 but below default threshold
      rec(mkQ(6, 9), 50, 1000),
      rec(mkQ(6, 9), 51, 1000),
    ]),
  ];

  test('ranks by error rate, excludes pairs below minAttempts (default 3)', () => {
    const top = trickiestPairs(history);
    expect(top).toHaveLength(2);
    expect(top[0]).toMatchObject({ a: 7, b: 8, attempts: 5, errors: 3 });
    expect(top[0].errorRate).toBeCloseTo(0.6);
    expect(top[1]).toMatchObject({ a: 2, b: 3, attempts: 4 });
    expect(top[1].errorRate).toBeCloseTo(0.25);
  });

  test('minAttempts and limit are configurable', () => {
    const top = trickiestPairs(history, { minAttempts: 1, limit: 1 });
    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({ a: 6, b: 9 });
    expect(top[0].errorRate).toBeCloseTo(1);
  });

  test('timeouts count toward the error rate', () => {
    const h = [
      mkSession([
        rec(mkQ(3, 4), 12, 1000),
        rec(mkQ(3, 4), 12, 1000),
        rec(mkQ(3, 4), null, 4000), // timeout
      ]),
    ];
    const [p] = trickiestPairs(h, { minAttempts: 3 });
    expect(p).toMatchObject({ a: 3, b: 4, attempts: 3, timeouts: 1 });
    expect(p.errorRate).toBeCloseTo(1 / 3);
  });
});

describe('errorGrid', () => {
  const history = [
    mkSession([
      rec(mkQ(7, 8), 50, 1000),
      rec(mkQ(7, 8), 51, 1000),
      rec(mkQ(8, 7), 56, 1000),
    ]),
  ];

  test('has MULTIPLICANDS rows x MULTIPLIERS cols', () => {
    const grid = errorGrid(history);
    expect(grid).toHaveLength(MULTIPLICANDS.length);
    expect(grid[0]).toHaveLength(MULTIPLIERS.length);
  });

  test('computes rate and is symmetric via canonical key', () => {
    const grid = errorGrid(history);
    const r7 = MULTIPLICANDS.indexOf(7);
    const c8 = MULTIPLIERS.indexOf(8);
    const r8 = MULTIPLICANDS.indexOf(8);
    const c7 = MULTIPLIERS.indexOf(7);
    expect(grid[r7][c8].errorRate).toBeCloseTo(2 / 3);
    expect(grid[r8][c7].errorRate).toBeCloseTo(2 / 3);
  });

  test('never-practised cell has null errorRate', () => {
    const grid = errorGrid(history);
    const r15 = MULTIPLICANDS.indexOf(15);
    const c11 = MULTIPLIERS.indexOf(11);
    expect(grid[r15][c11].errorRate).toBeNull();
    expect(grid[r15][c11].attempts).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/progress.test.ts`
Expected: FAIL — cannot resolve `../domain/progress` (module does not exist yet).

- [ ] **Step 3: Implement `src/domain/progress.ts`**

```ts
import { MULTIPLICANDS, MULTIPLIERS } from './tables';
import { aggregateErrors, canonicalKey } from './stats';
import { totalScore } from './scoring';
import type { SessionResult, AnswerRecord } from './session';

export type SessionScorePoint = {
  startedAt: string;
  total: number;
  correctRatio: number;
  creditRatio: number;
};

export type PairStat = {
  a: number;
  b: number;
  attempts: number;
  errors: number;
  timeouts: number;
  errorRate: number;
};

export type GridCell = {
  a: number;
  b: number;
  attempts: number;
  errorRate: number | null;
};

export type TrickiestOpts = { minAttempts?: number; limit?: number };

export const isCorrect = (record: AnswerRecord): boolean => {
  if (record.selfMarkedCorrect !== undefined) return record.selfMarkedCorrect;
  return record.given !== null && record.given === record.question.expected;
};

export const sessionScores = (
  history: SessionResult[],
): SessionScorePoint[] =>
  history.map((session) => {
    const total = session.answers.length;
    const correct = session.answers.filter(isCorrect).length;
    const { points, max } = totalScore(session.answers, {
      durationPerQuestionMs: session.durationPerQuestionMs,
      partialCreditFactor: session.partialCreditFactor,
    });
    return {
      startedAt: session.startedAt,
      total,
      correctRatio: total === 0 ? 0 : correct / total,
      creditRatio: max === 0 ? 0 : points / max,
    };
  });

export const trickiestPairs = (
  history: SessionResult[],
  opts: TrickiestOpts = {},
): PairStat[] => {
  const { minAttempts = 3, limit = 8 } = opts;
  return Object.entries(aggregateErrors(history))
    .map(([key, stat]) => {
      const [a, b] = key.split('x').map(Number);
      return {
        a,
        b,
        attempts: stat.attempts,
        errors: stat.errors,
        timeouts: stat.timeouts,
        errorRate: (stat.errors + stat.timeouts) / stat.attempts,
      };
    })
    .filter((row) => row.attempts >= minAttempts)
    .sort(
      (x, y) =>
        y.errorRate - x.errorRate ||
        y.attempts - x.attempts ||
        x.a - y.a ||
        x.b - y.b,
    )
    .slice(0, limit);
};

export const errorGrid = (history: SessionResult[]): GridCell[][] => {
  const stats = aggregateErrors(history);
  return MULTIPLICANDS.map((a) =>
    MULTIPLIERS.map((b) => {
      const stat = stats[canonicalKey(a, b)];
      if (!stat || stat.attempts === 0) {
        return { a, b, attempts: 0, errorRate: null };
      }
      return {
        a,
        b,
        attempts: stat.attempts,
        errorRate: (stat.errors + stat.timeouts) / stat.attempts,
      };
    }),
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/progress.test.ts`
Expected: PASS (all describe blocks green).

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/domain/progress.ts src/__tests__/progress.test.ts
git commit -m "feat: add progress derivations (scores, trickiest pairs, error grid)"
```

---

## Task 2: Presentational components + styling

**Files:**
- Create: `src/components/rateColor.ts`
- Create: `src/components/ScoreLineChart.tsx`
- Create: `src/components/TrickiestPairsList.tsx`
- Create: `src/components/ErrorHeatmap.tsx`
- Create: `src/screens/ProgressScreen.css`

No new unit test — these are exercised by the screen render test (Task 3) and `tsc`. This task is verified by `npx tsc --noEmit`.

- [ ] **Step 1: Create `src/components/rateColor.ts`**

```ts
/**
 * Maps an error rate (0..1) — or null for "never practised" — to the CSS
 * bucket suffix used by the shared `.heat--{bucket}` classes.
 */
export const rateBucket = (rate: number | null): string => {
  if (rate === null) return 'nodata';
  if (rate < 0.08) return '0';
  if (rate < 0.18) return '1';
  if (rate < 0.3) return '2';
  return '3';
};
```

- [ ] **Step 2: Create `src/components/ScoreLineChart.tsx`**

```tsx
import type { SessionScorePoint } from '../domain/progress';

type Props = { points: SessionScorePoint[] };

const W = 320;
const H = 180;
const PAD = { left: 34, right: 12, top: 14, bottom: 24 };
const TICKS = [0, 0.25, 0.5, 0.75, 1];

const xAt = (i: number, n: number): number => {
  const span = W - PAD.left - PAD.right;
  if (n <= 1) return PAD.left + span / 2;
  return PAD.left + (span * i) / (n - 1);
};

const yAt = (ratio: number): number =>
  PAD.top + (H - PAD.top - PAD.bottom) * (1 - ratio);

const toLine = (vals: number[]): string =>
  vals.map((v, i) => `${xAt(i, vals.length)},${yAt(v)}`).join(' ');

export const ScoreLineChart = ({ points }: Props) => {
  const n = points.length;
  const correct = points.map((p) => p.correctRatio);
  const credit = points.map((p) => p.creditRatio);

  return (
    <div className="chart">
      <svg
        className="chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Score sur les dernières sessions"
      >
        {TICKS.map((t) => (
          <g key={t}>
            <line
              className="chart__grid"
              x1={PAD.left}
              y1={yAt(t)}
              x2={W - PAD.right}
              y2={yAt(t)}
            />
            <text
              className="chart__axis"
              x={PAD.left - 5}
              y={yAt(t) + 3}
              textAnchor="end"
            >
              {Math.round(t * 100)}%
            </text>
          </g>
        ))}

        {n > 1 && (
          <>
            <polyline
              className="chart__line chart__line--credit"
              points={toLine(credit)}
            />
            <polyline
              className="chart__line chart__line--correct"
              points={toLine(correct)}
            />
          </>
        )}

        {n <= 15 &&
          points.map((p, i) => (
            <g key={i}>
              <circle
                className="chart__dot chart__dot--credit"
                cx={xAt(i, n)}
                cy={yAt(p.creditRatio)}
                r={3}
              />
              <circle
                className="chart__dot chart__dot--correct"
                cx={xAt(i, n)}
                cy={yAt(p.correctRatio)}
                r={3}
              />
            </g>
          ))}

        {n > 1 && (
          <text
            className="chart__axis"
            x={PAD.left}
            y={H - 8}
            textAnchor="start"
          >
            -{n - 1}
          </text>
        )}
        <text
          className="chart__axis"
          x={W - PAD.right}
          y={H - 8}
          textAnchor="end"
        >
          dernière
        </text>
      </svg>
      <div className="chart__legend">
        <span className="chart__legend-item chart__legend-item--correct">
          juste / total
        </span>
        <span className="chart__legend-item chart__legend-item--credit">
          score (crédit partiel)
        </span>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create `src/components/TrickiestPairsList.tsx`**

```tsx
import type { PairStat } from '../domain/progress';
import { rateBucket } from './rateColor';

type Props = { pairs: PairStat[] };

export const TrickiestPairsList = ({ pairs }: Props) => {
  if (pairs.length === 0) {
    return (
      <p className="pairs__empty">
        Pas encore assez de données pour repérer les paires difficiles.
      </p>
    );
  }
  const maxRate = Math.max(...pairs.map((p) => p.errorRate)) || 1;
  return (
    <ul className="pairs">
      {pairs.map((p) => (
        <li className="pairs__row" key={`${p.a}x${p.b}`}>
          <span className="pairs__pair">
            {p.a} × {p.b}
          </span>
          <span className="pairs__barwrap">
            <span
              className={`pairs__bar heat--${rateBucket(p.errorRate)}`}
              style={{ width: `${Math.round((p.errorRate / maxRate) * 100)}%` }}
            />
          </span>
          <span className="pairs__num">
            {p.errors + p.timeouts} / {p.attempts}
          </span>
        </li>
      ))}
    </ul>
  );
};
```

- [ ] **Step 4: Create `src/components/ErrorHeatmap.tsx`**

```tsx
import { MULTIPLIERS } from '../domain/tables';
import type { GridCell } from '../domain/progress';
import { rateBucket } from './rateColor';

type Props = { grid: GridCell[][] };

export const ErrorHeatmap = ({ grid }: Props) => (
  <div className="heatmap">
    <table className="heatmap__table">
      <thead>
        <tr>
          <th className="heatmap__corner" aria-hidden />
          {MULTIPLIERS.map((b) => (
            <th key={b} className="heatmap__colhead" scope="col">
              {b}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grid.map((row) => (
          <tr key={row[0].a}>
            <th className="heatmap__rowhead" scope="row">
              {row[0].a}
            </th>
            {row.map((cell) => (
              <td
                key={`${cell.a}x${cell.b}`}
                className={`heatmap__cell heat--${rateBucket(cell.errorRate)}`}
                title={
                  cell.errorRate === null
                    ? `${cell.a}×${cell.b} — pas encore joué`
                    : `${cell.a}×${cell.b} — ${Math.round(cell.errorRate * 100)}%`
                }
              />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <div className="heatmap__legend">
      <span className="heat--0" /> rare
      <span className="heat--3" /> fréquent
      <span className="heat--nodata" /> pas joué
    </div>
  </div>
);
```

- [ ] **Step 5: Create `src/screens/ProgressScreen.css`**

```css
.progress {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.progress__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress__header h2 {
  margin: 0;
  font-size: 1.6rem;
  color: var(--color-fg);
}

.progress__back-btn {
  width: 3rem;
  height: 3rem;
  font-size: 1.4rem;
  border: 2px solid var(--color-chip-border);
  background: var(--color-card-bg);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.progress__back-btn:hover {
  transform: translateY(-2px);
}

.progress__empty {
  text-align: center;
  color: var(--color-fg-muted);
  font-size: 1.15rem;
  margin-top: 3rem;
}

.progress__panel {
  background: var(--color-card-bg);
  border-radius: 18px;
  padding: 1rem 1.1rem;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}

.progress__panel-title {
  font-size: 0.95rem;
  margin: 0 0 0.75rem;
  color: var(--color-fg-muted);
  font-weight: 600;
}

.progress__caption {
  margin: 0.6rem 0 0;
  font-size: 0.8rem;
  color: var(--color-fg-muted);
}

/* line chart */
.chart__svg {
  width: 100%;
  height: auto;
  display: block;
}
.chart__grid {
  stroke: var(--color-chip-bg);
  stroke-width: 1;
}
.chart__axis {
  fill: var(--color-fg-muted);
  font-size: 9px;
  font-family: inherit;
}
.chart__line {
  fill: none;
  stroke-width: 2.5;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.chart__line--correct {
  stroke: var(--color-accent);
}
.chart__line--credit {
  stroke: var(--color-warning);
}
.chart__dot--correct {
  fill: var(--color-accent);
}
.chart__dot--credit {
  fill: var(--color-warning);
}
.chart__legend {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-fg-muted);
}
.chart__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.chart__legend-item::before {
  content: '';
  width: 12px;
  height: 3px;
  border-radius: 2px;
  display: inline-block;
}
.chart__legend-item--correct::before {
  background: var(--color-accent);
}
.chart__legend-item--credit::before {
  background: var(--color-warning);
}

/* trickiest pairs */
.pairs {
  list-style: none;
  padding: 0;
  margin: 0;
}
.pairs__empty {
  color: var(--color-fg-muted);
  font-size: 0.9rem;
  margin: 0;
}
.pairs__row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.4rem 0;
}
.pairs__pair {
  width: 4rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.pairs__barwrap {
  flex: 1;
  background: var(--color-chip-bg);
  border-radius: 5px;
  height: 16px;
  overflow: hidden;
}
.pairs__bar {
  display: block;
  height: 100%;
  border-radius: 5px;
}
.pairs__num {
  width: 3.5rem;
  text-align: right;
  color: var(--color-fg-muted);
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

/* heat-map */
.heatmap {
  overflow-x: auto;
}
.heatmap__table {
  border-collapse: collapse;
}
.heatmap__corner,
.heatmap__colhead,
.heatmap__rowhead {
  font-size: 0.7rem;
  color: var(--color-fg-muted);
  font-weight: 600;
  padding: 2px;
  text-align: center;
}
.heatmap__cell {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-card-bg);
  border-radius: 4px;
}
.heatmap__legend {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.6rem;
  font-size: 0.75rem;
  color: var(--color-fg-muted);
}
.heatmap__legend span {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  display: inline-block;
}

/* shared error-rate buckets (light) */
.heat--0 {
  background: #dcfce7;
}
.heat--1 {
  background: #fde68a;
}
.heat--2 {
  background: #fdba74;
}
.heat--3 {
  background: #fca5a5;
}
.heat--nodata {
  background: var(--color-chip-bg);
}

@media (prefers-color-scheme: dark) {
  .heat--0 {
    background: #14532d;
  }
  .heat--1 {
    background: #78600f;
  }
  .heat--2 {
    background: #7c3a12;
  }
  .heat--3 {
    background: #7f1d1d;
  }
  .progress__panel {
    box-shadow: none;
    border: 1px solid var(--color-chip-border);
  }
}
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/rateColor.ts src/components/ScoreLineChart.tsx src/components/TrickiestPairsList.tsx src/components/ErrorHeatmap.tsx src/screens/ProgressScreen.css
git commit -m "feat: add progress chart, pairs list and heat-map components"
```

---

## Task 3: ProgressScreen orchestrator (TDD)

**Files:**
- Test: `src/__tests__/progressScreen.test.tsx`
- Create: `src/screens/ProgressScreen.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/progressScreen.test.tsx`:

```tsx
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressScreen } from '../screens/ProgressScreen';
import { STORAGE_KEYS } from '../storage/profileStore';
import type { SessionResult } from '../domain/session';

const session = (over: Partial<SessionResult> = {}): SessionResult => ({
  startedAt: '2026-01-01T00:00:00.000Z',
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
  questionCount: 3,
  selectedTables: [7],
  mode: 'mul',
  answers: [
    { question: { a: 7, b: 8, op: 'mul', expected: 56 }, given: 50, elapsedMs: 1000 },
    { question: { a: 7, b: 8, op: 'mul', expected: 56 }, given: 51, elapsedMs: 1000 },
    { question: { a: 7, b: 8, op: 'mul', expected: 56 }, given: 56, elapsedMs: 1000 },
  ],
  ...over,
});

beforeEach(() => {
  localStorage.clear();
});

describe('ProgressScreen', () => {
  test('shows empty state when there is no history', () => {
    render(<ProgressScreen onBack={() => {}} />);
    expect(screen.getByText(/Joue quelques sessions/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('renders heading, chart and trickiest pair from history', () => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify([session()]));
    render(<ProgressScreen onBack={() => {}} />);
    expect(
      screen.getByRole('heading', { name: 'Mes résultats' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Score sur les dernières sessions/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('7 × 8')).toBeInTheDocument();
  });

  test('back button calls onBack', () => {
    const onBack = vi.fn();
    render(<ProgressScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /retour/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/__tests__/progressScreen.test.tsx`
Expected: FAIL — cannot resolve `../screens/ProgressScreen`.

- [ ] **Step 3: Implement `src/screens/ProgressScreen.tsx`**

```tsx
import { useMemo } from 'react';
import { loadHistory } from '../storage/profileStore';
import { sessionScores, trickiestPairs, errorGrid } from '../domain/progress';
import { ScoreLineChart } from '../components/ScoreLineChart';
import { TrickiestPairsList } from '../components/TrickiestPairsList';
import { ErrorHeatmap } from '../components/ErrorHeatmap';
import './ProgressScreen.css';

type Props = {
  onBack: () => void;
};

export const ProgressScreen = ({ onBack }: Props) => {
  const history = useMemo(() => loadHistory(), []);
  const points = useMemo(() => sessionScores(history), [history]);
  const pairs = useMemo(() => trickiestPairs(history), [history]);
  const grid = useMemo(() => errorGrid(history), [history]);

  return (
    <div className="progress">
      <header className="progress__header">
        <h2>Mes résultats</h2>
        <button
          type="button"
          className="progress__back-btn"
          onClick={onBack}
          aria-label="retour à l'accueil"
        >
          🏠
        </button>
      </header>

      {history.length === 0 ? (
        <p className="progress__empty">
          Joue quelques sessions pour voir ta progression 📈
        </p>
      ) : (
        <>
          <section className="progress__panel">
            <h3 className="progress__panel-title">Score par session</h3>
            <ScoreLineChart points={points} />
            <p className="progress__caption">
              Chaque point = une session. Les tables et le mode choisis
              changent la difficulté, donc le score.
            </p>
          </section>

          <section className="progress__panel">
            <h3 className="progress__panel-title">Paires à revoir</h3>
            <TrickiestPairsList pairs={pairs} />
          </section>

          <section className="progress__panel">
            <h3 className="progress__panel-title">Carte des tables</h3>
            <ErrorHeatmap grid={grid} />
          </section>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/__tests__/progressScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgressScreen.tsx src/__tests__/progressScreen.test.tsx
git commit -m "feat: add ProgressScreen orchestrating the results views"
```

---

## Task 4: Navigation wiring (App + HomeScreen)

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.css`
- Modify: `src/__tests__/homeScreen.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update the HomeScreen test (add prop + new failing assertion)**

In `src/__tests__/homeScreen.test.tsx`, replace the existing render call in the "Saisie toggle" test to also pass `onOpenProgress={noop}`, and add a new test block. The full file becomes:

```tsx
import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeScreen } from '../screens/HomeScreen';
import { DEFAULT_SETTINGS } from '../domain/session';

const noop = () => {};

describe('HomeScreen — Saisie toggle', () => {
  test('selecting "Sur papier" emits settings with answerMode=paper', () => {
    const onChange = vi.fn();
    render(
      <HomeScreen
        settings={DEFAULT_SETTINGS}
        onChange={onChange}
        onStart={noop}
        onOpenSettings={noop}
        onOpenProgress={noop}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: '✏️ Sur papier' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ answerMode: 'paper' }),
    );
  });
});

describe('HomeScreen — progress entry', () => {
  test('clicking the results button calls onOpenProgress', () => {
    const onOpenProgress = vi.fn();
    render(
      <HomeScreen
        settings={DEFAULT_SETTINGS}
        onChange={noop}
        onStart={noop}
        onOpenSettings={noop}
        onOpenProgress={onOpenProgress}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'mes résultats' }));
    expect(onOpenProgress).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the HomeScreen test to verify the new case fails**

Run: `npx vitest run src/__tests__/homeScreen.test.tsx`
Expected: FAIL — no button named "mes résultats" yet (and/or TS prop error once compiled).

- [ ] **Step 3: Update `src/screens/HomeScreen.tsx`**

Change the `Props` type to add `onOpenProgress`, and replace the `<header>` block. Full file:

```tsx
import { TableSelector } from '../components/TableSelector';
import { ModeToggle } from '../components/ModeToggle';
import { AnswerModeToggle } from '../components/AnswerModeToggle';
import type { Settings } from '../domain/session';
import './HomeScreen.css';

type Props = {
  settings: Settings;
  onChange: (next: Settings) => void;
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenProgress: () => void;
};

export const HomeScreen = ({
  settings,
  onChange,
  onStart,
  onOpenSettings,
  onOpenProgress,
}: Props) => {
  const seconds = (settings.durationPerQuestionMs / 1000)
    .toFixed(1)
    .replace('.0', '');
  const canStart = settings.selectedTables.length > 0;

  return (
    <div className="home">
      <header className="home__header">
        <h1>Math Quizz</h1>
        <div className="home__header-actions">
          <button
            type="button"
            className="home__progress-btn"
            onClick={onOpenProgress}
            aria-label="mes résultats"
          >
            📈
          </button>
          <button
            type="button"
            className="home__settings-btn"
            onClick={onOpenSettings}
            aria-label="paramètres"
          >
            ⚙
          </button>
        </div>
      </header>
      <section className="home__panel">
        <TableSelector
          selected={settings.selectedTables}
          onChange={(selectedTables) => onChange({ ...settings, selectedTables })}
        />
      </section>
      <section className="home__panel">
        <h2 className="home__panel-title">Mode</h2>
        <ModeToggle
          value={settings.mode}
          onChange={(mode) => onChange({ ...settings, mode })}
        />
      </section>
      <section className="home__panel">
        <h2 className="home__panel-title">Saisie</h2>
        <AnswerModeToggle
          value={settings.answerMode}
          onChange={(answerMode) => onChange({ ...settings, answerMode })}
        />
      </section>
      <p className="home__info">
        {settings.questionCount} questions · {seconds}s par question
      </p>
      <button
        type="button"
        className="home__start-btn"
        onClick={onStart}
        disabled={!canStart}
      >
        🚀 Lancer
      </button>
    </div>
  );
};
```

- [ ] **Step 4: Add styles in `src/screens/HomeScreen.css`**

Append after the `.home__settings-btn:hover` rule (around line 35):

```css
.home__header-actions {
  display: flex;
  gap: 0.6rem;
}

.home__progress-btn {
  width: 3rem;
  height: 3rem;
  font-size: 1.4rem;
  border: 2px solid var(--color-chip-border);
  background: var(--color-card-bg);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.home__progress-btn:hover {
  transform: translateY(-2px);
}
```

- [ ] **Step 5: Update `src/App.tsx`**

Add the import, extend the `Screen` union, render the route, and pass `onOpenProgress`. Full file:

```tsx
import { useEffect, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { PaperSessionScreen } from './screens/PaperSessionScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ProgressScreen } from './screens/ProgressScreen';
import type { SessionResult, Settings } from './domain/session';
import {
  loadSettings,
  saveSettings,
  recordSession,
  clearAll,
} from './storage/profileStore';

type Screen = 'home' | 'session' | 'results' | 'settings' | 'progress';

export const App = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const handleSessionComplete = (result: SessionResult) => {
    // Paper sessions are recorded later, once the child has self-marked.
    if (result.answerMode !== 'paper') {
      recordSession(result);
    }
    setLastResult(result);
    setScreen('results');
  };

  const handleSaveResult = (final: SessionResult) => {
    recordSession(final);
    setLastResult(final);
  };

  return (
    <div className="app">
      {screen === 'home' && (
        <HomeScreen
          settings={settings}
          onChange={setSettings}
          onStart={() => setScreen('session')}
          onOpenSettings={() => setScreen('settings')}
          onOpenProgress={() => setScreen('progress')}
        />
      )}
      {screen === 'session' &&
        (settings.answerMode === 'paper' ? (
          <PaperSessionScreen settings={settings} onComplete={handleSessionComplete} />
        ) : (
          <SessionScreen settings={settings} onComplete={handleSessionComplete} />
        ))}
      {screen === 'results' && lastResult && (
        <ResultsScreen
          result={lastResult}
          onReplay={() => setScreen('session')}
          onHome={() => setScreen('home')}
          onSave={handleSaveResult}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onSave={setSettings}
          onClearHistory={clearAll}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'progress' && (
        <ProgressScreen onBack={() => setScreen('home')} />
      )}
    </div>
  );
};
```

- [ ] **Step 6: Run the HomeScreen test to verify it passes**

Run: `npx vitest run src/__tests__/homeScreen.test.tsx`
Expected: PASS (both describe blocks).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/screens/HomeScreen.tsx src/screens/HomeScreen.css src/__tests__/homeScreen.test.tsx
git commit -m "feat: add Mes résultats entry point and progress route"
```

---

## Task 5: Full verification gate

**Files:** none (verification only).

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: all test files pass, including the pre-existing suites.

- [ ] **Step 2: Production build + typecheck**

Run: `npm run build`
Expected: `tsc --noEmit` clean, `vite build` succeeds, `dist/` produced.

- [ ] **Step 3: Commit (only if Steps 1–2 required fixes)**

```bash
git add -A
git commit -m "fix: address build/test issues in progress page"
```

---

## Self-review notes (author)

- **Spec coverage:** both score curves (Task 2 ScoreLineChart) ✓; trickiest list + heat-map (Task 2) ✓; plot-all + caption (Task 3) ✓; ≥3 threshold (Task 1 default) ✓; 📈 header entry (Task 4) ✓; empty/low-data states (Task 3 empty state, Task 2 list-empty, Task 2 chart n≤1) ✓; dark-mode buckets (Task 2 CSS) ✓; tests (Tasks 1, 3, 4) ✓.
- **Type consistency:** `SessionScorePoint`/`PairStat`/`GridCell` defined in Task 1 are consumed unchanged in Tasks 2–3; `rateBucket` signature stable; `onOpenProgress` added in both HomeScreen Props (Task 4 Step 3) and the App call site (Task 4 Step 5) and the tests (Task 4 Step 1).
- **No placeholders:** every code step contains complete file content.
