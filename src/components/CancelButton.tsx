import { useI18n } from '../i18n/I18nContext';
import './CancelButton.css';

type Props = {
  onCancel: () => void;
};

/**
 * Deliberately low-prominence "abandon this session" affordance — a small,
 * muted link-style button at the bottom of an active session. It's an escape
 * hatch for a child who finds the time pressure stressful, sized so it isn't
 * an easy/tempting way to skip practice. Caller decides what cancelling means
 * (the app returns home without recording the session).
 */
export const CancelButton = ({ onCancel }: Props) => {
  const { t } = useI18n();
  return (
    <button type="button" className="cancel-btn" onClick={onCancel}>
      {t('session.cancel')}
    </button>
  );
};
