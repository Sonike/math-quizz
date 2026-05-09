import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  loadSettings,
  saveSettings,
  loadHistory,
  appendSession,
  loadErrors,
  recordSession,
  clearAll,
  HISTORY_LIMIT,
  STORAGE_KEYS,
} from '../storage/profileStore';
import { DEFAULT_SETTINGS } from '../domain/session';
import type { SessionResult } from '../domain/session';

const mkSession = (offsetMinutes: number): SessionResult => ({
  startedAt: new Date(Date.UTC(2026, 4, 9, 8, offsetMinutes, 0)).toISOString(),
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
  questionCount: 1,
  selectedTables: [7],
  mode: 'mul',
  answers: [
    {
      question: { a: 7, b: 8, op: 'mul', expected: 56 },
      given: 56,
      elapsedMs: 1000,
    },
  ],
});

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe('settings', () => {
  test('loadSettings returns DEFAULT_SETTINGS when storage is empty', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  test('saveSettings then loadSettings returns the saved object', () => {
    const custom = { ...DEFAULT_SETTINGS, durationPerQuestionMs: 6000, questionCount: 10 };
    saveSettings(custom);
    expect(loadSettings()).toEqual(custom);
  });

  test('loadSettings falls back to defaults when storage is JSON-corrupt', () => {
    localStorage.setItem(STORAGE_KEYS.settings, '{not valid json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  test('storage key uses mathquizz:profile:default: prefix', () => {
    expect(STORAGE_KEYS.settings).toBe('mathquizz:profile:default:settings');
  });

  test('loadSettings fills missing fields from defaults (forward-compat)', () => {
    // Simulate a settings blob saved before partialCreditFactor existed
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({
        durationPerQuestionMs: 5000,
        questionCount: 10,
        selectedTables: [7],
        mode: 'mul',
      }),
    );
    const loaded = loadSettings();
    expect(loaded.durationPerQuestionMs).toBe(5000);
    expect(loaded.partialCreditFactor).toBe(DEFAULT_SETTINGS.partialCreditFactor);
  });
});

describe('history', () => {
  test('loadHistory returns [] when empty', () => {
    expect(loadHistory()).toEqual([]);
  });

  test('appendSession pushes and persists', () => {
    const s = mkSession(1);
    appendSession(s);
    expect(loadHistory()).toEqual([s]);
  });

  test('history is capped at HISTORY_LIMIT (oldest dropped)', () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      appendSession(mkSession(i));
    }
    const hist = loadHistory();
    expect(hist).toHaveLength(HISTORY_LIMIT);
    // Oldest (offset 0..4) must have been dropped
    expect(hist[0].startedAt).toBe(mkSession(5).startedAt);
    expect(hist[hist.length - 1].startedAt).toBe(mkSession(HISTORY_LIMIT + 4).startedAt);
  });

  test('loadHistory returns [] when storage is JSON-corrupt', () => {
    localStorage.setItem(STORAGE_KEYS.history, 'garbage');
    expect(loadHistory()).toEqual([]);
  });
});

describe('errors', () => {
  test('loadErrors returns {} when empty', () => {
    expect(loadErrors()).toEqual({});
  });

  test('recordSession appends to history AND merges error stats', () => {
    const session: SessionResult = {
      ...mkSession(0),
      answers: [
        {
          question: { a: 7, b: 8, op: 'mul', expected: 56 },
          given: 54,
          elapsedMs: 1500,
        },
        {
          question: { a: 9, b: 6, op: 'mul', expected: 54 },
          given: null,
          elapsedMs: 4000,
        },
      ],
    };
    recordSession(session);
    expect(loadHistory()).toHaveLength(1);
    const errors = loadErrors();
    expect(errors['7x8']).toEqual({ attempts: 1, errors: 1, timeouts: 0 });
    expect(errors['6x9']).toEqual({ attempts: 1, errors: 0, timeouts: 1 });
  });
});

describe('clearAll', () => {
  test('clears history and errors but preserves settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, questionCount: 11 });
    appendSession(mkSession(1));
    clearAll();
    expect(loadHistory()).toEqual([]);
    expect(loadErrors()).toEqual({});
    expect(loadSettings().questionCount).toBe(11);
  });
});
