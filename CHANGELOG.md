# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project uses [Semantic Versioning](https://semver.org/).

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
