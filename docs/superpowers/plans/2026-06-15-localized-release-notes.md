# Localized Release Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the À propos "Nouveautés" release notes in the user's selected language (FR/DE/EN), backfilling all 9 historical entries, and ship it as 0.9.0.

**Architecture:** Change `ReleaseNote.changes` from `string[]` to `Record<Language, string[]>` (single-sourced version/date, three co-located translations). InfoScreen renders `changes[lang] ?? changes.fr`. The "notes are in French" disclaimer, its `info.notesInFrench` key, and its CSS are removed. The drift-guard test is extended to require all three languages.

**Tech Stack:** React + TypeScript, Vite, vitest + Testing Library, existing `src/i18n` system.

---

## File Structure

- `src/domain/releaseNotes.ts` — **modify**: new type + all entries localized + new 0.9.0 entry.
- `src/screens/InfoScreen.tsx` — **modify**: render `changes[lang]`, drop disclaimer.
- `src/i18n/{fr,de,en}.ts` — **modify**: remove `info.notesInFrench` (all three, for key parity).
- `src/screens/InfoScreen.css` — **modify**: remove `.info__notes-lang` rule.
- `src/__tests__/releaseNotes.test.ts` — **modify**: per-language non-empty assertion.
- `src/__tests__/infoScreen.test.tsx` — **modify**: fix `changes.fr[0]` ref + add DE-language test.
- `package.json` — **modify**: version → 0.9.0.
- `CHANGELOG.md` — **modify**: add `## [0.9.0]` section.
- `CLAUDE.md` — **modify**: fix stale "French UI" wording; rewrite release step 3; note drift-guard 3-language rule.

German quote convention: this codebase uses Swiss guillemets `« … »` in German copy (`de.ts` `info.dataP2`), not German `„…"`. The German notes below follow that.

---

## Task 1: Update tests to the new contract (red)

**Files:**
- Modify: `src/__tests__/releaseNotes.test.ts:31-39`
- Modify: `src/__tests__/infoScreen.test.tsx`

- [ ] **Step 1: Rewrite the per-entry test in `releaseNotes.test.ts`**

Replace the `it('every entry has a date and at least one non-empty change note', ...)` block (lines 31-39) with:

```ts
  it('every entry has a date and non-empty notes in all three languages', () => {
    for (const note of releaseNotes) {
      expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const lang of ['fr', 'de', 'en'] as const) {
        expect(note.changes[lang].length).toBeGreaterThan(0);
        for (const change of note.changes[lang]) {
          expect(change.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
```

- [ ] **Step 2: Fix the existing ref and add a DE test in `infoScreen.test.tsx`**

Add the import at the top (after the existing imports):

```tsx
import { renderWithLanguage } from './renderWithLanguage';
```

In `test('lists the latest release note (version + change text)', ...)`, change:

```tsx
    expect(screen.getByText(latest.changes[0])).toBeInTheDocument();
```

to:

```tsx
    expect(screen.getByText(latest.changes.fr[0])).toBeInTheDocument();
```

Add a new test at the end of the `describe` block:

```tsx
  test('shows notes in the selected language and drops the French disclaimer', () => {
    renderWithLanguage(<InfoScreen version="9.9.9" onBack={() => {}} />, 'de');
    const latest = releaseNotes[0];
    expect(screen.getByText(latest.changes.de[0])).toBeInTheDocument();
    expect(
      screen.queryByText(/auf Französisch|in French|en français/i),
    ).not.toBeInTheDocument();
  });
```

- [ ] **Step 3: Run the tests, expect failure**

Run: `pnpm test`
Expected: FAIL — `releaseNotes.test.ts` and `infoScreen.test.tsx` error because `note.changes` is still `string[]` (`.fr`/`.de` undefined). This confirms the red state. No commit.

---

## Task 2: Localize data, render, cleanup, and bump to 0.9.0 (green)

**Files:**
- Modify: `src/domain/releaseNotes.ts` (full rewrite of type + data)
- Modify: `src/screens/InfoScreen.tsx`
- Modify: `src/i18n/fr.ts:97`, `src/i18n/de.ts:100`, `src/i18n/en.ts:98`
- Modify: `src/screens/InfoScreen.css:68-72`
- Modify: `package.json`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Rewrite `src/domain/releaseNotes.ts`**

Replace the whole file with:

