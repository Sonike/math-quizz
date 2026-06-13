# Training Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an untimed "Entraînement" (training) play mode with immediate per-question feedback, tracked separately from test results with its own dashboard view.

**Architecture:** A third `AnswerMode` value (`'training'`) selected via the home play-mode toggle routes to a new `TrainingScreen` (answer → feedback → Suivant, no timer). Each training answer records `selfMarkedCorrect = (given === expected)`, so the existing time-agnostic scoring/stats functions treat it as binary correct/incorrect with zero new scoring code. Training sessions persist to a separate `trainingHistory` localStorage key and surface via a `Test | Entraînement` toggle inside the existing `ProgressScreen`.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + Testing Library, plain CSS. Fully client-side; `localStorage` persistence. i18n across fr/de/en.

---

## File structure

- `src/domain/session.ts` — extend `AnswerMode` union with `'training'`.
- `src/storage/profileStore.ts` — add `trainingHistory` key, `loadTrainingHistory`, `recordTrainingSession`; extend `clearAll`.
- `src/i18n/{fr,de,en}.ts` — add training/play-mode keys; relabel screen/paper.
- `src/components/AnswerModeToggle.tsx` — 3-way selector.
- `src/screens/HomeScreen.tsx` — training-specific summary + start label.
- `src/screens/TrainingScreen.tsx` + `.css` — new, the core flow.
- `src/screens/ResultsScreen.tsx` — add `TrainingResults` variant.
- `src/screens/ProgressScreen.tsx` — `Test | Entraînement` view toggle.
- `src/App.tsx` — route training; record to training history.
- `package.json`, `CHANGELOG.md`, `src/domain/releaseNotes.ts` — 0.6.0 release (drift guard).

Existing tests touched: `answerModeToggle.test.tsx`, `homeScreen.test.tsx` (relabel).

---

### Task 1: Domain type + separate training storage

**Files:**
- Modify: `src/domain/session.ts:4`
- Modify: `src/storage/profileStore.ts`
- Test: `src/__tests__/profileStore.test.ts`

- [ ] **Step 1: Extend the AnswerMode union**

In `src/domain/session.ts`, change line 4 from:

```ts
export type AnswerMode = 'screen' | 'paper';
```

to:

```ts
export type AnswerMode = 'screen' | 'paper' | 'training';
```

- [ ] **Step 2: Write the failing storage test**

Append to `src/__tests__/profileStore.test.ts` (after the `clearAll` describe block, before the final standalone `it`). Note the import additions at the top: add `loadTrainingHistory` and `recordTrainingSession` to the existing import from `'../storage/profileStore'`.

```ts
describe('training history', () => {
  test('loadTrainingHistory returns [] when empty', () => {
    expect(loadTrainingHistory()).toEqual([]);
  });

  test('recordTrainingSession appends to training history, not the test history', () => {
    const s: SessionResult = { ...mkSession(0), answerMode: 'training' };
    recordTrainingSession(s);
    expect(loadTrainingHistory()).toEqual([s]);
    expect(loadHistory()).toEqual([]);
  });

  test('training history is capped at HISTORY_LIMIT', () => {
    for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
      recordTrainingSession({ ...mkSession(i), answerMode: 'training' });
    }
    expect(loadTrainingHistory()).toHaveLength(HISTORY_LIMIT);
  });

  test('clearAll also wipes training history', () => {
    recordTrainingSession({ ...mkSession(1), answerMode: 'training' });
    clearAll();
    expect(loadTrainingHistory()).toEqual([]);
  });

  test('training history key uses the profile prefix', () => {
    expect(STORAGE_KEYS.trainingHistory).toBe(
      'mathquizz:profile:default:training-history',
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `pnpm test -- profileStore`
Expected: FAIL — `loadTrainingHistory`/`recordTrainingSession`/`STORAGE_KEYS.trainingHistory` are not exported.

- [ ] **Step 4: Implement the storage functions**

In `src/storage/profileStore.ts`, add `trainingHistory` to `STORAGE_KEYS`:

```ts
export const STORAGE_KEYS = {
  settings: `${PREFIX}settings`,
  history: `${PREFIX}history`,
  errors: `${PREFIX}errors`,
  trainingHistory: `${PREFIX}training-history`,
} as const;
```

Add these two functions (place them after `recordSession`):

```ts
export const loadTrainingHistory = (): SessionResult[] =>
  safeParse(localStorage.getItem(STORAGE_KEYS.trainingHistory), [] as SessionResult[]);

