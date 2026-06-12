import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { Countdown } from '../components/Countdown';

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
  });
});

afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('Countdown', () => {
  test('fires onElapsed exactly once after durationMs', () => {
    const onElapsed = vi.fn();
    render(<Countdown durationMs={4000} resetKey={0} onElapsed={onElapsed} />);

    advance(3999);
    expect(onElapsed).not.toHaveBeenCalled();

    advance(1);
    expect(onElapsed).toHaveBeenCalledTimes(1);

    advance(5000);
    expect(onElapsed).toHaveBeenCalledTimes(1);
  });

  test('changing resetKey restarts the countdown', () => {
    const onElapsed = vi.fn();
    const { rerender } = render(
      <Countdown durationMs={4000} resetKey={0} onElapsed={onElapsed} />,
    );
    advance(4000);
    expect(onElapsed).toHaveBeenCalledTimes(1);

    rerender(<Countdown durationMs={4000} resetKey={1} onElapsed={onElapsed} />);
    advance(4000);
    expect(onElapsed).toHaveBeenCalledTimes(2);
  });
});
