import { useState } from 'react';
import type { Settings } from '../domain/session';
import { useI18n } from '../i18n/I18nContext';
import { LanguageToggle } from '../components/LanguageToggle';
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
  const { t } = useI18n();

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
        <button type="button" onClick={onBack} className="settings__back" aria-label={t('settings.backAria')}>
          ←
        </button>
        <h2>{t('settings.title')}</h2>
      </header>

      <label className="settings__field">
        <span className="settings__label">{t('settings.targetTime')}</span>
        <input
          type="number"
          step={0.5}
          min={1}
          max={60}
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
        />
        <span className="settings__hint">
          {t('settings.targetTimeHint')}
        </span>
      </label>

      <label className="settings__field">
        <span className="settings__label">{t('settings.questionCount')}</span>
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
          {t('settings.partialCredit')}
        </span>
        <input
          type="number"
          step={0.1}
          min={0}
          max={1}
          value={partial}
          onChange={(e) => setPartial(Number(e.target.value))}
        />
        <span className="settings__hint">{t('settings.partialCreditHint')}</span>
      </label>

      <div className="settings__field">
        <span className="settings__label">{t('settings.language')}</span>
        <LanguageToggle
          value={settings.language}
          onChange={(language) => onSave({ ...settings, language })}
        />
      </div>

      <button type="button" className="settings__primary" onClick={submit}>
        {t('settings.save')}
      </button>

      <hr className="settings__divider" />

      {!confirming ? (
        <button
          type="button"
          className="settings__danger"
          onClick={() => setConfirming(true)}
        >
          {`🧹 ${t('settings.clearHistory')}`}
        </button>
      ) : (
        <div className="settings__confirm">
          <p>{t('settings.clearConfirm')}</p>
          <div className="settings__confirm-row">
            <button
              type="button"
              className="settings__danger"
              onClick={() => {
                onClearHistory();
                setConfirming(false);
              }}
            >
              {t('settings.clearYes')}
            </button>
            <button
              type="button"
              className="settings__secondary"
              onClick={() => setConfirming(false)}
            >
              {t('settings.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
