import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import './Countdown.css';

type Props = {
  durationMs: number;
  resetKey: string | number;
  onElapsed: () => void;
};

export const Countdown = ({ durationMs, resetKey, onElapsed }: Props) => {
  const { t } = useI18n();
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const onElapsedRef = useRef(onElapsed);
  onElapsedRef.current = onElapsed;

  useEffect(() => {
    const start = performance.now();
    setRemainingMs(durationMs);
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const remaining = durationMs - elapsed;
      setRemainingMs(Math.max(0, remaining));
      if (remaining > 0) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const timer = setTimeout(() => onElapsedRef.current(), durationMs);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [resetKey, durationMs]);

  const pct = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));
  return (
    <div className="countdown" role="timer" aria-label={t('countdown.aria')}>
      <div className="countdown__bar" style={{ width: `${pct}%` }} />
    </div>
  );
};
