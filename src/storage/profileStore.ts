import { DEFAULT_SETTINGS } from '../domain/session';
import type { Settings, SessionResult } from '../domain/session';
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
  trainingHistory: `${PREFIX}training-history`,
} as const;

/**
 * Abandoned in v0.11.0. It held lifetime per-pair counters that no screen ever
 * read: the progress screen recomputes from `history`, and now weights recent
 * sessions more heavily — something a timestamp-less running total cannot do.
 * Removed whenever we rewrite the profile, so nothing stale is left behind.
 */
const LEGACY_ERRORS_KEY = `${PREFIX}errors`;

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

export const recordSession = (session: SessionResult): void => {
  appendSession(session);
};

export const loadTrainingHistory = (): SessionResult[] =>
  safeParse(localStorage.getItem(STORAGE_KEYS.trainingHistory), [] as SessionResult[]);

export const recordTrainingSession = (session: SessionResult): void => {
  const next = [...loadTrainingHistory(), session].slice(-HISTORY_LIMIT);
  localStorage.setItem(STORAGE_KEYS.trainingHistory, JSON.stringify(next));
};

/**
 * Everything this profile owns, wrapped in the published backup envelope.
 * Both histories carry every per-pair statistic the app derives, so there is
 * nothing else to export.
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
    },
    { appVersion, exportedAt: now.toISOString(), profile: PROFILE_ID },
  );

/**
 * Overwrites the profile with a validated backup — a restore, not a merge.
 * Merging is deliberately out of scope: sessions carry no id, so two files
 * recorded on two devices cannot be reconciled without guessing from
 * `startedAt`. Throws if storage refuses the write (quota, private mode).
 */
export const importProfile = (backup: Backup): void => {
  const { settings, history, trainingHistory } = backup.data;
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
  // A v1 file may carry the deprecated `errors` section; it is validated on
  // read and then dropped, since nothing derives statistics from it any more.
  localStorage.removeItem(LEGACY_ERRORS_KEY);
};

export const clearAll = (): void => {
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.trainingHistory);
  localStorage.removeItem(LEGACY_ERRORS_KEY);
};
