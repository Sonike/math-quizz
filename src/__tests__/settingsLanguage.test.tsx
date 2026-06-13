import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithLanguage } from './renderWithLanguage';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DEFAULT_SETTINGS } from '../domain/session';

describe('SettingsScreen language selector', () => {
  it('applies the chosen language immediately via onSave', () => {
    const onSave = vi.fn();
    const onBack = vi.fn();
    renderWithLanguage(
      <SettingsScreen
        settings={DEFAULT_SETTINGS}
        onSave={onSave}
        onClearHistory={() => {}}
        onBack={onBack}
      />,
      'fr',
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Deutsch' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ language: 'de' }));
    expect(onBack).not.toHaveBeenCalled();
  });

  it('renders settings labels in the active language', () => {
    renderWithLanguage(
      <SettingsScreen
        settings={{ ...DEFAULT_SETTINGS, language: 'en' }}
        onSave={() => {}}
        onClearHistory={() => {}}
        onBack={() => {}}
      />,
      'en',
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });
});
