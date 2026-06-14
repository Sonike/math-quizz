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
