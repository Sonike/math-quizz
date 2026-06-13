import { describe, expect, test, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithLanguage } from './renderWithLanguage';
import { LanguageToggle } from '../components/LanguageToggle';

describe('LanguageToggle', () => {
  test('marks the active language and emits its code on click', () => {
    const onChange = vi.fn();
    renderWithLanguage(<LanguageToggle value="fr" onChange={onChange} />, 'fr');

    expect(
      screen.getByRole('radio', { name: 'Français' }),
    ).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Deutsch' }));
    expect(onChange).toHaveBeenCalledWith('de');
  });

  test('exposes all three languages by native name (code badge is a11y-hidden)', () => {
    renderWithLanguage(<LanguageToggle value="en" onChange={() => {}} />, 'en');
    expect(screen.getByRole('radio', { name: 'Français' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Deutsch' })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'English' }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});
