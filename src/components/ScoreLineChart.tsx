import type { SessionScorePoint } from '../domain/progress';
import { useI18n } from '../i18n/I18nContext';

type Props = { points: SessionScorePoint[] };

const W = 320;
const H = 180;
const PAD = { left: 34, right: 12, top: 14, bottom: 24 };
const TICKS = [0, 0.25, 0.5, 0.75, 1];

const xAt = (i: number, n: number): number => {
  const span = W - PAD.left - PAD.right;
  if (n <= 1) return PAD.left + span / 2;
  return PAD.left + (span * i) / (n - 1);
};

const yAt = (ratio: number): number =>
  PAD.top + (H - PAD.top - PAD.bottom) * (1 - ratio);

const toLine = (vals: number[]): string =>
  vals.map((v, i) => `${xAt(i, vals.length)},${yAt(v)}`).join(' ');

export const ScoreLineChart = ({ points }: Props) => {
  const { t } = useI18n();
  const n = points.length;
  const correct = points.map((p) => p.correctRatio);
  const credit = points.map((p) => p.creditRatio);

  return (
    <div className="chart">
      <svg
        className="chart__svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={t('chart.aria')}
      >
        {TICKS.map((tick) => (
          <g key={tick}>
            <line
              className="chart__grid"
              x1={PAD.left}
              y1={yAt(tick)}
              x2={W - PAD.right}
              y2={yAt(tick)}
            />
            <text
              className="chart__axis"
              x={PAD.left - 5}
              y={yAt(tick) + 3}
              textAnchor="end"
            >
              {Math.round(tick * 100)}%
            </text>
          </g>
        ))}

        {n > 1 && (
          <>
            <polyline
              className="chart__line chart__line--credit"
              points={toLine(credit)}
            />
            <polyline
              className="chart__line chart__line--correct"
              points={toLine(correct)}
            />
          </>
        )}

        {n <= 15 &&
          points.map((p, i) => (
            <g key={i}>
              <circle
                className="chart__dot chart__dot--credit"
                cx={xAt(i, n)}
                cy={yAt(p.creditRatio)}
                r={3}
              />
              <circle
                className="chart__dot chart__dot--correct"
                cx={xAt(i, n)}
                cy={yAt(p.correctRatio)}
                r={3}
              />
            </g>
          ))}

        {n > 1 && (
          <text
            className="chart__axis"
            x={PAD.left}
            y={H - 8}
            textAnchor="start"
          >
            -{n - 1}
          </text>
        )}
        <text
          className="chart__axis"
          x={W - PAD.right}
          y={H - 8}
          textAnchor="end"
        >
          {t('chart.last')}
        </text>
      </svg>
      <div className="chart__legend">
        <span className="chart__legend-item chart__legend-item--correct">
          {t('chart.legendCorrect')}
        </span>
        <span className="chart__legend-item chart__legend-item--credit">
          {t('chart.legendCredit')}
        </span>
      </div>
    </div>
  );
};
