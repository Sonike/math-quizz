# Language choice (FR / DE / EN) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user switch the UI between French, German, and English from Settings, with French as the default and source of truth.

**Architecture:** A homemade i18n layer in `src/i18n/` (flat dictionaries + a pure `translate()`), delivered through a React context (`LanguageProvider` / `useI18n()`). The provider reflects `settings.language` (single source of truth in localStorage). German and English dictionaries are typed `Record<TranslationKey, string>` so `tsc` fails the build on any missing/extra key. Words only — no locale number formatting, no plural engine. Math symbols, digits, the brand and the email stay literal.

**Tech Stack:** Vite 5, React 18, TypeScript, Vitest 2 + Testing Library, plain CSS. Zero new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-06-13-language-choice-design.md`

---

## File Structure

**Create:**
- `src/i18n/fr.ts` — canonical flat dictionary (defines the key set).
- `src/i18n/de.ts` — German, `Record<TranslationKey, string>`.
- `src/i18n/en.ts` — English, `Record<TranslationKey, string>`.
- `src/i18n/types.ts` — `Language`, `Messages`, `TranslationKey`.
- `src/i18n/index.ts` — `dictionaries`, `LANGUAGES`, `translate()`.
- `src/i18n/I18nContext.tsx` — `LanguageProvider`, `useI18n()`.
- `src/__tests__/renderWithLanguage.tsx` — test helper (not a suite).
- `src/__tests__/i18n.test.ts` — `translate` + completeness.
- `src/__tests__/i18nContext.test.tsx` — provider/hook/`<html lang>`.
- `src/__tests__/languageSwitch.test.tsx` — HomeScreen + Info in 3 languages.

**Modify:**
- `src/domain/session.ts` — add `language` to `Settings` + `DEFAULT_SETTINGS`.
- `src/App.tsx` — wrap in `LanguageProvider`.
- `src/screens/{Home,Session,PaperSession,Results,Progress,Settings,Info}Screen.tsx`.
- `src/components/{TableSelector,ModeToggle,AnswerModeToggle,NumPad,Countdown,Timer,ScoreLineChart,TrickiestPairsList}.tsx`.
- `package.json`, `CHANGELOG.md`, `src/domain/releaseNotes.ts` — release bump.

`QuestionCard.tsx` is math-only and is **not** touched.

---

## Authoritative translation table

Used verbatim in Task 1. The `{...}` placeholders and embedded `s` second-unit are intentional. German/English are first-draft and must be proofread by a human before release (see spec risks).

| key | fr | de | en |
|---|---|---|---|
| `common.backToHome` | Retour à l'accueil | Zurück zur Startseite | Back to home |
| `common.backToHomeAria` | retour à l'accueil | zurück zur startseite | back to home |
| `home.aboutAria` | à propos | über | about |
| `home.resultsAria` | mes résultats | meine Ergebnisse | my results |
| `home.settingsAria` | paramètres | Einstellungen | settings |
| `home.modeTitle` | Mode | Modus | Mode |
| `home.inputTitle` | Saisie | Eingabe | Input |
| `home.summary` | {count} questions · {seconds}s par question | {count} Fragen · {seconds}s pro Frage | {count} questions · {seconds}s per question |
| `home.start` | Lancer | Starten | Start |
| `tables.title` | Tables | Reihen | Tables |
| `tables.selectAll` | Tout cocher | Alle auswählen | Select all |
| `tables.deselectAll` | Tout décocher | Alle abwählen | Deselect all |
| `mode.aria` | mode | modus | mode |
| `mode.mul` | × Multiplications | × Multiplikation | × Multiplication |
| `mode.div` | ÷ Divisions | ÷ Division | ÷ Division |
| `mode.mix` | × ÷ Mélange | × ÷ Gemischt | × ÷ Mix |
| `answerMode.aria` | saisie | eingabe | input |
| `answerMode.screen` | 📱 Sur l'écran | 📱 Am Bildschirm | 📱 On screen |
| `answerMode.paper` | ✏️ Sur papier | ✏️ Auf Papier | ✏️ On paper |
| `session.counter` | Question {n} / {total} | Frage {n} / {total} | Question {n} / {total} |
| `session.ready` | Prêt ? | Bereit? | Ready? |
| `countdown.aria` | temps restant | verbleibende zeit | time remaining |
| `timer.running` | temps en cours | laufende zeit | time running |
| `timer.over` | temps dépassé | zeit überschritten | time exceeded |
| `timer.target` | / cible {target}s | / Ziel {target}s | / target {target}s |
| `numpad.digit` | chiffre {digit} | Ziffer {digit} | digit {digit} |
| `numpad.erase` | effacer | löschen | erase |
| `numpad.validate` | valider | bestätigen | confirm |
| `results.title` | Bilan | Bilanz | Summary |
| `results.legend` | Cible : {seconds}s — réponse plus lente : {points} pt | Ziel: {seconds}s — langsamere Antwort: {points} Pkt | Target: {seconds}s — slower answer: {points} pt |
| `results.slow` | trop lent | zu langsam | too slow |
| `results.wrongAnswer` | réponse : {given} | Antwort: {given} | answer: {given} |
| `results.noAnswer` | pas de réponse | keine Antwort | no answer |
| `results.paperLegend` | Compare avec ta feuille, puis décoche ❌ les réponses fausses. | Vergleiche mit deinem Blatt und entferne ❌ bei den falschen Antworten. | Compare with your sheet, then uncheck ❌ the wrong answers. |
| `results.markCorrect` | correct | richtig | correct |
| `results.markWrong` | faux | falsch | wrong |
| `results.save` | Enregistrer le résultat | Ergebnis speichern | Save result |
| `results.saved` | Enregistré | Gespeichert | Saved |
| `results.replay` | Refaire la même config | Gleiche Einstellung nochmal | Replay same setup |
| `progress.title` | Mes résultats | Meine Ergebnisse | My results |
| `progress.empty` | Joue quelques sessions pour voir ta progression | Spiele ein paar Runden, um deinen Fortschritt zu sehen | Play a few sessions to see your progress |
| `progress.scoreTitle` | Score par session | Punkte pro Runde | Score per session |
| `progress.scoreCaption` | Chaque point = une session. Les tables et le mode choisis changent la difficulté, donc le score. | Jeder Punkt = eine Runde. Die gewählten Reihen und der Modus ändern die Schwierigkeit und damit die Punkte. | Each dot = one session. The tables and mode you pick change the difficulty, and so the score. |
| `progress.pairsTitle` | Paires à revoir | Paare zum Üben | Pairs to review |
| `progress.tablesTitle` | Carte des tables | Reihen-Karte | Tables map |
| `chart.aria` | Score sur les dernières sessions | Punkte der letzten Runden | Score over recent sessions |
| `chart.last` | dernière | letzte | last |
| `chart.legendCorrect` | juste / total | richtig / gesamt | correct / total |
| `chart.legendCredit` | score (crédit partiel) | Punkte (Teilpunkte) | score (partial credit) |
| `pairs.empty` | Aucune paire à revoir pour l'instant. | Noch keine Paare zum Üben. | No pairs to review yet. |
| `settings.backAria` | retour | zurück | back |
| `settings.title` | Paramètres | Einstellungen | Settings |
| `settings.targetTime` | Temps cible par question (s) | Zielzeit pro Frage (s) | Target time per question (s) |
| `settings.targetTimeHint` | Réponse plus rapide : 1 point. Plus lente : crédit partiel. | Schnellere Antwort: 1 Punkt. Langsamere: Teilpunkte. | Faster answer: 1 point. Slower: partial credit. |
| `settings.questionCount` | Nombre de questions | Anzahl Fragen | Number of questions |
| `settings.partialCredit` | Crédit pour réponse correcte mais lente (0–1) | Punkte für richtige, aber langsame Antwort (0–1) | Credit for a correct but slow answer (0–1) |
| `settings.partialCreditHint` | 0 = pas de crédit · 0.5 = demi-point · 1 = autant qu'une réponse rapide | 0 = keine Punkte · 0.5 = halber Punkt · 1 = wie eine schnelle Antwort | 0 = no credit · 0.5 = half point · 1 = same as a fast answer |
| `settings.save` | Enregistrer | Speichern | Save |
| `settings.clearHistory` | Effacer l'historique | Verlauf löschen | Clear history |
| `settings.clearConfirm` | Effacer l'historique et les statistiques ? | Verlauf und Statistiken löschen? | Clear history and statistics? |
| `settings.clearYes` | Oui, effacer | Ja, löschen | Yes, clear |
| `settings.cancel` | Annuler | Abbrechen | Cancel |
| `settings.language` | Langue | Sprache | Language |
| `info.title` | À propos | Über | About |
| `info.version` | version {version} | Version {version} | version {version} |
| `info.whatsNew` | Nouveautés | Neuigkeiten | What's new |
| `info.notesInFrench` | Ces notes sont en français. | Diese Hinweise sind auf Französisch. | These notes are in French. |
| `info.dataTitle` | Tes données | Deine Daten | Your data |
| `info.dataP1` | Tes réglages, tes réponses et tes scores restent uniquement dans ce navigateur, sur cet appareil. Rien n'est envoyé sur Internet : pas de compte, pas de pistage. Tes données ne te suivent donc pas sur un autre appareil ou un autre navigateur. | Deine Einstellungen, deine Antworten und deine Punkte bleiben nur in diesem Browser, auf diesem Gerät. Nichts wird ins Internet gesendet: kein Konto, kein Tracking. Deine Daten folgen dir also nicht auf ein anderes Gerät oder einen anderen Browser. | Your settings, your answers and your scores stay only in this browser, on this device. Nothing is sent to the internet: no account, no tracking. So your data doesn't follow you to another device or browser. |
| `info.dataP2` | Tu peux tout effacer quand tu veux avec le bouton « Effacer l'historique » dans les Paramètres, ou en vidant les données de ton navigateur. | Du kannst alles jederzeit über die Schaltfläche « Verlauf löschen » in den Einstellungen entfernen, oder indem du die Browserdaten löschst. | You can erase everything whenever you want with the “Clear history” button in Settings, or by clearing your browser's data. |
| `info.credit` | Conçu avec 🥰, ☕ et 🤖 à Zürich, Suisse 🇨🇭 | Mit 🥰, ☕ und 🤖 in Zürich, Schweiz 🇨🇭 erstellt | Made with 🥰, ☕ and 🤖 in Zürich, Switzerland 🇨🇭 |

---

## Task 1: i18n core (dictionaries + translate)

**Files:**
- Create: `src/i18n/fr.ts`, `src/i18n/de.ts`, `src/i18n/en.ts`, `src/i18n/types.ts`, `src/i18n/index.ts`
- Test: `src/__tests__/i18n.test.ts`

- [ ] **Step 1: Write the failing test** — `src/__tests__/i18n.test.ts`

```ts
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
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test -- i18n.test.ts`
Expected: FAIL — cannot resolve `../i18n`.

- [ ] **Step 3: Create `src/i18n/fr.ts`**

Flat object, one entry per row of the translation table (the **fr** column). Begin:

```ts
export const fr = {
  'common.backToHome': "Retour à l'accueil",
  'common.backToHomeAria': "retour à l'accueil",
  'home.aboutAria': 'à propos',
  'home.resultsAria': 'mes résultats',
  'home.settingsAria': 'paramètres',
  'home.modeTitle': 'Mode',
  'home.inputTitle': 'Saisie',
  'home.summary': '{count} questions · {seconds}s par question',
  'home.start': 'Lancer',
  'tables.title': 'Tables',
  'tables.selectAll': 'Tout cocher',
  'tables.deselectAll': 'Tout décocher',
  'mode.aria': 'mode',
  'mode.mul': '× Multiplications',
  'mode.div': '÷ Divisions',
  'mode.mix': '× ÷ Mélange',
  'answerMode.aria': 'saisie',
  'answerMode.screen': "📱 Sur l'écran",
  'answerMode.paper': '✏️ Sur papier',
  'session.counter': 'Question {n} / {total}',
  'session.ready': 'Prêt ?',
  'countdown.aria': 'temps restant',
  'timer.running': 'temps en cours',
  'timer.over': 'temps dépassé',
  'timer.target': '/ cible {target}s',
  'numpad.digit': 'chiffre {digit}',
  'numpad.erase': 'effacer',
  'numpad.validate': 'valider',
  'results.title': 'Bilan',
  'results.legend': 'Cible : {seconds}s — réponse plus lente : {points} pt',
  'results.slow': 'trop lent',
  'results.wrongAnswer': 'réponse : {given}',
  'results.noAnswer': 'pas de réponse',
  'results.paperLegend': 'Compare avec ta feuille, puis décoche ❌ les réponses fausses.',
  'results.markCorrect': 'correct',
  'results.markWrong': 'faux',
  'results.save': 'Enregistrer le résultat',
  'results.saved': 'Enregistré',
  'results.replay': 'Refaire la même config',
  'progress.title': 'Mes résultats',
  'progress.empty': 'Joue quelques sessions pour voir ta progression',
  'progress.scoreTitle': 'Score par session',
  'progress.scoreCaption':
    'Chaque point = une session. Les tables et le mode choisis changent la difficulté, donc le score.',
  'progress.pairsTitle': 'Paires à revoir',
  'progress.tablesTitle': 'Carte des tables',
  'chart.aria': 'Score sur les dernières sessions',
  'chart.last': 'dernière',
  'chart.legendCorrect': 'juste / total',
  'chart.legendCredit': 'score (crédit partiel)',
  'pairs.empty': "Aucune paire à revoir pour l'instant.",
  'settings.backAria': 'retour',
  'settings.title': 'Paramètres',
  'settings.targetTime': 'Temps cible par question (s)',
  'settings.targetTimeHint': 'Réponse plus rapide : 1 point. Plus lente : crédit partiel.',
  'settings.questionCount': 'Nombre de questions',
  'settings.partialCredit': 'Crédit pour réponse correcte mais lente (0–1)',
  'settings.partialCreditHint':
    "0 = pas de crédit · 0.5 = demi-point · 1 = autant qu'une réponse rapide",
  'settings.save': 'Enregistrer',
  'settings.clearHistory': "Effacer l'historique",
  'settings.clearConfirm': "Effacer l'historique et les statistiques ?",
  'settings.clearYes': 'Oui, effacer',
  'settings.cancel': 'Annuler',
  'settings.language': 'Langue',
  'info.title': 'À propos',
  'info.version': 'version {version}',
  'info.whatsNew': 'Nouveautés',
  'info.notesInFrench': 'Ces notes sont en français.',
  'info.dataTitle': 'Tes données',
  'info.dataP1':
    "Tes réglages, tes réponses et tes scores restent uniquement dans ce navigateur, sur cet appareil. Rien n'est envoyé sur Internet : pas de compte, pas de pistage. Tes données ne te suivent donc pas sur un autre appareil ou un autre navigateur.",
  'info.dataP2':
    "Tu peux tout effacer quand tu veux avec le bouton « Effacer l'historique » dans les Paramètres, ou en vidant les données de ton navigateur.",
  'info.credit': 'Conçu avec 🥰, ☕ et 🤖 à Zürich, Suisse 🇨🇭',
};
```

- [ ] **Step 4: Create `src/i18n/types.ts`**

```ts
import { fr } from './fr';

