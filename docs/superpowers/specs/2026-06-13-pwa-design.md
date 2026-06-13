# Spec — PWA / service worker (Roadmap item 1)

**Status:** approved design, ready for implementation
**Date:** 2026-06-13
**Roadmap ref:** `docs/roadmap.md` §1

## Goal

Make Math Quizz installable on a tablet/phone and reachable without a
network round-trip after the first visit. The app is already fully
functional offline once loaded (static files + `localStorage`, no API
calls), so this work is purely: a web manifest for installability, an icon
set, and a small service worker that caches the shell. No new runtime or
build dependencies — a hand-written service worker, consistent with the
project's zero-superfluous-dependency philosophy. The roadmap floated
`vite-plugin-pwa`/Workbox; we deliberately chose not to pull that tooling
in (see "Approach chosen").

## Approach chosen

Hand-rolled service worker over `vite-plugin-pwa`. Rationale:

- The app is unusually simple to cache: every JS/CSS asset is
  **content-hashed** by Vite (`/assets/*.[hash].js`) and already served
  `immutable, 1y` by nginx. Content-hashing is what removes the classic
  service-worker footgun — a cached asset can never be the "wrong" version,
  because a new build means a new filename.
- A correct service worker for this app is ~40 lines and adds nothing to
  `node_modules`. Workbox would add a large dev-tooling tree purely to
  generate a precache manifest we don't need.

## Caching strategy (the core decision)

- **Navigation requests (HTML): network-first, cache fallback.** When
  online, fetch fresh `index.html` (which references the newest hashed
  assets) and update the cache. When offline, serve the last cached
  `index.html`.
- **Everything else (hashed `/assets/*`, icons, manifest): cache-first**,
  populating the cache on first fetch. A cache hit is never stale because
  the filename encodes the content.

**Consequence:** the update problem disappears. A new Cloud Run deploy is
picked up automatically on the next online launch — no "new version
available" prompt, no waiting-worker message-passing, no version
bookkeeping. (The SW still calls `skipWaiting()`/`clients.claim()` so the
worker *code* itself activates promptly; that's a two-line install/activate
step, not an update-UX flow.)
The only cost is one small (~0.5 KB) HTML request per launch when online,
which also keeps the app current. We explicitly reject the
cache-first-everything-with-precache approach, which would force an
update-prompt UX — the very complexity we avoided by not using Workbox.

A single `CACHE_NAME` constant (e.g. `mathquizz-v1`) namespaces the cache;
the `activate` handler deletes any cache whose name isn't the current one.

## Approved decisions

1. **Hand-rolled `public/sw.js`**, no plugin, no Workbox.
2. **Network-first for navigations, cache-first for assets/icons/manifest.**
3. **Icons are pre-rendered PNGs committed to the repo** (not generated at
   build time). The generation command is documented for reproducibility,
   but the repo carries the finished files so the tool is never needed
   again.
4. **No update-prompt UI, no install-button UI.** The browser's native
   install affordance is sufficient for V1.
5. **`start_url`/`scope` use `./`** to match the existing `base: './'`.

## File-by-file changes

### New — `public/manifest.webmanifest`

Static JSON, lands at `dist/` root. Values derived from the existing app
(`theme-color #3b82f6`, `<html lang="fr">`, title "Math Quizz"):

```jsonc
{
  "name": "Math Quizz",
  "short_name": "Math Quizz",
  "description": "Entraînement aux tables de multiplication et division",
  "lang": "fr",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "./icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" },
    { "src": "./icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }
  ]
}
```

Revisable defaults: `orientation: "portrait"` (the numpad/question UI is
portrait-first; drop the field to let the device decide) and
`background_color: "#ffffff"` (the splash background while the shell loads).

### New — icon files in `public/`

Generated **once** from `public/icon.svg`, then committed (each is a few KB):

