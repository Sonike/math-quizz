# Math Quizz

Timed mental-math drills (multiplication and division) for a child who already
knows the tables and wants to automate recall. Single-page app, French UI,
runs entirely in the browser, stores progress in `localStorage`.

## Prerequisites

- Node.js **22+**
- npm **10+**

## Install

```bash
npm install
```

## Develop

```bash
npm run dev
```

Opens a Vite dev server (default `http://localhost:5173`) with hot module
reload. Open the URL in any modern browser. Both the on-screen number pad and
the physical keyboard (digits, `Backspace`, `Enter`) drive answers.

## Test

```bash
npm test          # one-off Vitest run
npm run test:watch  # watch mode
```

Test files live in `src/__tests__/`.

## Build

```bash
npm run build
```

Produces a static bundle in `dist/`. The output is fully self-contained —
no backend, no environment variables, no runtime configuration.

## Preview the production build

```bash
npm run preview
```

Or with any static server, e.g.:

```bash
npx serve dist
```

Either approach mirrors what GitHub Pages / Netlify / Vercel will serve.

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

## What's next

See [`docs/v1.5-roadmap.md`](docs/v1.5-roadmap.md) for the V1.5+ backlog
(PWA, adaptive weighting, progress charts, multi-profile, etc.).
