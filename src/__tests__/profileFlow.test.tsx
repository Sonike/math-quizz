import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from '../App';
import { storageKeys, loadHistory } from '../storage/profileStore';
import { REGISTRY_KEY, loadRegistry } from '../storage/profileRegistry';
import { DEFAULT_SETTINGS } from '../domain/session';
import type { SessionResult } from '../domain/session';

const settingsFor = (questionCount: number) =>
  JSON.stringify({ ...DEFAULT_SETTINGS, questionCount, selectedTables: [7] });

const session = (minute: number): SessionResult => ({
  startedAt: new Date(Date.UTC(2026, 8, 5, 8, minute, 0)).toISOString(),
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
  questionCount: 1,
  selectedTables: [7],
  mode: 'mul',
  answerMode: 'screen',
  answers: [
    { question: { a: 7, b: 8, op: 'mul', expected: 56 }, given: 56, elapsedMs: 900 },
  ],
});

/** Two children on one tablet: the situation the whole feature exists for. */
const seedTwoProfiles = () => {
  localStorage.setItem(
    REGISTRY_KEY,
    JSON.stringify({
      active: 'default',
      profiles: [
        { id: 'default', name: 'Léa', createdAt: '' },
        { id: 'p2', name: 'Tom', createdAt: '2026-09-05T10:00:00.000Z' },
      ],
    }),
  );
  localStorage.setItem(storageKeys('default').settings, settingsFor(5));
  localStorage.setItem(storageKeys('p2').settings, settingsFor(9));
  localStorage.setItem(storageKeys('default').history, JSON.stringify([session(1)]));
  localStorage.setItem(storageKeys('p2').history, JSON.stringify([]));
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'performance',
    ],
  });
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('migrating a browser that predates profiles', () => {
  test('the existing data is adopted, not moved', () => {
    localStorage.setItem(storageKeys('default').settings, settingsFor(7));
    localStorage.setItem(storageKeys('default').history, JSON.stringify([session(1)]));

    render(<App />);

    // The settings on screen are the ones that were already stored.
    expect(screen.getByText(/7 questions/)).toBeInTheDocument();
    // And the keys they came from are untouched.
    expect(loadHistory('default')).toHaveLength(1);
  });

  test('the registry is written once, naming the pre-existing profile "default"', () => {
    render(<App />);
    expect(JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? 'null')).toEqual({
      active: 'default',
      profiles: [{ id: 'default', name: '', createdAt: '' }],
    });
  });

  test('a single profile shows no switcher — nothing to disambiguate yet', () => {
    render(<App />);
    expect(screen.queryByRole('radiogroup', { name: /choisir le profil/i })).toBeNull();
  });
});

describe('switching profile', () => {
  test('the switcher lists everyone once a second profile exists', () => {
    seedTwoProfiles();
    render(<App />);

    const group = screen.getByRole('radiogroup', { name: /choisir le profil/i });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Léa' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Tom' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('picking someone else swaps in their settings', () => {
    seedTwoProfiles();
    render(<App />);
    expect(screen.getByText(/5 questions/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Tom' }));

    expect(screen.getByText(/9 questions/)).toBeInTheDocument();
  });

  test("the switch does not write one child's settings into the other's key", () => {
    seedTwoProfiles();
    render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: 'Tom' }));

    const lea = JSON.parse(localStorage.getItem(storageKeys('default').settings) ?? '{}');
    const tom = JSON.parse(localStorage.getItem(storageKeys('p2').settings) ?? '{}');
    expect(lea.questionCount).toBe(5);
    expect(tom.questionCount).toBe(9);
  });

  test('the choice survives a reload', () => {
    seedTwoProfiles();
    const first = render(<App />);
    fireEvent.click(screen.getByRole('radio', { name: 'Tom' }));
    first.unmount();

    expect(loadRegistry().active).toBe('p2');
    render(<App />);
    expect(screen.getByRole('radio', { name: 'Tom' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('"Mes résultats" names whose results these are, and reads their history', () => {
    seedTwoProfiles();
    render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: 'Tom' }));
    fireEvent.click(screen.getByRole('button', { name: /mes résultats/i }));

    expect(screen.getByLabelText(/profil actif/i)).toHaveTextContent('Tom');
  });
});

describe('recording a session', () => {
  test('the result lands in the profile that was playing, and only there', () => {
    seedTwoProfiles();
    localStorage.setItem(storageKeys('p2').settings, settingsFor(1));
    render(<App />);

    fireEvent.click(screen.getByRole('radio', { name: 'Tom' }));
    fireEvent.click(screen.getByRole('button', { name: /Lancer/ }));
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: '6' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(loadHistory('p2')).toHaveLength(1);
    // Léa's history is exactly the one session it was seeded with.
    expect(loadHistory('default')).toHaveLength(1);
  });
});
