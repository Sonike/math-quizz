# Roadmap

Direct follow-up to the shipped V1. Each entry states: the motivation, the
area of code affected, and the condition that makes the work worthwhile.
**Unprioritized** list — we'll choose based on real usage.

**Status legend**: ✅ done · 📋 planned.

---

## 1. PWA / service worker (offline + installable)

**Status**: ✅ Done — shipped in v0.3.0. Hand-rolled service worker
(`public/sw.js`): network-first for the HTML shell, cache-first for
content-hashed assets; web manifest + committed PNG icon set
(incl. maskable + iOS `apple-touch-icon`). No `vite-plugin-pwa`/Workbox —
kept the zero-dependency rule. Routing logic is unit-tested via
`src/sw/cacheStrategy.ts`.

**Why**: V1 already works without a network once the page is loaded
(everything is static + `localStorage`), but you have to reach the page a
first time, and the app doesn't install like a real app on a tablet or
phone.

**What's needed**:

- add a manifest (`public/manifest.webmanifest`) with icons and
  `display: standalone`;
- add a service worker — simple option: the
  [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) plugin, which
  handles automatic generation in `injectManifest` or `generateSW` mode;
- cache strategy: `precache` the shell + assets, `cacheFirst` for the
  SVGs/icons — no network required, so nothing else to handle.

**When**: as soon as the child wants to use the app on a tablet without
opening a tab each time. Low cost (< 1h), big UX gain.

---

## 2. Adaptive weighting of draws

**Status**: 📋 Planned — blocked on history density (see prerequisite)

**Why**: today every pair `(a, b)` has the same probability of appearing.
The child replays easy pairs as often as the ones that give them trouble.

**What's needed**:

- in `domain/question.ts`, `generateQuestions(settings)` accepts an
  optional `errorStats` parameter;
- weight each pair in the pool by `1 + α × errorRate(canonicalKey)`
  where `errorRate = (errors + timeouts) / max(attempts, 1)`;
- weighted draw (for example via reservoir sampling) instead of
  Fisher-Yates;
- α adjustable from Settings (for example 0/2/5 = never / moderate / strong).

**Prerequisite**: having real history density. Useless until the child has
played around twenty sessions.

**Tests to add**: on a large sample with a biased `errorStats`, verify that
the appearance frequency of the problematic pair increases.

---

## 3. "My results" page (progress chart)

**Status**: ✅ Done — shipped in v0.2.0. Built as `ProgressScreen` with two
score curves (correct/total + partial-credit), a "trickiest pairs" list, and
a 14×11 error heat-map; reachable from a 📈 button on the home screen. Pure
derivations live in `src/domain/progress.ts`; rendering is inline SVG.

**Why**: motivation. The child sees their score improve session after
session, and spots the most fragile tables.

**What's needed**:

- new `ProgressScreen.tsx` screen reachable from the home screen;
- read `history` (already in localStorage, capped at 50);
- two visualizations:
  1. `correct/total` score over the last N sessions (simple line);
  2. heat-map of errors per canonical pair (`stats.aggregateErrors`).
- library: no need for Chart.js or Recharts for this — an inline SVG does
  the job nicely and stays true to the "zero superfluous dependency"
  philosophy.

**Prerequisite**: none, the data is already collected by `recordSession`.

---

## 4. Multi-profile

**Status**: 📋 Planned

**Why**: let several children (or contexts: practice, test) share the app
without mixing their histories.

**What's needed**:

- the storage schema is **already prefixed** `mathquizz:profile:default:`,
  so on the `storage/profileStore.ts` side it's enough to replace the
  `default` constant with an id passed as an argument;
