# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/).

## [0.11.0] - 2026-09-05

### Changed
- Per-pair statistics are now **recency-weighted**. "Paires à revoir" and the
  table heat-map discount older sessions on an exponential curve with a
  half-life of `RECENCY_HALF_LIFE_SESSIONS` (10 sessions), so a pair the child
  has since mastered stops being flagged instead of carrying its old failures
  forever. Decay is measured in sessions, not wall-clock time: deterministic,
  testable without mocking a clock, and it never blanks the progress screen
  after a school holiday.
- Confidence and ranking now come from different numbers, deliberately: the
  `minAttempts` threshold and the "3 / 5" counts shown on each row stay **raw**,
  while ordering and colour use the **weighted** rate. A pair practised three
  times long ago is still judged as having three attempts; it just ranks low.
- `domain/stats.ts` is rebuilt around `aggregatePairs`, which folds a history
  into raw and weighted counters in one pass, plus `recencyWeight` and
  `weightedErrorRate`. It replaces `aggregateErrors` / `mergeIntoErrors`, and
  `ErrorStat` / `ErrorStats` move to `domain/backup.ts` as `LegacyErrorStat` /
  `LegacyErrorStats` — the live domain no longer computes that shape.
- `HISTORY_LIMIT` gains a reason. It was an arbitrary storage guard (50 sessions
  is 97 KB, ~2% of a 5 MB quota — it was never buying much); it is now the span
  over which weighting is non-negligible. A test asserts
  `HISTORY_LIMIT >= 5 * RECENCY_HALF_LIFE_SESSIONS`, so raising the half-life
  without raising the cap fails the suite instead of silently truncating.
- The progress screen states the rule (`progress.recencyNote`, FR/DE/EN) rather
  than weighting silently.

### Removed
- The lifetime error accumulator. `recordSession` maintained
  `mathquizz:profile:default:errors` on every session and **no screen ever read
  it** — `ProgressScreen` recomputed from `history` throughout. It cannot be
  decayed either, being a running total with no timestamps, so recency weighting
  made it definitively redundant. `saveErrors` / `loadErrors` are gone, and the
  key is removed on `clearAll` and on import so nothing stale is left behind.
- No format bump was needed: `data.errors` was already optional in v1. Exports
  simply stop emitting it, files that carry it still validate and still import
  (the section is shape-checked, then dropped), and the schema now marks it
  `"deprecated": true`.

### Fixed
- The import confirmation's "Paires" count came from the error accumulator.
  It now counts distinct canonical pairs across the imported histories, so it
  keeps meaning something.

## [0.10.0] - 2026-09-05

### Added
- Export and import of the local data, from a new "Tes données" panel in
  Settings. Export writes settings, test history, training history and the
  lifetime error counters to one pretty-printed JSON file
  (`math-quizz-backup-<date>.json`); import reads one back after a confirmation
  dialog that shows what the file contains. `errors` travels alongside
  `history` rather than being recomputed from it: history is capped at 50
  sessions while the counters accumulate for the life of the profile and are
  never evicted, so past that point they are the only record left. (The progress
  screen recomputes from `history` today and does not read them — see the note
  below.)
- The file format is published, not internal. `public/schemas/math-quizz-backup-v1.schema.json`
  (JSON Schema 2020-12, every field documented) is deployed with the app at
  `/schemas/math-quizz-backup-v1.schema.json` and linked from the Settings
  panel, so anyone can process their own export; `docs/data-format.md` covers
  the same ground in prose with `jq` recipes.
- `src/domain/backup.ts` — envelope (`format` / `formatVersion` / `data`),
  `validateBackup`, and the two validation policies: structure is rejected
  (a malformed session or a non-canonical error key fails the whole file,
  rather than silently importing a partial history), settings are sanitised
  (out-of-range numbers clamped, unknown enum values defaulted, and
  `selectedTables` never left empty — `generateQuestions` throws on empty).
- `exportProfile` / `importProfile` in `storage/profileStore.ts`. Import is a
  restore, not a merge; an oversized incoming history is trimmed to the newest
  50, the cap the app applies to its own writes.
- `SETTINGS_BOUNDS` in `domain/session.ts`, now the single source of the
  numeric ranges shared by the Settings form and the importer.
