import { releaseNotes } from '../domain/releaseNotes';
import './InfoScreen.css';

type Props = {
  version: string;
  onBack: () => void;
};

export const InfoScreen = ({ version, onBack }: Props) => {
  return (
    <div className="info">
      <header className="info__header">
        <h2>À propos</h2>
        <button
          type="button"
          className="info__back-btn"
          onClick={onBack}
          aria-label="retour à l'accueil"
        >
          🏠
        </button>
      </header>

      <section className="info__panel info__panel--version">
        <p className="info__app">Math Quizz</p>
        <p className="info__version">version {version}</p>
      </section>

      <section className="info__panel">
        <h3 className="info__panel-title">Nouveautés</h3>
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
        <h3 className="info__panel-title">Tes données</h3>
        <p className="info__data">
          Tes réglages, tes réponses et tes scores restent uniquement dans ce
          navigateur, sur cet appareil. Rien n'est envoyé sur Internet : pas de
          compte, pas de pistage. Tes données ne te suivent donc pas sur un
          autre appareil ou un autre navigateur.
        </p>
        <p className="info__data">
          Tu peux tout effacer quand tu veux avec le bouton « Effacer
          l'historique » dans les Paramètres, ou en vidant les données de ton
          navigateur.
        </p>
      </section>
    </div>
  );
};
