import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider, useI18n } from '../i18n/I18nContext';

const Probe = () => {
  const { lang, t } = useI18n();
  return <div>{`${lang}:${t('home.start')}`}</div>;
};

describe('LanguageProvider / useI18n', () => {
  it('translates into the provided language', () => {
    render(
      <LanguageProvider lang="de">
        <Probe />
      </LanguageProvider>,
    );
    expect(screen.getByText('de:Starten')).toBeInTheDocument();
  });

  it('defaults to French when no provider is mounted', () => {
    render(<Probe />);
    expect(screen.getByText('fr:Lancer')).toBeInTheDocument();
  });

  it('syncs document.documentElement.lang', () => {
    render(
      <LanguageProvider lang="en">
        <Probe />
      </LanguageProvider>,
    );
    expect(document.documentElement.lang).toBe('en');
  });
});
