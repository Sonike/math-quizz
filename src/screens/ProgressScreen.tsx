import { useMemo } from 'react';
import { loadHistory } from '../storage/profileStore';
import { sessionScores, trickiestPairs, errorGrid } from '../domain/progress';
import { ScoreLineChart } from '../components/ScoreLineChart';
import { TrickiestPairsList } from '../components/TrickiestPairsList';
import { ErrorHeatmap } from '../components/ErrorHeatmap';
import { useI18n } from '../i18n/I18nContext';
import './ProgressScreen.css';

type Props = {
  onBack: () => void;
};

export const ProgressScreen = ({ onBack }: Props) => {
  const { t } = useI18n();
  const history = useMemo(() => loadHistory(), []);
  const points = useMemo(() => sessionScores(history), [history]);
  const pairs = useMemo(() => trickiestPairs(history), [history]);
  const grid = useMemo(() => errorGrid(history), [history]);

  return (
    <div className="progress">
      <header className="progress__header">
        <h2>{t('progress.title')}</h2>
        <button
          type="button"
          className="progress__back-btn"
          onClick={onBack}
          aria-label={t('common.backToHomeAria')}
        >
          🏠
        </button>
      </header>

      {history.length === 0 ? (
        <p className="progress__empty">
          {`${t('progress.empty')} 📈`}
        </p>
      ) : (
        <>
          <section className="progress__panel">
            <h3 className="progress__panel-title">{t('progress.scoreTitle')}</h3>
            <ScoreLineChart points={points} />
            <p className="progress__caption">
              {t('progress.scoreCaption')}
            </p>
          </section>

          <section className="progress__panel">
            <h3 className="progress__panel-title">{t('progress.pairsTitle')}</h3>
            <TrickiestPairsList pairs={pairs} />
          </section>

          <section className="progress__panel">
            <h3 className="progress__panel-title">{t('progress.tablesTitle')}</h3>
            <ErrorHeatmap grid={grid} />
          </section>
        </>
      )}
    </div>
  );
};
