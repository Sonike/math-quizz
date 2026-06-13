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

  test('a wrong answer shows the correction; advancing moves to the next question', () => {
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
