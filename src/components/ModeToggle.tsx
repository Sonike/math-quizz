import type { Mode } from '../domain/question';
import './ModeToggle.css';

type Props = {
  value: Mode;
  onChange: (next: Mode) => void;
};

const OPTIONS: { id: Mode; label: string }[] = [
  { id: 'mul', label: '× Multiplications' },
  { id: 'div', label: '÷ Divisions' },
  { id: 'mix', label: '× ÷ Mélange' },
];

export const ModeToggle = ({ value, onChange }: Props) => (
  <div className="mode-toggle" role="radiogroup" aria-label="mode">
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
