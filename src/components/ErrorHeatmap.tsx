import { MULTIPLIERS } from '../domain/tables';
import type { GridCell } from '../domain/progress';
import { rateBucket } from './rateColor';

type Props = { grid: GridCell[][] };

export const ErrorHeatmap = ({ grid }: Props) => (
  <div className="heatmap">
    <table className="heatmap__table">
      <thead>
        <tr>
          <th className="heatmap__corner" aria-hidden />
          {MULTIPLIERS.map((b) => (
            <th key={b} className="heatmap__colhead" scope="col">
              {b}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {grid.map((row) => (
          <tr key={row[0].a}>
            <th className="heatmap__rowhead" scope="row">
              {row[0].a}
            </th>
            {row.map((cell) => {
              const label =
                cell.errorRate === null
                  ? `${cell.a}×${cell.b} — pas encore joué`
                  : `${cell.a}×${cell.b} — ${Math.round(cell.errorRate * 100)}%`;
              return (
                <td
                  key={`${cell.a}x${cell.b}`}
                  className={`heatmap__cell heat--${rateBucket(cell.errorRate)}`}
                  title={label}
                  aria-label={label}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
    <div className="heatmap__legend">
      <span className="heat--0" /> rare
      <span className="heat--3" /> fréquent
      <span className="heat--nodata" /> pas joué
    </div>
  </div>
);
