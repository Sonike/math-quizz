import type { AnswerRecord, Settings } from './session';

type ScoringSettings = Pick<Settings, 'durationPerQuestionMs' | 'partialCreditFactor'>;

export const pointsFor = (record: AnswerRecord, settings: ScoringSettings): number => {
  if (record.given === null) return 0;
  if (record.given !== record.question.expected) return 0;
  return record.elapsedMs <= settings.durationPerQuestionMs
    ? 1
    : settings.partialCreditFactor;
};

export const totalScore = (
  answers: AnswerRecord[],
  settings: ScoringSettings,
): { points: number; max: number } => ({
  points: answers.reduce((sum, a) => sum + pointsFor(a, settings), 0),
  max: answers.length,
});
