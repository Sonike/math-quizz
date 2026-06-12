import type { AnswerMode } from '../domain/session';
import './ModeToggle.css';

type Props = {
  value: AnswerMode | undefined;
  onChange: (next: AnswerMode) => void;
};

const OPTIONS: { id: AnswerMode; label: string }[] = [
  { id: 'screen', label: "📱 Sur l'écran" },
  { id: 'paper', label: '✏️ Sur papier' },
];

export const AnswerModeToggle = ({ value, onChange }: Props) => {
  const active = value ?? 'screen';
  return (
    <div className="mode-toggle mode-toggle--two" role="radiogroup" aria-label="saisie">
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
