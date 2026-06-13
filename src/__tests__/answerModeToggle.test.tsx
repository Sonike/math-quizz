import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnswerModeToggle } from '../components/AnswerModeToggle';

describe('AnswerModeToggle', () => {
  test('marks the active option and emits the other on click', () => {
    const onChange = vi.fn();
    render(<AnswerModeToggle value="screen" onChange={onChange} />);

    expect(
      screen.getByRole('radio', { name: '📱 Test écran' }),
    ).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: '✏️ Test papier' }));
    expect(onChange).toHaveBeenCalledWith('paper');
  });

  test('renders the training option and emits "training" on click', () => {
    const onChange = vi.fn();
    render(<AnswerModeToggle value="screen" onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: '🎓 Entraînement' }));
    expect(onChange).toHaveBeenCalledWith('training');
  });
});
