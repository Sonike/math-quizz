import { MULTIPLIERS } from './tables';
import type { Settings } from './session';

export type Operator = 'mul' | 'div';
export type Mode = 'mul' | 'div' | 'mix';

export type Question = {
  a: number;
  b: number;
  op: Operator;
  expected: number;
};

const fisherYates = <T>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const buildQuestion = (a: number, b: number, op: Operator): Question => ({
  a,
  b,
  op,
  expected: op === 'mul' ? a * b : b,
});

const pickOp = (mode: Mode): Operator =>
  mode === 'mix' ? (Math.random() < 0.5 ? 'mul' : 'div') : mode;

export const generateQuestions = (settings: Settings): Question[] => {
  if (settings.selectedTables.length === 0) {
    throw new Error('selectedTables must not be empty');
  }
  if (settings.questionCount <= 0) {
    throw new Error('questionCount must be positive');
  }

  const pool: Question[] = [];
  for (const a of settings.selectedTables) {
    for (const b of MULTIPLIERS) {
      pool.push(buildQuestion(a, b, pickOp(settings.mode)));
    }
  }

  const shuffled = fisherYates(pool);
  if (shuffled.length >= settings.questionCount) {
    return shuffled.slice(0, settings.questionCount);
  }

  const extras: Question[] = [];
  while (shuffled.length + extras.length < settings.questionCount) {
    const src = pool[Math.floor(Math.random() * pool.length)];
    extras.push(buildQuestion(src.a, src.b, pickOp(settings.mode)));
  }
  return fisherYates([...shuffled, ...extras]);
};
