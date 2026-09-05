import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { storageKeys, loadHistory } from '../storage/profileStore';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  vi.spyOn(Math, 'random').mockReturnValue(0);
  localStorage.setItem(
    storageKeys('default').settings,
    JSON.stringify({
      durationPerQuestionMs: 4000,
      questionCount: 5,
      selectedTables: [7],
      mode: 'mul',
      partialCreditFactor: 0.5,
      answerMode: 'screen',
    }),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('App — cancelling a session', () => {
  test('Arrêter during a timed test returns home and records nothing', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Lancer/ }));
    expect(screen.getByText('Question 1 / 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Arrêter' }));

    // Back on the home screen, nothing persisted.
    expect(screen.getByRole('button', { name: /Lancer/ })).toBeInTheDocument();
    expect(loadHistory('default')).toHaveLength(0);
  });
});
