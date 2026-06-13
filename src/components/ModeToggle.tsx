import type { Mode } from '../domain/question';
import { useI18n } from '../i18n/I18nContext';
import './ModeToggle.css';

type Props = {
  value: Mode;
  onChange: (next: Mode) => void;
};

export const ModeToggle = ({ value, onChange }: Props) => {
  const { t } = useI18n();
  const OPTIONS: { id: Mode; label: string }[] = [
    { id: 'mul', label: t('mode.mul') },
    { id: 'div', label: t('mode.div') },
    { id: 'mix', label: t('mode.mix') },
  ];
  return (
    <div className="mode-toggle" role="radiogroup" aria-label={t('mode.aria')}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={value === opt.id}
          className={`mode-toggle__option${value === opt.id ? ' mode-toggle__option--on' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
