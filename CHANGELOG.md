# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/).

## [0.9.0] - 2026-06-15

### Changed
- Release notes (the "Nouveautés" list on the À propos screen) are now localized
  to all three supported languages (FR, DE, EN) and follow the selected
  language. `ReleaseNote.changes` is now `Record<Language, string[]>`; all 9
  historical entries were backfilled with DE + EN.
- The "Buy me a coffee" support link now routes through a parent: the child is
  invited to tell their parents, who can choose to support the app (or not). The
  link is embedded inline in that sentence (new `info.coffeeLink` key; `info.coffee`
  is now the full sentence with a `{link}` placeholder).
- The round 🏠 back buttons (À propos, Mes résultats, Liste) now use the home
  screen's icon-button hover (background + border tint) instead of a lift
  animation, for a consistent feel across screens.

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
