import type { Question, Mode } from './question';

export type AnswerRecord = {
  question: Question;
  given: number | null;
  elapsedMs: number;
};

export type SessionResult = {
  startedAt: string;
  durationPerQuestionMs: number;
  partialCreditFactor: number;
  questionCount: number;
  selectedTables: number[];
  mode: Mode;
  answers: AnswerRecord[];
};

export type Settings = {
  /** Target answer time. Faster than this earns full credit. */
  durationPerQuestionMs: number;
  questionCount: number;
  selectedTables: number[];
  mode: Mode;
  /** Credit awarded for a correct answer slower than the target. */
  partialCreditFactor: number;
};

export const DEFAULT_SETTINGS: Settings = {
  durationPerQuestionMs: 4000,
  questionCount: 22,
  selectedTables: [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15],
  mode: 'mix',
  partialCreditFactor: 0.5,
};
