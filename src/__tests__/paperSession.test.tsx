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
    // With Math.random stubbed to 0, fisherYates places 7×2 first.
    expect(screen.getByText(/7 × 2/)).toBeInTheDocument();
    // The answer slot shows "?" (no value entered in paper mode).
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
