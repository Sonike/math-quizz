import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import {
  loadSettings,
  saveSettings,
  loadHistory,
  appendSession,
  recordSession,
  loadTrainingHistory,
  recordTrainingSession,
  clearAll,
  exportProfile,
  importProfile,
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

const LEGACY_ERRORS_KEY = 'mathquizz:profile:default:errors';

describe('the abandoned lifetime error counters', () => {
  const legacy = () => ({ '7x8': { attempts: 9, errors: 3, timeouts: 1 } });

  test('recordSession appends to history and writes nothing else', () => {
    recordSession({
      ...mkSession(0),
      answers: [
        {
          question: { a: 7, b: 8, op: 'mul', expected: 56 },
          given: 54,
          elapsedMs: 1500,
        },
      ],
    });
    expect(loadHistory()).toHaveLength(1);
    expect(localStorage.getItem(LEGACY_ERRORS_KEY)).toBeNull();
  });

  test('clearAll removes a key left behind by an older version', () => {
    localStorage.setItem(LEGACY_ERRORS_KEY, JSON.stringify(legacy()));
    clearAll();
    expect(localStorage.getItem(LEGACY_ERRORS_KEY)).toBeNull();
  });

  test('importProfile drops it too, so nothing stale outlives a restore', () => {
    localStorage.setItem(LEGACY_ERRORS_KEY, JSON.stringify(legacy()));
    importProfile(exportProfile('0.11.0'));
    expect(localStorage.getItem(LEGACY_ERRORS_KEY)).toBeNull();
  });
});

describe('clearAll', () => {
  test('clears history and errors but preserves settings', () => {
    saveSettings({ ...DEFAULT_SETTINGS, questionCount: 11 });
    appendSession(mkSession(1));
    clearAll();
    expect(loadHistory()).toEqual([]);
    expect(loadSettings().questionCount).toBe(11);
  });
});

describe('training history', () => {
  test('loadTrainingHistory returns [] when empty', () => {
    expect(loadTrainingHistory()).toEqual([]);
  });

  test('recordTrainingSession appends to training history, not the test history', () => {
    const s: SessionResult = { ...mkSession(0), answerMode: 'training' };
    recordTrainingSession(s);
    expect(loadTrainingHistory()).toEqual([s]);
    expect(loadHistory()).toEqual([]);
  });

  test('training history is capped at HISTORY_LIMIT', () => {
    for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
      recordTrainingSession({ ...mkSession(i), answerMode: 'training' });
    }
    expect(loadTrainingHistory()).toHaveLength(HISTORY_LIMIT);
  });

  test('clearAll also wipes training history', () => {
    recordTrainingSession({ ...mkSession(1), answerMode: 'training' });
    clearAll();
    expect(loadTrainingHistory()).toEqual([]);
  });

  test('training history key uses the profile prefix', () => {
    expect(STORAGE_KEYS.trainingHistory).toBe(
      'mathquizz:profile:default:training-history',
    );
  });
});

it('defaults language to fr when absent from stored settings', () => {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ questionCount: 10 }));
  expect(loadSettings().language).toBe('fr');
});

describe('export / import', () => {
  it('exportProfile captures settings, both histories and the error stats', () => {
    saveSettings({ ...DEFAULT_SETTINGS, questionCount: 11 });
    recordSession(mkSession(1));
    recordTrainingSession({ ...mkSession(2), answerMode: 'training' });

    const backup = exportProfile('0.10.0', new Date('2026-09-05T10:11:12.000Z'));

    expect(backup.appVersion).toBe('0.10.0');
    expect(backup.exportedAt).toBe('2026-09-05T10:11:12.000Z');
    expect(backup.profile).toBe('default');
    expect(backup.data.settings.questionCount).toBe(11);
    expect(backup.data.history).toHaveLength(1);
    expect(backup.data.trainingHistory).toHaveLength(1);
  });

  it('exportProfile never emits the deprecated errors section', () => {
    localStorage.setItem(
      LEGACY_ERRORS_KEY,
      JSON.stringify({ '7x8': { attempts: 9, errors: 3, timeouts: 1 } }),
    );
    recordSession(mkSession(1));
    expect(exportProfile('0.11.0').data).not.toHaveProperty('errors');
  });

  it('exportProfile on a fresh profile yields defaults and empty collections', () => {
    const backup = exportProfile('0.10.0');
    expect(backup.data.settings).toEqual(DEFAULT_SETTINGS);
    expect(backup.data.history).toEqual([]);
    expect(backup.data.trainingHistory).toEqual([]);
  });

  it('importProfile replaces every section, it does not merge', () => {
    saveSettings({ ...DEFAULT_SETTINGS, questionCount: 11 });
    recordSession(mkSession(1));
    recordTrainingSession({ ...mkSession(2), answerMode: 'training' });

    const incoming = exportProfile('0.10.0');
    incoming.data.settings = { ...DEFAULT_SETTINGS, questionCount: 33 };
    incoming.data.history = [mkSession(9)];
    incoming.data.trainingHistory = [];

    importProfile(incoming);

    expect(loadSettings().questionCount).toBe(33);
    expect(loadHistory()).toEqual([mkSession(9)]);
    expect(loadTrainingHistory()).toEqual([]);
  });

  it('round-trips: export, wipe, import, and the profile is back', () => {
    saveSettings({ ...DEFAULT_SETTINGS, questionCount: 11 });
    recordSession(mkSession(1));
    const backup = exportProfile('0.10.0');

    clearAll();
    saveSettings(DEFAULT_SETTINGS);
    importProfile(backup);

    expect(loadSettings().questionCount).toBe(11);
    expect(loadHistory()).toEqual([mkSession(1)]);
  });

  it('trims an oversized incoming history to HISTORY_LIMIT, keeping the newest', () => {
    const backup = exportProfile('0.10.0');
    backup.data.history = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) => mkSession(i));
    backup.data.trainingHistory = Array.from({ length: HISTORY_LIMIT + 5 }, (_, i) => mkSession(i));

    importProfile(backup);

    const history = loadHistory();
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0].startedAt).toBe(mkSession(5).startedAt);
    expect(loadTrainingHistory()).toHaveLength(HISTORY_LIMIT);
  });
});