```ts
/**
 * User-facing release notes, shown in the "À propos" screen.
 *
 * Localized and child-friendly (tutoiement FR / du-form DE / casual EN) — this
 * is NOT the technical changelog. See CHANGELOG.md for the contributor-facing
 * log, and CLAUDE.md for the release ritual that keeps the two (and
 * package.json) in sync. The newest entry's `version` MUST equal package.json's
 * version, and every entry MUST carry fr/de/en notes — both enforced by
 * src/__tests__/releaseNotes.test.ts.
 */
import type { Language } from '../i18n/types';

export type ReleaseNote = {
  version: string;
  /** ISO date, YYYY-MM-DD. Shared across languages. */
  date: string;
  /** User-oriented change notes, one array per language. */
  changes: Record<Language, string[]>;
};

/** Newest first. */
export const releaseNotes: ReleaseNote[] = [
  {
    version: '0.9.0',
    date: '2026-06-15',
    changes: {
      fr: [
        'Les nouveautés s’affichent maintenant dans ta langue (français, allemand ou anglais) — fini les notes toujours en français.',
      ],
      de: [
        'Die Neuigkeiten erscheinen jetzt in deiner Sprache (Französisch, Deutsch oder Englisch) — keine Hinweise mehr nur auf Französisch.',
      ],
      en: [
        'What’s new now shows in your language (French, German or English) — no more notes stuck in French.',
      ],
    },
  },
  {
    version: '0.8.0',
    date: '2026-06-14',
    changes: {
      fr: [
        'Nouveau mode « Liste » : fais défiler une liste d’opérations avec leurs réponses cachées. Montre-les toutes d’un coup, ou tape une ligne pour voir une seule réponse. Le bouton « Nouvelle liste » en génère d’autres.',
      ],
      de: [
        'Neuer Modus « Liste »: Scrolle durch eine Liste von Aufgaben mit versteckten Antworten. Zeig alle auf einmal an oder tippe auf eine Zeile, um nur eine Antwort zu sehen. Mit « Neue Liste » bekommst du neue Aufgaben.',
      ],
      en: [
        'New "List" mode: scroll through a list of problems with their answers hidden. Show them all at once, or tap a row to reveal just one. The "New list" button gives you more.',
      ],
    },
  },
  {
    version: '0.7.1',
    date: '2026-06-14',
    changes: {
      fr: [
        'Tu peux maintenant m’offrir un café ☕ depuis la page « À propos » pour soutenir l’appli.',
      ],
      de: [
        'Du kannst mir jetzt von der Seite « Über » aus einen Kaffee ☕ spendieren, um die App zu unterstützen.',
      ],
      en: [
        'You can now buy me a coffee ☕ from the "About" page to support the app.',
      ],
    },
  },
  {
    version: '0.7.0',
    date: '2026-06-14',
    changes: {
      fr: [
        'Tu peux maintenant changer la langue (FR, DE, EN) directement en haut de l’écran d’accueil, sans passer par les Paramètres.',
      ],
      de: [
        'Du kannst die Sprache (FR, DE, EN) jetzt direkt oben auf dem Startbildschirm wechseln, ohne in die Einstellungen zu gehen.',
      ],
      en: [
        'You can now switch the language (FR, DE, EN) right at the top of the home screen, without going into Settings.',
      ],
    },
  },
  {
    version: '0.6.0',
    date: '2026-06-13',
    changes: {
      fr: [
        'Nouveau mode « Entraînement » : pas de chrono. Après chaque réponse, tu vois tout de suite si c’est juste et la bonne réponse, puis tu passes à la suivante.',
        'Tes entraînements ont leur propre page de résultats : ouvre « Mes résultats » et choisis « Entraînement ».',
      ],
      de: [
        'Neuer Modus « Üben »: keine Stoppuhr. Nach jeder Antwort siehst du sofort, ob sie richtig ist und wie die richtige Antwort lautet, dann geht es zur nächsten.',
        'Deine Übungen haben ihre eigene Ergebnisseite: Öffne « Meine Ergebnisse » und wähle « Üben ».',
      ],
      en: [
        'New "Practice" mode: no timer. After each answer you see right away whether it’s correct and what the right answer is, then you go to the next one.',
        'Your practice sessions have their own results page: open "My results" and choose "Practice".',
      ],
    },
  },
  {
    version: '0.5.1',
    date: '2026-06-13',
    changes: {
      fr: [
        'Les boutons que tu as choisis (comme l’opération ou la langue) restent bien lisibles quand tu passes la souris dessus.',
      ],
      de: [
        'Die Schaltflächen, die du ausgewählt hast (wie die Rechenart oder die Sprache), bleiben gut lesbar, wenn du mit der Maus darüberfährst.',
      ],
      en: [
        'The buttons you’ve picked (like the operation or the language) stay easy to read when you hover over them.',
      ],
    },
  },
  {
    version: '0.5.0',
    date: '2026-06-13',
    changes: {
      fr: [
        'Tu peux maintenant choisir la langue : français, allemand ou anglais, dans les Paramètres.',
      ],
      de: [
        'Du kannst jetzt in den Einstellungen die Sprache wählen: Französisch, Deutsch oder Englisch.',
      ],
      en: [
        'You can now choose the language — French, German or English — in Settings.',
      ],
    },
  },
  {
    version: '0.4.0',
    date: '2026-06-13',
    changes: {
      fr: [
        "Nouvelle page « À propos » : la version de l'appli, les nouveautés, et où sont rangées tes données.",
      ],
      de: [
        'Neue Seite « Über »: die App-Version, die Neuigkeiten und wo deine Daten gespeichert sind.',
      ],
      en: [
        'New "About" page: the app version, what’s new, and where your data is kept.',
      ],
    },
  },
  {
    version: '0.3.0',
    date: '2026-06-13',
    changes: {
      fr: [
        "Installe l'appli sur ta tablette ou ton téléphone, et joue même hors connexion.",
      ],
      de: [
        'Installiere die App auf deinem Tablet oder Handy und spiele sogar ohne Internet.',
      ],
      en: [
        'Install the app on your tablet or phone, and play even when you’re offline.',
      ],
    },
  },
  {
    version: '0.2.0',
    date: '2026-06-13',
    changes: {
      fr: [
        'Nouvelle page « Mes résultats » : suis tes scores et repère les opérations à revoir.',
      ],
      de: [
        'Neue Seite « Meine Ergebnisse »: Verfolge deine Punkte und finde die Aufgaben, die du üben solltest.',
      ],
      en: [
        'New "My results" page: track your scores and spot the problems to review.',
      ],
    },
  },
  {
    version: '0.1.0',
    date: '2026-05-09',
    changes: {
      fr: [
        'Première version : entraînement chronométré aux tables de multiplication et de division, au clavier ou sur papier.',
      ],
      de: [
        'Erste Version: Training mit Stoppuhr für die Reihen der Multiplikation und Division, mit der Tastatur oder auf Papier.',
      ],
      en: [
        'First version: timed practice on the multiplication and division tables, with the keyboard or on paper.',
      ],
    },
  },
];
```

