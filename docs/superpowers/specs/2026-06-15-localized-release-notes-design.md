# Localized release notes (À propos / Nouveautés in FR, DE, EN)

- **Date:** 2026-06-15
- **Status:** Approved (design), pending spec review
- **Ships as:** 0.9.0

## Problem

The app already supports three languages (FR, DE, EN) through a complete i18n
system: `src/i18n/{fr,de,en}.ts` dictionaries, a `translate()` function with a
French fallback, an `I18nContext`/`LanguageProvider`, and a `LanguageToggle`.
The entire **À propos** (InfoScreen) is translated — title, version, credit,
data section, the "Nouveautés" heading — with **one exception**: the
release-note content.

`src/domain/releaseNotes.ts` stores each entry as
`{ version, date, changes: string[] }`, and `changes` holds hardcoded French
strings. The code already acknowledges the gap: `InfoScreen.tsx:61` renders a
disclaimer (`info.notesInFrench` → "Ces notes sont en français.") whenever the
selected language is not French. So a German- or English-speaking child reading
"Nouveautés" sees French text plus an apology.

(Aside: the project `CLAUDE.md` still describes the app as "French UI" /
"French copy throughout the UI". That is stale and actively misdescribes the
codebase; this work corrects it.)

## Goals

- Show release-note content in the user's selected language (FR, DE, EN).
- Backfill **all 9 existing entries** (0.1.0 → 0.8.0) into DE + EN.
- Make the release ritual require all three languages going forward, enforced
  by the existing drift-guard test so a missing translation fails `pnpm test`.
- Remove the now-obsolete "notes are in French" disclaimer (and its dead key
  and CSS).

## Non-goals

- No layout or visual change to InfoScreen beyond removing the disclaimer line.
- No change to the language-selection UX (already works).
- No change to other screens.
- Reworking the "Buy me a coffee" copy for a child audience — tracked as a
  **separate session todo** (see Follow-ups), not part of this change.

## Decision: `changes` becomes `Record<Language, string[]>` (Approach A)

```ts
import type { Language } from '../i18n/types'; // type-only; erased at build

export type ReleaseNote = {
  version: string;
  /** ISO date, YYYY-MM-DD. Shared across languages. */
  date: string;
  /** User-oriented change notes, one array per language. */
  changes: Record<Language, string[]>;
};
```

Rationale:

- **Single source of truth for `version`/`date`.** They stay shared, so they
  cannot drift across languages.
- **Co-located translations** match the existing "bump three things in one
  commit" release ritual — you write the three languages of a note in one place.
- **Cheap enforcement.** The drift guard can assert all three are present and
  non-empty for every entry.
- **Smallest diff.** Only the type, the data, one line in InfoScreen, and the
  cleanup change.

Type dependency note: importing `Language` makes `domain/releaseNotes.ts`
depend on `i18n/types.ts`. It is a **type-only** import (zero runtime, erased by
`tsc`), and `Language` is the canonical, single-sourced union of the three
codes — preferable to re-declaring `'fr' | 'de' | 'en'` inline. Release notes
are presentation content anyway; relocating the file out of `domain/` is out of
scope.

### Rejected alternatives

- **B — put notes in the i18n dictionaries.** Those are
  `Record<TranslationKey, string>` (flat strings). Notes are structured
  (version, date, *array*), forcing synthetic keys like `releaseNote.0.8.0.1`
  and duplicating version/date across three files. Wrong tool.
- **C — three parallel per-language arrays/files keyed by version.** Cleaner
  per-language editing, but version/date live in three places joined by key —
  more files, more drift surface, more test complexity. Overkill for a
  one-maintainer app with 9 short entries.

## Render change (`src/screens/InfoScreen.tsx`)

- Render `note.changes[lang] ?? note.changes.fr` (the French fallback mirrors
  `translate()`'s philosophy; it is a safety net, since the drift guard
  guarantees all three exist).
- Delete the `lang !== 'fr'` disclaimer block (line 61).

## Cleanup

- Remove the `info.notesInFrench` key from **all three** dictionaries
  (`fr.ts`, `de.ts`, `en.ts`) — required by both the TS excess-property check
  and the `i18n.test.ts` key-parity test (`i18n.test.ts:26`).
- Remove the `.info__notes-lang` rule from `InfoScreen.css` (line 68).

## New release 0.9.0

