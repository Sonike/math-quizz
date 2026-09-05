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

**Status**: 📋 Planned — the weighting half is now built (see item 11)

**Why**: today every pair `(a, b)` has the same probability of appearing.
The child replays easy pairs as often as the ones that give them trouble.

**What's needed**:

- in `domain/question.ts`, `generateQuestions(settings)` accepts an
  optional stats parameter — `aggregatePairs(history)` from `domain/stats.ts`
  already produces exactly the shape this needs;
- weight each pair in the pool by `1 + α × weightedErrorRate(counters)`, which
  v0.11.0 built for the progress screen. The recency curve is shared, so the
  draw biases toward what is shaky *now* rather than what was shaky a year ago;
- weighted draw (for example via reservoir sampling) instead of
  Fisher-Yates;
- α adjustable from Settings (for example 0/2/5 = never / moderate / strong).

**Prerequisite**: having real history density. Useless until the child has
played around twenty sessions.

**Tests to add**: on a large sample with a biased stats map, verify that the
appearance frequency of the problematic pair increases.

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
  2. heat-map of errors per canonical pair (`stats.aggregateErrors` at the
     time — `stats.aggregatePairs` since v0.11.0).
- library: no need for Chart.js or Recharts for this — an inline SVG does
  the job nicely and stays true to the "zero superfluous dependency"
  philosophy.

**Prerequisite**: none, the data is already collected by `recordSession`.

---

## 4. Multiple named local profiles

**Status**: ✅ Done — shipped in v0.12.0. `storage/profileRegistry.ts` owns
`mathquizz:profiles` (`{ active, profiles: [{ id, name, createdAt }] }`) outside
every profile prefix; every function in `storage/profileStore.ts` now takes the
profile id as its first argument, with **no default** — a screen cannot read the
wrong profile by forgetting to pass one, it fails to compile. A switcher sits on
the home screen (hidden while a single profile exists), create / rename / delete
in Settings. Design notes:
`docs/superpowers/specs/2026-09-05-multiple-profiles-design.md`.

**Why**: siblings share one tablet. The app stores exactly one profile per
browser, so a brother's timeouts land in his sister's heat-map and the score
curve mixes two children into one line. Named profiles separate them without
giving up the rule that nothing leaves the device.

**Explicitly still stateless and credential-free**: a profile is a name and a
storage prefix, not an identity. No password, no PIN, no recovery, no account —
whoever holds the device can switch to any profile. That is the point: the data
is a child's practice history on a family tablet, not something to protect from
the family. If a profile ever needs protecting, that is a different feature and
a different conversation.

**What's needed**:

- storage keys are already prefixed `mathquizz:profile:default:`, and
  `storage/profileStore.ts` routes every key through the exported `PROFILE_ID`
  constant — turning that constant into an argument is the whole storage change;
- a registry outside the per-profile prefix, e.g. `mathquizz:profiles` holding
  `{ active: string, profiles: { id, name, createdAt }[] }`. Ids stay stable and
  opaque; the name is what the child sees and can rename;
- a profile switcher on the home screen, with create / rename / delete in
  Settings. Deleting a profile must offer an export first (item 9);
- migration on first open after the update: register the existing `default:`
  data as a profile, keeping the id `default` so nothing has to move;
- export / import (item 9) follows. The backup envelope already carries a
  `profile` field, but the importer ignores it and always writes the default
  profile. With several profiles, importing should ask *which* profile to write
  into, and the suggested filename should carry the profile name.

**How it shipped, where it differs from the above**:

- migration works as planned: the existing data is registered under the id
  `default`, so nothing moves. Its `name` is empty — the app never asked for
  one — and the UI renders "Sans nom" until it is renamed;
- the envelope gained `profileName` alongside `profile` (additive, so
  `formatVersion` stays 1). Both are informational: the import destination is
  always the profile the user picks in the dialog, never the one named in the
  file. **The registry is not part of a backup**, so importing can never create,
  rename or remove a profile;
- **the active profile is not shown on *every* screen.** The risk below is
  *starting a session as the wrong person*, and that decision is made on the
  home screen — which is exactly where the switcher lives, permanently. A badge
  on the session screen would arrive after the choice is irreversible, on the one
  screen deliberately kept free of everything but the question. So the profile
  is shown where it changes a decision or interprets data: home, "Mes résultats",
  and Settings;
- creating a profile does **not** switch to it. Creation happens in Settings,
  where the form above edits the current profile's numbers; switching there
  would silently re-target the next "Enregistrer".

**Minor risk**: if a parent and a child use the app alternately without properly
selecting the profile, the stats become wrong. Mitigated by the always-visible
switcher on the home screen (see above), not eliminated — nothing short of a
login could eliminate it, and a login is explicitly out of scope.

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

**Status**: ✅ Done — shipped in v0.5.0 (selector in Settings), extended in
v0.7.0 (the same `LanguageToggle` on the home screen, so the language changes
without opening Settings) and v0.9.0 (release notes localized too). Hand-rolled
i18n as planned, no `react-i18next`: `src/i18n/{fr,de,en}.ts` plus `translate()`
with `{placeholder}` interpolation. `LanguageProvider` sets
`document.documentElement.lang`, and `i18n.test.ts` enforces that the three
dictionaries share exactly the same keys — a missing translation fails
`pnpm test`.

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

