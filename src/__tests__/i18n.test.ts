import { describe, it, expect } from 'vitest';
import { translate, dictionaries } from '../i18n';
import { fr } from '../i18n/fr';

describe('translate', () => {
  it('returns the string for the requested language', () => {
    expect(translate('fr', 'home.start')).toBe('Lancer');
    expect(translate('de', 'home.start')).toBe('Starten');
    expect(translate('en', 'home.start')).toBe('Start');
  });

  it('interpolates placeholders', () => {
    expect(translate('en', 'session.counter', { n: 2, total: 5 })).toBe('Question 2 / 5');
    expect(translate('fr', 'home.summary', { count: 22, seconds: 4 })).toBe(
      '22 questions · 4s par question',
    );
  });

  it('falls back to the key for an unknown key', () => {
    // @ts-expect-error unknown key is intentional here
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist');
  });
});

describe('dictionaries', () => {
  it('de and en have exactly the same keys as fr', () => {
    const frKeys = Object.keys(fr).sort();
    expect(Object.keys(dictionaries.de).sort()).toEqual(frKeys);
    expect(Object.keys(dictionaries.en).sort()).toEqual(frKeys);
  });

  it('every inline-link sentence keeps its {link} placeholder', () => {
    for (const lang of ['fr', 'de', 'en'] as const) {
      expect(dictionaries[lang]['info.coffee']).toContain('{link}');
      expect(dictionaries[lang]['info.credit']).toContain('{link}');
      expect(dictionaries[lang]['settings.formatDoc']).toContain('{link}');
    }
  });
});