export type Language = 'fr' | 'de' | 'en';
export type Messages = typeof fr;
export type TranslationKey = keyof Messages;
```

- [ ] **Step 5: Create `src/i18n/de.ts` and `src/i18n/en.ts`**

Each is `const <lang>: Record<TranslationKey, string> = { ...same keys, <lang> column... }`. The `Record<TranslationKey, string>` annotation makes `tsc` fail on any missing or misspelled key — do not use `as` or `@ts-ignore` to silence it. Example head for `de.ts`:

```ts
import type { TranslationKey } from './types';

export const de: Record<TranslationKey, string> = {
  'common.backToHome': 'Zurück zur Startseite',
  'common.backToHomeAria': 'zurück zur startseite',
  'home.aboutAria': 'über',
  // ... every key from the table's `de` column, same order as fr.ts ...
  'info.credit': 'Mit 🥰, ☕ und 🤖 in Zürich, Schweiz 🇨🇭 erstellt',
};
```

`en.ts` is identical structurally with the `en` column.

- [ ] **Step 6: Create `src/i18n/index.ts`**

```ts
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
```

- [ ] **Step 7: Run the test, expect pass**

Run: `pnpm test -- i18n.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add src/i18n/ src/__tests__/i18n.test.ts
git commit -m "feat(i18n): add FR/DE/EN dictionaries and translate()"
```

---

## Task 2: Language context + hook

**Files:**
- Create: `src/i18n/I18nContext.tsx`, `src/__tests__/renderWithLanguage.tsx`
- Test: `src/__tests__/i18nContext.test.tsx`

- [ ] **Step 1: Write the failing test** — `src/__tests__/i18nContext.test.tsx`

```tsx
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
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test -- i18nContext.test.tsx`
Expected: FAIL — cannot resolve `../i18n/I18nContext`.

- [ ] **Step 3: Create `src/i18n/I18nContext.tsx`**

```tsx
import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { translate } from './index';
import type { Language, TranslationKey } from './types';

