import { useEffect, useRef, useState } from 'react';
import './Timer.css';

type Props = {
  durationMs: number;
  resetKey: string | number;
  onTimeout: () => void;
};

export const Timer = ({ durationMs, resetKey, onTimeout }: Props) => {
  const [ratio, setRatio] = useState(0);
  const startRef = useRef<number>(performance.now());
  const firedRef = useRef<boolean>(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    startRef.current = performance.now();
    firedRef.current = false;
    setRatio(0);
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const r = Math.min(elapsed / durationMs, 1);
      setRatio(r);
      if (r >= 1 && !firedRef.current) {
        firedRef.current = true;
        onTimeoutRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs, resetKey]);

  const remainingMs = Math.max(0, durationMs - durationMs * ratio);
  return (
    <div className="timer" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((1 - ratio) * 100)}>
      <div
        className="timer__bar"
        style={{ width: `${Math.max(0, 100 - ratio * 100)}%` }}
      />
      <div className="timer__label">{(remainingMs / 1000).toFixed(1)}s</div>
    </div>
  );
};