- `PROFILE_ID` exported from `storage/profileStore.ts`: every storage key now
  routes through it, which is the whole storage-side change that multi-profile
  (roadmap item 4) will need.

### Fixed
- Importing left the three numeric inputs on the Settings form showing their
  pre-import values — they are seeded from props on first render only. Pressing
  "Enregistrer" afterwards wrote those stale numbers back over the imported
  settings. `confirmImport` now refreshes the fields from the imported backup.

### Changed
- `SettingsScreen` takes two new props, `onExport` and `onImport`; `App` wires
  them to the store and re-syncs its `settings` state after an import.
- Roadmap item 4 is rewritten as "Multiple named local profiles", with the
  no-credentials constraint stated explicitly, and new items 9 (export/import,
  done) and 10 (merge on import, deferred — sessions carry no id, and summing
  error counters double-counts pairs shared between two devices).

## [0.9.0] - 2026-06-15

### Changed
- Release notes (the "Nouveautés" list on the À propos screen) are now localized
  to all three supported languages (FR, DE, EN) and follow the selected
  language. `ReleaseNote.changes` is now `Record<Language, string[]>`; all 9
  historical entries were backfilled with DE + EN.
- App support is reframed for a child audience. The "Buy me a coffee" copy no
  longer asks the child to pay: it invites the child to tell their parents, who
  can choose to support the app (or not), with the support action as an inline
  link in the sentence (new `info.coffeeLink` key; `info.coffee` is the full
  sentence with a `{link}` placeholder). It now lives in a dedicated "Soutenir
  l'appli" panel near the top of the À propos screen (new `info.supportTitle`
  key), and the historical 0.7.1 note is reworded to match the same
  parent-routed framing.
- The À propos screen is tightened to four sections. The app name, version, and
  credit + contact email now share one header block (the credit line reads e.g.
  "Conçu avec 💖 à Zürich, Suisse par info@mrpia.ch", with the email as an inline
  link), followed by Soutenir l'appli, Tes données, and Nouveautés.
- The round 🏠 back buttons (À propos, Mes résultats, Liste) now use the home
  screen's icon-button hover (background + border tint) instead of a lift
  animation, for a consistent feel across screens.
- Settings now uses the same top-right 🏠 home button as every other non-home
  screen (previously a left-corner ← back button), and drops the now-unused
  `settings.backAria` string.
- Paper test mode no longer shows the on-screen countdown bar, to remove a
  visible time-pressure cue. Questions still auto-advance after the configured
  per-question time (the timer is unchanged) — only the draining bar is gone.
  The `Countdown` component (used only here) was removed and its timer inlined
  into `PaperSessionScreen`.

### Removed
- The "these notes are in French" disclaimer, its `info.notesInFrench` i18n key
  (fr/de/en), and the `.info__notes-lang` CSS rule — obsolete now that notes are
  localized.

## [0.8.0] - 2026-06-14

### Added
- **"Liste" play mode**: a fourth option in the "How to play" toggle that shows
  a scrollable list of `questionCount` operations using the same content
  generation as the drills. Answers are hidden by default; a button reveals or
  hides them all at once, tapping a single row flips just that answer, and a
  "Nouvelle liste" button reshuffles in place. The list is a view — it records
  no session. New `ExerciseListScreen`; `formatOperation` extracted from
  `QuestionCard` for shared operation rendering. New i18n keys (`answerMode.list`,
  `home.startList`, `home.summaryList`, `list.*`) in fr/de/en.

## [0.7.1] - 2026-06-14

### Added
- "Buy me a coffee" link (☕ → https://buymeacoffee.com/mrpia, opens in a new
  tab) in the About page's credit panel. New `info.coffee` key in fr/de/en.

### Changed
- About page tidied: sections reordered and the credit line simplified
  (now "Made with 💖 in Zürich").

## [0.7.0] - 2026-06-14

### Added
- **Language selector on the home page**: a 3-way segmented toggle showing the
  language code (FR / DE / EN) above the native name, placed as the first widget
  under the title — the UI language is now changeable without opening Settings.
  New reusable `src/components/LanguageToggle.tsx`; the code badge is
  `aria-hidden` so each option's accessible name stays the native label.

### Changed
- The Settings language selector now renders the same `LanguageToggle`
  component (a single source of truth) and gains the matching FR/DE/EN badges.

