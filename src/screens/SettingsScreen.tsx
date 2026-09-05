import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { SETTINGS_BOUNDS } from '../domain/session';
import type { Settings } from '../domain/session';
import {
  BACKUP_SCHEMA_URL,
  backupFileName,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from '../domain/backup';
import type { Backup, BackupProblem } from '../domain/backup';
import { downloadTextFile, readTextFile } from '../storage/fileTransfer';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/types';
import { LanguageToggle } from '../components/LanguageToggle';
import './SettingsScreen.css';

type Props = {
  settings: Settings;
  onSave: (next: Settings) => void;
  onClearHistory: () => void;
  /** Snapshot of the whole profile, ready to be written to a file. */
  onExport: () => Backup;
  /** Overwrites the profile. May throw if the browser refuses the write. */
  onImport: (backup: Backup) => void;
  onBack: () => void;
};

type Notice = { kind: 'info' | 'error'; key: TranslationKey };

const IMPORT_ERRORS: Record<BackupProblem, TranslationKey> = {
  unreadable: 'settings.importErrorUnreadable',
  'not-a-backup': 'settings.importErrorFormat',
  'unsupported-version': 'settings.importErrorVersion',
  corrupt: 'settings.importErrorCorrupt',
};

const clamp = (value: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, value));

const SECONDS_MIN = SETTINGS_BOUNDS.durationPerQuestionMs.min / 1000;
const SECONDS_MAX = SETTINGS_BOUNDS.durationPerQuestionMs.max / 1000;

export const SettingsScreen = ({
  settings,
  onSave,
  onClearHistory,
  onExport,
  onImport,
  onBack,
}: Props) => {
  const [seconds, setSeconds] = useState(settings.durationPerQuestionMs / 1000);
  const [count, setCount] = useState(settings.questionCount);
  const [partial, setPartial] = useState(settings.partialCreditFactor);
  const [confirming, setConfirming] = useState(false);
  const [pendingImport, setPendingImport] = useState<Backup | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { t } = useI18n();

  const [formatBefore, formatAfter] = t('settings.formatDoc').split('{link}');

  const submit = () => {
    onSave({
      ...settings,
      durationPerQuestionMs: Math.round(
        clamp(seconds, SECONDS_MIN, SECONDS_MAX) * 1000,
      ),
      questionCount: Math.round(
        clamp(count, SETTINGS_BOUNDS.questionCount.min, SETTINGS_BOUNDS.questionCount.max),
      ),
      partialCreditFactor: clamp(
        partial,
        SETTINGS_BOUNDS.partialCreditFactor.min,
        SETTINGS_BOUNDS.partialCreditFactor.max,
      ),
    });
    onBack();
  };

  const handleExport = () => {
    const backup = onExport();
    downloadTextFile(backupFileName(backup.exportedAt), serializeBackup(backup));
    setPendingImport(null);
    setNotice({ kind: 'info', key: 'settings.exportDone' });
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset first, so picking the same file twice in a row still fires onChange.
    event.target.value = '';
    if (!file) return;

    const result = parseBackup(await readTextFile(file));
    if (!result.ok) {
      setPendingImport(null);
      setNotice({ kind: 'error', key: IMPORT_ERRORS[result.problem] });
      return;
    }
    // Valid, but nothing is written until the confirmation below.
    setNotice(null);
    setPendingImport(result.backup);
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    try {
      onImport(pendingImport);
    } catch {
      setPendingImport(null);
      setNotice({ kind: 'error', key: 'settings.importErrorStorage' });
      return;
    }
    // The three inputs above are seeded from props on first render only, so an
    // import has to refresh them by hand. Without this they keep showing the
    // pre-import values, and the next "Enregistrer" writes those stale numbers
    // back over what was just imported.
    const imported = pendingImport.data.settings;
    setSeconds(imported.durationPerQuestionMs / 1000);
    setCount(imported.questionCount);
    setPartial(imported.partialCreditFactor);
    setPendingImport(null);
    setNotice({ kind: 'info', key: 'settings.importDone' });
  };

  const summary = pendingImport ? summarizeBackup(pendingImport) : null;

  return (
    <div className="settings">
      <header className="settings__header">
        <h2>{t('settings.title')}</h2>
        <button
          type="button"
          className="settings__back-btn"
          onClick={onBack}
          aria-label={t('common.backToHomeAria')}
        >
          🏠
        </button>
      </header>

      <label className="settings__field">
        <span className="settings__label">{t('settings.targetTime')}</span>
        <input
          type="number"
          step={0.5}
          min={SECONDS_MIN}
          max={SECONDS_MAX}
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
          min={SETTINGS_BOUNDS.questionCount.min}
          max={SETTINGS_BOUNDS.questionCount.max}
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
          min={SETTINGS_BOUNDS.partialCreditFactor.min}
          max={SETTINGS_BOUNDS.partialCreditFactor.max}
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

      <section className="settings__section">
        <h3 className="settings__section-title">{t('settings.dataTitle')}</h3>
        <p className="settings__hint">{t('settings.dataHint')}</p>

        <div className="settings__transfer">
          <button type="button" className="settings__secondary" onClick={handleExport}>
            {`⬇️ ${t('settings.export')}`}
          </button>
          <label className="settings__secondary settings__file">
            {`⬆️ ${t('settings.import')}`}
            <input
              type="file"
              accept="application/json,.json"
              className="settings__file-input"
              onChange={(event) => void handleFile(event)}
            />
          </label>
        </div>

        {notice && (
          <p
            className={`settings__notice settings__notice--${notice.kind}`}
            role={notice.kind === 'error' ? 'alert' : 'status'}
          >
            {t(notice.key)}
          </p>
        )}

        {pendingImport && summary && (
          <div className="settings__confirm">
            <p>{t('settings.importConfirm')}</p>
            <p className="settings__hint">
              {t('settings.importSummary', {
                sessions: summary.sessions,
                training: summary.trainingSessions,
                pairs: summary.pairs,
              })}
            </p>
            <p className="settings__hint">{t('settings.importWarning')}</p>
            <div className="settings__confirm-row">
              <button type="button" className="settings__danger" onClick={confirmImport}>
                {t('settings.importYes')}
              </button>
              <button
                type="button"
                className="settings__secondary"
                onClick={() => setPendingImport(null)}
              >
                {t('settings.cancel')}
              </button>
            </div>
          </div>
        )}

        <p className="settings__hint">
          {formatBefore}
          <a href={BACKUP_SCHEMA_URL} target="_blank" rel="noopener noreferrer">
            {t('settings.formatLink')}
          </a>
          {formatAfter}
        </p>
      </section>

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
