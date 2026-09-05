# Multiple named local profiles

- **Date:** 2026-09-05
- **Status:** As built, pending review
- **Ships as:** 0.12.0
- **Roadmap:** item 4

## Problem

The app stores exactly one profile per browser. Siblings sharing a tablet share
that profile, so a brother's timeouts land in his sister's heat-map and the
score curve on **Mes résultats** draws two children as one line. Every statistic
the app shows is derived from the two histories, so mixing the histories
corrupts everything downstream at once.

## Goals

- Separate settings and history per named person, on one device.
- Migrate the existing data without moving it.
- Keep the switch cheap and visible: a wrong-profile session is the failure mode
  this feature introduces, and it is silent.
- Extend export / import to name a profile, per roadmap item 4's last bullet.

## Non-goals

- **Any notion of security.** A profile is a name and a storage prefix, not an
  identity: no password, no PIN, no recovery, no account. Whoever holds the
  device can switch to, read or export any profile on it. That is the point —
  the data is a child's practice history on a family tablet, not something to
  protect from the family. If a profile ever needs protecting, that is a
  different feature and a different conversation.
- Syncing profiles between devices. Still nothing leaves the browser.
- Merging on import (roadmap item 10). Import stays a replace.

## Storage

Two modules, one direction of dependency.

`storage/profileRegistry.ts` owns a single key **outside** every profile prefix:

```jsonc
// mathquizz:profiles
{ "active": "default",
  "profiles": [{ "id": "default", "name": "", "createdAt": "" }] }
```

`storage/profileStore.ts` owns everything **inside** a prefix, and every
function now takes the id first: `loadHistory(profileId)`,
`saveSettings(profileId, settings)`, and so on. That is the whole storage
change the roadmap predicted — the keys already routed through a `PROFILE_ID`
constant, so turning the constant into an argument was mechanical.

The store deliberately does **not** know which profile is active. There is no
default parameter, so a screen cannot read the wrong profile by forgetting to
pass an id; it fails to compile instead. The registry imports `purgeProfile`
from the store (delete has to erase the data too); the store imports nothing
from the registry, so there is no cycle.

### Migration

`loadRegistry()` on a browser with no `mathquizz:profiles` key returns
`{ active: 'default', profiles: [{ id: 'default', name: '', createdAt: '' }] }`.
The id is pinned to `default`, which is the id the existing data is already
filed under, so **nothing moves and nothing is rewritten**.

`loadRegistry` is clock-free and side-effect-free: it synthesises that value but
does not persist it. `App` writes it in the same effect that persists settings,
so a first run stores the registry once instead of on every read, and tests do
not have to mock a clock.

`name` is `''` because the migrated profile genuinely has no name — the app
never asked for one. The UI renders `t('profiles.unnamed')` in its place, and
renaming starts from an empty field rather than from a placeholder the child
would have to clear. Same reasoning for `createdAt: ''`: the data predates the
registry, and inventing a timestamp would be a lie in a file a parent can read.

### Never returning garbage

`loadRegistry` degrades rather than throws: absent key, non-JSON, wrong shape,
entries with an id that would produce a broken storage prefix, duplicate ids,
an `active` naming a profile that is gone, an empty list — each falls back or is
filtered out. A browser that cannot answer "who is playing?" would have no
screen left to render. Ids are charset-restricted (`[A-Za-z0-9_-]{1,64}`)
precisely because they become part of a localStorage key.

### Pure mutators

`addProfile` / `renameProfile` / `setActiveProfile` are pure transforms over a
registry value; they return the input **unchanged** when the change is not
allowed (blank name, unknown id, past `MAX_PROFILES`), so `Object.is` on the
result is a reliable "did anything happen?". `deleteProfile` is the exception:
it also purges storage, because a profile whose keys outlived it would be
invisible storage nobody can reach, export or clear again.

## The desync that had to be designed out

The dangerous bug in this feature is one render in which `registry.active` is
the new profile while `settings` is still the old one — the effect that
persists settings then writes one child's preferences into another child's key.

`App` therefore holds **one** state value, `{ registry, settings }`. Two
`useState`s would have worked in practice (React 18 batches event handlers),
but this makes the bad render unrepresentable instead of merely unlikely. Every
transition goes through a helper that updates both halves together:
`switchProfile` reloads settings for the new id, and `applyRegistry` reloads
them only when the active id actually moved.

