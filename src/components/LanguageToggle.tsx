import type { Language } from '../i18n/types';
import { LANGUAGES } from '../i18n';
import { useI18n } from '../i18n/I18nContext';
import './ModeToggle.css';
import './LanguageToggle.css';

type Props = {
  value: Language;
  onChange: (next: Language) => void;
};

export const LanguageToggle = ({ value, onChange }: Props) => {
  const { t } = useI18n();
  return (
    <div
      className="mode-toggle language-toggle"
      role="radiogroup"
      aria-label={t('settings.language')}
    >
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={value === l.code}
          className={`mode-toggle__option language-toggle__option${
            value === l.code ? ' mode-toggle__option--on' : ''
          }`}
          onClick={() => onChange(l.code)}
        >
          <span className="language-toggle__badge" aria-hidden="true">
            {l.code.toUpperCase()}
          </span>
          {l.nativeLabel}
        </button>
      ))}
    </div>
  );
};
