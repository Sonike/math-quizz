import { TableSelector } from '../components/TableSelector';
import { ModeToggle } from '../components/ModeToggle';
import { AnswerModeToggle } from '../components/AnswerModeToggle';
import type { Settings } from '../domain/session';
import { useI18n } from '../i18n/I18nContext';
import './HomeScreen.css';

type Props = {
  settings: Settings;
  onChange: (next: Settings) => void;
  onStart: () => void;
  onOpenSettings: () => void;
  onOpenProgress: () => void;
  onOpenInfo: () => void;
};

export const HomeScreen = ({
  settings,
  onChange,
  onStart,
  onOpenSettings,
  onOpenProgress,
  onOpenInfo,
}: Props) => {
  const { t } = useI18n();
  const seconds = (settings.durationPerQuestionMs / 1000)
    .toFixed(1)
    .replace('.0', '');
  const canStart = settings.selectedTables.length > 0;

  return (
    <div className="home">
      <header className="home__header">
        <h1>Math Quizz</h1>
        <div className="home__header-actions">
          <button
            type="button"
            className="home__info-btn"
            onClick={onOpenInfo}
            aria-label={t('home.aboutAria')}
          >
            ℹ️
          </button>
          <button
            type="button"
            className="home__progress-btn"
            onClick={onOpenProgress}
            aria-label={t('home.resultsAria')}
          >
            📈
          </button>
          <button
            type="button"
            className="home__settings-btn"
            onClick={onOpenSettings}
            aria-label={t('home.settingsAria')}
          >
            ⚙
          </button>
        </div>
      </header>
      <section className="home__panel">
        <TableSelector
          selected={settings.selectedTables}
          onChange={(selectedTables) => onChange({ ...settings, selectedTables })}
        />
      </section>
      <section className="home__panel">
        <h2 className="home__panel-title">{t('home.modeTitle')}</h2>
        <ModeToggle
          value={settings.mode}
          onChange={(mode) => onChange({ ...settings, mode })}
        />
      </section>
      <section className="home__panel">
        <h2 className="home__panel-title">{t('home.inputTitle')}</h2>
        <AnswerModeToggle
          value={settings.answerMode}
          onChange={(answerMode) => onChange({ ...settings, answerMode })}
        />
      </section>
      <p className="home__info">{t('home.summary', { count: settings.questionCount, seconds })}</p>
      <button
        type="button"
        className="home__start-btn"
        onClick={onStart}
        disabled={!canStart}
      >
        {`🚀 ${t('home.start')}`}
      </button>
    </div>
  );
};