type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type I18n = { lang: Language; t: Translate };

const makeT = (lang: Language): Translate => (key, vars) => translate(lang, key, vars);

const I18nContext = createContext<I18n>({ lang: 'fr', t: makeT('fr') });

export const useI18n = (): I18n => useContext(I18nContext);

export const LanguageProvider = ({
  lang,
  children,
}: {
  lang: Language;
  children: ReactNode;
}) => {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return <I18nContext.Provider value={{ lang, t: makeT(lang) }}>{children}</I18nContext.Provider>;
};
```

- [ ] **Step 4: Create the test helper `src/__tests__/renderWithLanguage.tsx`**

(Has no `.test` suffix, so Vitest does not collect it as a suite.)

```tsx
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { LanguageProvider } from '../i18n/I18nContext';
import type { Language } from '../i18n/types';

export const renderWithLanguage = (ui: ReactElement, lang: Language = 'fr') =>
  render(<LanguageProvider lang={lang}>{ui}</LanguageProvider>);
```

- [ ] **Step 5: Run the test, expect pass**

Run: `pnpm test -- i18nContext.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/i18n/I18nContext.tsx src/__tests__/renderWithLanguage.tsx src/__tests__/i18nContext.test.tsx
git commit -m "feat(i18n): add LanguageProvider and useI18n hook"
```

---

## Task 3: `Settings.language` field + migration default

**Files:**
- Modify: `src/domain/session.ts`
- Test: `src/__tests__/profileStore.test.ts` (append one case)

- [ ] **Step 1: Write the failing test** — append to `src/__tests__/profileStore.test.ts`

```ts
it('defaults language to fr when absent from stored settings', () => {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ questionCount: 10 }));
  expect(loadSettings().language).toBe('fr');
});
```

(`STORAGE_KEYS` and `loadSettings` are already imported in this file; if not, add them to the existing import from `'../storage/profileStore'`.)

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test -- profileStore.test.ts`
Expected: FAIL — `language` is `undefined` / type error on `.language`.

