/**
 * User-facing release notes, shown in the "À propos" screen.
 *
 * French and child-friendly — this is NOT the technical changelog.
 * See CHANGELOG.md for the contributor-facing log, and CLAUDE.md for the
 * release ritual that keeps the two (and package.json) in sync. The newest
 * entry's `version` MUST equal package.json's version (enforced by
 * src/__tests__/releaseNotes.test.ts).
 */
export type ReleaseNote = {
  version: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  /** One or more short, user-oriented change notes. */
  changes: string[];
};

/** Newest first. */
export const releaseNotes: ReleaseNote[] = [
  {
    version: '0.4.0',
    date: '2026-06-13',
    changes: [
      "Nouvelle page « À propos » : la version de l'appli, les nouveautés, et où sont rangées tes données.",
    ],
  },
  {
    version: '0.3.0',
    date: '2026-06-13',
    changes: [
      "Installe l'appli sur ta tablette ou ton téléphone, et joue même hors connexion.",
    ],
  },
  {
    version: '0.2.0',
    date: '2026-06-13',
    changes: [
      'Nouvelle page « Mes résultats » : suis tes scores et repère les opérations à revoir.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-05-09',
    changes: [
      'Première version : entraînement chronométré aux tables de multiplication et de division, au clavier ou sur papier.',
    ],
  },
];
