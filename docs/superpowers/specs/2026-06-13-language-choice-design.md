# Language choice (FR / DE / EN) — design

Roadmap item 7. A homemade i18n layer that lets the user switch the interface
between French, German, and English. French stays the default and the source
of truth.

- **Status**: design approved 2026-06-13, pre-implementation.
- **Scope decided with the user**:
  - Translate the persistent UI chrome + the static labels of À propos.
    Release-note bodies stay French and render verbatim, with a small caption
    shown when the active language is not French.
  - Words only — no locale-aware number/decimal/percentage formatting, no
    plural engine. Math symbols and digits are universal and stay literal.
  - Delivery via a React context + `useI18n()` hook (no prop-drilling).
  - Homemade dictionary, zero new runtime dependencies.

## Motivation

A potentially multilingual home or classroom, and use outside France. The
`language` field this introduces is also the prerequisite for roadmap item 8
(voice mode), whose TTS locale must follow the UI locale — but item 8 itself is
out of scope here.

## Architecture

### Module layout — `src/i18n/`

- **`types.ts`** — `export type Language = 'fr' | 'de' | 'en'`. The message
  shape is derived from the French dictionary: `type Messages = typeof fr`,
  `type TranslationKey = keyof Messages`. French *defines* the key set rather
  than being checked against it.
- **`fr.ts`** — the canonical flat map, e.g. `{ 'home.start': 'Lancer', … }`.
- **`de.ts`, `en.ts`** — declared `const de: Record<TranslationKey, string>`
  (likewise `en`). This makes `tsc --noEmit` fail the build if either misses or
  misnames a key, so the three dictionaries cannot silently drift. This is the
  primary completeness guarantee; the runtime test (below) only guards against
  a stray `@ts-ignore`/`as` cast.
- **`index.ts`** — exports:
  - `dictionaries: Record<Language, Record<TranslationKey, string>>`.
  - `LANGUAGES: { code: Language; nativeLabel: string }[]` —
    `[{code:'fr',nativeLabel:'Français'}, {code:'de',nativeLabel:'Deutsch'},
    {code:'en',nativeLabel:'English'}]`. Drives the selector; order is the
    display order.
  - `translate(lang, key, vars?)` — pure function. Looks up
    `dictionaries[lang][key]`, applies `{placeholder}` substitution from
    `vars`, and falls back along `active lang → fr → key`.
- **`I18nContext.tsx`** — `LanguageProvider` + `useI18n()`.

### Delivery — context + hook

- `App.tsx` wraps its screens in `<LanguageProvider lang={settings.language}>`.
  The provider **reflects** `settings.language`; it does not own language
  state, so `settings` (and thus localStorage) stays the single source of
  truth.
- `useI18n()` returns `{ lang, t }` where `t(key, vars?)` curries
  `translate(lang, …)`. Components call
  `const { t } = useI18n();` and use `t('home.start')`.
- The provider runs one effect: `document.documentElement.lang = lang`
  (the roadmap's `<html lang>` requirement — keeps TTS and a11y tooling on the
  right locale).
- **The context default value is the French translator.** A component rendered
  with no provider mounted (e.g. existing unit tests that render a screen bare)
  still resolves through French and keeps working. Only new multi-language
  tests opt into a provider wrapper. This keeps the change's blast radius on the
  existing suite near zero — to be verified, not assumed.

### `t` and interpolation

- `t(key, vars?)`, `vars: Record<string, string | number>`, simple
  `{name}` replacement.
- No plural engine. Two interpolated strings exist:
  - `home.summary` = `{count} questions · {seconds}s par question`
  - `session.counter` = `Question {n} / {total}`
  Plural-invariant wording is fine in all three languages. A future singular
  case (`count === 1`) is a one-line call-site conditional, not a system.
- Fallback chain `active → fr → key`. With the `Record<TranslationKey,string>`
  typing the `fr` and `key` rungs should be unreachable at runtime.

## Settings and persistence

- Add `language: Language` to `Settings`; `DEFAULT_SETTINGS.language = 'fr'`.
- **Migration: none, by construction.** `loadSettings` already returns
  `{ ...DEFAULT_SETTINGS, ...stored }`, so a stored settings object without a
  `language` resolves to `'fr'` — the same mechanism that introduced
  `answerMode`.
