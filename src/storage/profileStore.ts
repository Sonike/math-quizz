import { DEFAULT_SETTINGS } from '../domain/session';
import type { Settings, SessionResult } from '../domain/session';
import { mergeIntoErrors } from '../domain/stats';
import type { ErrorStats } from '../domain/stats';
import { createBackup } from '../domain/backup';
import type { Backup } from '../domain/backup';

/**
 * The one profile this build stores. Roadmap item 4 (multiple named profiles)
 * turns this constant into a parameter — everything below already reads the
 * keys through it.
 */
export const PROFILE_ID = 'default';

const PREFIX = `mathquizz:profile:${PROFILE_ID}:`;

export const STORAGE_KEYS = {
  settings: `${PREFIX}settings`,
  history: `${PREFIX}history`,
  errors: `${PREFIX}errors`,
  trainingHistory: `${PREFIX}training-history`,
} as const;

export const HISTORY_LIMIT = 50;

const safeParse = <T>(raw: string | null, fallback: T): T => {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const loadSettings = (): Settings => {
  const stored = safeParse<Partial<Settings>>(
    localStorage.getItem(STORAGE_KEYS.settings),
    {},
  );
  return { ...DEFAULT_SETTINGS, ...stored };
};

export const saveSettings = (settings: Settings): void => {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
};

export const loadHistory = (): SessionResult[] =>
  safeParse(localStorage.getItem(STORAGE_KEYS.history), [] as SessionResult[]);

export const appendSession = (session: SessionResult): void => {
  const next = [...loadHistory(), session].slice(-HISTORY_LIMIT);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(next));
};

export const loadErrors = (): ErrorStats =>
  safeParse(localStorage.getItem(STORAGE_KEYS.errors), {} as ErrorStats);

export const saveErrors = (stats: ErrorStats): void => {
  localStorage.setItem(STORAGE_KEYS.errors, JSON.stringify(stats));
};

export const recordSession = (session: SessionResult): void => {
  appendSession(session);
  saveErrors(mergeIntoErrors(loadErrors(), session));
};

export const loadTrainingHistory = (): SessionResult[] =>
  safeParse(localStorage.getItem(STORAGE_KEYS.trainingHistory), [] as SessionResult[]);

export const recordTrainingSession = (session: SessionResult): void => {
  const next = [...loadTrainingHistory(), session].slice(-HISTORY_LIMIT);
  localStorage.setItem(STORAGE_KEYS.trainingHistory, JSON.stringify(next));
};

/**
 * Everything this profile owns, wrapped in the published backup envelope.
 * `errors` has to travel on its own: `history` is capped at HISTORY_LIMIT while
 * the counters accumulate for the life of the profile, so they cannot be
 * recomputed from the sessions that survive. (ProgressScreen does recompute
 * from `history` today — these counters are the longer record it does not
 * currently use.)
 */
export const exportProfile = (
  appVersion: string,
  now: Date = new Date(),
): Backup =>
  createBackup(
    {
      settings: loadSettings(),
      history: loadHistory(),
      trainingHistory: loadTrainingHistory(),
      errors: loadErrors(),
    },
    { appVersion, exportedAt: now.toISOString(), profile: PROFILE_ID },
  );

/**
 * Overwrites the profile with a validated backup — a restore, not a merge.
 * Merging is deliberately out of scope: sessions carry no id, and merging
 * `errors` on top of merged `history` would double-count every pair the two
 * files share. Throws if storage refuses the write (quota, private mode).
 */
export const importProfile = (backup: Backup): void => {
  const { settings, history, trainingHistory, errors } = backup.data;
  saveSettings(settings);
  // A hand-written file may carry more than the app itself would keep.
  localStorage.setItem(
    STORAGE_KEYS.history,
    JSON.stringify(history.slice(-HISTORY_LIMIT)),
  );
  localStorage.setItem(
    STORAGE_KEYS.trainingHistory,
    JSON.stringify(trainingHistory.slice(-HISTORY_LIMIT)),
  );
  saveErrors(errors);
};

export const clearAll = (): void => {
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.errors);
  localStorage.removeItem(STORAGE_KEYS.trainingHistory);
};
