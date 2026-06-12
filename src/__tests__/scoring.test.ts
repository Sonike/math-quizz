import { describe, expect, test } from 'vitest';
import { pointsFor, totalScore } from '../domain/scoring';
import type { AnswerRecord, Settings } from '../domain/session';
import type { Question } from '../domain/question';

const settings: Pick<Settings, 'durationPerQuestionMs' | 'partialCreditFactor'> = {
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
};

const mkQ = (a: number, b: number, op: 'mul' | 'div' = 'mul'): Question => ({
  a,
  b,
  op,
  expected: op === 'mul' ? a * b : b,
});

const rec = (
  q: Question,
  given: number | null,
  elapsedMs: number,
): AnswerRecord => ({ question: q, given, elapsedMs });

describe('pointsFor', () => {
  test('correct under target → 1 point', () => {
    expect(pointsFor(rec(mkQ(7, 8), 56, 1500), settings)).toBe(1);
  });

  test('correct exactly at target → 1 point (≤ is fast)', () => {
    expect(pointsFor(rec(mkQ(7, 8), 56, 4000), settings)).toBe(1);
  });

  test('correct over target → partialCreditFactor', () => {
    expect(pointsFor(rec(mkQ(7, 8), 56, 4500), settings)).toBe(0.5);
  });

  test('wrong → 0 regardless of time', () => {
    expect(pointsFor(rec(mkQ(7, 8), 49, 1000), settings)).toBe(0);
    expect(pointsFor(rec(mkQ(7, 8), 49, 8000), settings)).toBe(0);
  });

  test('null answer (legacy timeout records) → 0', () => {
    expect(pointsFor(rec(mkQ(7, 8), null, 4000), settings)).toBe(0);
  });

  test('partialCreditFactor is configurable', () => {
    expect(
      pointsFor(rec(mkQ(7, 8), 56, 6000), {
        durationPerQuestionMs: 4000,
        partialCreditFactor: 0.25,
      }),
    ).toBe(0.25);
  });
});

describe('totalScore', () => {
  test('aggregates points and reports max', () => {
    const answers: AnswerRecord[] = [
      rec(mkQ(7, 8), 56, 1000), // 1
      rec(mkQ(7, 8), 56, 5000), // 0.5
      rec(mkQ(7, 8), 49, 2000), // 0
      rec(mkQ(7, 8), 56, 4000), // 1 (exactly target)
    ];
    expect(totalScore(answers, settings)).toEqual({ points: 2.5, max: 4 });
  });

  test('empty answers → zero of zero', () => {
    expect(totalScore([], settings)).toEqual({ points: 0, max: 0 });
  });
});

describe('pointsFor — self-marked (pen-and-paper)', () => {
  const paper = (correct: boolean): AnswerRecord => ({
    question: mkQ(7, 8),
    given: null,
    elapsedMs: 0,
    selfMarkedCorrect: correct,
  });

  test('self-marked correct → 1 point (ignores given/elapsed)', () => {
    expect(pointsFor(paper(true), settings)).toBe(1);
  });

  test('self-marked wrong → 0 points', () => {
    expect(pointsFor(paper(false), settings)).toBe(0);
  });
});
