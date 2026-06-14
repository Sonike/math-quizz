# Exercise List Mode ("Liste") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth play mode, "Liste", that shows a scrollable list of `questionCount` operations with answers hidden by default — revealable all-at-once or one row at a time — plus a "Nouvelle liste" reshuffle button.

**Architecture:** A new `ExerciseListScreen` reuses `generateQuestions(settings)` and is launched through the existing Start → `'session'` path, routed by `App.tsx` when `answerMode === 'list'`. Unlike the other three modes, it is a pure view: it takes `onCancel` but no `onComplete`, so it never records a `SessionResult`.

**Tech Stack:** React 18 + TypeScript, Vite, vitest + Testing Library. French/English/German i18n via a typed key table (`fr.ts` is the source of truth).

---

## File Structure

- `src/domain/question.ts` — **modify**: export a shared `formatOperation(q)` helper (extracted from `QuestionCard`). `generateQuestions` unchanged.
- `src/components/QuestionCard.tsx` — **modify**: use the imported `formatOperation`.
- `src/domain/session.ts` — **modify**: add `'list'` to the `AnswerMode` union.
- `src/components/AnswerModeToggle.tsx` — **modify**: add the 4th `📋 Liste` option + a `mode-toggle--four` wrapper class.
- `src/components/ModeToggle.css` — **modify**: add `.mode-toggle--four` (2×2 grid).
- `src/screens/HomeScreen.tsx` — **modify**: `isList` branch for Start label + summary.
- `src/screens/ExerciseListScreen.tsx` + `ExerciseListScreen.css` — **create**: the list screen.
- `src/App.tsx` — **modify**: route `answerMode === 'list'` to `ExerciseListScreen`.
- `src/i18n/{fr,en,de}.ts` — **modify**: 9 new keys (added per-task, kept in sync).
- `package.json`, `CHANGELOG.md`, `src/domain/releaseNotes.ts` — **modify**: release bump to `0.8.0`.
- Tests created/modified: `question.test.ts`, `answerModeToggle.test.tsx`, `homeScreen.test.tsx`, `exerciseListScreen.test.tsx` (new), `appExerciseListFlow.test.tsx` (new).

---

## Task 1: Extract `formatOperation` helper

**Files:**
- Modify: `src/domain/question.ts`
- Modify: `src/components/QuestionCard.tsx:11-14`
- Test: `src/__tests__/question.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/question.test.ts`:

```ts
import { formatOperation } from '../domain/question';

describe('formatOperation', () => {
  it('renders multiplication as "a × b"', () => {
    expect(formatOperation({ a: 7, b: 8, op: 'mul', expected: 56 })).toBe('7 × 8');
  });

  it('renders division as "(a*b) ÷ a"', () => {
    expect(formatOperation({ a: 7, b: 8, op: 'div', expected: 8 })).toBe('56 ÷ 7');
  });
});
```

