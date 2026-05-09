import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { SessionScreen } from '../screens/SessionScreen';
import type { Settings, SessionResult } from '../domain/session';

const settings: Settings = {
  durationPerQuestionMs: 4000,
  questionCount: 3,
  selectedTables: [7],
  mode: 'mul',
};

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
  // Deterministic question generation (mode=mul, expected = a*b)
  vi.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('SessionScreen flow', () => {
  test('keyboard input + Enter → records correct answer', async () => {
    let result: SessionResult | null = null;
    render(<SessionScreen settings={settings} onComplete={(r) => (result = r)} />);

    // First question, expected = 7 * b for some b
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: '6' });
    fireEvent.keyDown(window, { key: 'Enter' });

    fireEvent.keyDown(window, { key: '0' });
    fireEvent.keyDown(window, { key: 'Enter' });

    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(result).not.toBeNull();
    expect(result!.answers).toHaveLength(3);
    expect(result!.answers[0].given).toBe(56);
    expect(result!.answers[1].given).toBe(0);
    expect(result!.answers[2].given).toBe(1);
  });

  test('timeout records given=null', async () => {
    let result: SessionResult | null = null;
    render(<SessionScreen settings={settings} onComplete={(r) => (result = r)} />);

    // Let all 3 questions time out
    for (let i = 0; i < 3; i++) {
      advance(4100);
    }

    expect(result).not.toBeNull();
    expect(result!.answers.map((a) => a.given)).toEqual([null, null, null]);
  });

  test('NumPad clicks erase + validate work', () => {
    let result: SessionResult | null = null;
    render(<SessionScreen settings={settings} onComplete={(r) => (result = r)} />);

    fireEvent.click(screen.getByRole('button', { name: 'chiffre 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'chiffre 9' })); // 59
    fireEvent.click(screen.getByRole('button', { name: 'effacer' }));   // 5
    fireEvent.click(screen.getByRole('button', { name: 'chiffre 6' })); // 56
    fireEvent.click(screen.getByRole('button', { name: 'valider' }));

    fireEvent.keyDown(window, { key: '0' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(result!.answers[0].given).toBe(56);
  });

  test('empty answer + Enter is ignored (no advance)', () => {
    let result: SessionResult | null = null;
    render(<SessionScreen settings={settings} onComplete={(r) => (result = r)} />);

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.getByText('Question 1 / 3')).toBeInTheDocument();

    // Confirm we can still complete normally
    fireEvent.keyDown(window, { key: '1' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: '2' });
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: '3' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(result!.answers).toHaveLength(3);
  });
});
