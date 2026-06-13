# Math Quizz

Timed mental-math drills (multiplication and division) for a child who already
knows the tables and wants to automate recall. Single-page app, French UI,
runs entirely in the browser, stores progress in `localStorage`.

## Prerequisites

- Node.js **22+**
- pnpm **10+** (install with `npm install -g pnpm` or
  [`corepack enable`](https://pnpm.io/installation#using-corepack))

This project uses pnpm; `pnpm-lock.yaml` is the source of truth. Don't mix
with `npm install` (it would create a stray `package-lock.json` and a
divergent `node_modules`).

## Install

```bash
pnpm install
```

You may see a one-time warning `Ignored build scripts: esbuild` — it's
benign. The native esbuild binary still ships via optional dependencies
and the build works regardless.

## Develop

```bash
pnpm dev
```

Opens a Vite dev server (default `http://localhost:5173`) with hot module
reload. Open the URL in any modern browser. Both the on-screen number pad and
the physical keyboard (digits, `Backspace`, `Enter`) drive answers.

## Test

```bash
pnpm test           # one-off Vitest run
pnpm test:watch     # watch mode
```

Test files live in `src/__tests__/`.

## Build

```bash
pnpm build
```

Produces a static bundle in `dist/`. The output is fully self-contained —
no backend, no environment variables, no runtime configuration.

## Preview the production build

```bash
pnpm preview
```

Or with any static server, e.g.:

```bash
pnpm dlx serve dist
```

Either approach mirrors what GitHub Pages / Netlify / Vercel will serve.

## Deploy

The app ships as a static bundle served by nginx in a container, hosted on
**Google Cloud Run**. The image is built by the multi-stage `Dockerfile`
(`pnpm build` → `nginx:alpine` serving `dist/` on port 8080); `nginx.conf`
handles the SPA fallback and long-caches the content-hashed `/assets/`.

Build from source and roll out a new revision in one step — Cloud Build
builds the `Dockerfile`, then Cloud Run shifts traffic:

```bash
gcloud run deploy math-quizz --source . --region us-central1
```

`.gcloudignore` keeps `node_modules`, the build output, and local-only files
out of the upload. No environment variables or runtime config are required —
the bundle is fully self-contained.

## Project layout

```
src/
├── App.tsx                 screen state machine
├── main.tsx                React bootstrap
├── domain/                 pure logic (questions, stats, types)
├── storage/                localStorage I/O
├── components/             UI primitives (NumPad, Timer, ...)
├── screens/                Home / Session / Results / Settings
├── hooks/                  useNumericKeyboard
├── styles/                 global CSS + design tokens
└── __tests__/              Vitest suite
```

## Icons

The favicon and PWA icons derive from `public/icon.svg` (rounded, for the
`"any"` purpose) and `public/icon-maskable.svg` (full-bleed, for the
`maskable` purpose and the iOS `apple-touch-icon`). The committed PNGs are
regenerated with:

```bash
npx -y sharp-cli --density 576 -i public/icon.svg          -o public/icon-192.png          resize 192 192
npx -y sharp-cli --density 576 -i public/icon.svg          -o public/icon-512.png          resize 512 512
npx -y sharp-cli --density 576 -i public/icon-maskable.svg -o public/icon-maskable-512.png resize 512 512
npx -y sharp-cli --density 576 -i public/icon-maskable.svg -o public/apple-touch-icon.png  resize 180 180
```

## Stack

- [Vite 5](https://vitejs.dev/) + [React 18](https://react.dev/) + TypeScript
- [Vitest 2](https://vitest.dev/) with `jsdom` for component tests
- `@testing-library/react` for component + hook tests
- No CSS framework — plain CSS with custom properties (light + dark mode)

## Storage layout

All keys are namespaced under `mathquizz:profile:default:`, so a future
multi-profile feature can swap `default` for any profile id without a
migration.

| Key | Type |
|---|---|
| `…:settings` | `Settings` (timer duration, question count, selected tables, mode) |
| `…:history` | `SessionResult[]` capped at 50 |
| `…:errors` | `ErrorStats` keyed by `${min(a,b)}x${max(a,b)}` |

Use the in-app **Settings → Effacer l'historique** button to reset history
and error stats; the user-facing `Settings` object is preserved.

## Contributing

1. Branch off `main`: `git switch -c feat/<short-name>`.
2. Work test-first. Anything in `src/domain/` or a new component ships with a
   Vitest case; run `pnpm test` and `pnpm build` (the build also type-checks)
   before pushing.
3. Keep the zero-runtime-dependency rule — no chart or UI libraries. An
   inline SVG or a few lines of CSS almost always do the job.
4. Follow the existing shape: pure logic in `src/domain/`, presentational
   components in `src/components/`, screens orchestrate. UI strings stay in
   French until the i18n item lands.
5. Keep commits small and focused, then open a pull request against `main`.

## What's next

See [`docs/roadmap.md`](docs/roadmap.md) for the backlog
(PWA, adaptive weighting, progress charts, multi-profile, etc.).
