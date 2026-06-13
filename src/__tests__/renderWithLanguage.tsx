import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { LanguageProvider } from '../i18n/I18nContext';
import type { Language } from '../i18n/types';

export const renderWithLanguage = (ui: ReactElement, lang: Language = 'fr') =>
  render(<LanguageProvider lang={lang}>{ui}</LanguageProvider>);
