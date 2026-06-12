# Pen-and-paper Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second answer mode where each question is shown on screen for a fixed time (reusing the 4 s per-question duration), the child writes answers on paper, then self-marks them on the results screen, which saves the score to history.

**Architecture:** A new orthogonal setting `answerMode: 'screen' | 'paper'` (default `screen`) chosen by a home-screen toggle. A new `PaperSessionScreen` runs a timed, input-free question loop; `ResultsScreen` gains an interactive self-marking branch. Scoring and stats get a guard for self-marked records. Recording to history is deferred for paper mode until the child presses "Enregistrer".

**Tech Stack:** React 18 + TypeScript + Vite; Vitest + @testing-library/react (fake timers fake `performance`/`requestAnimationFrame`); CSS files per component using existing CSS variables.

**Reference spec:** `docs/superpowers/specs/2026-06-13-pen-and-paper-mode-design.md`

---

## File Structure

New files:

- `src/components/Countdown.tsx` + `.css` — counts *down* over a duration and fires `onElapsed` once at zero; depleting bar. (The existing `Timer` counts *up* and never fires a callback.)
- `src/components/AnswerModeToggle.tsx` — segmented toggle for `screen` / `paper`, reusing `ModeToggle.css`.
- `src/screens/PaperSessionScreen.tsx` + `.css` — 3·2·1 lead-in, then timed input-free question display, auto-advance, draft result on completion.
- `src/__tests__/countdown.test.tsx`, `answerModeToggle.test.tsx`, `homeScreen.test.tsx`, `paperSession.test.tsx`, `resultsScreen.test.tsx`, `appPaperFlow.test.tsx` — new test files.

Modified files:

- `src/domain/session.ts` — add `AnswerMode` type; optional `answerMode` on `Settings` and `SessionResult`; `selfMarkedCorrect?` on `AnswerRecord`; `answerMode: 'screen'` in `DEFAULT_SETTINGS`.
- `src/domain/scoring.ts` — self-marked guard at the top of `pointsFor`.
- `src/domain/stats.ts` — self-marked guard at the top of `classify`.
- `src/components/ModeToggle.css` — add a 2-column modifier `.mode-toggle--two`.
- `src/screens/HomeScreen.tsx` — mount `AnswerModeToggle` in a new "Saisie" panel.
- `src/screens/ResultsScreen.tsx` + `.css` — paper self-marking branch + `onSave` prop.
- `src/App.tsx` — route to `PaperSessionScreen`; defer recording for paper; add save handler.

`SessionScreen.tsx` is intentionally **not** modified.

---

## Task 1: Extend the domain model (types only)

**Files:**
- Modify: `src/domain/session.ts`

This task only adds optional/defaulted fields. It cannot break existing code because every addition is optional or defaulted. Verification is the existing suite staying green.

- [ ] **Step 1: Edit `src/domain/session.ts`**

Replace the whole file with:

```ts
import type { Question, Mode } from './question';

export type AnswerMode = 'screen' | 'paper';

export type AnswerRecord = {
  question: Question;
  given: number | null;
  elapsedMs: number;
  /** Set only for pen-and-paper records (self-marked on the results screen). */
  selfMarkedCorrect?: boolean;
};

export type SessionResult = {
  startedAt: string;
  durationPerQuestionMs: number;
  partialCreditFactor: number;
  questionCount: number;
  selectedTables: number[];
  mode: Mode;
  answers: AnswerRecord[];
  /** Missing on legacy history entries; treat absent as 'screen'. */
  answerMode?: AnswerMode;
};

export type Settings = {
  /** Target answer time. Faster than this earns full credit. */
  durationPerQuestionMs: number;
  questionCount: number;
  selectedTables: number[];
  mode: Mode;
  /** Credit awarded for a correct answer slower than the target. */
  partialCreditFactor: number;
  /** How answers are collected. Absent reads as 'screen'. */
  answerMode?: AnswerMode;
};

export const DEFAULT_SETTINGS: Settings = {
  durationPerQuestionMs: 4000,
  questionCount: 22,
  selectedTables: [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15],
  mode: 'mix',
  partialCreditFactor: 0.5,
  answerMode: 'screen',
};
```