**Status**: 📋 Planned — unblocked, item 7 (language choice) shipped in v0.5.0

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

**Prerequisite**: item **7. Language choice** — done, so this is ready to
start. The TTS locale must follow `settings.language`.

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

## 9. Export / import of the local data

**Status**: ✅ Done — shipped in v0.10.0. **Settings → Tes données** writes the
whole profile to one JSON file and reads it back. The envelope is a published
contract: `public/schemas/math-quizz-backup-v1.schema.json` is live at
<https://math-quizz.mrpia.ch/schemas/math-quizz-backup-v1.schema.json> and linked
from the Settings screen, `docs/data-format.md` documents it in prose, and
`src/__tests__/backup.test.ts` pins the schema to the constants in
`src/domain/backup.ts` so the two cannot drift. (Firebase serves static files
ahead of the `**` → `/index.html` SPA rewrite, so that path really returns the
schema and not the app shell — worth re-checking if the rewrite rules change.)

**Why**: `localStorage` is the only copy. Clearing browser data, switching
device or reinstalling the PWA loses months of practice history, and nothing
short of an account could bring it back. An export file is the whole backup
story for an app that deliberately has no backend.

**Design notes worth keeping**:

- the export carries the two histories and nothing else. A lifetime error
  accumulator used to travel with them until v0.11.0 (item 11) removed it;
  `data.errors` survives in the schema marked deprecated, so files already in
  the wild keep validating;
- structure is rejected, settings are sanitised. See `domain/backup.ts` for why
  the two halves are treated differently;
- import is a restore, not a merge (item 10);
- since v0.12.0 (item 4) a restore has a *destination*: the import dialog asks
  which profile to overwrite, defaulting to the one in use. The file names its
  source profile but never picks the target.

---

## 10. Merge on import

**Status**: 📋 Planned — deliberately deferred out of item 9, and **cheaper than
it used to be** since v0.11.0

**Why**: today importing replaces the profile. That covers backup / restore and
moving to a new device, but not "the child practised on the tablet and on the
laptop, and both histories should survive".

**What changed**: this entry used to say the error counters made merging
intractable — they already included sessions aged out of the capped history, so
summing two files double-counted every shared pair while recomputing from the
merged history dropped the older statistics. Item 11 deleted that accumulator.
Every statistic is now derived from the histories, so **merging the histories
merges the statistics**. There is no second store to reconcile.

**What is left**: sessions still carry no id. `startedAt` is the closest thing
and is unique only by luck — two devices can stamp the same second, and a device
with a wrong clock breaks ordering outright.

**Two consequences of recency weighting to respect**:

- weights come from a session's *position* in the list, so a merged history has
  to be sorted chronologically before it means anything. Concatenating two files
  in import order would silently mis-weight both;
- the result is still trimmed to `HISTORY_LIMIT`, so merging two full histories
  keeps the 50 most recent *overall*. That is the right answer, but it means a
  merge can drop sessions from the file just imported — the confirmation dialog
  should say so rather than implying everything was kept.

**What's needed**:

- a stable session id written at record time. Additive, so `formatVersion` stays
  1: older files simply lack it and fall back to matching on `startedAt` plus
  answer count;
- dedupe on that id when concatenating, then sort by `startedAt`, then trim;
- a UI choice on import (replace / merge) rather than a silent behaviour.

**When**: once a real second device is in play. Until then, replace is the
honest behaviour and the confirmation dialog says so.

---

## 11. Recency-weighted statistics

**Status**: ✅ Done — shipped in v0.11.0. `domain/stats.ts` →
`aggregatePairs(history)` folds a history into raw and weighted counters in one
pass; an attempt `n` sessions back counts `0.5 ^ (n / RECENCY_HALF_LIFE_SESSIONS)`
with a half-life of 10.

**Why**: found while building item 9. The app maintained a lifetime per-pair
accumulator that **no screen ever read** — `ProgressScreen` recomputed from the
capped `history` throughout. Two divergent statistics, no stated source of
truth, one of them dead.

The interesting part was that the dead one was arguably the *wrong* one to
revive: lifetime counters never forget, so a pair the child mastered months ago
keeps its old failures forever and crowds out what is actually shaky. Weighting
by recency resolves both problems at once and makes the accumulator redundant —
a running total with no timestamps cannot be decayed.

**Decisions worth not re-litigating**:

- decay is per **session**, not wall-clock. Elapsed-time decay is pedagogically
  truer, but after a school holiday every weight collapses and the heat-map goes
  grey — statistically correct, reads as broken. Session decay is also
  deterministic and testable without mocking a clock;
- **confidence from raw counts, ranking from weighted rate.** The `minAttempts`
  filter and the "3 / 5" on each row stay raw; only ordering and colour are
  weighted. Collapsing the two would drop a pair practised three times long ago
  below the confidence threshold entirely;
- `HISTORY_LIMIT` is now sized to the half-life rather than to storage. 50
  sessions is 97 KB, ~2% of a 5 MB quota — it was never a real storage guard.
  At half-life 10 the newest 50 carry >96% of all weight; a test asserts
  `HISTORY_LIMIT >= 5 * RECENCY_HALF_LIFE_SESSIONS`.

**Follow-up**: item 2 (adaptive weighting of draws) now only needs the draw
side — the statistic it wants already exists.

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
