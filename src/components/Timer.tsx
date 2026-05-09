import { useEffect, useRef, useState } from 'react';
import './Timer.css';

type Props = {
  targetMs: number;
  resetKey: string | number;
};

export const Timer = ({ targetMs, resetKey }: Props) => {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startRef = useRef<number>(performance.now());

  useEffect(() => {
    startRef.current = performance.now();
    setElapsedMs(0);
    let raf = 0;
    const tick = () => {
      setElapsedMs(performance.now() - startRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [resetKey]);

  const overTarget = elapsedMs > targetMs;
  const seconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div
      className={`timer${overTarget ? ' timer--over' : ''}`}
      role="status"
      aria-label={overTarget ? 'temps dépassé' : 'temps en cours'}
    >
      <span className="timer__value">{seconds}s</span>
      <span className="timer__target"> / cible {(targetMs / 1000).toFixed(0)}s</span>
    </div>
  );
};
