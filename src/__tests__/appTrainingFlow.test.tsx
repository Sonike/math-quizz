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
