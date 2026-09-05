import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PROFILE_ID,
  MAX_NAME_LENGTH,
  MAX_PROFILES,
  REGISTRY_KEY,
  addProfile,
  deleteProfile,
  findProfile,
  isNameTaken,
  loadRegistry,
  normalizeName,
  profileLabel,
  renameProfile,
  saveRegistry,
  setActiveProfile,
} from '../storage/profileRegistry';
import type { ProfileRegistry } from '../storage/profileRegistry';
import { saveSettings, recordSession, storageKeys } from '../storage/profileStore';
import { DEFAULT_SETTINGS } from '../domain/session';
import type { SessionResult } from '../domain/session';

const session = (): SessionResult => ({
  startedAt: '2026-09-05T08:00:00.000Z',
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
  questionCount: 1,
  selectedTables: [7],
  mode: 'mul',
  answers: [
    { question: { a: 7, b: 8, op: 'mul', expected: 56 }, given: 56, elapsedMs: 900 },
  ],
});

const NOW = new Date('2026-09-05T10:00:00.000Z');

beforeEach(() => localStorage.clear());

describe('loadRegistry', () => {
  it('migrates a browser that has never seen the registry into a single default profile', () => {
    const registry = loadRegistry();
    expect(registry.active).toBe(DEFAULT_PROFILE_ID);
    expect(registry.profiles).toEqual([
      { id: DEFAULT_PROFILE_ID, name: '', createdAt: '' },
    ]);
  });

  it('keeps the id "default" so the existing data does not have to move', () => {
    saveSettings(DEFAULT_PROFILE_ID, { ...DEFAULT_SETTINGS, questionCount: 11 });
    const registry = loadRegistry();
    expect(registry.profiles[0].id).toBe(DEFAULT_PROFILE_ID);
    expect(localStorage.getItem(storageKeys(DEFAULT_PROFILE_ID).settings)).toContain('11');
  });

  it('reads back what saveRegistry wrote', () => {
    const registry: ProfileRegistry = {
      active: 'p2',
      profiles: [
        { id: DEFAULT_PROFILE_ID, name: 'Léa', createdAt: '' },
        { id: 'p2', name: 'Tom', createdAt: '2026-09-05T10:00:00.000Z' },
      ],
    };
    saveRegistry(registry);
    expect(loadRegistry()).toEqual(registry);
  });

  it('falls back to the default registry when the stored value is not JSON', () => {
    localStorage.setItem(REGISTRY_KEY, '{not json');
    expect(loadRegistry().profiles).toHaveLength(1);
  });

  it('drops entries with an unusable id rather than minting a broken storage prefix', () => {
    saveRegistry({
      active: 'ok',
      profiles: [
        { id: 'ok', name: 'Tom', createdAt: '' },
        { id: 'has:colon', name: 'Bad', createdAt: '' },
        { id: '', name: 'Empty', createdAt: '' },
      ] as never,
    });
    expect(loadRegistry().profiles.map((p) => p.id)).toEqual(['ok']);
  });

  it('keeps the first of two entries sharing an id', () => {
    saveRegistry({
      active: 'dup',
      profiles: [
        { id: 'dup', name: 'First', createdAt: '' },
        { id: 'dup', name: 'Second', createdAt: '' },
      ],
    });
    expect(loadRegistry().profiles).toEqual([{ id: 'dup', name: 'First', createdAt: '' }]);
  });

  it('repoints active at the first profile when it names one that is gone', () => {
    saveRegistry({
      active: 'vanished',
      profiles: [{ id: 'kept', name: 'Tom', createdAt: '' }],
    });
    expect(loadRegistry().active).toBe('kept');
  });

  it('never returns an empty profile list', () => {
    saveRegistry({ active: 'x', profiles: [] });
    expect(loadRegistry().profiles).toHaveLength(1);
  });
});

describe('names', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeName('  Léa   Marie ')).toBe('Léa Marie');
  });

  it('caps the length so a name still fits a switcher chip', () => {
    expect(normalizeName('x'.repeat(MAX_NAME_LENGTH + 10))).toHaveLength(MAX_NAME_LENGTH);
  });

  it('reports a name already used by another profile, ignoring case', () => {
    const profiles = [{ id: 'a', name: 'Léa', createdAt: '' }];
    expect(isNameTaken(profiles, 'léa')).toBe(true);
    expect(isNameTaken(profiles, 'Tom')).toBe(false);
  });

  it('does not count a profile against its own rename', () => {
    const profiles = [{ id: 'a', name: 'Léa', createdAt: '' }];
    expect(isNameTaken(profiles, 'Léa', 'a')).toBe(false);
  });

  it('labels the nameless migrated profile with the caller-supplied fallback', () => {
    expect(profileLabel({ id: 'default', name: '', createdAt: '' }, 'Sans nom')).toBe('Sans nom');
    expect(profileLabel({ id: 'default', name: 'Tom', createdAt: '' }, 'Sans nom')).toBe('Tom');
  });
});

