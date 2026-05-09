import type { Question, Mode } from './question';

export type AnswerRecord = {
  question: Question;
  given: number | null;
  elapsedMs: number;
};

export type SessionResult = {
  startedAt: string;
  durationPerQuestionMs: number;
  questionCount: number;
  selectedTables: number[];
  mode: Mode;
  answers: AnswerRecord[];
};

export type Settings = {
  durationPerQuestionMs: number;
  questionCount: number;
  selectedTables: number[];
  mode: Mode;
};

export const DEFAULT_SETTINGS: Settings = {
  durationPerQuestionMs: 4000,
  questionCount: 22,
  selectedTables: [2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 15],
  mode: 'mix',
};