- [ ] **Step 3: Edit `src/domain/session.ts`**

Add the import and field. At the top:

```ts
import type { Language } from '../i18n/types';
```

In `type Settings`, add (after `answerMode?`):

```ts
  /** UI language. Absent reads as 'fr'. */
  language: Language;
```

In `DEFAULT_SETTINGS`, add:

```ts
  language: 'fr',
```

- [ ] **Step 4: Run the test, expect pass**

Run: `pnpm test -- profileStore.test.ts`
Expected: PASS. The `{ ...DEFAULT_SETTINGS, ...stored }` merge in `loadSettings` supplies `'fr'`; no migration code needed.

- [ ] **Step 5: Commit**

```bash
git add src/domain/session.ts src/__tests__/profileStore.test.ts
git commit -m "feat(i18n): add language field to Settings (defaults fr)"
```

---

## Task 4: Wrap the app in `LanguageProvider`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Edit `src/App.tsx`**

Add the import:

```ts
import { LanguageProvider } from './i18n/I18nContext';
```

Wrap the returned tree. Change `return ( <div className="app"> … </div> );` so the `<div className="app">` is wrapped:

```tsx
  return (
    <LanguageProvider lang={settings.language}>
      <div className="app">
        {/* ...existing screen switch unchanged... */}
      </div>
    </LanguageProvider>
  );
```