(If `describe`/`it`/`expect` are already imported at the top of the file, do not re-import them — vitest globals are enabled, but match the file's existing style.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run src/__tests__/question.test.ts`
Expected: FAIL — `formatOperation is not a function` / no exported member `formatOperation`.

- [ ] **Step 3: Add the helper to `src/domain/question.ts`**

After the `buildQuestion` definition (around line 28), add:

```ts
export const formatOperation = (q: Question): string =>
  q.op === 'mul' ? `${q.a} × ${q.b}` : `${q.a * q.b} ÷ ${q.a}`;
```

- [ ] **Step 4: Use it in `QuestionCard`**

In `src/components/QuestionCard.tsx`, replace the local `renderOperation` (lines 11-14) and its call site. Change the import line and the operation div:

```tsx
import type { Question } from '../domain/question';
import { formatOperation } from '../domain/question';
import './QuestionCard.css';
```

Delete the `renderOperation` function. In the JSX, change `{renderOperation(question)}` to `{formatOperation(question)}`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- --run src/__tests__/question.test.ts src/__tests__/paperSession.test.tsx`
Expected: PASS (paperSession exercises `QuestionCard` rendering; identical output confirms no regression).

- [ ] **Step 6: Commit**

```bash
git add src/domain/question.ts src/components/QuestionCard.tsx src/__tests__/question.test.ts
git commit -m "refactor(question): extract shared formatOperation helper"
```

---

## Task 2: Add the `list` AnswerMode and the 4th toggle option

**Files:**
- Modify: `src/domain/session.ts:4`
- Modify: `src/components/AnswerModeToggle.tsx`
- Modify: `src/components/ModeToggle.css`
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/i18n/de.ts`
- Test: `src/__tests__/answerModeToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Append a test inside the `describe('AnswerModeToggle', ...)` block in `src/__tests__/answerModeToggle.test.tsx`:

```ts
  test('renders the list option and emits "list" on click', () => {
    const onChange = vi.fn();
    render(<AnswerModeToggle value="screen" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: '📋 Liste' }));
    expect(onChange).toHaveBeenCalledWith('list');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run src/__tests__/answerModeToggle.test.tsx`
Expected: FAIL — no radio named `📋 Liste`.

- [ ] **Step 3: Extend the `AnswerMode` union**

In `src/domain/session.ts`, change line 4:

```ts
export type AnswerMode = 'screen' | 'paper' | 'training' | 'list';
```

Update the doc comment on `SessionResult.answerMode` (around line 22-23) to note that `'list'` never appears in a recorded result. Replace that comment with:

```ts
  /**
   * How answers are collected. Absent reads as 'screen'. Never 'list' — the
   * list mode is a view and does not record a session.
   */
```

- [ ] **Step 4: Add the i18n key to all three dictionaries**

In `src/i18n/fr.ts`, after the `'answerMode.training'` line:

```ts
  'answerMode.list': '📋 Liste',
```

In `src/i18n/en.ts`, after its `'answerMode.training'` line:

```ts
  'answerMode.list': '📋 List',
```

In `src/i18n/de.ts`, after its `'answerMode.training'` line:

```ts
  'answerMode.list': '📋 Liste',
```

- [ ] **Step 5: Add the option and the 4-column wrapper class**

In `src/components/AnswerModeToggle.tsx`, add the option to `OPTIONS` (after `training`):

```ts
    { id: 'list', label: t('answerMode.list') },
```

Change the wrapper `className` from `"mode-toggle"` to `"mode-toggle mode-toggle--four"`:

```tsx
    <div className="mode-toggle mode-toggle--four" role="radiogroup" aria-label={t('answerMode.aria')}>
```

- [ ] **Step 6: Add the CSS modifier**

Append to `src/components/ModeToggle.css`:

```css
.mode-toggle--four {
  grid-template-columns: repeat(2, 1fr);
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm test -- --run src/__tests__/answerModeToggle.test.tsx src/__tests__/i18n.test.ts`
Expected: PASS (i18n "same keys" check stays green because the key was added to all three dicts).

- [ ] **Step 8: Commit**

```bash
git add src/domain/session.ts src/components/AnswerModeToggle.tsx src/components/ModeToggle.css src/i18n/fr.ts src/i18n/en.ts src/i18n/de.ts src/__tests__/answerModeToggle.test.tsx
git commit -m "feat(toggle): add 'Liste' as a fourth play mode option"
```

---

## Task 3: HomeScreen — Start label and summary for list mode

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/i18n/de.ts`
- Test: `src/__tests__/homeScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Append a new `describe` block to `src/__tests__/homeScreen.test.tsx`:

```ts
describe('HomeScreen — list mode', () => {
  test('shows the list summary and start label when answerMode is list', () => {
    render(
      <HomeScreen
        settings={{ ...DEFAULT_SETTINGS, answerMode: 'list' }}
        onChange={noop}
        onStart={noop}
        onOpenSettings={noop}
        onOpenProgress={noop}
        onOpenInfo={noop}
      />,
    );

    expect(screen.getByText(/opérations à réviser/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Voir la liste/ }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run src/__tests__/homeScreen.test.tsx`
Expected: FAIL — no "Voir la liste" button / no "opérations à réviser" text.

- [ ] **Step 3: Add i18n keys to all three dictionaries**

In `src/i18n/fr.ts`, after the `'home.startTraining'` line:

```ts
  'home.startList': 'Voir la liste',
  'home.summaryList': '{count} opérations à réviser',
```

In `src/i18n/en.ts`, after its `'home.startTraining'` line:

```ts
  'home.startList': 'View the list',
  'home.summaryList': '{count} operations to review',
```

In `src/i18n/de.ts`, after its `'home.startTraining'` line:

```ts
  'home.startList': 'Liste ansehen',
  'home.summaryList': '{count} Aufgaben zum Üben',
```

- [ ] **Step 4: Add the `isList` branch in `HomeScreen.tsx`**

After the `isTraining` line (around line 31), add:

```tsx
  const isList = (settings.answerMode ?? 'screen') === 'list';
```

Replace the summary paragraph (lines 88-92) with a three-way branch:

```tsx
      <p className="home__info">
        {isList
          ? t('home.summaryList', { count: settings.questionCount })
          : isTraining
            ? t('home.summaryTraining', { count: settings.questionCount })
            : t('home.summary', { count: settings.questionCount, seconds })}
      </p>
```

Replace the Start button label expression (line 99) with:

```tsx
        {isList
          ? `📋 ${t('home.startList')}`
          : isTraining
            ? `🎓 ${t('home.startTraining')}`
            : `🚀 ${t('home.start')}`}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- --run src/__tests__/homeScreen.test.tsx src/__tests__/i18n.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx src/i18n/fr.ts src/i18n/en.ts src/i18n/de.ts src/__tests__/homeScreen.test.tsx
git commit -m "feat(home): start label and summary for list mode"
```

---

## Task 4: ExerciseListScreen component

**Files:**
- Create: `src/screens/ExerciseListScreen.tsx`
- Create: `src/screens/ExerciseListScreen.css`
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`, `src/i18n/de.ts`
- Test: `src/__tests__/exerciseListScreen.test.tsx`

Test fixture note: `selectedTables: [7]`, `mode: 'mul'`, `questionCount: 11` makes the sample the entire `7 ×` pool (`7×2 … 7×12`), so content is deterministic regardless of shuffle order — every answer 14…84 is present, and there are exactly 11 rows.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/exerciseListScreen.test.tsx`:

```tsx
import { describe, expect, test, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { ExerciseListScreen } from '../screens/ExerciseListScreen';
import { DEFAULT_SETTINGS } from '../domain/session';
import { renderWithLanguage } from './renderWithLanguage';

const listSettings = {
  ...DEFAULT_SETTINGS,
  selectedTables: [7],
  mode: 'mul' as const,
  questionCount: 11,
};

const renderScreen = (onCancel = () => {}) =>
  renderWithLanguage(
    <ExerciseListScreen settings={listSettings} onCancel={onCancel} />,
  );

describe('ExerciseListScreen', () => {
  test('renders one hidden row per question', () => {
    renderScreen();
    expect(
      screen.getAllByRole('button', { name: 'montrer la réponse' }),
    ).toHaveLength(11);
    // answers hidden: the product 56 (7×8) is not shown yet
    expect(screen.queryByText('56')).not.toBeInTheDocument();
  });

  test('the global button reveals every answer then hides them again', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /^montrer les réponses$/i }));
    expect(screen.getByText('56')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'cacher la réponse' }),
    ).toHaveLength(11);

    fireEvent.click(screen.getByRole('button', { name: /^cacher les réponses$/i }));
    expect(screen.queryByText('56')).not.toBeInTheDocument();
  });

  test('tapping one row reveals only that answer', () => {
    renderScreen();
    const rows = screen.getAllByRole('button', { name: 'montrer la réponse' });
    fireEvent.click(rows[0]);
    expect(
      screen.getAllByRole('button', { name: 'cacher la réponse' }),
    ).toHaveLength(1);
  });

  test('"Nouvelle liste" re-renders rows and resets reveal state', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /^montrer les réponses$/i }));
    fireEvent.click(screen.getByRole('button', { name: /nouvelle liste/i }));
    expect(
      screen.getAllByRole('button', { name: 'montrer la réponse' }),
    ).toHaveLength(11);
  });

  test('the back button calls onCancel', () => {
    const onCancel = vi.fn();
    renderScreen(onCancel);
    fireEvent.click(screen.getByRole('button', { name: /retour à l'accueil/i }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run src/__tests__/exerciseListScreen.test.tsx`
Expected: FAIL — cannot find module `../screens/ExerciseListScreen`.

- [ ] **Step 3: Add the i18n keys to all three dictionaries**

In `src/i18n/fr.ts`, after the `'answerMode.list'` line (or anywhere in the object), add a `list.*` group:

```ts
  'list.title': "Liste d'exercices",
  'list.revealAll': 'Montrer les réponses',
  'list.hideAll': 'Cacher les réponses',
  'list.shuffle': 'Nouvelle liste',
  'list.revealRowAria': 'montrer la réponse',
  'list.hideRowAria': 'cacher la réponse',
```

In `src/i18n/en.ts`:

```ts
  'list.title': 'Exercise list',
  'list.revealAll': 'Show answers',
  'list.hideAll': 'Hide answers',
  'list.shuffle': 'New list',
  'list.revealRowAria': 'show the answer',
  'list.hideRowAria': 'hide the answer',
```

In `src/i18n/de.ts`:

```ts
  'list.title': 'Aufgabenliste',
  'list.revealAll': 'Antworten zeigen',
  'list.hideAll': 'Antworten verbergen',
  'list.shuffle': 'Neue Liste',
  'list.revealRowAria': 'Antwort zeigen',
  'list.hideRowAria': 'Antwort verbergen',
```

- [ ] **Step 4: Create the component**

Create `src/screens/ExerciseListScreen.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { generateQuestions, formatOperation } from '../domain/question';
import type { Question } from '../domain/question';
import type { Settings } from '../domain/session';
import { useI18n } from '../i18n/I18nContext';
import './ExerciseListScreen.css';

type Props = {
  settings: Settings;
  /** Return to the caller (home). The list never completes a session. */
  onCancel: () => void;
};

export const ExerciseListScreen = ({ settings, onCancel }: Props) => {
  const { t } = useI18n();
  const [seed, setSeed] = useState(0);
  const questions = useMemo<Question[]>(
    () => generateQuestions(settings),
    [settings, seed],
  );
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const allRevealed = questions.length > 0 && revealed.size === questions.length;

  const toggleAll = () =>
    setRevealed(allRevealed ? new Set() : new Set(questions.map((_, i) => i)));

  const toggleOne = (i: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const reshuffle = () => {
    setRevealed(new Set());
    setSeed((s) => s + 1);
  };

  return (
    <div className="exercise-list">
      <header className="exercise-list__header">
        <h2>{t('list.title')}</h2>
        <button
          type="button"
          className="exercise-list__back-btn"
          onClick={onCancel}
          aria-label={t('common.backToHomeAria')}
        >
          🏠
        </button>
      </header>

      <div className="exercise-list__controls">
        <button
          type="button"
          className="exercise-list__control"
          onClick={toggleAll}
        >
          {allRevealed ? t('list.hideAll') : t('list.revealAll')}
        </button>
        <button
          type="button"
          className="exercise-list__control exercise-list__control--ghost"
          onClick={reshuffle}
        >
          {t('list.shuffle')}
        </button>
      </div>

      <ul className="exercise-list__rows">
        {questions.map((q, i) => {
          const isRevealed = revealed.has(i);
          return (
            <li key={i} className="exercise-list__item">
              <button
                type="button"
                className="exercise-list__row"
                onClick={() => toggleOne(i)}
                aria-label={isRevealed ? t('list.hideRowAria') : t('list.revealRowAria')}
              >
                <span className="exercise-list__operation">
                  {formatOperation(q)} =
                </span>
                <span
                  className={`exercise-list__answer${
                    isRevealed ? '' : ' exercise-list__answer--hidden'
                  }`}
                >
                  {isRevealed ? q.expected : '?'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
```

- [ ] **Step 5: Create the stylesheet**

Create `src/screens/ExerciseListScreen.css` (mirrors `InfoScreen.css` idioms):

```css
.exercise-list {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exercise-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.exercise-list__header h2 {
  margin: 0;
  font-size: 1.6rem;
  color: var(--color-fg);
}

.exercise-list__back-btn {
  width: 3rem;
  height: 3rem;
  font-size: 1.4rem;
  border: 2px solid var(--color-chip-border);
  background: var(--color-card-bg);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.exercise-list__back-btn:hover {
  transform: translateY(-2px);
}

.exercise-list__controls {
  display: flex;
  gap: 0.6rem;
}

.exercise-list__control {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  padding: 0.8rem 0.6rem;
  border: none;
  border-radius: 14px;
  background: var(--color-accent);
  color: white;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.exercise-list__control:hover {
  transform: translateY(-1px);
}

.exercise-list__control--ghost {
  background: var(--color-card-bg);
  color: var(--color-fg);
  border: 2px solid var(--color-chip-border);
}

.exercise-list__rows {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.exercise-list__row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.85rem 1.1rem;
  border: 2px solid var(--color-chip-border);
  border-radius: 14px;
  background: var(--color-card-bg);
  color: var(--color-fg);
  font-size: 1.3rem;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.exercise-list__row:hover {
  transform: translateY(-1px);
}

.exercise-list__operation {
  font-variant-numeric: tabular-nums;
}

.exercise-list__answer {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
  min-width: 3ch;
  text-align: right;
}

.exercise-list__answer--hidden {
  color: var(--color-fg-muted);
}

@media (prefers-color-scheme: dark) {
  .exercise-list__row {
    box-shadow: none;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test -- --run src/__tests__/exerciseListScreen.test.tsx src/__tests__/i18n.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/screens/ExerciseListScreen.tsx src/screens/ExerciseListScreen.css src/i18n/fr.ts src/i18n/en.ts src/i18n/de.ts src/__tests__/exerciseListScreen.test.tsx
git commit -m "feat(list): add ExerciseListScreen with reveal and reshuffle"
```

---

## Task 5: Route list mode in App

**Files:**
- Modify: `src/App.tsx`
- Test: `src/__tests__/appExerciseListFlow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/appExerciseListFlow.test.tsx`:

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
      questionCount: 11,
      selectedTables: [7],
      mode: 'mul',
      partialCreditFactor: 0.5,
      answerMode: 'list',
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('App — exercise list flow', () => {
  test('starting in list mode shows the list and records no session', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Voir la liste/ }));

    expect(
      screen.getAllByRole('button', { name: 'montrer la réponse' }),
    ).toHaveLength(11);
    expect(loadHistory()).toHaveLength(0);
    expect(loadTrainingHistory()).toHaveLength(0);
  });

  test('the list back button returns home', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Voir la liste/ }));
    fireEvent.click(screen.getByRole('button', { name: /retour à l'accueil/i }));
    expect(screen.getByRole('button', { name: /Voir la liste/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --run src/__tests__/appExerciseListFlow.test.tsx`
Expected: FAIL — after clicking "Voir la liste" no rows appear (list mode falls through to `SessionScreen`).

- [ ] **Step 3: Wire the route in `App.tsx`**

Add the import near the other screen imports (after line 5):

```tsx
import { ExerciseListScreen } from './screens/ExerciseListScreen';
```

In the `screen === 'session'` block, add a `list` branch at the front of the ternary chain (before the `paper` check on line 62):

```tsx
        {screen === 'session' &&
          (settings.answerMode === 'list' ? (
            <ExerciseListScreen
              settings={settings}
              onCancel={() => setScreen('home')}
            />
          ) : settings.answerMode === 'paper' ? (
            <PaperSessionScreen
              settings={settings}
              onComplete={handleSessionComplete}
              onCancel={() => setScreen('home')}
            />
          ) : settings.answerMode === 'training' ? (
            <TrainingScreen
              settings={settings}
              onComplete={handleSessionComplete}
              onCancel={() => setScreen('home')}
            />
          ) : (
            <SessionScreen
              settings={settings}
              onComplete={handleSessionComplete}
              onCancel={() => setScreen('home')}
            />
          ))}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- --run src/__tests__/appExerciseListFlow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/__tests__/appExerciseListFlow.test.tsx
git commit -m "feat(app): route list mode to ExerciseListScreen"
```

---

## Task 6: Release bookkeeping (version 0.8.0)

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: `src/domain/releaseNotes.ts`
- Guard test: `src/__tests__/releaseNotes.test.ts` (runs as part of the suite)

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.7.1"` to `"version": "0.8.0"`.

- [ ] **Step 2: Add the CHANGELOG entry**

In `CHANGELOG.md`, insert a new section directly below the `## [0.7.1] - 2026-06-14` block header line and above its content — i.e. add at the top of the version sections:

```markdown
## [0.8.0] - 2026-06-14

### Added
- **"Liste" play mode**: a fourth option in the "How to play" toggle that shows
  a scrollable list of `questionCount` operations using the same content
  generation as the drills. Answers are hidden by default; a button reveals or
  hides them all at once, tapping a single row flips just that answer, and a
  "Nouvelle liste" button reshuffles in place. The list is a view — it records
  no session. New `ExerciseListScreen`; `formatOperation` extracted from
  `QuestionCard` for shared operation rendering. New i18n keys (`answerMode.list`,
  `home.startList`, `home.summaryList`, `list.*`) in fr/de/en.
```

- [ ] **Step 3: Prepend the French release note**

In `src/domain/releaseNotes.ts`, add a new entry as the first element of the `releaseNotes` array (before the `0.7.1` entry):

```ts
  {
    version: '0.8.0',
    date: '2026-06-14',
    changes: [
      'Nouveau mode « Liste » : fais défiler une liste d’opérations avec leurs réponses cachées. Montre-les toutes d’un coup, ou tape une ligne pour voir une seule réponse. Le bouton « Nouvelle liste » en génère d’autres.',
    ],
  },
```

- [ ] **Step 4: Run the drift guard**

Run: `pnpm test -- --run src/__tests__/releaseNotes.test.ts`
Expected: PASS (`releaseNotes[0].version === '0.8.0'` matches `package.json`; `CHANGELOG.md` has a `## [0.8.0]` section).

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md src/domain/releaseNotes.ts
git commit -m "chore(release): 0.8.0 — Liste play mode"
```

---

## Task 7: Full verification, push, and PR

- [ ] **Step 1: Run the entire test suite**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 2: Typecheck + production build**

Run: `pnpm build`
Expected: `tsc --noEmit` clean, Vite build succeeds.

- [ ] **Step 3: Push the branch**

```bash
git push -u origin feat/exercise-list-mode
```

- [ ] **Step 4: Open the PR**

```bash
gh pr create --title "feat: Liste play mode (scrollable exercise list)" --body "$(cat <<'EOF'
## Summary
Adds a fourth play mode, **Liste**, alongside screen / paper / training. It shows one scrollable list of `questionCount` operations (same content generation as the drills) with answers hidden by default.

- Global **Montrer/Cacher les réponses** button reveals/hides all answers.
- Tapping a single row flips just that answer (quiz one at a time).
- **Nouvelle liste** reshuffles a fresh sample in place.
- The list is a pure view — it records no session.

`formatOperation` was extracted from `QuestionCard` so the card and the list row share one operation-rendering source. New i18n keys added to fr/de/en. Version bumped to 0.8.0 with CHANGELOG + release-notes entries (drift guard green).

Spec: `docs/superpowers/specs/2026-06-14-exercise-list-mode-design.md`
Plan: `docs/superpowers/plans/2026-06-14-exercise-list-mode.md`

## Test plan
- `pnpm test` — full suite green (new `exerciseListScreen` + `appExerciseListFlow` tests, extended toggle/home tests, i18n + releaseNotes drift guards).
- `pnpm build` — typecheck + production build clean.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Report the PR URL** to the user.

---

## Self-Review

**Spec coverage:**
- 4th mode in toggle → Task 2. ✓
- Launch via Start path + routing → Tasks 3, 5. ✓
- Reuse `generateQuestions` (questionCount sample) → Task 4 (`generateQuestions(settings)`). ✓
- `formatOperation` extraction → Task 1. ✓
- `AnswerMode` union + "never recorded" doc → Task 2. ✓
- Hidden-by-default, global reveal/hide, per-item reveal → Task 4 tests + component. ✓
- "Nouvelle liste" reshuffle → Task 4. ✓
- New screen mirrors `InfoScreen` (🏠 header + panels) → Task 4 markup/CSS. ✓
- i18n keys in all three languages → Tasks 2, 3, 4. ✓
- Release bookkeeping (3-in-sync) → Task 6. ✓
- Tests enumerated in spec → Tasks 1–5. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `formatOperation(q: Question): string` (Task 1) is imported and called in Task 4. `AnswerMode` includes `'list'` (Task 2) before it is referenced in HomeScreen (Task 3) and App (Task 5). `ExerciseListScreen` prop shape `{ settings, onCancel }` (Task 4) matches the call site in App (Task 5). i18n key names match between dictionary additions and component usages (`list.title`, `list.revealAll`, `list.hideAll`, `list.shuffle`, `list.revealRowAria`, `list.hideRowAria`, `home.startList`, `home.summaryList`, `answerMode.list`). ✓

**Layout gotcha covered:** `.mode-toggle` is hard-coded to 3 columns; Task 2 adds `.mode-toggle--four` (2×2) and applies it, preventing a wrapped 4th cell. ✓
