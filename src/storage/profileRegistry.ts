/**
 * Who is playing.
 *
 * A profile is a **name and a storage prefix, not an identity**. There is no
 * password, no PIN, no recovery and no account: whoever holds the device can
 * switch to any profile. That is deliberate — the data is a child's practice
 * history on a family tablet, not something to protect from the family. What
 * profiles fix is attribution: a brother's timeouts should not land in his
 * sister's heat-map.
 *
 * This module owns exactly one localStorage key, `mathquizz:profiles`, which
 * sits *outside* the per-profile prefix. `profileStore.ts` owns everything
 * inside a prefix and never reads this registry — ids arrive there as
 * arguments. The dependency runs one way (registry → store, for the purge on
 * delete), so there is no cycle.
 *
 * Every mutator here is a **pure transform** over a registry value: it returns
 * a new registry, or the one it was given, unchanged, when the change is not
 * allowed (blank name, unknown id, past the cap, deleting the last profile).
 * `Object.is` on the result is therefore a reliable "did anything happen?".
 * The one exception is `deleteProfile`, which also has to erase the data.
 */
import { purgeProfile } from './profileStore';

export type ProfileEntry = {
  /** Opaque and stable. Also the storage prefix segment, so charset-restricted. */
  id: string;
  /** What the child sees. Empty on the migrated profile — see `profileLabel`. */
  name: string;
  /** ISO timestamp, or '' when unknown (the migrated profile predates it). */
  createdAt: string;
};

export type ProfileRegistry = {
  /** Id of the profile currently in use. Always present in `profiles`. */
  active: string;
  /** At least one, always. Order is creation order and drives the switcher. */
  profiles: ProfileEntry[];
};

export const REGISTRY_KEY = 'mathquizz:profiles';

/**
 * The profile that existed before this feature. Its id is pinned so the data
 * already sitting under `mathquizz:profile:default:` does not have to move.
 */
export const DEFAULT_PROFILE_ID = 'default';

/** Enough for a family; keeps the switcher a single readable row of chips. */
export const MAX_PROFILES = 6;

/** A first name, not a sentence. Long enough for "Marie-Charlotte". */
export const MAX_NAME_LENGTH = 20;

/** An id becomes part of a localStorage key, so ':' and friends are out. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const migrated = (): ProfileRegistry => ({
  active: DEFAULT_PROFILE_ID,
  profiles: [{ id: DEFAULT_PROFILE_ID, name: '', createdAt: '' }],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readEntry = (value: unknown): ProfileEntry | null => {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !ID_PATTERN.test(value.id)) return null;
  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : '',
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
  };
};

/**
 * Always returns a usable registry. Anything unreadable, malformed or
 * self-inconsistent degrades to the migrated single-profile registry rather
 * than throwing: a browser that cannot answer "who is playing?" would have no
 * screen left to render.
 *
 * Deliberately clock-free and side-effect-free. The caller persists the result
 * (App does it in the same effect that persists settings), so a first run
 * writes the registry once and nothing rewrites it on every read.
 */
export const loadRegistry = (): ProfileRegistry => {
  const raw = localStorage.getItem(REGISTRY_KEY);
  if (raw === null) return migrated();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return migrated();
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.profiles)) return migrated();

  const seen = new Set<string>();
  const profiles: ProfileEntry[] = [];
  for (const candidate of parsed.profiles) {
    const entry = readEntry(candidate);
    if (entry === null || seen.has(entry.id)) continue;
    seen.add(entry.id);
    profiles.push(entry);
  }
  if (profiles.length === 0) return migrated();

  const active =
    typeof parsed.active === 'string' && seen.has(parsed.active)
      ? parsed.active
      : profiles[0].id;
  return { active, profiles };
};

export const saveRegistry = (registry: ProfileRegistry): void => {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
};

/** Trimmed, whitespace-collapsed and capped. '' means "the caller must refuse". */
export const normalizeName = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);

/**
 * Case-insensitive, because two siblings called "Léa" and "léa" is the exact
 * confusion profiles exist to prevent. Compares raw names: the fallback label
 * for the nameless profile is a UI concern and is not reserved.
 */
export const isNameTaken = (
  profiles: ProfileEntry[],
  name: string,
  exceptId?: string,
): boolean => {
  const wanted = normalizeName(name).toLocaleLowerCase();
  return profiles.some(
    (entry) => entry.id !== exceptId && entry.name.toLocaleLowerCase() === wanted,
  );
};

export const findProfile = (
  registry: ProfileRegistry,
  id: string,
): ProfileEntry | undefined => registry.profiles.find((entry) => entry.id === id);

/** The name to show. The migrated profile has none, so the UI supplies a label. */
export const profileLabel = (
  entry: ProfileEntry | undefined,
  fallback: string,
): string => (entry && entry.name.trim() !== '' ? entry.name : fallback);

const newId = (taken: Set<string>): string => {
  const base =
    globalThis.crypto?.randomUUID?.() ??
    `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
};

/**
 * Appends a profile **without switching to it**. Creation happens in Settings,
 * where the form above edits the *current* profile's numbers; switching under
 * the user there would silently re-target the next "Enregistrer". Switching
 * stays one deliberate tap on the home screen.
 */
export const addProfile = (
  registry: ProfileRegistry,
  name: string,
  now: Date = new Date(),
): ProfileRegistry => {
  const clean = normalizeName(name);
  if (clean === '' || registry.profiles.length >= MAX_PROFILES) return registry;
  const id = newId(new Set(registry.profiles.map((entry) => entry.id)));
  return {
    ...registry,
    profiles: [
      ...registry.profiles,
      { id, name: clean, createdAt: now.toISOString() },
    ],
  };
};

export const renameProfile = (
  registry: ProfileRegistry,
  id: string,
  name: string,
): ProfileRegistry => {
  const clean = normalizeName(name);
  if (clean === '' || findProfile(registry, id) === undefined) return registry;
  return {
    ...registry,
    profiles: registry.profiles.map((entry) =>
      entry.id === id ? { ...entry, name: clean } : entry,
    ),
  };
};

export const setActiveProfile = (
  registry: ProfileRegistry,
  id: string,
): ProfileRegistry =>
  findProfile(registry, id) === undefined ? registry : { ...registry, active: id };

/**
 * Drops the entry **and erases the data it owned** — a profile whose keys
 * outlived it would be invisible storage nobody can reach or export.
 * Refuses on the last profile: the app has no "no profile" state.
 */
export const deleteProfile = (
  registry: ProfileRegistry,
  id: string,
): ProfileRegistry => {
  if (registry.profiles.length <= 1 || findProfile(registry, id) === undefined) {
    return registry;
  }
  const profiles = registry.profiles.filter((entry) => entry.id !== id);
  purgeProfile(id);
  return {
    active: registry.active === id ? profiles[0].id : registry.active,
    profiles,
  };
};