## [0.6.0] - 2026-06-13

### Added
- **Training mode** ("Entraînement"): a third play option on the home screen
  (`📱 Test écran` / `✏️ Test papier` / `🎓 Entraînement`). Untimed — after each
  submitted answer the child immediately sees correct/incorrect and the right
  answer, then taps **Suivant**. Answers are auto-marked (correct = 1 point,
  time ignored) by setting `selfMarkedCorrect` on each record, so the existing
  scoring (`pointsFor`) and stats (`stats.classify`, `progress.isCorrect`)
  reuse it unchanged. New `src/screens/TrainingScreen.tsx`.
- **Separate training tracking + dashboard view**: training sessions persist to
  a new `trainingHistory` localStorage key (independent 50-session cap) and are
  shown via a `Test | Entraînement` toggle on the "Mes résultats" page. The
  training view shows trickiest pairs + the table heat-map only (no
  score-over-time chart). `clearAll` now clears training history too.

### Changed
- The home play-mode toggle is now three-way and its options are relabelled
  `Test écran` / `Test papier` to distinguish them from `Entraînement`.

## [0.5.1] - 2026-06-13

### Fixed
- Mode-toggle hover on a selected option. The base `.mode-toggle__option:hover`
  rule (specificity 0,2,0) outranked the single `--on` modifier class (0,1,0),
  so hovering a selected segment replaced its accent background with the light
  `rgba(0,0,0,0.04)` overlay while keeping white text — unreadable light-on-light.
  A selected option now darkens to `--color-accent-hover` on hover instead.
  Affects the operation toggle, the answer-mode toggle, and the language selector
  (all share the class).

## [0.5.0] - 2026-06-13

### Added
- Language choice (French, German, English) selectable in Settings; the whole
  interface switches live and `<html lang>` follows the choice. French remains
  the default. À propos labels are translated; the release notes themselves
  stay in French, with a caption shown in other languages.

## [0.4.0] - 2026-06-13

### Added

- **"À propos" info page** (reachable from an ℹ️ button on the home screen):
  shows the app version, a French user-oriented changelog, and a paragraph
  explaining that all data (settings, results) stays in this browser's
  `localStorage` — nothing is sent to a server. The displayed version is
  injected from `package.json` at build time (`vite.config.ts` →
  `__APP_VERSION__`); the user-facing notes live in `src/domain/releaseNotes.ts`.
- Contributor `CLAUDE.md` documenting the release ritual that keeps
  `package.json`, `CHANGELOG.md`, and the in-app notes in sync, with a
  drift-guard test (`src/__tests__/releaseNotes.test.ts`) asserting the top
  release note matches the package version.

## [0.3.0] - 2026-06-13

### Added

- **Progressive Web App** (roadmap item 1): the app is now installable on a
  tablet or phone (`public/manifest.webmanifest` + a committed PNG icon set,
  including an iOS `apple-touch-icon` and a maskable icon) and loads offline
  after the first visit via a hand-rolled service worker (`public/sw.js`) —
  no Workbox, no new dependencies. The worker is network-first for the HTML
  shell (always current when online, last-good when offline) and cache-first
  for content-hashed assets. `nginx.conf` serves `sw.js` and the manifest
  with `no-cache` so updates always reach installed clients.

## [0.2.0] - 2026-06-13

### Added

- **"Mes résultats" progress page** (roadmap item 3): a per-session score
  chart with two curves (correct/total and the partial-credit score), a
  "trickiest pairs" list, and a times-table error heat-map — reachable from a
  📈 button on the home screen. Pure data derivations live in
  `src/domain/progress.ts`; rendering is inline SVG, no chart library.
- **Cloud Run deploy setup**: multi-stage `Dockerfile`, `nginx.conf`, and a
  `.gcloudignore` to keep Cloud Build uploads lean.
- English translation of the V1.5 roadmap, with a status marker per item.

## [0.1.0] - 2026-05-09

### Added

- Initial release: timed multiplication and division drills for a child who
  already knows the tables.
- On-screen number pad and pen-and-paper (self-marking) answer modes.
- Per-pair error stats and a settings screen (timer, question count, table
  selection, mode).
- French UI, fully client-side, with `localStorage` persistence.
