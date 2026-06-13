import { MULTIPLICANDS, MULTIPLIERS } from './tables';
import { aggregateErrors, canonicalKey } from './stats';
import { totalScore } from './scoring';
import type { SessionResult, AnswerRecord } from './session';

export type SessionScorePoint = {
  startedAt: string;
  total: number;
  correctRatio: number;
  creditRatio: number;
};

export type PairStat = {
  a: number;
  b: number;
  attempts: number;
  errors: number;
  timeouts: number;
  errorRate: number;
};

export type GridCell = {
  a: number;
  b: number;
  attempts: number;
  errorRate: number | null;
};

export type TrickiestOpts = { minAttempts?: number; limit?: number };

export const isCorrect = (record: AnswerRecord): boolean => {
  if (record.selfMarkedCorrect !== undefined) return record.selfMarkedCorrect;
  return record.given !== null && record.given === record.question.expected;
};

export const sessionScores = (
  history: SessionResult[],
): SessionScorePoint[] =>
  history.map((session) => {
    const total = session.answers.length;
    const correct = session.answers.filter(isCorrect).length;
    const { points, max } = totalScore(session.answers, {
      durationPerQuestionMs: session.durationPerQuestionMs,
      partialCreditFactor: session.partialCreditFactor,
    });
    return {
      startedAt: session.startedAt,
      total,
      correctRatio: total === 0 ? 0 : correct / total,
      creditRatio: max === 0 ? 0 : points / max,
    };
  });

export const trickiestPairs = (
  history: SessionResult[],
  opts: TrickiestOpts = {},
): PairStat[] => {
  const { minAttempts = 3, limit = 8 } = opts;
  return Object.entries(aggregateErrors(history))
    .map(([key, stat]) => {
      const [a, b] = key.split('x').map(Number);
      return {
        a,
        b,
        attempts: stat.attempts,
        errors: stat.errors,
        timeouts: stat.timeouts,
        errorRate: (stat.errors + stat.timeouts) / stat.attempts,
      };
    })
    .filter((row) => row.attempts >= minAttempts && row.errorRate > 0)
    .sort(
      (x, y) =>
        y.errorRate - x.errorRate ||
        y.attempts - x.attempts ||
        x.a - y.a ||
        x.b - y.b,
    )
    .slice(0, limit);
};

export const errorGrid = (history: SessionResult[]): GridCell[][] => {
  const stats = aggregateErrors(history);
  return MULTIPLICANDS.map((a) =>
    MULTIPLIERS.map((b) => {
      const stat = stats[canonicalKey(a, b)];
      if (!stat || stat.attempts === 0) {
        return { a, b, attempts: 0, errorRate: null };
      }
      return {
        a,
        b,
        attempts: stat.attempts,
        errorRate: (stat.errors + stat.timeouts) / stat.attempts,
      };
    }),
  );
};
