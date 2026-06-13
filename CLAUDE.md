# math-quizz

A small, fully client-side React + TypeScript app: timed multiplication and
division drills for a child who already knows the tables. French UI. State
(settings, session history) lives in `localStorage` — no backend, no account.

## Commands

- `pnpm dev` — local dev server (Vite)
- `pnpm test` — run the vitest suite once (`pnpm test:watch` to watch)
- `pnpm build` — typecheck (`tsc --noEmit`) then production build

## Releasing — keep three things in sync

The app version, the technical changelog, and the in-app "Nouveautés" notes
each have a single source of truth. On **every** version bump, change all
three together in the same commit:

1. **`package.json` `version`** — the one source of truth for the version
   number. It is injected into the bundle at build time (`vite.config.ts` →
   `__APP_VERSION__`) and shown on the À propos screen. Never hard-code a
   version in UI source.

2. **`CHANGELOG.md`** — contributor-facing, **English**, in
   [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format
   (`## [x.y.z] - YYYY-MM-DD` with `### Added` / `### Changed` / `### Fixed`).
   Technical detail is welcome here.

3. **`src/domain/releaseNotes.ts`** — user-facing, **French**, child-friendly
   (tutoiement), shown in-app on the À propos screen. Prepend a new
   `{ version, date, changes: [...] }` entry at the top (newest first). Keep
   notes short and about what the *user* gains, not implementation detail.

The drift guard (`src/__tests__/releaseNotes.test.ts`) ties all three to the
version in `package.json`:
- `releaseNotes[0].version` must equal `package.json` version (step 1 ↔ 3).
- `CHANGELOG.md` must contain a `## [<version>]` section for it (step 1 ↔ 2).

So forgetting either the French note or the changelog entry on a bump makes
`pnpm test` fail. The `CHANGELOG.md` check is intentionally loose — it only
verifies the section header exists, not its contents.

## Deploy

Hosted on Google Cloud Run in `europe-west6` (Zürich). See `README.md` for the
`gcloud run deploy` command.

## Conventions

- TDD: write the failing test first (see existing `src/__tests__/`), then the
  minimal code to pass. Tests use vitest globals + Testing Library.
- New screens follow the `App.tsx` screen-state-machine pattern and mirror an
  existing screen (e.g. `ProgressScreen` / `InfoScreen`): a header with a 🏠
  back button, then `*__panel` sections. Component CSS sits beside the `.tsx`.
- French copy throughout the UI.
