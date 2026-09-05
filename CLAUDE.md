# math-quizz

A small, fully client-side React + TypeScript app: timed multiplication and
division drills for a child who already knows the tables. Trilingual UI
(FR/DE/EN) via `src/i18n/`. State (settings, session history) lives in
`localStorage` — no backend, no account.

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

3. **`src/domain/releaseNotes.ts`** — user-facing, child-friendly, shown in-app
   on the À propos screen. Prepend a new
   `{ version, date, changes: { fr, de, en } }` entry at the top (newest first).
   `changes` is `Record<Language, string[]>`: write the note in **all three
   languages** (tutoiement FR / du-form DE / casual EN), each referencing the
   same UI labels the child sees. Keep notes short and about what the *user*
   gains, not implementation detail.

The drift guard (`src/__tests__/releaseNotes.test.ts`) ties all three to the
version in `package.json`:
- `releaseNotes[0].version` must equal `package.json` version (step 1 ↔ 3).
- `CHANGELOG.md` must contain a `## [<version>]` section for it (step 1 ↔ 2).
- every entry must carry non-empty `fr`, `de` **and** `en` notes — a missing
  translation fails `pnpm test`.

So forgetting the changelog entry, or any of the three language notes, on a bump
makes `pnpm test` fail. The `CHANGELOG.md` check is intentionally loose — it
only verifies the section header exists, not its contents.

## The backup format is a published contract

Settings → Tes données exports/imports the whole profile as one JSON file. Three
things describe that file and must move together:

- `src/domain/backup.ts` — the envelope constants and `validateBackup`;
- `public/schemas/math-quizz-backup-v1.schema.json` — the JSON Schema, deployed
  with the app and linked from the Settings screen, so third parties can process
  their own export;
- `docs/data-format.md` — the same contract in prose.

`src/__tests__/backup.test.ts` pins the schema's `$id`, `format`, `formatVersion`
and `required` list to the code, and requires a non-empty `description` on every
documented field — so a new field with no documentation fails `pnpm test`.

Additive changes keep `formatVersion: 1`. Anything that would make an existing
export unreadable bumps it and ships a `-v2` schema next to v1; the old URL keeps
resolving.

Two validation policies, deliberately different — don't "simplify" them into
one: **structure is rejected** (a malformed session or a non-canonical error key
fails the whole file, because a partial history that looks complete is worse than
a refusal), **settings are sanitised** (every setting has a safe default, and
`selectedTables` must never end up empty — `generateQuestions` throws on empty).

## Statistics are recency-weighted

Per-pair figures come from `domain/stats.ts` → `aggregatePairs(history)`, which
returns raw and weighted counters together. Keep the two uses apart:

- **raw** (`attempts` / `errors` / `timeouts`) — confidence thresholds and any
  number shown to the child;
- **weighted** (`weightedAttempts` / `weightedFailures`, via
  `weightedErrorRate`) — ranking and colour.

Collapsing them would either flag pairs the child has already fixed or judge a
pair on one recent lucky answer. Decay is per *session*, never wall-clock: it
stays deterministic and does not blank the progress screen after a holiday.

`HISTORY_LIMIT` is not arbitrary any more — it is sized to the half-life, and
`stats.test.ts` asserts `HISTORY_LIMIT >= 5 * RECENCY_HALF_LIFE_SESSIONS`. Raise
one and you must raise the other.

There is **no stored statistics accumulator**. Versions up to 0.10.0 kept one
that nothing read; don't reintroduce it, and don't "optimise" the render by
caching derived stats into localStorage — a running total cannot be decayed.

## Deploy

Static bundle on **Firebase Hosting** (GCP project `modern-ally-102412`), live at
`math-quizz.mrpia.ch`. Deploy with `pnpm ship` (builds, then `firebase deploy
--only hosting`). See `README.md` and
`docs/superpowers/specs/2026-06-13-firebase-hosting-design.md`.

## Conventions

- TDD: write the failing test first (see existing `src/__tests__/`), then the
  minimal code to pass. Tests use vitest globals + Testing Library.
- New screens follow the `App.tsx` screen-state-machine pattern and mirror an
  existing screen (e.g. `ProgressScreen` / `InfoScreen`): a header with a 🏠
  back button, then `*__panel` sections. Component CSS sits beside the `.tsx`.
- UI copy lives in `src/i18n/{fr,de,en}.ts`; every user-facing string is keyed
  and translated into all three languages. `i18n.test.ts` enforces that the
  three dictionaries share exactly the same keys.