- [ ] **Step 2: Verify build + full suite**

Run: `pnpm build && pnpm test`
Expected: typecheck passes; all existing tests still green (components fall back to French via the default context — App now provides `'fr'` explicitly).

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(i18n): provide language context from App settings"
```

---

## Task 5: Settings screen — language selector + string extraction

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Test: `src/__tests__/settingsLanguage.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — `src/__tests__/settingsLanguage.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithLanguage } from './renderWithLanguage';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DEFAULT_SETTINGS } from '../domain/session';

describe('SettingsScreen language selector', () => {
  it('applies the chosen language immediately via onSave', () => {
    const onSave = vi.fn();
    renderWithLanguage(
      <SettingsScreen
        settings={DEFAULT_SETTINGS}
        onSave={onSave}
        onClearHistory={() => {}}
        onBack={() => {}}
      />,
      'fr',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deutsch' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ language: 'de' }));
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
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test -- settingsLanguage.test.tsx`
Expected: FAIL — no "Deutsch" button; heading is "Paramètres".

- [ ] **Step 3: Edit `src/screens/SettingsScreen.tsx`**

Add imports:

```ts
import { useI18n } from '../i18n/I18nContext';
import { LANGUAGES } from '../i18n';
```

Inside the component, after the existing `useState` lines:

```ts
  const { t } = useI18n();
```

Replace the hard-coded French strings with `t(...)` calls using these keys:
- `aria-label="retour"` → `aria-label={t('settings.backAria')}`
- `<h2>Paramètres</h2>` → `<h2>{t('settings.title')}</h2>`
- "Temps cible par question (s)" → `{t('settings.targetTime')}`
- the target-time hint → `{t('settings.targetTimeHint')}`
- "Nombre de questions" → `{t('settings.questionCount')}`
- "Crédit pour réponse correcte mais lente (0–1)" → `{t('settings.partialCredit')}`
- the partial-credit hint → `{t('settings.partialCreditHint')}`
- "Enregistrer" (primary button) → `{t('settings.save')}`
- "🧹 Effacer l'historique" → `{`🧹 ${t('settings.clearHistory')}`}`
- "Effacer l'historique et les statistiques ?" → `{t('settings.clearConfirm')}`
- "Oui, effacer" → `{t('settings.clearYes')}`
- "Annuler" → `{t('settings.cancel')}`

Add a language field **before** the `<hr className="settings__divider" />` (so it sits with the other settings):

```tsx
      <div className="settings__field">
        <span className="settings__label">{t('settings.language')}</span>
        <div className="mode-toggle mode-toggle--two" role="radiogroup" aria-label={t('settings.language')}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={settings.language === l.code}
              className={`mode-toggle__option${
                settings.language === l.code ? ' mode-toggle__option--on' : ''
              }`}
              onClick={() => onSave({ ...settings, language: l.code })}
            >
              {l.nativeLabel}
            </button>
          ))}
        </div>
      </div>
```

Note: language applies live through `onSave` (does not call `onBack`), unlike the numeric "Enregistrer" button. The `mode-toggle` classes are reused from `ModeToggle.css`, which is already imported globally by other screens; if the styles do not apply, import `'../components/ModeToggle.css'` at the top of `SettingsScreen.tsx`.

- [ ] **Step 4: Run the test, expect pass**

Run: `pnpm test -- settingsLanguage.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify nothing else broke**

Run: `pnpm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/screens/SettingsScreen.tsx src/__tests__/settingsLanguage.test.tsx
git commit -m "feat(i18n): translate Settings screen and add language selector"
```

---

## Task 6: Home screen + its toggles

**Files:**
- Modify: `src/screens/HomeScreen.tsx`, `src/components/TableSelector.tsx`, `src/components/ModeToggle.tsx`, `src/components/AnswerModeToggle.tsx`
- Test: `src/__tests__/languageSwitch.test.tsx` (create)

- [ ] **Step 1: Write the failing test** — `src/__tests__/languageSwitch.test.tsx`

```tsx
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
```

(Regex name match because the button text is e.g. `🚀 Lancer`.)

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test -- languageSwitch.test.tsx`
Expected: FAIL on `de` / `en` (still renders "Lancer").

- [ ] **Step 3: Edit `src/screens/HomeScreen.tsx`**