- [ ] **Step 2: Run the full suite to confirm nothing breaks**

Run: `pnpm test`
Expected: all existing tests PASS (the additions are optional/defaulted).

- [ ] **Step 3: Commit**

```bash
git add src/domain/session.ts
git commit -m "feat: add answerMode and selfMarkedCorrect to domain types"
```

---

## Task 2: Scoring guard for self-marked records

**Files:**
- Modify: `src/domain/scoring.ts`
- Test: `src/__tests__/scoring.test.ts`

- [ ] **Step 1: Add failing tests to `src/__tests__/scoring.test.ts`**

Append this block inside the file (after the existing `describe('totalScore', ...)` block, before the final newline):

```ts
describe('pointsFor — self-marked (pen-and-paper)', () => {
  const paper = (correct: boolean): AnswerRecord => ({
    question: mkQ(7, 8),
    given: null,
    elapsedMs: 0,
    selfMarkedCorrect: correct,
  });

  test('self-marked correct → 1 point (ignores given/elapsed)', () => {
    expect(pointsFor(paper(true), settings)).toBe(1);
  });

  test('self-marked wrong → 0 points', () => {
    expect(pointsFor(paper(false), settings)).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/__tests__/scoring.test.ts`
Expected: FAIL — "self-marked correct" gets `0` (current logic sees `given === null` → 0).

- [ ] **Step 3: Add the guard to `src/domain/scoring.ts`**

Replace `pointsFor` with:

```ts
export const pointsFor = (record: AnswerRecord, settings: ScoringSettings): number => {
  if (record.selfMarkedCorrect !== undefined) {
    return record.selfMarkedCorrect ? 1 : 0;
  }
  if (record.given === null) return 0;
  if (record.given !== record.question.expected) return 0;
  return record.elapsedMs <= settings.durationPerQuestionMs
    ? 1
    : settings.partialCreditFactor;
};
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test src/__tests__/scoring.test.ts`
Expected: PASS (new + all existing scoring tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/scoring.ts src/__tests__/scoring.test.ts
git commit -m "feat: score self-marked records as binary 1/0"
```

---

## Task 3: Stats guard for self-marked records

**Files:**
- Modify: `src/domain/stats.ts`
- Test: `src/__tests__/stats.test.ts`

The guard MUST sit before the `given === null` check, or a self-marked wrong answer is counted as a `timeout` instead of an `error`.

- [ ] **Step 1: Add failing test to `src/__tests__/stats.test.ts`**

Append inside the `describe('aggregateErrors / mergeIntoErrors', ...)` block:

```ts
  test('self-marked records count as attempts/errors, never timeouts', () => {
    const session = mkSession([
      { question: mkQ(7, 8), given: null, elapsedMs: 0, selfMarkedCorrect: true },
      { question: mkQ(7, 8), given: null, elapsedMs: 0, selfMarkedCorrect: false },
    ]);
    const stats = aggregateErrors([session]);
    expect(stats['7x8']).toEqual({ attempts: 2, errors: 1, timeouts: 0 });
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/__tests__/stats.test.ts`
Expected: FAIL — current logic classifies both as `timeouts` (got `{ attempts: 2, errors: 0, timeouts: 2 }`).

- [ ] **Step 3: Add the guard to `src/domain/stats.ts`**

Replace `classify` with:

```ts
const classify = (record: AnswerRecord): keyof ErrorStat => {
  if (record.selfMarkedCorrect !== undefined) {
    return record.selfMarkedCorrect ? 'attempts' : 'errors';
  }
  if (record.given === null) return 'timeouts';
  if (record.given !== record.question.expected) return 'errors';
  return 'attempts';
};
```

(Note: `accumulate` already bumps `attempts` for every record, so returning `'attempts'` for a correct mark adds nothing extra, and returning `'errors'` bumps both `attempts` and `errors` — matching the existing wrong-answer behavior.)

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test src/__tests__/stats.test.ts`
Expected: PASS (new + all existing stats tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/stats.ts src/__tests__/stats.test.ts
git commit -m "feat: classify self-marked records as attempt/error not timeout"
```

---

## Task 4: `Countdown` component

**Files:**
- Create: `src/components/Countdown.tsx`
- Create: `src/components/Countdown.css`
- Test: `src/__tests__/countdown.test.tsx`

- [ ] **Step 1: Write the failing test `src/__tests__/countdown.test.tsx`**

```tsx
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { Countdown } from '../components/Countdown';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('Countdown', () => {
  test('fires onElapsed exactly once after durationMs', () => {
    const onElapsed = vi.fn();
    render(<Countdown durationMs={4000} resetKey={0} onElapsed={onElapsed} />);

    advance(3999);
    expect(onElapsed).not.toHaveBeenCalled();

    advance(1);
    expect(onElapsed).toHaveBeenCalledTimes(1);

    advance(5000);
    expect(onElapsed).toHaveBeenCalledTimes(1);
  });

  test('changing resetKey restarts the countdown', () => {
    const onElapsed = vi.fn();
    const { rerender } = render(
      <Countdown durationMs={4000} resetKey={0} onElapsed={onElapsed} />,
    );
    advance(4000);
    expect(onElapsed).toHaveBeenCalledTimes(1);

    rerender(<Countdown durationMs={4000} resetKey={1} onElapsed={onElapsed} />);
    advance(4000);
    expect(onElapsed).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/__tests__/countdown.test.tsx`
Expected: FAIL — cannot resolve `../components/Countdown`.

- [ ] **Step 3: Create `src/components/Countdown.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import './Countdown.css';

type Props = {
  durationMs: number;
  resetKey: string | number;
  onElapsed: () => void;
};

export const Countdown = ({ durationMs, resetKey, onElapsed }: Props) => {
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const onElapsedRef = useRef(onElapsed);
  onElapsedRef.current = onElapsed;

  useEffect(() => {
    const start = performance.now();
    setRemainingMs(durationMs);
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      setRemainingMs(Math.max(0, durationMs - elapsed));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = setTimeout(() => onElapsedRef.current(), durationMs);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [resetKey, durationMs]);

  const pct = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));
  return (
    <div className="countdown" role="timer" aria-label="temps restant">
      <div className="countdown__bar" style={{ width: `${pct}%` }} />
    </div>
  );
};
```

- [ ] **Step 4: Create `src/components/Countdown.css`**

```css
.countdown {
  width: 100%;
  height: 12px;
  background: var(--color-chip-bg);
  border: 2px solid var(--color-chip-border);
  border-radius: 999px;
  overflow: hidden;
}

.countdown__bar {
  height: 100%;
  background: var(--color-accent);
  border-radius: 999px;
  transition: width 0.08s linear;
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test src/__tests__/countdown.test.tsx`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/Countdown.tsx src/components/Countdown.css src/__tests__/countdown.test.tsx
git commit -m "feat: add Countdown component (counts down, fires onElapsed)"
```

---

## Task 5: `AnswerModeToggle` component

**Files:**
- Create: `src/components/AnswerModeToggle.tsx`
- Modify: `src/components/ModeToggle.css`
- Test: `src/__tests__/answerModeToggle.test.tsx`

- [ ] **Step 1: Write the failing test `src/__tests__/answerModeToggle.test.tsx`**

```tsx
import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnswerModeToggle } from '../components/AnswerModeToggle';

describe('AnswerModeToggle', () => {
  test('marks the active option and emits the other on click', () => {
    const onChange = vi.fn();
    render(<AnswerModeToggle value="screen" onChange={onChange} />);

    expect(
      screen.getByRole('radio', { name: "📱 Sur l'écran" }),
    ).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: '✏️ Sur papier' }));
    expect(onChange).toHaveBeenCalledWith('paper');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/__tests__/answerModeToggle.test.tsx`
Expected: FAIL — cannot resolve `../components/AnswerModeToggle`.

- [ ] **Step 3: Create `src/components/AnswerModeToggle.tsx`**

```tsx
import type { AnswerMode } from '../domain/session';
import './ModeToggle.css';

type Props = {
  value: AnswerMode | undefined;
  onChange: (next: AnswerMode) => void;
};

const OPTIONS: { id: AnswerMode; label: string }[] = [
  { id: 'screen', label: "📱 Sur l'écran" },
  { id: 'paper', label: '✏️ Sur papier' },
];

export const AnswerModeToggle = ({ value, onChange }: Props) => {
  const active = value ?? 'screen';
  return (
    <div className="mode-toggle mode-toggle--two" role="radiogroup" aria-label="saisie">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={active === opt.id}
          className={`mode-toggle__option${active === opt.id ? ' mode-toggle__option--on' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Add the 2-column modifier to `src/components/ModeToggle.css`**

Append at the end of the file:

```css
.mode-toggle--two {
  grid-template-columns: repeat(2, 1fr);
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test src/__tests__/answerModeToggle.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/AnswerModeToggle.tsx src/components/ModeToggle.css src/__tests__/answerModeToggle.test.tsx
git commit -m "feat: add AnswerModeToggle (screen vs paper)"
```

---

## Task 6: Mount the toggle in `HomeScreen`

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Test: `src/__tests__/homeScreen.test.tsx`

- [ ] **Step 1: Write the failing test `src/__tests__/homeScreen.test.tsx`**

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
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: '✏️ Sur papier' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ answerMode: 'paper' }),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/__tests__/homeScreen.test.tsx`
Expected: FAIL — no element with role `radio` named "✏️ Sur papier".

- [ ] **Step 3: Edit `src/screens/HomeScreen.tsx`**

Add the import near the existing component imports:

```tsx
import { AnswerModeToggle } from '../components/AnswerModeToggle';
```

Then insert a new panel immediately after the existing Mode `<section>` (after the `</section>` that closes the ModeToggle panel, before the `<p className="home__info">`):

```tsx
      <section className="home__panel">
        <h2 className="home__panel-title">Saisie</h2>
        <AnswerModeToggle
          value={settings.answerMode}
          onChange={(answerMode) => onChange({ ...settings, answerMode })}
        />
      </section>
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test src/__tests__/homeScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/HomeScreen.tsx src/__tests__/homeScreen.test.tsx
git commit -m "feat: add Saisie (screen/paper) toggle to home screen"
```

---

## Task 7: `PaperSessionScreen`

**Files:**
- Create: `src/screens/PaperSessionScreen.tsx`
- Create: `src/screens/PaperSessionScreen.css`
- Test: `src/__tests__/paperSession.test.tsx`

- [ ] **Step 1: Write the failing test `src/__tests__/paperSession.test.tsx`**

```tsx
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { PaperSessionScreen } from '../screens/PaperSessionScreen';
import type { Settings, SessionResult } from '../domain/session';

const settings: Settings = {
  durationPerQuestionMs: 4000,
  questionCount: 2,
  selectedTables: [7],
  mode: 'mul',
  partialCreditFactor: 0.5,
  answerMode: 'paper',
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('PaperSessionScreen', () => {
  test('lead-in precedes the first question', () => {
    render(<PaperSessionScreen settings={settings} onComplete={() => {}} />);
    expect(screen.getByText('Prêt ?')).toBeInTheDocument();
    expect(screen.queryByText('Question 1 / 2')).toBeNull();

    advance(3000);
    expect(screen.getByText('Question 1 / 2')).toBeInTheDocument();
  });

  test('auto-advances through all questions and completes once with a draft result', () => {
    let result: SessionResult | null = null;
    render(<PaperSessionScreen settings={settings} onComplete={(r) => (result = r)} />);

    advance(3000); // lead-in
    expect(screen.getByText('Question 1 / 2')).toBeInTheDocument();
    expect(result).toBeNull();

    advance(4000); // first question elapses
    expect(screen.getByText('Question 2 / 2')).toBeInTheDocument();
    expect(result).toBeNull();

    advance(4000); // second question elapses → complete
    expect(result).not.toBeNull();
    expect(result!.answerMode).toBe('paper');
    expect(result!.answers).toHaveLength(2);
    expect(result!.answers[0].given).toBeNull();
    expect(result!.answers[0].elapsedMs).toBe(0);
    expect(result!.answers[0].selfMarkedCorrect).toBeUndefined();

    advance(10000); // no double-complete
    expect(result!.answers).toHaveLength(2);
  });

  test('shows the operation without an answer (a × b = ?)', () => {
    render(<PaperSessionScreen settings={settings} onComplete={() => {}} />);
    advance(3000);
    // QuestionCard renders "<op> =" in one element, so match a substring.
    expect(screen.getByText(/7 × 8/)).toBeInTheDocument();
    // The answer slot shows "?" (no value entered in paper mode).
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/__tests__/paperSession.test.tsx`
Expected: FAIL — cannot resolve `../screens/PaperSessionScreen`.

- [ ] **Step 3: Create `src/screens/PaperSessionScreen.tsx`**

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { generateQuestions } from '../domain/question';
import type { Question } from '../domain/question';
import type { AnswerRecord, Settings, SessionResult } from '../domain/session';
import { QuestionCard } from '../components/QuestionCard';
import { Countdown } from '../components/Countdown';
import './PaperSessionScreen.css';

type Props = {
  settings: Settings;
  onComplete: (result: SessionResult) => void;
};

type Phase = { kind: 'leadin' } | { kind: 'question'; index: number };

const LeadIn = ({ onDone }: { onDone: () => void }) => {
  const [n, setN] = useState(3);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (n <= 0) {
      onDoneRef.current();
      return;
    }
    const t = setTimeout(() => setN((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [n]);

  return (
    <div className="paper-session paper-session--leadin">
      <p className="paper-session__ready">Prêt ?</p>
      <p className="paper-session__leadin-number">{n}</p>
    </div>
  );
};

export const PaperSessionScreen = ({ settings, onComplete }: Props) => {
  const questions = useMemo<Question[]>(() => generateQuestions(settings), [settings]);
  const [phase, setPhase] = useState<Phase>({ kind: 'leadin' });
  const startedAtRef = useRef<string>(new Date().toISOString());
  const completedRef = useRef(false);

  const finish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    const answers: AnswerRecord[] = questions.map((question) => ({
      question,
      given: null,
      elapsedMs: 0,
    }));
    onComplete({
      startedAt: startedAtRef.current,
      durationPerQuestionMs: settings.durationPerQuestionMs,
      partialCreditFactor: settings.partialCreditFactor,
      questionCount: settings.questionCount,
      selectedTables: [...settings.selectedTables],
      mode: settings.mode,
      answerMode: 'paper',
      answers,
    });
  };

  const advance = (current: number) => {
    if (current + 1 >= questions.length) {
      finish();
    } else {
      setPhase({ kind: 'question', index: current + 1 });
    }
  };

  if (phase.kind === 'leadin') {
    return <LeadIn onDone={() => setPhase({ kind: 'question', index: 0 })} />;
  }

  const current = questions[phase.index];
  return (
    <div className="paper-session">
      <div className="paper-session__counter">
        Question {phase.index + 1} / {questions.length}
      </div>
      <QuestionCard question={current} given="" />
      <Countdown
        durationMs={settings.durationPerQuestionMs}
        resetKey={phase.index}
        onElapsed={() => advance(phase.index)}
      />
    </div>
  );
};
```

- [ ] **Step 4: Create `src/screens/PaperSessionScreen.css`**

```css
.paper-session {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  max-width: 36rem;
  margin: 0 auto;
}

.paper-session__counter {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-fg-muted);
}

.paper-session--leadin {
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
}

.paper-session__ready {
  font-size: 1.6rem;
  font-weight: 700;
  margin: 0;
  color: var(--color-fg);
}

.paper-session__leadin-number {
  font-size: 5rem;
  font-weight: 800;
  margin: 0;
  color: var(--color-accent);
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test src/__tests__/paperSession.test.tsx`
Expected: PASS (all three tests).

- [ ] **Step 6: Commit**

```bash
git add src/screens/PaperSessionScreen.tsx src/screens/PaperSessionScreen.css src/__tests__/paperSession.test.tsx
git commit -m "feat: add PaperSessionScreen (timed, input-free, lead-in)"
```

---

## Task 8: Self-marking branch in `ResultsScreen`

**Files:**
- Modify: `src/screens/ResultsScreen.tsx`
- Modify: `src/screens/ResultsScreen.css`
- Test: `src/__tests__/resultsScreen.test.tsx`

- [ ] **Step 1: Write the failing test `src/__tests__/resultsScreen.test.tsx`**

```tsx
import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsScreen } from '../screens/ResultsScreen';
import type { SessionResult } from '../domain/session';
import type { Question } from '../domain/question';

const q = (a: number, b: number): Question => ({ a, b, op: 'mul', expected: a * b });

const paperResult: SessionResult = {
  startedAt: '2026-06-13T08:00:00Z',
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
  questionCount: 2,
  selectedTables: [7],
  mode: 'mul',
  answerMode: 'paper',
  answers: [
    { question: q(7, 8), given: null, elapsedMs: 0 },
    { question: q(6, 9), given: null, elapsedMs: 0 },
  ],
};

const screenResult: SessionResult = {
  ...paperResult,
  answerMode: 'screen',
  answers: [
    { question: q(7, 8), given: 56, elapsedMs: 1200 },
    { question: q(6, 9), given: 50, elapsedMs: 2000 },
  ],
};

const noop = () => {};

describe('ResultsScreen — paper self-marking', () => {
  test('rows default to correct → score equals max', () => {
    render(<ResultsScreen result={paperResult} onReplay={noop} onHome={noop} onSave={noop} />);
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    // The correct answer is shown for self-comparison
    expect(screen.getByText('7 × 8 = 56')).toBeInTheDocument();
  });

  test('un-marking a row lowers the live score', () => {
    render(<ResultsScreen result={paperResult} onReplay={noop} onHome={noop} onSave={noop} />);
    fireEvent.click(screen.getByRole('button', { name: /7 × 8 = 56/ }));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  test('Enregistrer fires onSave once with selfMarkedCorrect from the marks, then disappears', () => {
    const onSave = vi.fn();
    render(<ResultsScreen result={paperResult} onReplay={noop} onHome={noop} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: /6 × 9 = 54/ })); // mark second wrong
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0] as SessionResult;
    expect(saved.answers[0].selfMarkedCorrect).toBe(true);
    expect(saved.answers[1].selfMarkedCorrect).toBe(false);
    expect(saved.answerMode).toBe('paper');

    expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull();
  });
});

describe('ResultsScreen — screen mode unchanged', () => {
  test('renders read-only rows with no Enregistrer button', () => {
    render(<ResultsScreen result={screenResult} onReplay={noop} onHome={noop} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument(); // 56 ok, 50 wrong
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/__tests__/resultsScreen.test.tsx`
Expected: FAIL — paper rows/`Enregistrer`/`onSave` do not exist yet.

- [ ] **Step 3: Replace `src/screens/ResultsScreen.tsx`**

```tsx
import { useState } from 'react';
import type { SessionResult, AnswerRecord } from '../domain/session';
import { totalScore } from '../domain/scoring';
import './ResultsScreen.css';

type Props = {
  result: SessionResult;
  onReplay: () => void;
  onHome: () => void;
  /** Paper mode only: persist the self-marked result to history. */
  onSave?: (final: SessionResult) => void;
};

type Kind = 'ok' | 'slow' | 'wrong' | 'timeout';

const renderOperation = (record: AnswerRecord): string => {
  const { question } = record;
  if (question.op === 'mul') {
    return `${question.a} × ${question.b} = ${question.expected}`;
  }
  return `${question.a * question.b} ÷ ${question.a} = ${question.expected}`;
};

const classify = (record: AnswerRecord, targetMs: number): Kind => {
  if (record.given === null) return 'timeout';
  if (record.given !== record.question.expected) return 'wrong';
  return record.elapsedMs <= targetMs ? 'ok' : 'slow';
};

const ICON: Record<Kind, string> = {
  ok: '✅',
  slow: '🟡',
  wrong: '❌',
  timeout: '⏰',
};

const formatPoints = (n: number): string =>
  Number.isInteger(n) ? n.toString() : n.toFixed(1);

const ScreenResults = ({ result }: { result: SessionResult }) => {
  const targetSeconds = (result.durationPerQuestionMs / 1000).toFixed(0);
  return (
    <>
      <p className="results__legend">
        Cible : {targetSeconds}s — réponse plus lente :{' '}
        {formatPoints(result.partialCreditFactor)} pt
      </p>
      <ul className="results__list">
        {result.answers.map((record, i) => {
          const kind = classify(record, result.durationPerQuestionMs);
          const elapsed = (record.elapsedMs / 1000).toFixed(1);
          return (
            <li key={i} className={`results__row results__row--${kind}`}>
              <span className="results__icon" aria-hidden>
                {ICON[kind]}
              </span>
              <span className="results__operation">{renderOperation(record)}</span>
              <span className="results__detail">
                {kind === 'ok' && <>{elapsed}s</>}
                {kind === 'slow' && <>{elapsed}s · trop lent</>}
                {kind === 'wrong' && (
                  <>
                    {elapsed}s · réponse : {record.given}
                  </>
                )}
                {kind === 'timeout' && <>pas de réponse</>}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
};

const PaperResults = ({
  result,
  marks,
  onToggle,
}: {
  result: SessionResult;
  marks: boolean[];
  onToggle: (i: number) => void;
}) => (
  <>
    <p className="results__legend">
      Compare avec ta feuille, puis décoche ❌ les réponses fausses.
    </p>
    <ul className="results__list">
      {result.answers.map((record, i) => (
        <li
          key={i}
          className={`results__row results__row--${marks[i] ? 'ok' : 'wrong'}`}
        >
          <button
            type="button"
            className="results__mark"
            aria-pressed={marks[i]}
            aria-label={`${renderOperation(record)} ${marks[i] ? 'correct' : 'faux'}`}
            onClick={() => onToggle(i)}
          >
            {marks[i] ? '✅' : '❌'}
          </button>
          <span className="results__operation">{renderOperation(record)}</span>
        </li>
      ))}
    </ul>
  </>
);

export const ResultsScreen = ({ result, onReplay, onHome, onSave }: Props) => {
  const isPaper = result.answerMode === 'paper';
  const [marks, setMarks] = useState<boolean[]>(() => result.answers.map(() => true));
  const [saved, setSaved] = useState(false);

  const scoredAnswers: AnswerRecord[] = isPaper
    ? result.answers.map((a, i) => ({ ...a, selfMarkedCorrect: marks[i] }))
    : result.answers;

  const { points, max } = totalScore(scoredAnswers, {
    durationPerQuestionMs: result.durationPerQuestionMs,
    partialCreditFactor: result.partialCreditFactor,
  });

  const handleSave = () => {
    if (saved) return;
    setSaved(true);
    onSave?.({ ...result, answers: scoredAnswers });
  };

  return (
    <div className="results">
      <header className="results__header">
        <h2>Bilan</h2>
        <div className="results__score">
          {formatPoints(points)} / {max}
        </div>
      </header>

      {isPaper ? (
        <PaperResults
          result={result}
          marks={marks}
          onToggle={(i) =>
            setMarks((m) => m.map((v, j) => (j === i ? !v : v)))
          }
        />
      ) : (
        <ScreenResults result={result} />
      )}

      <div className="results__actions">
        {isPaper && !saved && (
          <button type="button" className="results__btn" onClick={handleSave}>
            💾 Enregistrer le résultat
          </button>
        )}
        {isPaper && saved && <p className="results__saved">Enregistré ✓</p>}
        <button type="button" className="results__btn" onClick={onReplay}>
          🔁 Refaire la même config
        </button>
        <button
          type="button"
          className="results__btn results__btn--secondary"
          onClick={onHome}
        >
          🏠 Retour à l'accueil
        </button>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Append to `src/screens/ResultsScreen.css`**

```css
.results__mark {
  font-size: 1.3rem;
  line-height: 1;
  padding: 0.2rem 0.3rem;
  border: none;
  background: transparent;
  cursor: pointer;
}

.results__saved {
  margin: 0;
  text-align: center;
  font-weight: 700;
  color: var(--color-success);
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test src/__tests__/resultsScreen.test.tsx`
Expected: PASS (all four tests).

- [ ] **Step 6: Commit**

```bash
git add src/screens/ResultsScreen.tsx src/screens/ResultsScreen.css src/__tests__/resultsScreen.test.tsx
git commit -m "feat: add self-marking paper branch to ResultsScreen"
```

---

## Task 9: Route and defer recording in `App`

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/appPaperFlow.test.tsx`

- [ ] **Step 1: Write the failing test `src/__tests__/appPaperFlow.test.tsx`**

```tsx
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { STORAGE_KEYS, loadHistory } from '../storage/profileStore';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  localStorage.setItem(
    STORAGE_KEYS.settings,
    JSON.stringify({
      durationPerQuestionMs: 4000,
      questionCount: 2,
      selectedTables: [7],
      mode: 'mul',
      partialCreditFactor: 0.5,
      answerMode: 'paper',
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('App — pen-and-paper flow', () => {
  test('nothing is recorded until Enregistrer is pressed', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Lancer/ }));
    advance(3000); // lead-in
    advance(4000); // question 1
    advance(4000); // question 2 → results

    expect(screen.getByText('Bilan')).toBeInTheDocument();
    expect(loadHistory()).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));

    const history = loadHistory();
    expect(history).toHaveLength(1);
    expect(history[0].answerMode).toBe('paper');
    expect(history[0].answers).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/__tests__/appPaperFlow.test.tsx`
Expected: FAIL — App renders `SessionScreen` (no lead-in / `Lancer` starts the keypad flow), and history is written immediately.

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { HomeScreen } from './screens/HomeScreen';
import { SessionScreen } from './screens/SessionScreen';
import { PaperSessionScreen } from './screens/PaperSessionScreen';
import { ResultsScreen } from './screens/ResultsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type { SessionResult, Settings } from './domain/session';
import {
  loadSettings,
  saveSettings,
  recordSession,
  clearAll,
} from './storage/profileStore';

type Screen = 'home' | 'session' | 'results' | 'settings';

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
    </div>
  );
};
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test src/__tests__/appPaperFlow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/__tests__/appPaperFlow.test.tsx
git commit -m "feat: route paper sessions and defer history recording until save"
```

---

## Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire test suite**

Run: `pnpm test`
Expected: ALL tests PASS (existing + new). No regressions.

- [ ] **Step 2: Typecheck + production build**

Run: `pnpm build`
Expected: `tsc --noEmit` reports no errors; Vite build succeeds.

- [ ] **Step 3: Manual smoke test**

Run: `pnpm dev`, open the printed URL, then:
- On home, the new **Saisie** panel shows "📱 Sur l'écran" / "✏️ Sur papier".
- Select **✏️ Sur papier**, press **🚀 Lancer**: a "Prêt ? 3 2 1" lead-in plays, then each question appears as `a × b = ?` with a depleting bar and auto-advances (no keypad).
- After the last question, the **Bilan** shows every operation with its answer, all marked ✅; tap a row to flip it to ❌ and watch the score drop.
- Press **💾 Enregistrer le résultat**: the button is replaced by "Enregistré ✓".
- Switch back to **📱 Sur l'écran** and confirm the original keypad flow is unchanged.

- [ ] **Step 4: Confirm the branch is clean**

Run: `git status`
Expected: working tree clean; all work committed on `feat/pen-and-paper-mode`.

---

## Notes for the implementer

- **Determinism in tests:** `Math.random` mocked to `0` makes `generateQuestions` deterministic. With `selectedTables: [7]` and `mode: 'mul'`, the first generated questions are `7 × 2`, `7 × 3`, … — but the paper tests assert the *count* and structure, not specific operands, except `paperSession.test.tsx`'s "7 × 8" check. If that operand assertion proves brittle under the generator's ordering, replace it with a structural assertion (`screen.getByText(/× /)`), but try the literal first — with `Math.random → 0` the pool order is stable.
- **Fake timers:** every timed test must fake `performance` and `requestAnimationFrame` (see the `toFake` array), because both `Countdown` and `Timer` read `performance.now()` inside a RAF loop.
- **Why `SessionScreen` is untouched:** its results carry `answerMode: undefined`, which every consumer treats as `screen`. Recording, scoring, and stats are unchanged for it.
- **Accepted trade-off:** paper rows default to ✅ (un-tick the wrong ones). A forgotten wrong answer inflates the score — this was chosen deliberately over forcing a tap on every row.