- add a profile selector on the home screen (list of profiles + "new
  profile" button);
- store the list of profiles + the active profile under
  `mathquizz:profiles` (outside the profile prefix to avoid a circular
  reference);
- migrate existing data: on first open after the update, create a
  "default" profile and keep `default:` as is.

**Minor risk**: if a parent and a child use the app alternately without
properly selecting the profile, the stats become wrong. Solution: display
the active profile prominently on every screen.

---

## 5. Fill-in-the-blank division (`a × ? = a×b`)

**Status**: 📋 Planned

**Why**: a pedagogical variant that asks for the missing factor instead of
the result. Reinforces memorization in both directions.

**What's needed**:

- new type `Operator = 'mul' | 'div' | 'div-hole'` (or a separate mode);
- `Question.expected` stays `b`, the display becomes `${a} × ? = ${a*b}`
  (touches `QuestionCard.tsx`);
- add a toggle in `ModeToggle.tsx` or a sub-mode in Settings.

**Tests to add**: error aggregation must always use the same canonical key
so that mul / div / div-hole feed the same counter.

---

## 6. Sounds and animations at the end of a session

**Status**: 📋 Planned

**Why**: reward perseverance without breaking the "no feedback during the
session" rule.

**What's needed**:

- short jingle (Web Audio API, locally generated sounds — no external
  audio file, to stay offline-first) on `ResultsScreen`;
- animation of the ✅ appearing one after another;
- "sound off" option in Settings (on by default).

**Guardrail**: anything triggered during `SessionScreen` is excluded —
that's deliberate, to avoid disturbing concentration.

---

## 7. Language choice: FR, DE, EN

**Status**: 📋 Planned

**Why**: potentially multilingual home or classroom, future use outside
France.

**What's needed**:

- new field `Settings.language: 'fr' | 'de' | 'en'` (default `fr`, like the
  current UI);
- i18n layer: for ~30 strings a homemade solution is enough — a
  `src/i18n/{fr,de,en}.ts` dictionary plus a `t(key)` function.
  `react-i18next` is useful beyond ~100 strings or when you want plurals or
  complex interpolation;
- inventory the strings: `HomeScreen`, `SessionScreen`, `ResultsScreen`,
  `SettingsScreen`, `ModeToggle`, `TableSelector`, + the `aria-label`
  labels of the `NumPad`;
- language selector in Settings (flag or 2-letter code);
- update `<html lang>` on the fly so the TTS and accessibility tools pick
  the right locale.

**Prerequisite**: none.

**Tests to add**: for each language, render `HomeScreen` and
`ResultsScreen` and verify the presence of a characteristic keyword
("Lancer" / "Start" / "Starten").

**Note**: mathematical labels (`×`, `÷`, digits) stay unchanged —
universal.

---

## 8. Voice mode (audio reading of the question)

**Status**: 📋 Planned — depends on item 7 (language choice)

**Why**: trains oral mental arithmetic — that's the real modality of the
school test ("how much is seven times eight?"). Also useful for a younger
child who reads more slowly than the 4-second target.

**What's needed**:

- native `window.speechSynthesis` API (Web Speech API) — free, offline on
  most platforms, voices vary by OS;
- new field `Settings.voiceEnabled: boolean` (default `false`, so as not to
  surprise);
- on mount of each question, create a `SpeechSynthesisUtterance` with:
  - `lang = settings.language` (`fr-FR` / `de-DE` / `en-US`);
  - `text`: the question in words, not digits — for example
    `"seven times eight"` rather than `"7 × 8"` (TTS engines pronounce `×`
    unpredictably). So a small `numberToWords(n, lang)` function to write
    (covering 0–225 is enough);
- `speechSynthesis.getVoices()` to pick a voice matching the locale; silent
  fallback if no voice available;
- a "🔊 Replay" button in `SessionScreen` to replay the question, with no
  score cost (the child hears but doesn't cheat).

**Prerequisite**: item **7. Language choice** — the TTS locale must follow
the UI locale.

**Caveats**:

- voice quality depends on the OS — Chrome desktop is decent, Safari iOS is
  variable, German voices sometimes absent on Linux;
- feature detection required: `if ('speechSynthesis' in window)` before
  exposing the option in Settings;
- no relevant automated tests (browser API not simulated by jsdom) —
  manual verification on the three target languages.

**Guardrail**: the voice triggers at the start of each question, not on
each keystroke nor at the end of the session. Consistent with the "no
feedback during the session" rule: the voice reads the question, it doesn't
comment on the answer.

---

## Residual reservations (to reconsider if the context changes)

These points are neither bugs nor missing features — they are **deliberate
design choices** made at the time of V1. They're listed here so we can
explicitly reopen them if the context evolves.

### Pure test mode, no learning

The app assumes the child already knows their tables. If another child in
the discovery phase has to use the tool, a **learning mode** will be needed
(no timer, with immediate correction) — that's a separate project, not an
option to add to the test mode.

### Tables 11, 12, 15 outside the official curriculum

The client's choice. If the educational objective changes, modifying the
`MULTIPLICANDS` constant in `src/domain/tables.ts` is enough; no other file
depends on the exact list.

### No telemetry, no analytics

Deliberate. No data leaves the device. If we ever want to track usage (for
example to iterate on perceived difficulty), it will require an **explicit**
decision on what to collect, where, and with what consent — not a quiet
addition.

### Input limited to 4 digits

`SessionScreen.handleDigit` caps at 4 digits. The largest possible result
with `MULTIPLICANDS × MULTIPLIERS` is `15 × 15 = 225` (3 digits). If we
extend the tables beyond 31 (`32 × 32 = 1024`), this limit will need to be
widened.
