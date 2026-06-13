import type { PairStat } from '../domain/progress';
import { rateBucket } from './rateColor';

type Props = { pairs: PairStat[] };

export const TrickiestPairsList = ({ pairs }: Props) => {
  if (pairs.length === 0) {
    return (
      <p className="pairs__empty">
        Pas encore assez de données pour repérer les paires difficiles.
      </p>
    );
  }
  const maxRate = Math.max(...pairs.map((p) => p.errorRate)) || 1;
  return (
    <ul className="pairs">
      {pairs.map((p) => (
        <li className="pairs__row" key={`${p.a}x${p.b}`}>
          <span className="pairs__pair">
            {p.a} × {p.b}
          </span>
          <span className="pairs__barwrap">
            <span
              className={`pairs__bar heat--${rateBucket(p.errorRate)}`}
              style={{ width: `${Math.round((p.errorRate / maxRate) * 100)}%` }}
            />
          </span>
          <span className="pairs__num">
            {p.errors + p.timeouts} / {p.attempts}
          </span>
        </li>
      ))}
    </ul>
  );
};