`SettingsScreen` is rendered with `key={activeId}`. Its three numeric inputs
seed from props on first render only (a known wrinkle the import path already
worked around by hand). Deleting the active profile moves `active`, so the
screen has to remount with fresh numbers rather than keep stale ones that the
next **Enregistrer** would write into someone else's profile.

`ProgressScreen` takes `profileId` and puts it in its `useMemo` deps, so
switching re-reads instead of showing the previous child's curve under the new
name.

## UI

**Home** — `ProfileSwitcher`, a wrapping row of name chips (a radio group, like
`ModeToggle`, but wrapping: names differ in length and there can be six).
Placed under the title, above the language row.

**It renders nothing when there is one profile.** Before this feature every
browser had exactly one, and a lone chip reading "Sans nom" would be noise on a
screen otherwise entirely about starting a session. It appears the moment a
second profile exists — which is also the moment picking the wrong one starts to
cost something.

**Settings → Profils** — `ProfileManager`: the list, rename, delete, and a
create field. Capped at `MAX_PROFILES = 6`, names at 20 characters, duplicate
names refused case-insensitively (two siblings called "Léa" and "léa" is the
exact confusion profiles exist to prevent).

**Mes résultats** — a name badge in the header, shown only when more than one
profile exists.

### Deviation from the roadmap: "display the active profile prominently on every screen"

Not done literally. The badge appears on Home and Mes résultats, and Settings
shows the list with the active one marked; the session, results, exercise-list
and about screens do not carry it.

The risk the roadmap wanted mitigated is *starting a session as the wrong
person*. The moment that decision is made is the home screen, and that is where
the switcher lives, permanently, at full size. A badge on the session screen
would arrive after the choice is irreversible, on the one screen the app
deliberately keeps free of anything but the question. So: **every screen where
it changes a decision or interprets data**, which is a smaller set.

### Deviation: creating a profile does not switch to it

Creation happens in Settings, where the form above edits the *current*
profile's numbers. Switching under the user there would silently re-target the
next **Enregistrer**. Switching stays one deliberate tap on the home screen.

## Export / import

- `exportProfile(profileId, appVersion, profileName)`; any profile can be
  exported, not only the active one.
- The delete confirmation offers **⬇️ Exporter ses données d'abord** in the same
  dialog. Deleting is the only irreversible thing this app can do — there is no
  server — so the escape hatch belongs next to the button, not in a hint the
  reader is trusted to have read.
- Suggested filename folds in the name: `math-quizz-backup-lea-2026-09-05.json`.
  Accents are folded; a name that folds to nothing (a non-Latin script) simply
  drops out rather than producing a doubled hyphen.
- The import confirmation gains a destination `<select>` (rendered only when
  there is somewhere else to put it), defaulting to the active profile, and
  names the source when the file carries one. `settings.importWarning` now names
  the **destination**, which is the honest statement once there is a choice.
- Importing into a non-active profile leaves the open Settings form untouched;
  only an import into the profile being edited re-seeds the three inputs.

### Envelope change (additive, `formatVersion` stays 1)

`profileName: string` joins `profile`. Both are informational: the destination
of an import is always the profile the user picked, never the one named in the
file — an id minted on another device may mean someone else here, or nobody.

**The registry is not part of a backup.** A file is one profile. Importing
therefore never creates, renames or removes a profile, so a file from another
device cannot rearrange this device's people, and a hand-edited file cannot
conjure one into being. The cost is that moving a sibling's data to a new device
is two steps (create the profile, then import into it) — and no step where the
app guesses who someone is.

`public/schemas/math-quizz-backup-v1.schema.json` and `docs/data-format.md`
move with it, as `CLAUDE.md` requires.

## Effect on roadmap item 10 (merge on import)

Unchanged in difficulty. Merging still waits on a stable session id. Profiles do
add a second reason to want it — "the same child on two devices" is now
distinguishable from "two children on one device", which was previously
ambiguous.

## Tests

- `profileRegistry.test.ts` — migration, self-healing on every malformed input,
  the pure mutators' refusals, delete purging storage, delete of the active one
  moving `active`.
- `profileStore.test.ts` — the existing suite, now parameterised, plus isolation
  between two profiles.
- `profileFlow.test.tsx` — switching in `App` swaps settings and history; a
  session records against the profile in use; the switcher stays hidden with one
  profile.
- `profileManager.test.tsx` — create / rename / delete, duplicate and blank
  names, export-before-delete.
- `settingsBackup.test.tsx` — the destination selector, and that importing
  elsewhere leaves the active profile alone.