| File | Size | Purpose |
|---|---|---|
| `icon-192.png` | 192×192 | manifest `purpose: any` |
| `icon-512.png` | 512×512 | manifest `purpose: any` |
| `icon-maskable-512.png` | 512×512 | manifest `purpose: maskable` — blue bleeds edge-to-edge, the `×÷` glyph sits inside the central 80% safe circle so the OS mask never clips it |
| `apple-touch-icon.png` | 180×180 | iOS home screen (iOS ignores the manifest icons) |

The existing `icon.svg` is kept and also listed in the manifest
(`sizes: "any"`), which Chrome accepts.

**Generation (one-off, documented, not a dependency):** render from the SVG
via headless Chromium or `npx sharp-cli`. The maskable variant uses a
padded source SVG (no rounded corners — the OS applies its own mask). The
exact command will be recorded in the spec/README during implementation so
the PNGs are reproducible.

### New — `public/sw.js` (hand-rolled, ~40 lines)

Structure:

- `const CACHE_NAME = 'mathquizz-v1';`
- `install`: `self.skipWaiting()` so a freshly registered SW activates
  promptly (safe here — content-hashed assets mean no cross-version
  breakage).
- `activate`: `clients.claim()` + delete caches whose name ≠ `CACHE_NAME`.
- `fetch`: ignore non-GET; for `request.mode === 'navigate'` →
  network-first (on success, `cache.put(<canonical index key>, clone)`; on
  failure, `caches.match(<canonical index key>)`); otherwise → cache-first
  (return cache hit, else fetch + `cache.put` the successful response).

The navigation branch caches under a single **canonical key: `'./'`** so any
SPA route served via nginx's `try_files … /index.html` fallback resolves to
the same cached shell when offline. (`sw.js` lives in `public/` and is
copied verbatim — Vite does not process it, so `import.meta.env.BASE_URL` is
unavailable inside it; `'./'` resolves against the SW's own root scope,
which is the app root.)

**Testability:** the cache-routing decision is extracted into a pure helper
so it can be unit-tested without a service-worker environment (see Testing).

### Modified — `src/main.tsx`

Append, after the existing render call:

```ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  );
}
```

Registered on `load` (never competes with first paint); silent `catch` so
unsupported browsers degrade to today's behaviour.

### Modified — `index.html`

Add inside `<head>` (the `theme-color` meta is already present):

```html
<link rel="manifest" href="./manifest.webmanifest" />
<link rel="apple-touch-icon" href="./apple-touch-icon.png" />
<meta name="mobile-web-app-capable" content="yes" />
```

### Modified — `nginx.conf`

`sw.js` and the manifest must not inherit aggressive caching, or SW updates
won't propagate. Add (the existing `/assets/` immutable rule is unchanged —
it's what makes cache-first safe):

```nginx
location = /sw.js                 { add_header Cache-Control "no-cache"; }
location = /manifest.webmanifest  { add_header Cache-Control "no-cache"; }
```

## Testing

The service worker and manifest are browser-runtime and largely outside
jsdom's reach, so:

- **Unit (vitest):** test the extracted pure routing helper — e.g.
  `cacheStrategyFor(request)` → `'network-first' | 'cache-first' | 'pass'`
  (navigations vs. asset GETs vs. non-GET).
- **Manual checklist (recorded in the spec/PR):**
  1. `pnpm build && pnpm preview`.
  2. Lighthouse "Installable" / PWA audit passes.
  3. Chrome desktop: install prompt appears; install; relaunch as a
     standalone window.
  4. DevTools → offline → reload still works.
  5. Best-effort: iOS Safari "Add to Home Screen" shows the
     `apple-touch-icon` and opens standalone.

No E2E browser tooling is added — that would contradict the zero-dependency
choice.

## Out of scope (YAGNI)

- Push notifications, background sync, offline-write queue (nothing writes
  to a server).
- Update-prompt / "new version available" UI (network-first navigation
  makes it unnecessary).
- Custom in-app install button (native browser affordance is enough).
```
