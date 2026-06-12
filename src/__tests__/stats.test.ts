import { describe, expect, test } from 'vitest';
import { canonicalKey, aggregateErrors, mergeIntoErrors } from '../domain/stats';
import type { SessionResult } from '../domain/session';
import type { Question } from '../domain/question';

const mkSession = (answers: SessionResult['answers']): SessionResult => ({
  startedAt: new Date('2026-05-09T08:00:00Z').toISOString(),
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
  questionCount: answers.length,
  selectedTables: [7, 8],
  mode: 'mul',
  answers,
});

const mkQ = (a: number, b: number, op: 'mul' | 'div' = 'mul'): Question => ({
  a,
  b,
  op,
  expected: op === 'mul' ? a * b : b,
});

describe('canonicalKey', () => {
  test('same key for (a,b) and (b,a)', () => {
    expect(canonicalKey(7, 8)).toBe(canonicalKey(8, 7));
  });

  test('format is "${min}x${max}"', () => {
    expect(canonicalKey(8, 7)).toBe('7x8');
    expect(canonicalKey(11, 3)).toBe('3x11');
  });

  test('reflexive case', () => {
    expect(canonicalKey(6, 6)).toBe('6x6');
  });
});

describe('aggregateErrors / mergeIntoErrors', () => {
  test('counts attempts, errors and timeouts per canonical key', () => {
    const session = mkSession([
      { question: mkQ(7, 8), given: 56, elapsedMs: 1200 }, // correct
      { question: mkQ(8, 7), given: 54, elapsedMs: 1500 }, // wrong (same key)
      { question: mkQ(9, 6), given: null, elapsedMs: 4000 }, // timeout
      { question: mkQ(7, 8), given: 49, elapsedMs: 1800 }, // wrong
    ]);
    const stats = aggregateErrors([session]);
    expect(stats['7x8']).toEqual({ attempts: 3, errors: 2, timeouts: 0 });
    expect(stats['6x9']).toEqual({ attempts: 1, errors: 0, timeouts: 1 });
  });

  test('division questions are aggregated under same canonical key as multiplication', () => {
    const session = mkSession([
      { question: mkQ(7, 8, 'mul'), given: 56, elapsedMs: 1000 },
      { question: mkQ(7, 8, 'div'), given: 9, elapsedMs: 1000 }, // wrong, expected 8
    ]);
    const stats = aggregateErrors([session]);
    expect(stats['7x8'].attempts).toBe(2);
    expect(stats['7x8'].errors).toBe(1);
  });

  test('mergeIntoErrors accumulates onto an existing ErrorStats', () => {
    const initial = { '7x8': { attempts: 5, errors: 1, timeouts: 0 } };
    const session = mkSession([
      { question: mkQ(7, 8), given: 56, elapsedMs: 1200 },
      { question: mkQ(7, 8), given: null, elapsedMs: 4000 },
    ]);
    const merged = mergeIntoErrors(initial, session);
    expect(merged['7x8']).toEqual({ attempts: 7, errors: 1, timeouts: 1 });
  });

  test('aggregateErrors of empty history is empty', () => {
    expect(aggregateErrors([])).toEqual({});
  });

  test('self-marked records count as attempts/errors, never timeouts', () => {
    const session = mkSession([
      { question: mkQ(7, 8), given: null, elapsedMs: 0, selfMarkedCorrect: true },
      { question: mkQ(7, 8), given: null, elapsedMs: 0, selfMarkedCorrect: false },
    ]);
    const stats = aggregateErrors([session]);
    expect(stats['7x8']).toEqual({ attempts: 2, errors: 1, timeouts: 0 });
  });
});