- Language is stored per-profile under the existing `…:settings` key.
  - *Caveat for roadmap item 4 (multi-profile)*: per-profile language means
    switching profile switches UI language. Acceptable now; revisit when
    profiles land.

## Selector UX

- A new field in `SettingsScreen`: a three-way radiogroup reusing the existing
  `mode-toggle` styling, labelled with native names from `LANGUAGES` —
  **Français · Deutsch · English**.
- Native labels, not flag emoji: a flag denotes a country, not a language
  (🇩🇪 wrongly excludes Austrian/Swiss German).
- **Applies live.** Selecting a language calls
  `onSave({ ...settings, language })` immediately, independent of the numeric
  fields' "Enregistrer" button. The whole UI re-renders into the chosen
  language as instant confirmation. (The numeric fields keep their existing
  edit-then-save batching; only language is live.)

## À propos handling

- Translate the static labels: title, `version {version}`, "Nouveautés",
  "Tes données" and its two privacy paragraphs, the Zürich credit line.
- The `releaseNotes` entries render **verbatim in French**.
- When `lang !== 'fr'`, show `info.notesInFrench` above the notes list:
  - fr (unused here): "Ces notes sont en français."
  - de: "Diese Hinweise sind auf Französisch."
  - en: "These notes are in French."
- The documented three-source release process (`package.json` ↔ `CHANGELOG.md`
  ↔ `releaseNotes.ts`) is unchanged.

## What stays untranslated (out of the dictionary)

`×`, `÷`, `=`, `?`, all digits, the operation strings rendered by
`QuestionCard` and `ResultsScreen`, the `%` axis labels in `ScoreLineChart`,
the brand "Math Quizz", and the contact email.

## Testing (TDD — failing test first)

- `src/__tests__/i18n.test.ts`:
  - `translate` returns the right string per language.
  - interpolation substitutes `{vars}`.
  - fallback chain `active → fr → key`.
  - completeness loop: `de` and `en` key sets equal `fr`'s (cheap guard against
    a `@ts-ignore`).
- A `renderWithLanguage(ui, lang)` helper (Testing Library render inside
  `LanguageProvider`).
- Per the roadmap: render `HomeScreen` in each language, assert the
  characteristic verb — "Lancer" / "Starten" / "Start".
- Provider effect test: asserts `document.documentElement.lang` tracks `lang`.
- Settings test: selecting a language calls `onSave` with the new `language`
  and the rendered strings change.
- The existing 19 test files are expected to need **no changes** thanks to the
  French default context. Run `pnpm test` to confirm; fix any that assumed a
  bare render only if they actually break.

## Non-goals

- Voice mode (item 8). We add only the `language` field it will consume.
- Translating release-note bodies.
- Locale-aware number / date / decimal / percentage formatting.
- Per-language math labels.
- Right-to-left languages.

## Risks and caveats

- **Translation quality is the real risk, not the plumbing.** German child
  register especially (informal *du*, natural phrasing) needs a fluent human
  proofread before shipping. The spec assumes a review pass over the
  machine-drafted DE/EN strings; it does not treat the first draft as final.
- Key-naming is flat dotted strings (`area.thing`); shared strings live under
  `common.*`. Bikeshed risk acknowledged and closed.

## Release checklist (this is a feature → version bump)

Per `CLAUDE.md`, the same commit must change all three, and the drift-guard
test enforces it:

1. `package.json` `version` bump (e.g. `0.4.0 → 0.5.0`).
2. `CHANGELOG.md` — new `## [x.y.z] - YYYY-MM-DD` section, English.
3. `src/domain/releaseNotes.ts` — prepend a French, child-friendly entry
   covering: choose your language (FR/DE/EN) in Settings.

## Appendix — string key inventory

Grouped by area. French values shown; `de`/`en` to be authored. Emoji and the
leading `🏠`/`🚀`/`💾` glyphs stay in JSX unless noted; only text is keyed.

