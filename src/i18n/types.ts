import { fr } from './fr';

export type Language = 'fr' | 'de' | 'en';
export type Messages = typeof fr;
export type TranslationKey = keyof Messages;
