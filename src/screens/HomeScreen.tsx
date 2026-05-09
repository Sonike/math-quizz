import { TableSelector } from '../components/TableSelector';
import { ModeToggle } from '../components/ModeToggle';
import type { Settings } from '../domain/session';
import './HomeScreen.css';

type Props = {
  settings: Settings;
  onChange: (next: Settings) => void;
  onStart: () => void;
  onOpenSettings: () => void;
};

export const HomeScreen = ({ settings, onChange, onStart, onOpenSettings }: Props) => {
  const seconds = (settings.durationPerQuestionMs / 1000).toFixed(1).replace('.0', '');
  const canStart = settings.selectedTables.length > 0;

  return (
    <div className="home">
      <header className="home__header">
        <h1>Math Quizz</h1>
        <button
          type="button"
          className="home__settings-btn"
          onClick={onOpenSettings}
          aria-label="paramètres"
        >
          ⚙
        </button>
      </header>
      <section className="home__panel">
        <TableSelector
          selected={settings.selectedTables}
          onChange={(selectedTables) => onChange({ ...settings, selectedTables })}
        />
      </section>
      <section className="home__panel">
        <h2 className="home__panel-title">Mode</h2>
        <ModeToggle
          value={settings.mode}
          onChange={(mode) => onChange({ ...settings, mode })}
        />
      </section>
      <p className="home__info">
        {settings.questionCount} questions · {seconds}s par question
      </p>
      <button
        type="button"
        className="home__start-btn"
        onClick={onStart}
        disabled={!canStart}
      >
        🚀 Lancer
      </button>
    </div>
  );
};