Add `import { useI18n } from '../i18n/I18nContext';`, then `const { t } = useI18n();` at the top of the component. Replace:
- `aria-label="à propos"` → `aria-label={t('home.aboutAria')}`
- `aria-label="mes résultats"` → `aria-label={t('home.resultsAria')}`
- `aria-label="paramètres"` → `aria-label={t('home.settingsAria')}`
- `<h2 className="home__panel-title">Mode</h2>` → `{t('home.modeTitle')}`
- `<h2 className="home__panel-title">Saisie</h2>` → `{t('home.inputTitle')}`
- the `<p className="home__info">{settings.questionCount} questions · {seconds}s par question</p>` →
  `<p className="home__info">{t('home.summary', { count: settings.questionCount, seconds })}</p>`
- `🚀 Lancer` → `{`🚀 ${t('home.start')}`}`

Leave `<h1>Math Quizz</h1>` untranslated (brand).

- [ ] **Step 4: Edit `src/components/TableSelector.tsx`**

Add the hook. Replace:
- `<span>Tables</span>` → `<span>{t('tables.title')}</span>`
- `{allSelected ? 'Tout décocher' : 'Tout cocher'}` → `{allSelected ? t('tables.deselectAll') : t('tables.selectAll')}`

- [ ] **Step 5: Edit `src/components/ModeToggle.tsx`**

Move the `OPTIONS` array inside the component so labels can use `t`. Add the hook, then:

```tsx
  const { t } = useI18n();
  const OPTIONS: { id: Mode; label: string }[] = [
    { id: 'mul', label: t('mode.mul') },
    { id: 'div', label: t('mode.div') },
    { id: 'mix', label: t('mode.mix') },
  ];
```

Replace `aria-label="mode"` → `aria-label={t('mode.aria')}`.

- [ ] **Step 6: Edit `src/components/AnswerModeToggle.tsx`**

Same pattern — move `OPTIONS` inside, add the hook:

```tsx
  const { t } = useI18n();
  const OPTIONS: { id: AnswerMode; label: string }[] = [
    { id: 'screen', label: t('answerMode.screen') },
    { id: 'paper', label: t('answerMode.paper') },
  ];
```

Replace `aria-label="saisie"` → `aria-label={t('answerMode.aria')}`.

- [ ] **Step 7: Run tests, expect pass**

Run: `pnpm test -- languageSwitch.test.tsx` then `pnpm test`
Expected: language test PASS (3); full suite green.

- [ ] **Step 8: Commit**

```bash
git add src/screens/HomeScreen.tsx src/components/TableSelector.tsx src/components/ModeToggle.tsx src/components/AnswerModeToggle.tsx src/__tests__/languageSwitch.test.tsx
git commit -m "feat(i18n): translate home screen and toggles"
```

---

## Task 7: Session screens + session components

**Files:**
- Modify: `src/screens/SessionScreen.tsx`, `src/screens/PaperSessionScreen.tsx`, `src/components/NumPad.tsx`, `src/components/Timer.tsx`, `src/components/Countdown.tsx`

- [ ] **Step 1: Edit `src/components/NumPad.tsx`**

Add `import { useI18n } from '../i18n/I18nContext';` and `const { t } = useI18n();` inside the component (convert the arrow body to a block that returns the JSX). Replace:
- `aria-label={`chiffre ${digit}`}` → `aria-label={t('numpad.digit', { digit })}`
- `aria-label="effacer"` → `aria-label={t('numpad.erase')}`
- `aria-label="valider"` → `aria-label={t('numpad.validate')}`

- [ ] **Step 2: Edit `src/components/Countdown.tsx`**

Add the hook. Replace `aria-label="temps restant"` → `aria-label={t('countdown.aria')}`.

- [ ] **Step 3: Edit `src/components/Timer.tsx`**

Add the hook. Replace:
- `aria-label={overTarget ? 'temps dépassé' : 'temps en cours'}` → `aria-label={overTarget ? t('timer.over') : t('timer.running')}`
- the target span `> / cible {(targetMs / 1000).toFixed(0)}s<` → render `{t('timer.target', { target: (targetMs / 1000).toFixed(0) })}` (the key value already contains the leading `/ ` and trailing `s`). Concretely:

```tsx
      <span className="timer__target"> {t('timer.target', { target: (targetMs / 1000).toFixed(0) })}</span>
```

- [ ] **Step 4: Edit `src/screens/SessionScreen.tsx`**

Add the hook. Replace `Question {index + 1} / {questions.length}` →
`{t('session.counter', { n: index + 1, total: questions.length })}`.

- [ ] **Step 5: Edit `src/screens/PaperSessionScreen.tsx`**

Two spots — the `LeadIn` sub-component and the main counter. Add the hook in **each** component that renders text:
- In `LeadIn`: add `const { t } = useI18n();`, replace `<p className="paper-session__ready">Prêt ?</p>` → `{t('session.ready')}`.
- In `PaperSessionScreen`: add `const { t } = useI18n();`, replace `Question {phase.index + 1} / {questions.length}` → `{t('session.counter', { n: phase.index + 1, total: questions.length })}`.

Add `import { useI18n } from '../i18n/I18nContext';` at the top.