- [ ] **Step 2: Update `src/screens/InfoScreen.tsx`**

Delete the disclaimer line (line 61):

```tsx
        {lang !== 'fr' && <p className="info__notes-lang">{t('info.notesInFrench')}</p>}
```

Change the changes map from:

```tsx
                {note.changes.map((change, i) => (
```

to:

```tsx
                {(note.changes[lang] ?? note.changes.fr).map((change, i) => (
```

(`lang` is already destructured from `useI18n()` and stays in use.)

- [ ] **Step 3: Remove `info.notesInFrench` from all three dictionaries**

In `src/i18n/fr.ts` delete: `  'info.notesInFrench': 'Ces notes sont en français.',`
In `src/i18n/de.ts` delete: `  'info.notesInFrench': 'Diese Hinweise sind auf Französisch.',`
In `src/i18n/en.ts` delete: `  'info.notesInFrench': 'These notes are in French.',`

- [ ] **Step 4: Remove the `.info__notes-lang` rule from `src/screens/InfoScreen.css` (lines 68-72)**

```css
.info__notes-lang {
  margin: 0 0 0.6rem;
  font-size: 0.78rem;
  color: var(--color-fg-muted);
}
```

- [ ] **Step 5: Bump `package.json` version to `0.9.0`**

Change `"version": "0.8.0",` → `"version": "0.9.0",`.

- [ ] **Step 6: Add the `## [0.9.0]` section to `CHANGELOG.md`**

Insert immediately after line 6 (the blank line before `## [0.8.0]`):

```md
## [0.9.0] - 2026-06-15

### Changed
- Release notes (the "Nouveautés" list on the À propos screen) are now localized
  to all three supported languages (FR, DE, EN) and follow the selected
  language. `ReleaseNote.changes` is now `Record<Language, string[]>`; all 9
  historical entries were backfilled with DE + EN.

### Removed
- The "these notes are in French" disclaimer, its `info.notesInFrench` i18n key
  (fr/de/en), and the `.info__notes-lang` CSS rule — obsolete now that notes are
  localized.

```

