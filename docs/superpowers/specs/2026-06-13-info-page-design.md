# Info page ("À propos") + changelog sync — design

Date: 2026-06-13
Status: approved (pending spec review)

## Goal

Add an in-app info page that shows the app version, a French user-oriented
summary of recent changes, and a short paragraph about where the user's data
is stored. Establish a contributor workflow (in `CLAUDE.md`) that keeps the
technical changelog, the in-app notes, and the version number in sync, backed
by an automated drift-guard test.

## Audience split (the core constraint)

Two changelog artifacts, different readers:

- `CHANGELOG.md` — English, *Keep a Changelog* format, for contributors. Unchanged in format.
- `src/domain/releaseNotes.ts` — French, user-oriented, rendered in-app for the child/parent.

Single source of truth per fact:
- Version number: `package.json` `version` (never re-typed in UI source).
- Technical history: `CHANGELOG.md`.
- User-facing history: `releaseNotes.ts`.

## Navigation

- Add `'info'` to the `Screen` union in `src/App.tsx`.
- Add an ℹ️ button to the `HomeScreen` header beside 📈/⚙
  (`aria-label="à propos"`), wired through a new `onOpenInfo` prop.
- `App` renders `<InfoScreen onBack={() => setScreen('home')} />` for `'info'`.
- `InfoScreen` mirrors `ProgressScreen`: header (`<h2>À propos</h2>` + 🏠 back
  button, `aria-label="retour à l'accueil"`) then stacked `panel` sections.
  Reuse the existing panel visual language (`InfoScreen.css` modeled on
  `ProgressScreen.css`).

## Version surfacing

- `vite.config.ts` reads `package.json` and injects:
  `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`.
- Declare `declare const __APP_VERSION__: string;` in `src/vite-env.d.ts`.
- Page shows `Math Quizz · v{__APP_VERSION__}`.

## In-app changelog

`src/domain/releaseNotes.ts`:

```ts
export type ReleaseNote = { version: string; date: string; changes: string[] };
export const releaseNotes: ReleaseNote[] = [ /* newest first */ ];
```

Initial entries (French, child-friendly tutoiement, all three shown
newest-first as a "Nouveautés" panel — version + date + bullets):

- 0.3.0 (2026-06-13): « Installe l'appli sur ta tablette ou ton téléphone, et
  joue même hors connexion. »
- 0.2.0 (2026-06-13): « Nouvelle page *Mes résultats* : suis tes scores et
  repère les opérations à revoir. »
- 0.1.0 (2026-05-09): « Première version : entraînement chronométré aux tables
  de multiplication et de division, au clavier ou sur papier. »

## Data-storage paragraph ("Tes données" panel)

French, reassuring, plain. Conveys: settings + results live only in this
browser on this device (`localStorage`); nothing is sent over the network; no
account, no tracking; data does not follow the user to another device or
browser; clearing browser data — or the clear-history action in Paramètres —
erases everything. (Exact label of the clear-history control to be confirmed
against `SettingsScreen.tsx` during implementation.)

## Drift guard

`src/__tests__/releaseNotes.test.ts`:
- `releaseNotes[0].version === package.json version` (read `package.json` via
  `fs.readFileSync` to avoid changing tsconfig).
- Entries are strictly newest-first by semver.
- Every entry has a non-empty `changes` array.

A release that bumps `package.json` but forgets the French note fails CI.

## CLAUDE.md (root)

Brief project context + a **Releasing** section: on every version bump, do all
three together —
1. Bump `version` in `package.json`.
2. Add a `CHANGELOG.md` section (English, Keep a Changelog).
3. Prepend a matching entry to `src/domain/releaseNotes.ts` (French,
   user-oriented). The drift-guard test enforces 1 ↔ 3.

## Tests (TDD)

- `releaseNotes.test.ts` — drift guard + ordering + non-empty (above).
- `infoScreen.test.tsx` — renders the version string, the latest release note,
  and the data-storage paragraph.
- Extend `homeScreen.test.tsx` — ℹ️ button present and calls `onOpenInfo`.

## Files

New: `src/screens/InfoScreen.tsx`, `src/screens/InfoScreen.css`,
`src/domain/releaseNotes.ts`, `src/__tests__/releaseNotes.test.ts`,
`src/__tests__/infoScreen.test.tsx`, `/CLAUDE.md`.

Edited: `src/App.tsx`, `src/screens/HomeScreen.tsx`, `vite.config.ts`,
`src/vite-env.d.ts`, `src/__tests__/homeScreen.test.tsx`.

## Out of scope (YAGNI)

No markdown rendering, no collapse/expand or "show older" toggle (only 3
entries), no i18n framework (app is French-only today), no auto-generation of
French notes from `CHANGELOG.md`.