- [ ] **Step 6: Verify**

Run: `pnpm test`
Expected: all green (existing session/paper/numpad/countdown tests render bare → French default, still match). `pnpm build` typechecks.

- [ ] **Step 7: Commit**

```bash
git add src/screens/SessionScreen.tsx src/screens/PaperSessionScreen.tsx src/components/NumPad.tsx src/components/Timer.tsx src/components/Countdown.tsx
git commit -m "feat(i18n): translate session screens and components"
```

---

## Task 8: Results screen

**Files:**
- Modify: `src/screens/ResultsScreen.tsx`

- [ ] **Step 1: Edit `src/screens/ResultsScreen.tsx`**

`ScreenResults` and `PaperResults` are separate sub-components and the main `ResultsScreen` — add `const { t } = useI18n();` inside **each** of the three that render text, and `import { useI18n } from '../i18n/I18nContext';` at the top.

In `ScreenResults`:
- legend `Cible : {targetSeconds}s — réponse plus lente : {formatPoints(...)} pt` →
  `{t('results.legend', { seconds: targetSeconds, points: formatPoints(result.partialCreditFactor) })}`
- `{elapsed}s · trop lent` → `{elapsed}s · {t('results.slow')}` (keep `{elapsed}s · `)
- `{elapsed}s · réponse : {record.given}` → `{elapsed}s · {t('results.wrongAnswer', { given: record.given ?? '' })}`
- `pas de réponse` → `{t('results.noAnswer')}`

In `PaperResults`:
- legend → `{t('results.paperLegend')}`
- `aria-label={`${renderOperation(record)} ${marks[i] ? 'correct' : 'faux'}`}` →
  `aria-label={`${renderOperation(record)} ${marks[i] ? t('results.markCorrect') : t('results.markWrong')}`}`

In `ResultsScreen`:
- `<h2>Bilan</h2>` → `{t('results.title')}`
- `💾 Enregistrer le résultat` → `{`💾 ${t('results.save')}`}`
- `Enregistré ✓` → `{`${t('results.saved')} ✓`}`
- `🔁 Refaire la même config` → `{`🔁 ${t('results.replay')}`}`
- `🏠 Retour à l'accueil` → `{`🏠 ${t('common.backToHome')}`}`

- [ ] **Step 2: Verify**

Run: `pnpm test`
Expected: existing `resultsScreen.test.tsx` still passes (French default). `pnpm build` typechecks.

- [ ] **Step 3: Commit**

```bash
git add src/screens/ResultsScreen.tsx
git commit -m "feat(i18n): translate results screen"
```

---

## Task 9: Progress screen + chart + pairs list

**Files:**
- Modify: `src/screens/ProgressScreen.tsx`, `src/components/ScoreLineChart.tsx`, `src/components/TrickiestPairsList.tsx`

- [ ] **Step 1: Edit `src/screens/ProgressScreen.tsx`**

Add the hook + import. Replace:
- `<h2>Mes résultats</h2>` → `{t('progress.title')}`
- `aria-label="retour à l'accueil"` → `aria-label={t('common.backToHomeAria')}`
- empty `Joue quelques sessions pour voir ta progression 📈` → `{`${t('progress.empty')} 📈`}`
- `Score par session` → `{t('progress.scoreTitle')}`
- the caption → `{t('progress.scoreCaption')}`
- `Paires à revoir` → `{t('progress.pairsTitle')}`
- `Carte des tables` → `{t('progress.tablesTitle')}`

- [ ] **Step 2: Edit `src/components/ScoreLineChart.tsx`**

Add the hook + import. Replace:
- `aria-label="Score sur les dernières sessions"` → `aria-label={t('chart.aria')}`
- the `>dernière<` axis text → `{t('chart.last')}`
- legend `juste / total` → `{t('chart.legendCorrect')}`
- legend `score (crédit partiel)` → `{t('chart.legendCredit')}`

Leave the `{Math.round(t * 100)}%` axis ticks as-is (universal). Note: this file already uses a local variable named `t` for the tick ratio in `TICKS.map((t) => …)`. **Rename that map parameter** to `tick` to avoid shadowing the translator: `TICKS.map((tick) => …)` and update `yAt(tick)`, `key={tick}`, `Math.round(tick * 100)` accordingly.

- [ ] **Step 3: Edit `src/components/TrickiestPairsList.tsx`**

Add the hook + import. Replace `Aucune paire à revoir pour l'instant.` → `{t('pairs.empty')}`.

- [ ] **Step 4: Verify**

Run: `pnpm test`
Expected: existing `progressScreen.test.tsx` still passes. `pnpm build` typechecks (watch for the `t` shadow rename in the chart).

- [ ] **Step 5: Commit**

```bash
git add src/screens/ProgressScreen.tsx src/components/ScoreLineChart.tsx src/components/TrickiestPairsList.tsx
git commit -m "feat(i18n): translate progress screen, chart and pairs list"
```

---

## Task 10: À propos screen + French-notes caption