- [ ] **Step 7: Run the full suite, expect green**

Run: `pnpm test`
Expected: PASS — all suites, including the new per-language and DE-render tests.

- [ ] **Step 8: Typecheck + build**

Run: `pnpm build`
Expected: PASS — `tsc --noEmit` confirms no dictionary has a stray key and the `Record<Language, string[]>` shape checks across data, render, and tests.

- [ ] **Step 9: Commit**

```bash
git add src/domain/releaseNotes.ts src/screens/InfoScreen.tsx src/screens/InfoScreen.css \
  src/i18n/fr.ts src/i18n/de.ts src/i18n/en.ts \
  src/__tests__/releaseNotes.test.ts src/__tests__/infoScreen.test.tsx \
  package.json CHANGELOG.md
git commit -m "feat(i18n): localize release notes to FR/DE/EN (0.9.0)"
```

---

## Task 3: Update project CLAUDE.md

**Files:**
- Modify: `CLAUDE.md:4` (intro), `:29-32` (release step 3), `:34-41` (drift guard), `:57` (conventions)

- [ ] **Step 1: Fix the stale "French UI" intro (line 4)**

Change:

```md
division drills for a child who already knows the tables. French UI. State
```

to:

```md
division drills for a child who already knows the tables. Trilingual UI
(FR/DE/EN) via `src/i18n/`. State
```

- [ ] **Step 2: Rewrite release step 3 (lines 29-32)**

Replace with:

```md
3. **`src/domain/releaseNotes.ts`** — user-facing, child-friendly, shown in-app
   on the À propos screen. Prepend a new
   `{ version, date, changes: { fr, de, en } }` entry at the top (newest first).
   `changes` is `Record<Language, string[]>`: write the note in **all three
   languages** (tutoiement FR / du-form DE / casual EN), each referencing the
   same UI labels the child sees. Keep notes short and about what the *user*
   gains, not implementation detail.
```

- [ ] **Step 3: Extend the drift-guard description (lines 34-41)**

Replace with:

```md
The drift guard (`src/__tests__/releaseNotes.test.ts`) ties all three to the
version in `package.json`:
- `releaseNotes[0].version` must equal `package.json` version (step 1 ↔ 3).
- `CHANGELOG.md` must contain a `## [<version>]` section for it (step 1 ↔ 2).
- every entry must carry non-empty `fr`, `de` **and** `en` notes — a missing
  translation fails `pnpm test`.

So forgetting the changelog entry, or any of the three language notes, on a bump
makes `pnpm test` fail. The `CHANGELOG.md` check is intentionally loose — it
only verifies the section header exists, not its contents.
```

- [ ] **Step 4: Fix the "French copy throughout" convention (line 57)**

Replace:

```md
- French copy throughout the UI.
```

with:

```md
- UI copy lives in `src/i18n/{fr,de,en}.ts`; every user-facing string is keyed
  and translated into all three languages. `i18n.test.ts` enforces that the
  three dictionaries share exactly the same keys.
```

- [ ] **Step 5: Sanity-check tests still pass (CLAUDE.md is untested but confirm nothing else drifted)**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): describe trilingual UI and 3-language release ritual"
```

---

## Task 4: Push and open PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/localized-release-notes
```

- [ ] **Step 2: Open the PR**

```bash
gh pr create --title "Localize release notes to FR/DE/EN (0.9.0)" --body "<see below>"
```

Body covers: the French-only island fixed, all 9 entries backfilled, disclaimer/key/CSS removed, drift guard now enforces 3 languages, CLAUDE.md updated, shipped as 0.9.0. Note the coffee-copy follow-up is tracked separately (out of scope).

---

## Self-Review

- **Spec coverage:** data model (T2/S1), render + disclaimer removal (T2/S2), key cleanup (T2/S3), CSS cleanup (T2/S4), 0.9.0 bump + CHANGELOG (T2/S5-6), CLAUDE.md (T3), tests incl. DE render (T1), all 9 translations present (T2/S1). Covered.
- **Placeholder scan:** none — all code/content is inline; PR body content is described and will be written at execution.
- **Type consistency:** `Record<Language, string[]>` used identically in the type, the data, `changes[lang] ?? changes.fr` in render, and `note.changes[lang]` / `note.changes.fr`/`.de` in tests. `Language` imported type-only from `../i18n/types`.