export const recordTrainingSession = (session: SessionResult): void => {
  const next = [...loadTrainingHistory(), session].slice(-HISTORY_LIMIT);
  localStorage.setItem(STORAGE_KEYS.trainingHistory, JSON.stringify(next));
};
```

Extend `clearAll`:

```ts
export const clearAll = (): void => {
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.errors);
  localStorage.removeItem(STORAGE_KEYS.trainingHistory);
};
```

(No training errors-map is maintained: `ProgressScreen` recomputes pair/heatmap stats from the history array via `aggregateErrors(history)`, so a persisted training errors map would be dead code.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- profileStore`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domain/session.ts src/storage/profileStore.ts src/__tests__/profileStore.test.ts
git commit -m "feat(training): add 'training' answer mode + separate training history store"
```

---

### Task 2: i18n keys (add training keys, relabel play modes)

**Files:**
- Modify: `src/i18n/fr.ts`, `src/i18n/de.ts`, `src/i18n/en.ts`
- Modify (relabel assertions): `src/__tests__/answerModeToggle.test.tsx`, `src/__tests__/homeScreen.test.tsx`

The `i18n` parity test requires the exact same key set in all three dictionaries. Add every new key to all three.

- [ ] **Step 1: Update `src/i18n/fr.ts`**

Change these existing lines:

```ts
  'home.inputTitle': 'Comment jouer',
```
```ts
  'answerMode.aria': 'comment jouer',
  'answerMode.screen': '📱 Test écran',
  'answerMode.paper': '✏️ Test papier',
```

Add these new lines (group them logically — `home.*` near the other home keys, `training.*` after the `session.*` block, `progress.*` near the other progress keys):

```ts
  'home.startTraining': "S'entraîner",
  'home.summaryTraining': '{count} questions · correction après chaque réponse',
  'answerMode.training': '🎓 Entraînement',
  'training.correct': 'Bravo !',
  'training.wrong': 'Presque !',
  'training.yourAnswer': 'Tu as répondu {given} · la bonne réponse est {expected}',
  'training.next': 'Suivant',
  'training.finish': 'Voir le bilan',
  'progress.viewAria': 'type de résultats',
  'progress.viewTest': 'Test',
  'progress.viewTraining': 'Entraînement',
  'progress.trainingEmpty': 'Entraîne-toi pour voir tes paires à revoir',
```

- [ ] **Step 2: Update `src/i18n/de.ts`**

Change existing:

```ts
  'home.inputTitle': 'Spielmodus',
```
```ts
  'answerMode.aria': 'spielmodus',
  'answerMode.screen': '📱 Bildschirm-Test',
  'answerMode.paper': '✏️ Papier-Test',
```

Add new:

```ts
  'home.startTraining': 'Üben',
  'home.summaryTraining': '{count} Fragen · Korrektur nach jeder Antwort',
  'answerMode.training': '🎓 Üben',
  'training.correct': 'Super!',
  'training.wrong': 'Fast!',
  'training.yourAnswer': 'Du hast {given} geantwortet · die richtige Antwort ist {expected}',
  'training.next': 'Weiter',
  'training.finish': 'Zur Bilanz',
  'progress.viewAria': 'ergebnistyp',
  'progress.viewTest': 'Test',
  'progress.viewTraining': 'Üben',
  'progress.trainingEmpty': 'Übe, um deine Paare zum Üben zu sehen',
```

- [ ] **Step 3: Update `src/i18n/en.ts`**

Change existing:

```ts
  'home.inputTitle': 'How to play',
```
```ts
  'answerMode.aria': 'how to play',
  'answerMode.screen': '📱 Screen test',
  'answerMode.paper': '✏️ Paper test',
```

Add new:

```ts
  'home.startTraining': 'Practice',
  'home.summaryTraining': '{count} questions · feedback after each answer',
  'answerMode.training': '🎓 Practice',
  'training.correct': 'Well done!',
  'training.wrong': 'Almost!',
  'training.yourAnswer': 'You answered {given} · the correct answer is {expected}',
  'training.next': 'Next',
  'training.finish': 'See summary',
  'progress.viewAria': 'results type',
  'progress.viewTest': 'Test',
  'progress.viewTraining': 'Practice',
  'progress.trainingEmpty': 'Practice to see your pairs to review',
```

- [ ] **Step 4: Fix the two existing tests that assert the old labels**

In `src/__tests__/answerModeToggle.test.tsx`, replace the body of the test with the relabeled strings (the 3rd option is added in Task 3; for now keep it to the two that still render):

```ts
    expect(
      screen.getByRole('radio', { name: '📱 Test écran' }),
    ).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: '✏️ Test papier' }));
    expect(onChange).toHaveBeenCalledWith('paper');
