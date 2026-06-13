import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithLanguage } from './renderWithLanguage';
import { HomeScreen } from '../screens/HomeScreen';
import { DEFAULT_SETTINGS } from '../domain/session';
import { LanguageProvider as LanguageProviderForTest } from '../i18n/I18nContext';
import { InfoScreen } from '../screens/InfoScreen';

const homeProps = {
  settings: DEFAULT_SETTINGS,
  onChange: () => {},
  onStart: () => {},
  onOpenSettings: () => {},
  onOpenProgress: () => {},
  onOpenInfo: () => {},
};

describe('HomeScreen language', () => {
  it.each([
    ['fr', /Lancer/],
    ['de', /Starten/],
    ['en', /Start/],
  ] as const)('renders the start button in %s', (lang, label) => {
    renderWithLanguage(<HomeScreen {...homeProps} />, lang);
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });
});

describe('InfoScreen language', () => {
  it('shows the French-notes caption only when language is not French', () => {
    const { rerender } = renderWithLanguage(
      <InfoScreen version="9.9.9" onBack={() => {}} />,
      'en',
    );
    expect(screen.getByText('These notes are in French.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument();

    rerender(
      <LanguageProviderForTest lang="fr">
        <InfoScreen version="9.9.9" onBack={() => {}} />
      </LanguageProviderForTest>,
    );
    expect(screen.queryByText('Ces notes sont en français.')).not.toBeInTheDocument();
  });
});
