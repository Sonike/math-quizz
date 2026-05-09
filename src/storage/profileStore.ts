import { DEFAULT_SETTINGS } from '../domain/session';
import type { Settings, SessionResult } from '../domain/session';
import { mergeIntoErrors } from '../domain/stats';
import type { ErrorStats } from '../domain/stats';

const PREFIX = 'mathquizz:profile:default:';

export const STORAGE_KEYS = {
  settings: `${PREFIX}settings`,
  history: `${PREFIX}history`,
  errors: `${PREFIX}errors`,
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

export const loadSettings = (): Settings =>
  safeParse(localStorage.getItem(STORAGE_KEYS.settings), DEFAULT_SETTINGS);

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

export const clearAll = (): void => {
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.errors);
};
