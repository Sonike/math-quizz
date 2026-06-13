import { releaseNotes } from '../domain/releaseNotes';
import { useI18n } from '../i18n/I18nContext';
import './InfoScreen.css';

type Props = {
  version: string;
  onBack: () => void;
};

export const InfoScreen = ({ version, onBack }: Props) => {
  const { t, lang } = useI18n();
  return (
    <div className="info">
      <header className="info__header">
        <h2>{t('info.title')}</h2>
        <button
          type="button"
          className="info__back-btn"
          onClick={onBack}
          aria-label={t('common.backToHomeAria')}
        >
          🏠
        </button>
      </header>

      <section className="info__panel info__panel--version">
        <p className="info__app">Math Quizz</p>
        <p className="info__version">{t('info.version', { version })}</p>
      </section>

      <section className="info__panel">
        <h3 className="info__panel-title">{t('info.whatsNew')}</h3>
        {lang !== 'fr' && <p className="info__notes-lang">{t('info.notesInFrench')}</p>}
        <ul className="info__notes">
          {releaseNotes.map((note) => (
            <li key={note.version} className="info__note">
              <p className="info__note-head">
                <span className="info__note-version">v{note.version}</span>
                <span className="info__note-date">{note.date}</span>
              </p>
              <ul className="info__note-changes">
                {note.changes.map((change, i) => (
                  <li key={i}>{change}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="info__panel">
        <h3 className="info__panel-title">{t('info.dataTitle')}</h3>
        <p className="info__data">
          {t('info.dataP1')}
        </p>
        <p className="info__data">
          {t('info.dataP2')}
        </p>
      </section>

      <section className="info__panel info__credit">
        <p className="info__credit-line">
          {t('info.credit')}
        </p>
        <p className="info__contact">
          <a href="mailto:info@mrpia.ch">info@mrpia.ch</a>
        </p>
      </section>
    </div>
  );
};
