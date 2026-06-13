import { fr } from './fr';
import { de } from './de';
import { en } from './en';
import type { Language, TranslationKey } from './types';

export type { Language, TranslationKey, Messages } from './types';

export const dictionaries: Record<Language, Record<TranslationKey, string>> = {
  fr,
  de,
  en,
};

export const LANGUAGES: { code: Language; nativeLabel: string }[] = [
  { code: 'fr', nativeLabel: 'Français' },
  { code: 'de', nativeLabel: 'Deutsch' },
  { code: 'en', nativeLabel: 'English' },
];

export const translate = (
  lang: Language,
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string => {
  const dict = dictionaries[lang] ?? dictionaries.fr;
  const template = dict[key] ?? dictionaries.fr[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  );
};