This is a user-facing change, so per the release ritual it bumps the version
and adds notes — and that note becomes the first one authored in all three
languages from the start (dogfooding the new rule):

1. `package.json` `version` → `0.9.0`.
2. `CHANGELOG.md` → new `## [0.9.0] - 2026-06-15` section
   (`### Changed`: release notes localized to FR/DE/EN; disclaimer removed).
3. `src/domain/releaseNotes.ts` → prepend the 0.9.0 entry (see table).

## `CLAUDE.md` updates (project)

- Fix the stale intro: replace "French UI" / "French copy throughout the UI"
  with an accurate description (trilingual UI via `src/i18n/`, FR/DE/EN).
- Rewrite release **step 3** (`releaseNotes.ts`): `changes` is now
  `Record<Language, string[]>`; every new entry must provide **FR, DE, and EN**
  notes (child-friendly: tutoiement FR, du-form DE, casual "you" EN), each
  referencing the same UI labels the child sees.
- Update the drift-guard description: `pnpm test` now also fails if any of the
  top entry's three languages is missing or empty.

## Tests (TDD — write first, then implement)

1. **`releaseNotes.test.ts`** — replace the "every entry has ≥1 non-empty
   change" test with one asserting **every entry has `fr`, `de`, and `en`
   arrays, each with ≥1 non-empty string**. Keep the existing
   version-matches-package.json, CHANGELOG-section, and newest-first tests.
2. **`infoScreen.test.tsx`** —
   - Fix existing references: `latest.changes[0]` → `latest.changes.fr[0]`
     (default render has no provider, so `lang` is `'fr'`).
   - Add a test rendering with `renderWithLanguage(<InfoScreen .../>, 'de')`
     (or `'en'`) that asserts the matching-language note text shows **and** the
     "notes are in French" disclaimer is **absent**.

## Proposed translations (for review)

UI labels are matched to each language's dictionary:
mode "Entraînement"/"Üben"/"Practice", "Liste"/"Liste"/"List",
"Mes résultats"/"Meine Ergebnisse"/"My results",
"Paramètres"/"Einstellungen"/"Settings", "À propos"/"Über"/"About".

### 0.9.0 — 2026-06-15 (new)

- **FR:** Les nouveautés s’affichent maintenant dans ta langue (français,
  allemand ou anglais) — fini les notes toujours en français.
- **DE:** Die Neuigkeiten erscheinen jetzt in deiner Sprache (Französisch,
  Deutsch oder Englisch) — keine Hinweise mehr nur auf Französisch.
- **EN:** What’s new now shows in your language (French, German or English) —
  no more notes stuck in French.

### 0.8.0 — 2026-06-14 (List mode)

- **FR (existing):** Nouveau mode « Liste » : fais défiler une liste
  d’opérations avec leurs réponses cachées. Montre-les toutes d’un coup, ou tape
  une ligne pour voir une seule réponse. Le bouton « Nouvelle liste » en génère
  d’autres.
- **DE:** Neuer Modus „Liste": Scrolle durch eine Liste von Aufgaben mit
  versteckten Antworten. Zeig alle auf einmal an oder tippe auf eine Zeile, um
  nur eine Antwort zu sehen. Mit „Neue Liste" bekommst du neue Aufgaben.
- **EN:** New "List" mode: scroll through a list of problems with their answers
  hidden. Show them all at once, or tap a row to reveal just one. The "New list"
  button gives you more.

### 0.7.1 — 2026-06-14 (coffee link) — *see Follow-ups*

- **FR (existing):** Tu peux maintenant m’offrir un café ☕ depuis la page
  « À propos » pour soutenir l’appli.
- **DE:** Du kannst mir jetzt von der Seite „Über" aus einen Kaffee ☕
  spendieren, um die App zu unterstützen.
- **EN:** You can now buy me a coffee ☕ from the "About" page to support the
  app.

### 0.7.0 — 2026-06-14 (language switch on home)

- **FR (existing):** Tu peux maintenant changer la langue (FR, DE, EN)
  directement en haut de l’écran d’accueil, sans passer par les Paramètres.
- **DE:** Du kannst die Sprache (FR, DE, EN) jetzt direkt oben auf dem
  Startbildschirm wechseln, ohne in die Einstellungen zu gehen.
- **EN:** You can now switch the language (FR, DE, EN) right at the top of the
  home screen, without going into Settings.

