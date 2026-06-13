import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithLanguage } from './renderWithLanguage';
import { HomeScreen } from '../screens/HomeScreen';
import { DEFAULT_SETTINGS } from '../domain/session';

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
