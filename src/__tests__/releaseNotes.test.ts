import pkg from '../../package.json';
import changelog from '../../CHANGELOG.md?raw';
import { releaseNotes } from '../domain/releaseNotes';

const compareSemver = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
};

describe('releaseNotes', () => {
  it('top entry matches the package.json version (drift guard)', () => {
    expect(releaseNotes[0].version).toBe(pkg.version);
  });

  it('CHANGELOG.md has a Keep a Changelog section for the current version', () => {
    expect(changelog).toContain(`## [${pkg.version}]`);
  });

  it('is ordered strictly newest-first by semver', () => {
    for (let i = 1; i < releaseNotes.length; i++) {
      expect(
        compareSemver(releaseNotes[i - 1].version, releaseNotes[i].version),
      ).toBeGreaterThan(0);
    }
  });

  it('every entry has a date and non-empty notes in all three languages', () => {
    for (const note of releaseNotes) {
      expect(note.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const lang of ['fr', 'de', 'en'] as const) {
        expect(note.changes[lang].length).toBeGreaterThan(0);
        for (const change of note.changes[lang]) {
          expect(change.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