```

In `src/__tests__/homeScreen.test.tsx`, change the click target string:

```ts
    fireEvent.click(screen.getByRole('radio', { name: '✏️ Test papier' }));
```

- [ ] **Step 5: Run the affected tests**

Run: `pnpm test -- i18n answerModeToggle homeScreen`
Expected: PASS (parity holds; relabeled assertions pass).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/fr.ts src/i18n/de.ts src/i18n/en.ts src/__tests__/answerModeToggle.test.tsx src/__tests__/homeScreen.test.tsx
git commit -m "i18n(training): add training/play-mode keys and relabel screen/paper as tests"
```

---

### Task 3: 3-way AnswerModeToggle

**Files:**
- Modify: `src/components/AnswerModeToggle.tsx`
- Test: `src/__tests__/answerModeToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a second test inside the existing `describe('AnswerModeToggle', ...)` in `src/__tests__/answerModeToggle.test.tsx`:

```ts
  test('renders the training option and emits "training" on click', () => {
    const onChange = vi.fn();
    render(<AnswerModeToggle value="screen" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: '🎓 Entraînement' }));
    expect(onChange).toHaveBeenCalledWith('training');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- answerModeToggle`
Expected: FAIL — no radio named "🎓 Entraînement".

- [ ] **Step 3: Add the third option and drop the two-column modifier**

In `src/components/AnswerModeToggle.tsx`, extend `OPTIONS` and remove `mode-toggle--two`:

```tsx
  const OPTIONS: { id: AnswerMode; label: string }[] = [
    { id: 'screen', label: t('answerMode.screen') },
    { id: 'paper', label: t('answerMode.paper') },
    { id: 'training', label: t('answerMode.training') },
  ];
  const active = value ?? 'screen';
  return (
    <div className="mode-toggle" role="radiogroup" aria-label={t('answerMode.aria')}>
```

(The default `.mode-toggle` is already a 3-column grid in `ModeToggle.css`, so dropping `--two` gives three equal segments.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- answerModeToggle`
Expected: PASS (both tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/AnswerModeToggle.tsx src/__tests__/answerModeToggle.test.tsx
git commit -m "feat(training): make the play-mode toggle three-way"
```

---

### Task 4: HomeScreen training summary + start label

**Files:**
- Modify: `src/screens/HomeScreen.tsx:26-31,82-90`
- Test: `src/__tests__/homeScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a new describe block to `src/__tests__/homeScreen.test.tsx`:

```ts
describe('HomeScreen — training mode', () => {
  test('shows the training summary and start label when answerMode is training', () => {
    render(
      <HomeScreen
        settings={{ ...DEFAULT_SETTINGS, answerMode: 'training' }}
        onChange={noop}
        onStart={noop}
        onOpenSettings={noop}
        onOpenProgress={noop}
        onOpenInfo={noop}
      />,
    );

    expect(
      screen.getByText(/correction après chaque réponse/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /S'entraîner/ }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- homeScreen`
Expected: FAIL — the summary still says "{seconds}s par question" and the button reads "Lancer".

- [ ] **Step 3: Implement the conditional copy**

In `src/screens/HomeScreen.tsx`, after the `canStart` line (~29) add:

```tsx
  const isTraining = (settings.answerMode ?? 'screen') === 'training';
```

Replace the summary paragraph and start button (lines 82-90) with:

```tsx
      <p className="home__info">
        {isTraining
          ? t('home.summaryTraining', { count: settings.questionCount })
          : t('home.summary', { count: settings.questionCount, seconds })}
      </p>
      <button
        type="button"
        className="home__start-btn"
        onClick={onStart}
        disabled={!canStart}
      >
        {isTraining ? `🎓 ${t('home.startTraining')}` : `🚀 ${t('home.start')}`}
      </button>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- homeScreen`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/HomeScreen.tsx src/__tests__/homeScreen.test.tsx
git commit -m "feat(training): training-specific home summary and start button"
```

---

### Task 5: TrainingScreen (answer → feedback → Suivant)

**Files:**
- Create: `src/screens/TrainingScreen.tsx`
- Create: `src/screens/TrainingScreen.css`
- Test: `src/__tests__/trainingFlow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/trainingFlow.test.tsx`:

```tsx
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainingScreen } from '../screens/TrainingScreen';
import type { Settings, SessionResult } from '../domain/session';

const settings: Settings = {
  durationPerQuestionMs: 4000,
  questionCount: 2,
  selectedTables: [7],
  mode: 'mul',
  partialCreditFactor: 0.5,
  answerMode: 'training',
  language: 'fr',
};

beforeEach(() => {
  // Deterministic generation (mode=mul, expected = a*b)
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TrainingScreen', () => {
  test('no timer is shown', () => {
    render(<TrainingScreen settings={settings} onComplete={() => {}} />);
    expect(screen.queryByLabelText('temps en cours')).toBeNull();
    expect(screen.queryByLabelText('temps restant')).toBeNull();
  });

  test('a wrong answer shows the correction; a correct answer shows praise', () => {
    render(<TrainingScreen settings={settings} onComplete={() => {}} />);

    // Q1 — answer something wrong, submit
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText(/Presque/)).toBeInTheDocument();
    expect(screen.getByText(/la bonne réponse est/)).toBeInTheDocument();

    // Advance to Q2
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('Question 2 / 2')).toBeInTheDocument();
  });

  test('records one auto-marked answer per question with selfMarkedCorrect set', () => {
    let result: SessionResult | null = null;
    render(<TrainingScreen settings={settings} onComplete={(r) => (result = r)} />);

    // Q1: submit then advance
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' }); // validate -> feedback
    fireEvent.keyDown(window, { key: 'Enter' }); // Suivant -> Q2

    // Q2 (last): submit then finish
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'Enter' }); // validate -> feedback
    fireEvent.keyDown(window, { key: 'Enter' }); // Voir le bilan -> onComplete

    expect(result).not.toBeNull();
    expect(result!.answerMode).toBe('training');
    expect(result!.answers).toHaveLength(2);
    for (const a of result!.answers) {
      expect(a.selfMarkedCorrect).toBe(a.given === a.question.expected);
    }
  });

  test('empty answer + Enter does not advance to feedback', () => {
    render(<TrainingScreen settings={settings} onComplete={() => {}} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('Question 1 / 2')).toBeInTheDocument();
    expect(screen.queryByText(/Bravo|Presque/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- trainingFlow`
Expected: FAIL — `../screens/TrainingScreen` does not exist.

- [ ] **Step 3: Create `src/screens/TrainingScreen.tsx`**

```tsx
import { useMemo, useRef, useState } from 'react';
import { generateQuestions } from '../domain/question';
import type { Question } from '../domain/question';
import type { AnswerRecord, Settings, SessionResult } from '../domain/session';
import { NumPad } from '../components/NumPad';
import { QuestionCard } from '../components/QuestionCard';
import { useNumericKeyboard } from '../hooks/useNumericKeyboard';
import { useI18n } from '../i18n/I18nContext';
import './TrainingScreen.css';

type Props = {
  settings: Settings;
  onComplete: (result: SessionResult) => void;
};

type Phase = 'answering' | 'feedback';
type Feedback = { correct: boolean; given: number; expected: number };

export const TrainingScreen = ({ settings, onComplete }: Props) => {
  const { t } = useI18n();
  const questions = useMemo<Question[]>(() => generateQuestions(settings), [settings]);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState('');
  const [phase, setPhase] = useState<Phase>('answering');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());
  const questionStartRef = useRef<number>(performance.now());
  const answersRef = useRef<AnswerRecord[]>([]);
  const completedRef = useRef(false);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  const submit = () => {
    if (given === '' || phase !== 'answering') return;
    const value = Number(given);
    const correct = value === current.expected;
    answersRef.current = [
      ...answersRef.current,
      {
        question: current,
        given: value,
        elapsedMs: performance.now() - questionStartRef.current,
        selfMarkedCorrect: correct,
      },
    ];
    setFeedback({ correct, given: value, expected: current.expected });
    setPhase('feedback');
  };

  const handleNext = () => {
    if (completedRef.current) return;
    if (isLast) {
      completedRef.current = true;
      onComplete({
        startedAt: startedAtRef.current,
        durationPerQuestionMs: settings.durationPerQuestionMs,
        partialCreditFactor: settings.partialCreditFactor,
        questionCount: settings.questionCount,
        selectedTables: [...settings.selectedTables],
        mode: settings.mode,
        answerMode: 'training',
        answers: answersRef.current,
      });
      return;
    }
    setIndex((i) => i + 1);
    setGiven('');
    setFeedback(null);
    setPhase('answering');
    questionStartRef.current = performance.now();
  };

  const handleDigit = (d: number) => {
    if (phase !== 'answering') return;
    setGiven((prev) => (prev.length >= 4 ? prev : prev + String(d)));
  };
  const handleErase = () => {
    if (phase !== 'answering') return;
    setGiven((prev) => prev.slice(0, -1));
  };
  const handleValidate = () => {
    if (phase === 'answering') submit();
    else handleNext();
  };

  useNumericKeyboard({
    onDigit: handleDigit,
    onErase: handleErase,
    onValidate: handleValidate,
    enabled: !completedRef.current,
  });

  return (
    <div className="training">
      <div className="training__counter">
        {t('session.counter', { n: index + 1, total: questions.length })}
      </div>
      <QuestionCard
        question={current}
        given={phase === 'feedback' && feedback ? String(feedback.given) : given}
      />
      {phase === 'answering' ? (
        <NumPad onDigit={handleDigit} onErase={handleErase} onValidate={handleValidate} />
      ) : (
        feedback && (
          <>
            <div className={`training__feedback training__feedback--${feedback.correct ? 'ok' : 'wrong'}`}>
              <p className="training__verdict">
                {feedback.correct ? `✅ ${t('training.correct')}` : `❌ ${t('training.wrong')}`}
              </p>
              {!feedback.correct && (
                <p className="training__correction">
                  {t('training.yourAnswer', {
                    given: feedback.given,
                    expected: feedback.expected,
                  })}
                </p>
              )}
            </div>
            <button type="button" className="training__next-btn" onClick={handleNext}>
              {isLast ? t('training.finish') : `${t('training.next')} →`}
            </button>
          </>
        )
      )}
    </div>
  );
};
```

- [ ] **Step 4: Create `src/screens/TrainingScreen.css`**

```css
.training {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 1.2rem;
  max-width: 32rem;
  margin: 0 auto;
}

.training__counter {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-fg-muted);
}

.training__feedback {
  padding: 1rem 1.1rem;
  border-radius: 14px;
  border-left: 4px solid var(--color-chip-border);
  background: var(--color-card-bg);
}

.training__feedback--ok {
  border-left-color: var(--color-success);
}

.training__feedback--wrong {
  border-left-color: var(--color-error);
}

.training__verdict {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
}

.training__correction {
  margin: 0.5rem 0 0;
  font-size: 1.05rem;
  color: var(--color-fg);
}

.training__next-btn {
  font-size: 1.1rem;
  font-weight: 700;
  padding: 0.9rem;
  border: none;
  border-radius: 14px;
  background: var(--color-accent);
  color: white;
  cursor: pointer;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- trainingFlow`
Expected: PASS (all four tests).

- [ ] **Step 6: Commit**

```bash
git add src/screens/TrainingScreen.tsx src/screens/TrainingScreen.css src/__tests__/trainingFlow.test.tsx
git commit -m "feat(training): TrainingScreen with immediate per-answer feedback"
```

---

### Task 6: ResultsScreen training summary variant

**Files:**
- Modify: `src/screens/ResultsScreen.tsx`
- Test: `src/__tests__/resultsScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/resultsScreen.test.tsx` (after the existing `screenResult` definition, add a `trainingResult`, then a new describe):

```ts
const trainingResult: SessionResult = {
  ...paperResult,
  answerMode: 'training',
  answers: [
    { question: q(7, 8), given: 56, elapsedMs: 900, selfMarkedCorrect: true },
    { question: q(6, 9), given: 50, elapsedMs: 1300, selfMarkedCorrect: false },
  ],
};

describe('ResultsScreen — training summary', () => {
  test('scores from selfMarkedCorrect, shows the correct facts, no Enregistrer', () => {
    render(<ResultsScreen result={trainingResult} onReplay={noop} onHome={noop} />);
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('7 × 8 = 56')).toBeInTheDocument();
    expect(screen.getByText('6 × 9 = 54')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enregistrer/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- resultsScreen`
Expected: FAIL — training currently falls through to `ScreenResults`, which renders time/wrong-answer details and classifies by `given` vs `expected` (here it would also read 1/2, but the row format differs); the assertion on the operation `6 × 9 = 54` via `renderOperation` does pass, but `ScreenResults` shows `6 × 9 = 54` only inside a detail row — confirm failure is on the missing dedicated rendering by checking the test output. If it unexpectedly passes, still proceed to add the explicit variant for clarity and correctness.

> Note: the dedicated `TrainingResults` block below is required because `ScreenResults` would mark a slow-but-correct training answer as "🟡 trop lent" using `elapsedMs` — wrong for an untimed mode. The test guards the score; the variant guards the per-row semantics.

- [ ] **Step 3: Add the `TrainingResults` component and branch**

In `src/screens/ResultsScreen.tsx`, add a new component after `PaperResults` (before the main `ResultsScreen` export):

```tsx
const TrainingResults = ({ result }: { result: SessionResult }) => {
  const { t } = useI18n();
  return (
    <ul className="results__list">
      {result.answers.map((record, i) => {
        const ok = record.selfMarkedCorrect === true;
        return (
          <li key={i} className={`results__row results__row--${ok ? 'ok' : 'wrong'}`}>
            <span className="results__icon" aria-hidden>
              {ok ? '✅' : '❌'}
            </span>
            <span className="results__operation">{renderOperation(record)}</span>
            {!ok && (
              <span className="results__detail">
                {t('results.wrongAnswer', { given: record.given ?? '' })}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
};
```

In the `ResultsScreen` body, add an `isTraining` flag next to `isPaper`:

```tsx
  const isPaper = result.answerMode === 'paper';
  const isTraining = result.answerMode === 'training';
```

Replace the results-body conditional (the `isPaper ? <PaperResults .../> : <ScreenResults .../>` block) with:

```tsx
      {isPaper ? (
        <PaperResults
          result={result}
          marks={marks}
          onToggle={(i) =>
            setMarks((m) => m.map((v, j) => (j === i ? !v : v)))
          }
        />
      ) : isTraining ? (
        <TrainingResults result={result} />
      ) : (
        <ScreenResults result={result} />
      )}
```

(The score header already works: `totalScore` reads `selfMarkedCorrect` first. The save button stays gated behind `isPaper`, so training shows none.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- resultsScreen`
Expected: PASS (paper, screen, and training describes).

- [ ] **Step 5: Commit**

```bash
git add src/screens/ResultsScreen.tsx src/__tests__/resultsScreen.test.tsx
git commit -m "feat(training): training results summary variant (auto-marked, no time)"
```

---

### Task 7: ProgressScreen Test | Entraînement view toggle

**Files:**
- Modify: `src/screens/ProgressScreen.tsx`
- Test: `src/__tests__/progressScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/progressScreen.test.tsx` a new describe (the existing `session()` helper and `STORAGE_KEYS` import are reused; add `loadTrainingHistory` is NOT needed — we seed via `STORAGE_KEYS.trainingHistory`):

```ts
describe('ProgressScreen — training view', () => {
  test('switching to Entraînement reads training history and hides the score chart', () => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify([session()]));
    localStorage.setItem(
      STORAGE_KEYS.trainingHistory,
      JSON.stringify([
        session({
          answerMode: 'training',
          answers: [
            { question: { a: 6, b: 9, op: 'mul', expected: 54 }, given: 50, elapsedMs: 0, selfMarkedCorrect: false },
            { question: { a: 6, b: 9, op: 'mul', expected: 54 }, given: 49, elapsedMs: 0, selfMarkedCorrect: false },
            { question: { a: 6, b: 9, op: 'mul', expected: 54 }, given: 54, elapsedMs: 0, selfMarkedCorrect: true },
          ],
        }),
      ]),
    );
    render(<ProgressScreen onBack={() => {}} />);

    // Test view (default) shows the score chart
    expect(
      screen.getByRole('img', { name: /Score sur les dernières sessions/i }),
    ).toBeInTheDocument();

    // Switch to training
    fireEvent.click(screen.getByRole('radio', { name: 'Entraînement' }));

    // Chart is gone; the training-only weak pair (6 × 9) is shown
    expect(
      screen.queryByRole('img', { name: /Score sur les dernières sessions/i }),
    ).toBeNull();
    expect(screen.getByText('6 × 9')).toBeInTheDocument();
  });

  test('training view shows its own empty state when there is no training history', () => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify([session()]));
    render(<ProgressScreen onBack={() => {}} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Entraînement' }));
    expect(screen.getByText(/Entraîne-toi pour voir/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- progressScreen`
Expected: FAIL — there is no "Entraînement" radio.

- [ ] **Step 3: Rewrite `src/screens/ProgressScreen.tsx`**

Replace the file contents with:

```tsx
import { useMemo, useState } from 'react';
import { loadHistory, loadTrainingHistory } from '../storage/profileStore';
import { sessionScores, trickiestPairs, errorGrid } from '../domain/progress';
import { ScoreLineChart } from '../components/ScoreLineChart';
import { TrickiestPairsList } from '../components/TrickiestPairsList';
import { ErrorHeatmap } from '../components/ErrorHeatmap';
import { useI18n } from '../i18n/I18nContext';
import './ProgressScreen.css';
import '../components/ModeToggle.css';

type Props = {
  onBack: () => void;
};

type View = 'test' | 'training';

export const ProgressScreen = ({ onBack }: Props) => {
  const { t } = useI18n();
  const [view, setView] = useState<View>('test');
  const testHistory = useMemo(() => loadHistory(), []);
  const trainingHistory = useMemo(() => loadTrainingHistory(), []);
  const history = view === 'test' ? testHistory : trainingHistory;

  const points = useMemo(() => sessionScores(history), [history]);
  const pairs = useMemo(() => trickiestPairs(history), [history]);
  const grid = useMemo(() => errorGrid(history), [history]);

  const VIEWS: { id: View; label: string }[] = [
    { id: 'test', label: t('progress.viewTest') },
    { id: 'training', label: t('progress.viewTraining') },
  ];

  return (
    <div className="progress">
      <header className="progress__header">
        <h2>{t('progress.title')}</h2>
        <button
          type="button"
          className="progress__back-btn"
          onClick={onBack}
          aria-label={t('common.backToHomeAria')}
        >
          🏠
        </button>
      </header>

      <div className="mode-toggle mode-toggle--two" role="radiogroup" aria-label={t('progress.viewAria')}>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={view === v.id}
            className={`mode-toggle__option${view === v.id ? ' mode-toggle__option--on' : ''}`}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      {history.length === 0 ? (
        <p className="progress__empty">
          {view === 'training'
            ? `${t('progress.trainingEmpty')} 🎓`
            : `${t('progress.empty')} 📈`}
        </p>
      ) : (
        <>
          {view === 'test' && (
            <section className="progress__panel">
              <h3 className="progress__panel-title">{t('progress.scoreTitle')}</h3>
              <ScoreLineChart points={points} />
              <p className="progress__caption">{t('progress.scoreCaption')}</p>
            </section>
          )}

          <section className="progress__panel">
            <h3 className="progress__panel-title">{t('progress.pairsTitle')}</h3>
            <TrickiestPairsList pairs={pairs} />
          </section>

          <section className="progress__panel">
            <h3 className="progress__panel-title">{t('progress.tablesTitle')}</h3>
            <ErrorHeatmap grid={grid} />
          </section>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- progressScreen`
Expected: PASS (existing three tests + two new).

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgressScreen.tsx src/__tests__/progressScreen.test.tsx
git commit -m "feat(training): Test | Entraînement toggle on the results dashboard"
```

---

### Task 8: App routing + record to training history

**Files:**
- Modify: `src/App.tsx:11-16,29-36,56-61`
- Test: `src/__tests__/appTrainingFlow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/appTrainingFlow.test.tsx`:

```tsx
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { STORAGE_KEYS, loadHistory, loadTrainingHistory } from '../storage/profileStore';

beforeEach(() => {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  localStorage.setItem(
    STORAGE_KEYS.settings,
    JSON.stringify({
      durationPerQuestionMs: 4000,
      questionCount: 2,
      selectedTables: [7],
      mode: 'mul',
      partialCreditFactor: 0.5,
      answerMode: 'training',
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('App — training flow', () => {
  test('completing a training session records to training history only, then shows the summary', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /S'entraîner/ }));

    // Q1: answer, validate, advance
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Enter' });
    // Q2: answer, validate, finish
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(screen.getByText('Bilan')).toBeInTheDocument();
    expect(loadHistory()).toHaveLength(0);
    const training = loadTrainingHistory();
    expect(training).toHaveLength(1);
    expect(training[0].answerMode).toBe('training');
    expect(training[0].answers).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- appTrainingFlow`
Expected: FAIL — `App` routes training to `SessionScreen` (timed) and records via `recordSession` into the test history.

- [ ] **Step 3: Wire the routing and recording in `src/App.tsx`**

Add the import (`TrainingScreen`) and `recordTrainingSession`:

```tsx
import { SessionScreen } from './screens/SessionScreen';
import { PaperSessionScreen } from './screens/PaperSessionScreen';
import { TrainingScreen } from './screens/TrainingScreen';
```
```tsx
import {
  loadSettings,
  saveSettings,
  recordSession,
  recordTrainingSession,
  clearAll,
} from './storage/profileStore';
```

Replace `handleSessionComplete`:

```tsx
  const handleSessionComplete = (result: SessionResult) => {
    if (result.answerMode === 'paper') {
      // Paper sessions are recorded later, once the child has self-marked.
    } else if (result.answerMode === 'training') {
      recordTrainingSession(result);
    } else {
      recordSession(result);
    }
    setLastResult(result);
    setScreen('results');
  };
```

Replace the `session` screen branch:

```tsx
        {screen === 'session' &&
          (settings.answerMode === 'paper' ? (
            <PaperSessionScreen settings={settings} onComplete={handleSessionComplete} />
          ) : settings.answerMode === 'training' ? (
            <TrainingScreen settings={settings} onComplete={handleSessionComplete} />
          ) : (
            <SessionScreen settings={settings} onComplete={handleSessionComplete} />
          ))}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- appTrainingFlow`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/__tests__/appTrainingFlow.test.tsx
git commit -m "feat(training): route training sessions and persist to training history"
```

---

### Task 9: Release 0.6.0 (version + changelog + notes, drift guard)

**Files:**
- Modify: `package.json` (`version`)
- Modify: `CHANGELOG.md`
- Modify: `src/domain/releaseNotes.ts`

These three MUST change together or `pnpm test` (the `releaseNotes` drift guard) fails.

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.5.1"` to `"version": "0.6.0"`.

- [ ] **Step 2: Prepend the changelog section**

In `CHANGELOG.md`, insert directly under the intro paragraph (above `## [0.5.1]`):

```markdown
## [0.6.0] - 2026-06-13

### Added
- **Training mode** ("Entraînement"): a third play option on the home screen
  (`📱 Test écran` / `✏️ Test papier` / `🎓 Entraînement`). Untimed — after each
  submitted answer the child immediately sees correct/incorrect and the right
  answer, then taps **Suivant**. Answers are auto-marked (correct = 1 point,
  time ignored) by setting `selfMarkedCorrect` on each record, so the existing
  scoring (`pointsFor`) and stats (`stats.classify`, `progress.isCorrect`)
  reuse it unchanged. New `src/screens/TrainingScreen.tsx`.
- **Separate training tracking + dashboard view**: training sessions persist to
  a new `trainingHistory` localStorage key (independent 50-session cap) and are
  shown via a `Test | Entraînement` toggle on the "Mes résultats" page. The
  training view shows trickiest pairs + the table heatmap only (no
  score-over-time chart). `clearAll` now clears training history too.

### Changed
- The home play-mode toggle is now three-way and its options are relabelled
  `Test écran` / `Test papier` to distinguish them from `Entraînement`.
```

- [ ] **Step 3: Prepend the French release note**

In `src/domain/releaseNotes.ts`, add as the first element of the `releaseNotes` array (before the `0.5.1` entry):

```ts
  {
    version: '0.6.0',
    date: '2026-06-13',
    changes: [
      'Nouveau mode « Entraînement » : pas de chrono. Après chaque réponse, tu vois tout de suite si c’est juste et la bonne réponse, puis tu passes à la suivante.',
      'Tes entraînements ont leur propre page de résultats : ouvre « Mes résultats » et choisis « Entraînement ».',
    ],
  },
```

- [ ] **Step 4: Run the drift guard**

Run: `pnpm test -- releaseNotes`
Expected: PASS — top note version `0.6.0` matches `package.json`; `CHANGELOG.md` contains `## [0.6.0]`.

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md src/domain/releaseNotes.ts
git commit -m "chore(release): 0.6.0 — training mode"
```

---

### Task 10: Full verification

- [ ] **Step 1: Run the entire test suite**

Run: `pnpm test`
Expected: PASS — all suites green, including i18n parity and the drift guard.

- [ ] **Step 2: Typecheck + production build**

Run: `pnpm build`
Expected: `tsc --noEmit` clean (the new `AnswerMode` member breaks no exhaustive switches) and Vite build succeeds.

- [ ] **Step 3: If anything fails, fix and re-run before proceeding.**

No commit needed unless a fix was applied (then commit it with a `fix(training): ...` message).

---

## Self-review notes (verified against the spec)

- **Spec coverage:** 3-way selector (Task 3), data model + `selfMarkedCorrect` reuse (Tasks 1,5), no-retry feedback flow (Task 5), separate `trainingHistory` + `clearAll` (Task 1), minimal dashboard via in-screen toggle (Task 7), training summary (Task 6), App routing (Task 8), i18n×3 (Task 2), release ritual (Task 9). All mapped.
- **Type consistency:** `recordTrainingSession`/`loadTrainingHistory`/`STORAGE_KEYS.trainingHistory` are defined in Task 1 and consumed identically in Tasks 7–8; `AnswerMode` `'training'` defined Task 1, used Tasks 3,5,6,8; new i18n keys defined Task 2, used Tasks 3–7.
- **Keyboard double-fire:** the Enter that submits an answer (`answering`→`feedback`) and the Enter that advances (`feedback`→next) are distinct key events; `handleValidate` branches on `phase`, so one press never does both. Covered by the `trainingFlow` "records one auto-marked answer per question" test.
- **Greenness between commits:** version stays `0.5.1` through Tasks 1–8, so the drift guard passes; it is bumped atomically with changelog + notes in Task 9.
