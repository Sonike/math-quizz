# Language selector on the home page — design

Date: 2026-06-14
Status: approved

## Goal

Make the UI language easy to find and change. Today it's only reachable in
Settings, which is not obvious. Surface it directly on the home page.

## Decision

Add a **3-way segmented language toggle as the first widget under the home
title row** (above the Tables panel), as a bare row (not a card). Each segment
shows a **language-code badge (FR / DE / EN) above the native name**
(Français / Deutsch / English). Extract a reusable **`LanguageToggle`** component
and use it in **both** HomeScreen and SettingsScreen — replacing the inline
selector that's in Settings today, so there's one source of truth.

## Why this shape

- **Discoverability is the actual problem.** Promoting it to the first home
  widget solves that regardless of styling.
- **Bare row, not a card.** Language is a *set-once-and-forget* control, unlike
  Tables / Mode which the child changes every session. A bare segmented row
  keeps it from pushing the per-session controls down as much as a full card
  would. (Chosen over a header control, which was mocked but rejected: the
  header is already three round buttons and tight on a phone.)
- **Codes, not flags.** Flags are countries, not languages — there is no clean
  flag for "English" (GB? US?) and in a Zürich context 🇩🇪/🇫🇷 don't represent
  Swiss German/French. ISO codes (FR/DE/EN) are unambiguous and Swiss-neutral,
  and the native name sits right beside the code.

## Component — `LanguageToggle`

```
Props: { value: Language; onChange: (next: Language) => void }
```

- Renders the existing `LANGUAGES` list ( `{ code, nativeLabel }` ) as a
  `role="radiogroup"`, mirroring `ModeToggle` / `AnswerModeToggle` and reusing
  the `.mode-toggle` / `.mode-toggle__option(--on)` classes. Adds a
  `.language-toggle` layer (a small `LanguageToggle.css`) to stack the badge
  over the name.
- Each option: a `role="radio"` button containing
  `<span class="language-toggle__badge" aria-hidden="true">FR</span>` + the
  native name. The badge is **`aria-hidden`** — it's decorative and redundant
  with the name, so the radio's accessible name stays the native label
  ("Français" / "Deutsch" / "English"). This is both the correct a11y choice and
  what keeps `settingsLanguage.test.tsx` (which queries `name: 'Deutsch'`) green.
- `aria-label` for the group reuses `t('settings.language')` — no new i18n keys.

## Data flow (unchanged plumbing)

`LanguageToggle.onChange(code)` →
- on Home: `onChange({ ...settings, language: code })`
- in Settings: `onSave({ ...settings, language: code })`

→ `App` already persists `settings` (`useEffect` → `saveSettings`) and feeds
`settings.language` to `LanguageProvider`, which re-renders the whole UI in the
new language and updates `<html lang>`. No new state, store keys, or context.

## Placement

HomeScreen: insert `<LanguageToggle … />` immediately after `</header>`, before
the first `home__panel` (Tables). SettingsScreen: replace the inline
`.mode-toggle` block (currently lines ~85–103) with `<LanguageToggle … />`,
keeping the surrounding `settings__field` + label.

## Testing (TDD)

- **`LanguageToggle`** (new unit test): renders 3 options; the active one has
  `aria-checked="true"`; clicking another emits its `code`; accessible names are
  the native labels (badge hidden).
- **HomeScreen** (new test): the language toggle is present and clicking
  "Deutsch" calls `onChange` with `language: 'de'`.
- **Existing, must stay green:** `settingsLanguage.test.tsx` (Settings selector
  via the shared component), `languageSwitch.test.tsx` (Home/Info/Heatmap render
  per language), `homeScreen.test.tsx`, `i18n` parity, the App flow tests.

## Release ritual

User-facing change → bump `package.json` `0.6.0 → 0.7.0`, add a `## [0.7.0]`
`CHANGELOG.md` section, and prepend a French `releaseNotes.ts` `0.7.0` entry
(the drift guard ties all three to the version).

## Out of scope

- A header/top-row language control (mocked, rejected).
- Switching language mid-session (only Home + Settings expose it).
- Flag emojis.
- Documenting the two post-0.6.0 user-facing commits that currently have no
  release note (cancel button, correct-answer-in-green) — flagged to the owner
  separately, not folded into this PR's 0.7.0 note.
