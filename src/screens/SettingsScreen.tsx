import { useState } from 'react';
import type { Settings } from '../domain/session';
import './SettingsScreen.css';

type Props = {
  settings: Settings;
  onSave: (next: Settings) => void;
  onClearHistory: () => void;
  onBack: () => void;
};

const clamp = (value: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, value));

export const SettingsScreen = ({ settings, onSave, onClearHistory, onBack }: Props) => {
  const [seconds, setSeconds] = useState(settings.durationPerQuestionMs / 1000);
  const [count, setCount] = useState(settings.questionCount);
  const [partial, setPartial] = useState(settings.partialCreditFactor);
  const [confirming, setConfirming] = useState(false);

  const submit = () => {
    onSave({
      ...settings,
      durationPerQuestionMs: Math.round(clamp(seconds, 1, 60) * 1000),
      questionCount: Math.round(clamp(count, 1, 200)),
      partialCreditFactor: clamp(partial, 0, 1),
    });
    onBack();
  };

  return (
    <div className="settings">
      <header className="settings__header">
        <button type="button" onClick={onBack} className="settings__back" aria-label="retour">
          ←
        </button>
        <h2>Paramètres</h2>
      </header>

      <label className="settings__field">
        <span className="settings__label">Temps cible par question (s)</span>
        <input
          type="number"
          step={0.5}
          min={1}
          max={60}
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
        />
        <span className="settings__hint">
          Réponse plus rapide : 1 point. Plus lente : crédit partiel.
        </span>
      </label>

      <label className="settings__field">
        <span className="settings__label">Nombre de questions</span>
        <input
          type="number"
          step={1}
          min={1}
          max={200}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        />
      </label>

      <label className="settings__field">
        <span className="settings__label">
          Crédit pour réponse correcte mais lente (0–1)
        </span>
        <input
          type="number"
          step={0.1}
          min={0}
          max={1}
          value={partial}
          onChange={(e) => setPartial(Number(e.target.value))}
        />
        <span className="settings__hint">0 = pas de crédit · 0.5 = demi-point · 1 = autant qu'une réponse rapide</span>
      </label>

      <button type="button" className="settings__primary" onClick={submit}>
        Enregistrer
      </button>

      <hr className="settings__divider" />

      {!confirming ? (
        <button
          type="button"
          className="settings__danger"
          onClick={() => setConfirming(true)}
        >
          🧹 Effacer l'historique
        </button>
      ) : (
        <div className="settings__confirm">
          <p>Effacer l'historique et les statistiques ?</p>
          <div className="settings__confirm-row">
            <button
              type="button"
              className="settings__danger"
              onClick={() => {
                onClearHistory();
                setConfirming(false);
              }}
            >
              Oui, effacer
            </button>
            <button
              type="button"
              className="settings__secondary"
              onClick={() => setConfirming(false)}
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