| Key | French value |
|---|---|
| `common.backToHome` | Retour à l'accueil |
| `common.backToHomeAria` | retour à l'accueil |
| `home.aboutAria` | à propos |
| `home.resultsAria` | mes résultats |
| `home.settingsAria` | paramètres |
| `home.modeTitle` | Mode |
| `home.inputTitle` | Saisie |
| `home.summary` | {count} questions · {seconds}s par question |
| `home.start` | Lancer |
| `tables.title` | Tables |
| `tables.selectAll` | Tout cocher |
| `tables.deselectAll` | Tout décocher |
| `mode.aria` | mode |
| `mode.mul` | × Multiplications |
| `mode.div` | ÷ Divisions |
| `mode.mix` | × ÷ Mélange |
| `answerMode.aria` | saisie |
| `answerMode.screen` | 📱 Sur l'écran |
| `answerMode.paper` | ✏️ Sur papier |
| `session.counter` | Question {n} / {total} |
| `session.ready` | Prêt ? |
| `countdown.aria` | temps restant |
| `timer.running` | temps en cours |
| `timer.over` | temps dépassé |
| `timer.target` | / cible {target}s |
| `numpad.digit` | chiffre {digit} |
| `numpad.erase` | effacer |
| `numpad.validate` | valider |
| `results.title` | Bilan |
| `results.legend` | Cible : {seconds}s — réponse plus lente : {points} pt |
| `results.slow` | trop lent |
| `results.wrongAnswer` | réponse : {given} |
| `results.noAnswer` | pas de réponse |
| `results.paperLegend` | Compare avec ta feuille, puis décoche ❌ les réponses fausses. |
| `results.markCorrect` | correct |
| `results.markWrong` | faux |
| `results.save` | Enregistrer le résultat |
| `results.saved` | Enregistré |
| `results.replay` | Refaire la même config |
| `progress.title` | Mes résultats |
| `progress.empty` | Joue quelques sessions pour voir ta progression |
| `progress.scoreTitle` | Score par session |
| `progress.scoreCaption` | Chaque point = une session. Les tables et le mode choisis changent la difficulté, donc le score. |
| `progress.pairsTitle` | Paires à revoir |
| `progress.tablesTitle` | Carte des tables |
| `chart.aria` | Score sur les dernières sessions |
| `chart.last` | dernière |
| `chart.legendCorrect` | juste / total |
| `chart.legendCredit` | score (crédit partiel) |
| `pairs.empty` | Aucune paire à revoir pour l'instant. |
| `settings.backAria` | retour |
| `settings.title` | Paramètres |
| `settings.targetTime` | Temps cible par question (s) |
| `settings.targetTimeHint` | Réponse plus rapide : 1 point. Plus lente : crédit partiel. |
| `settings.questionCount` | Nombre de questions |
| `settings.partialCredit` | Crédit pour réponse correcte mais lente (0–1) |
| `settings.partialCreditHint` | 0 = pas de crédit · 0.5 = demi-point · 1 = autant qu'une réponse rapide |
| `settings.save` | Enregistrer |
| `settings.clearHistory` | Effacer l'historique |
| `settings.clearConfirm` | Effacer l'historique et les statistiques ? |
| `settings.clearYes` | Oui, effacer |
| `settings.cancel` | Annuler |
| `settings.language` | Langue |
| `info.title` | À propos |
| `info.version` | version {version} |
| `info.whatsNew` | Nouveautés |
| `info.notesInFrench` | (shown only when lang ≠ fr — see À propos section) |
| `info.dataTitle` | Tes données |
| `info.dataP1` | Tes réglages, tes réponses et tes scores restent uniquement dans ce navigateur, sur cet appareil. Rien n'est envoyé sur Internet : pas de compte, pas de pistage. Tes données ne te suivent donc pas sur un autre appareil ou un autre navigateur. |
| `info.dataP2` | Tu peux tout effacer quand tu veux avec le bouton « Effacer l'historique » dans les Paramètres, ou en vidant les données de ton navigateur. |
| `info.credit` | Conçu avec 🥰, ☕ et 🤖 à Zürich, Suisse 🇨🇭 |

The `s` second-unit suffix (`{seconds}s`, `{target}s`) stays literal — it reads
the same in all three languages and is treated as a unit, not a word.
