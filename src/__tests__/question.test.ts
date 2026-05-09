import { describe, expect, test } from 'vitest';
import { generateQuestions } from '../domain/question';
import { MULTIPLIERS } from '../domain/tables';
import type { Settings } from '../domain/session';

const baseSettings = (overrides: Partial<Settings> = {}): Settings => ({
  durationPerQuestionMs: 4000,
  questionCount: 22,
  selectedTables: [7],
  mode: 'mul',
  partialCreditFactor: 0.5,
  ...overrides,
});

describe('generateQuestions', () => {
  test('returns exactly questionCount questions', () => {
    const questions = generateQuestions(baseSettings({ questionCount: 22 }));
    expect(questions).toHaveLength(22);
  });

  test('all questions have a in selectedTables and b in MULTIPLIERS', () => {
    const settings = baseSettings({
      selectedTables: [7, 8],
      questionCount: 50,
    });
    const questions = generateQuestions(settings);
    for (const q of questions) {
      expect(settings.selectedTables).toContain(q.a);
      expect(MULTIPLIERS).toContain(q.b as (typeof MULTIPLIERS)[number]);
    }
  });

  test('mode "mul": every question is a multiplication with expected = a*b', () => {
    const questions = generateQuestions(
      baseSettings({ mode: 'mul', selectedTables: [7, 8], questionCount: 30 }),
    );
    for (const q of questions) {
      expect(q.op).toBe('mul');
      expect(q.expected).toBe(q.a * q.b);
    }
  });

  test('mode "div": every question is a division with expected = b', () => {
    const questions = generateQuestions(
      baseSettings({ mode: 'div', selectedTables: [7, 8], questionCount: 30 }),
    );
    for (const q of questions) {
      expect(q.op).toBe('div');
      expect(q.expected).toBe(q.b);
    }
  });

  test('mode "mix": both operators appear on a large sample', () => {
    const questions = generateQuestions(
      baseSettings({ mode: 'mix', selectedTables: [7, 8], questionCount: 200 }),
    );
    const ops = new Set(questions.map((q) => q.op));
    expect(ops.has('mul')).toBe(true);
    expect(ops.has('div')).toBe(true);
  });

  test('pool smaller than questionCount: returns questionCount questions with repetitions', () => {
    // 1 selected table * 12 multipliers = 12 distinct couples
    const questions = generateQuestions(
      baseSettings({ selectedTables: [7], questionCount: 30 }),
    );
    expect(questions).toHaveLength(30);
    // At least one duplicated (a,b,op) signature must exist
    const sigs = questions.map((q) => `${q.a}-${q.b}-${q.op}`);
    expect(new Set(sigs).size).toBeLessThan(sigs.length);
  });

  test('throws when selectedTables is empty', () => {
    expect(() =>
      generateQuestions(baseSettings({ selectedTables: [] })),
    ).toThrow();
  });

  test('throws when questionCount <= 0', () => {
    expect(() =>
      generateQuestions(baseSettings({ questionCount: 0 })),
    ).toThrow();
  });
});