### 0.6.0 — 2026-06-13 (Practice mode + its results)

- **FR1 (existing):** Nouveau mode « Entraînement » : pas de chrono. Après
  chaque réponse, tu vois tout de suite si c’est juste et la bonne réponse, puis
  tu passes à la suivante.
- **DE1:** Neuer Modus „Üben": keine Stoppuhr. Nach jeder Antwort siehst du
  sofort, ob sie richtig ist und wie die richtige Antwort lautet, dann geht es
  zur nächsten.
- **EN1:** New "Practice" mode: no timer. After each answer you see right away
  whether it’s correct and what the right answer is, then you go to the next one.
- **FR2 (existing):** Tes entraînements ont leur propre page de résultats :
  ouvre « Mes résultats » et choisis « Entraînement ».
- **DE2:** Deine Übungen haben ihre eigene Ergebnisseite: Öffne „Meine
  Ergebnisse" und wähle „Üben".
- **EN2:** Your practice sessions have their own results page: open "My results"
  and choose "Practice".

### 0.5.1 — 2026-06-13 (selected buttons readable on hover)

- **FR (existing):** Les boutons que tu as choisis (comme l’opération ou la
  langue) restent bien lisibles quand tu passes la souris dessus.
- **DE:** Die Schaltflächen, die du ausgewählt hast (wie die Rechenart oder die
  Sprache), bleiben gut lesbar, wenn du mit der Maus darüberfährst.
- **EN:** The buttons you’ve picked (like the operation or the language) stay
  easy to read when you hover over them.

### 0.5.0 — 2026-06-13 (choose language in Settings)

- **FR (existing):** Tu peux maintenant choisir la langue : français, allemand
  ou anglais, dans les Paramètres.
- **DE:** Du kannst jetzt in den Einstellungen die Sprache wählen: Französisch,
  Deutsch oder Englisch.
- **EN:** You can now choose the language — French, German or English — in
  Settings.

### 0.4.0 — 2026-06-13 (About page)

- **FR (existing):** Nouvelle page « À propos » : la version de l’appli, les
  nouveautés, et où sont rangées tes données.
- **DE:** Neue Seite „Über": die App-Version, die Neuigkeiten und wo deine
  Daten gespeichert sind.
- **EN:** New "About" page: the app version, what’s new, and where your data is
  kept.

### 0.3.0 — 2026-06-13 (install + offline)

- **FR (existing):** Installe l’appli sur ta tablette ou ton téléphone, et joue
  même hors connexion.
- **DE:** Installiere die App auf deinem Tablet oder Handy und spiele sogar ohne
  Internet.
- **EN:** Install the app on your tablet or phone, and play even when you’re
  offline.

### 0.2.0 — 2026-06-13 (My results page)

- **FR (existing):** Nouvelle page « Mes résultats » : suis tes scores et repère
  les opérations à revoir.
- **DE:** Neue Seite „Meine Ergebnisse": Verfolge deine Punkte und finde die
  Aufgaben, die du üben solltest.
- **EN:** New "My results" page: track your scores and spot the problems to
  review.

### 0.1.0 — 2026-05-09 (first version)

- **FR (existing):** Première version : entraînement chronométré aux tables de
  multiplication et de division, au clavier ou sur papier.
- **DE:** Erste Version: Training mit Stoppuhr für die Reihen der Multiplikation
  und Division, mit der Tastatur oder auf Papier.
- **EN:** First version: timed practice on the multiplication and division
  tables, with the keyboard or on paper.

## Verification

- `pnpm test` — drift guard + InfoScreen tests pass; key-parity test still
  passes after removing `info.notesInFrench`.
- `pnpm build` — `tsc --noEmit` confirms no dictionary has a stray key and the
  new `Record<Language, string[]>` type checks.
- Manual: open À propos, switch FR/DE/EN via the home toggle, confirm notes
  follow the language and no disclaimer appears.

## Follow-ups (out of scope here)

- **Coffee copy for kids** (session todo #1): rework `info.coffee` and the
  buymeacoffee link so it doesn't ask a child to pay directly — point them to
  their parents instead (e.g. "Tu aimes l'appli ? Demande à tes parents — ils
  peuvent m'offrir un café ☕"). Also decide whether to soften the historical
  0.7.1 note. Revisit after this ships.
