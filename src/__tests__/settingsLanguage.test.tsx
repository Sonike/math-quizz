import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithLanguage } from './renderWithLanguage';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DEFAULT_SETTINGS } from '../domain/session';
import { createBackup } from '../domain/backup';

const exportStub = () =>
  createBackup(
    { settings: DEFAULT_SETTINGS, history: [], trainingHistory: [], errors: {} },
    { appVersion: '0.0.0', exportedAt: '2026-01-01T00:00:00.000Z', profile: 'default' },
  );

describe('SettingsScreen language selector', () => {
  it('applies the chosen language immediately via onSave', () => {
    const onSave = vi.fn();
    const onBack = vi.fn();
    renderWithLanguage(
      <SettingsScreen
        settings={DEFAULT_SETTINGS}
        onSave={onSave}
        onClearHistory={() => {}}
        onExport={exportStub}
        onImport={() => {}}
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
        onExport={exportStub}
        onImport={() => {}}
        onBack={() => {}}
      />,
      'en',
    );
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('has a home (🏠) button that calls onBack, like the other screens', () => {
    const onBack = vi.fn();
    renderWithLanguage(
      <SettingsScreen
        settings={DEFAULT_SETTINGS}
        onSave={() => {}}
        onClearHistory={() => {}}
        onExport={exportStub}
        onImport={() => {}}
        onBack={onBack}
      />,
      'fr',
    );
    fireEvent.click(screen.getByRole('button', { name: /retour à l'accueil/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
