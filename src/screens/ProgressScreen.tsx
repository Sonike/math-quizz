import { useMemo } from 'react';
import { loadHistory } from '../storage/profileStore';
import { sessionScores, trickiestPairs, errorGrid } from '../domain/progress';
import { ScoreLineChart } from '../components/ScoreLineChart';
import { TrickiestPairsList } from '../components/TrickiestPairsList';
import { ErrorHeatmap } from '../components/ErrorHeatmap';
import './ProgressScreen.css';

type Props = {
  onBack: () => void;
};

export const ProgressScreen = ({ onBack }: Props) => {
  const history = useMemo(() => loadHistory(), []);
  const points = useMemo(() => sessionScores(history), [history]);
  const pairs = useMemo(() => trickiestPairs(history), [history]);
  const grid = useMemo(() => errorGrid(history), [history]);

  return (
    <div className="progress">
      <header className="progress__header">
        <h2>Mes résultats</h2>
        <button
          type="button"
          className="progress__back-btn"
          onClick={onBack}
          aria-label="retour à l'accueil"
        >
          🏠
        </button>
      </header>

      {history.length === 0 ? (
        <p className="progress__empty">
          Joue quelques sessions pour voir ta progression 📈
        </p>
      ) : (
        <>
          <section className="progress__panel">
            <h3 className="progress__panel-title">Score par session</h3>
            <ScoreLineChart points={points} />
            <p className="progress__caption">
              Chaque point = une session. Les tables et le mode choisis
              changent la difficulté, donc le score.
            </p>
          </section>

          <section className="progress__panel">
            <h3 className="progress__panel-title">Paires à revoir</h3>
            <TrickiestPairsList pairs={pairs} />
          </section>

          <section className="progress__panel">
            <h3 className="progress__panel-title">Carte des tables</h3>
            <ErrorHeatmap grid={grid} />
          </section>
        </>
      )}
    </div>
  );
};
