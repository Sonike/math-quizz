import type { AnswerMode } from '../domain/session';
import { useI18n } from '../i18n/I18nContext';
import './ModeToggle.css';

type Props = {
  value: AnswerMode | undefined;
  onChange: (next: AnswerMode) => void;
};

export const AnswerModeToggle = ({ value, onChange }: Props) => {
  const { t } = useI18n();
  const OPTIONS: { id: AnswerMode; label: string }[] = [
    { id: 'screen', label: t('answerMode.screen') },
    { id: 'paper', label: t('answerMode.paper') },
  ];
  const active = value ?? 'screen';
  return (
    <div className="mode-toggle mode-toggle--two" role="radiogroup" aria-label={t('answerMode.aria')}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={active === opt.id}
          className={`mode-toggle__option${active === opt.id ? ' mode-toggle__option--on' : ''}`}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};
