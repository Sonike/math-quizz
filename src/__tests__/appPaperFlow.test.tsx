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
