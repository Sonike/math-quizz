import type { SessionResult, AnswerRecord } from './session';

export type ErrorStat = {
  attempts: number;
  errors: number;
  timeouts: number;
};

export type ErrorStats = Record<string, ErrorStat>;

export const canonicalKey = (a: number, b: number): string => {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${lo}x${hi}`;
};

const classify = (record: AnswerRecord): keyof ErrorStat => {
  if (record.selfMarkedCorrect !== undefined) {
    return record.selfMarkedCorrect ? 'attempts' : 'errors';
  }
  if (record.given === null) return 'timeouts';
  if (record.given !== record.question.expected) return 'errors';
  return 'attempts';
};

const accumulate = (stats: ErrorStats, record: AnswerRecord): ErrorStats => {
  const key = canonicalKey(record.question.a, record.question.b);
  const prev = stats[key] ?? { attempts: 0, errors: 0, timeouts: 0 };
  const next = { ...prev, attempts: prev.attempts + 1 };
  const kind = classify(record);
  if (kind === 'errors') next.errors = prev.errors + 1;
  if (kind === 'timeouts') next.timeouts = prev.timeouts + 1;
  return { ...stats, [key]: next };
};

export const mergeIntoErrors = (
  existing: ErrorStats,
  session: SessionResult,
): ErrorStats =>
  session.answers.reduce<ErrorStats>(
    (acc, record) => accumulate(acc, record),
    existing,
  );

export const aggregateErrors = (history: SessionResult[]): ErrorStats =>
  history.reduce<ErrorStats>(
    (acc, session) => mergeIntoErrors(acc, session),
    {},
  );