**Files:**
- Modify: `src/screens/InfoScreen.tsx`
- Test: append to `src/__tests__/languageSwitch.test.tsx`

- [ ] **Step 1: Write the failing test** — append to `src/__tests__/languageSwitch.test.tsx`

```tsx
import { InfoScreen } from '../screens/InfoScreen';

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
```

To keep the rerender simple, instead of the helper's wrapper, add this import and tiny wrapper at the top of the test file:

```tsx
import { LanguageProvider as LanguageProviderForTest } from '../i18n/I18nContext';
```

- [ ] **Step 2: Run it, expect failure**

Run: `pnpm test -- languageSwitch.test.tsx`
Expected: FAIL — no "These notes are in French." text; heading is "À propos".

- [ ] **Step 3: Edit `src/screens/InfoScreen.tsx`**

Add `import { useI18n } from '../i18n/I18nContext';` and inside the component `const { t, lang } = useI18n();`. Replace:
- `<h2>À propos</h2>` → `{t('info.title')}`
- `aria-label="retour à l'accueil"` → `aria-label={t('common.backToHomeAria')}`
- `version {version}` → `{t('info.version', { version })}`
- `<h3 className="info__panel-title">Nouveautés</h3>` → `{t('info.whatsNew')}`
- `<h3 className="info__panel-title">Tes données</h3>` → `{t('info.dataTitle')}`
- the first data `<p>` → `{t('info.dataP1')}`
- the second data `<p>` → `{t('info.dataP2')}`
- the credit line → `{t('info.credit')}`

Leave `<p className="info__app">Math Quizz</p>`, the `releaseNotes` list, and the `mailto:` link untranslated.

Add the caption directly under the "Nouveautés" heading, shown only when not French:

```tsx
        <h3 className="info__panel-title">{t('info.whatsNew')}</h3>
        {lang !== 'fr' && <p className="info__notes-lang">{t('info.notesInFrench')}</p>}
        <ul className="info__notes">
```

- [ ] **Step 4: Run the test, expect pass**

Run: `pnpm test -- languageSwitch.test.tsx`
Expected: PASS. Then `pnpm test` (existing `infoScreen.test.tsx` renders bare → French → caption absent, unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/screens/InfoScreen.tsx src/__tests__/languageSwitch.test.tsx
git commit -m "feat(i18n): translate À propos and add French-notes caption"
```

---

## Task 11: Release bump (version + changelog + release notes)

Per `CLAUDE.md`, all three move together in one commit; `src/__tests__/releaseNotes.test.ts` enforces it.

**Files:**
- Modify: `package.json`, `CHANGELOG.md`, `src/domain/releaseNotes.ts`

- [ ] **Step 1: Bump `package.json`**

Change `"version": "0.4.0"` → `"version": "0.5.0"`.

- [ ] **Step 2: Prepend a `CHANGELOG.md` section** (English, Keep a Changelog)

```markdown
## [0.5.0] - 2026-06-13

### Added
- Language choice (French, German, English) selectable in Settings; the whole
  interface switches live and `<html lang>` follows the choice. French remains
  the default. À propos labels are translated; the release notes themselves
  stay in French, with a caption shown in other languages.
```

(Place it above the previous top entry, keeping the file's existing format.)

- [ ] **Step 3: Prepend a `releaseNotes.ts` entry** (French, child-friendly, newest first)

```ts
  {
    version: '0.5.0',
    date: '2026-06-13',
    changes: [
      'Tu peux maintenant choisir la langue : français, allemand ou anglais, dans les Paramètres.',
    ],
  },
```

(Add as the first element of the `releaseNotes` array. Match the existing object shape.)

- [ ] **Step 4: Verify the drift guard + full suite + build**

Run: `pnpm test && pnpm build`
Expected: `releaseNotes.test.ts` passes (version 0.5.0 matches across the three sources); all tests green; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md src/domain/releaseNotes.ts
git commit -m "chore(release): 0.5.0 — language choice (FR/DE/EN)"
```

---

## Final verification (run after all tasks)

- [ ] `pnpm test` — full suite green.
- [ ] `pnpm build` — typecheck + production build succeed.
- [ ] Manual smoke (dev server): switch language in Settings, confirm Home/Session/Results/Progress/À propos all change, the À propos caption appears in DE/EN, and the page `<html lang>` updates.

---

## Self-review notes

- **Spec coverage:** module layout (T1), context+hook+default+`<html lang>` (T2), `Settings.language`+migration (T3), App wiring (T4), live selector + native labels (T5), every string-bearing file from the inventory (T5–T10), À propos caption (T10), release bump (T11), tests including the roadmap's 3-language Home assertion (T6) and completeness guard (T1).
- **Known watch-points for the executor:** the `t` shadow in `ScoreLineChart` (T9 step 2); `NumPad`/`Countdown`/`Timer` use arrow-function-with-implicit-return bodies that must become block bodies to host the hook; `PaperSessionScreen` and `ResultsScreen` have multiple sub-components each needing their own `useI18n()` call.
- **Out of scope (per spec):** voice mode, translating release-note bodies, locale number formatting, RTL.