describe('addProfile', () => {
  it('appends an entry with an opaque id and a creation date', () => {
    const next = addProfile(loadRegistry(), 'Tom', NOW);
    expect(next.profiles).toHaveLength(2);
    const added = next.profiles[1];
    expect(added.name).toBe('Tom');
    expect(added.createdAt).toBe(NOW.toISOString());
    expect(added.id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(added.id).not.toBe(DEFAULT_PROFILE_ID);
  });

  it('does not switch to the new profile — switching stays an explicit gesture', () => {
    const next = addProfile(loadRegistry(), 'Tom', NOW);
    expect(next.active).toBe(DEFAULT_PROFILE_ID);
  });

  it('refuses a blank name', () => {
    const registry = loadRegistry();
    expect(addProfile(registry, '   ', NOW)).toBe(registry);
  });

  it('refuses to go past MAX_PROFILES', () => {
    let registry = loadRegistry();
    for (let i = 1; i < MAX_PROFILES; i++) registry = addProfile(registry, `P${i}`, NOW);
    expect(registry.profiles).toHaveLength(MAX_PROFILES);
    expect(addProfile(registry, 'one too many', NOW)).toBe(registry);
  });
});

describe('renameProfile / setActiveProfile', () => {
  it('renames in place, leaving the id and the stored data alone', () => {
    const next = renameProfile(loadRegistry(), DEFAULT_PROFILE_ID, '  Léa ');
    expect(next.profiles[0]).toEqual({ id: DEFAULT_PROFILE_ID, name: 'Léa', createdAt: '' });
  });

  it('ignores a rename to nothing and a rename of an unknown profile', () => {
    const registry = loadRegistry();
    expect(renameProfile(registry, DEFAULT_PROFILE_ID, '  ')).toBe(registry);
    expect(renameProfile(registry, 'nope', 'Tom')).toBe(registry);
  });

  it('switches the active profile, and ignores an unknown id', () => {
    const registry = addProfile(loadRegistry(), 'Tom', NOW);
    const tom = registry.profiles[1].id;
    expect(setActiveProfile(registry, tom).active).toBe(tom);
    expect(setActiveProfile(registry, 'nope')).toBe(registry);
  });
});

describe('deleteProfile', () => {
  it('removes the entry and wipes every storage key that profile owned', () => {
    const registry = addProfile(loadRegistry(), 'Tom', NOW);
    const tom = registry.profiles[1].id;
    saveSettings(tom, { ...DEFAULT_SETTINGS, questionCount: 33 });
    recordSession(tom, session());

    const next = deleteProfile(registry, tom);

    expect(next.profiles.map((p) => p.id)).toEqual([DEFAULT_PROFILE_ID]);
    expect(localStorage.getItem(storageKeys(tom).settings)).toBeNull();
    expect(localStorage.getItem(storageKeys(tom).history)).toBeNull();
  });

  it('moves active to the first survivor when the active profile is deleted', () => {
    let registry = addProfile(loadRegistry(), 'Tom', NOW);
    const tom = registry.profiles[1].id;
    registry = setActiveProfile(registry, tom);
    expect(deleteProfile(registry, tom).active).toBe(DEFAULT_PROFILE_ID);
  });

  it('refuses to delete the last profile, and touches no storage when it refuses', () => {
    const registry = loadRegistry();
    saveSettings(DEFAULT_PROFILE_ID, { ...DEFAULT_SETTINGS, questionCount: 11 });
    expect(deleteProfile(registry, DEFAULT_PROFILE_ID)).toBe(registry);
    expect(localStorage.getItem(storageKeys(DEFAULT_PROFILE_ID).settings)).not.toBeNull();
  });
});

describe('findProfile', () => {
  it('returns the entry, or undefined for an unknown id', () => {
    const registry = loadRegistry();
    expect(findProfile(registry, DEFAULT_PROFILE_ID)?.id).toBe(DEFAULT_PROFILE_ID);
    expect(findProfile(registry, 'nope')).toBeUndefined();
  });
});
