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
