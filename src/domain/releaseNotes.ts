/**
 * User-facing release notes, shown in the "À propos" screen.
 *
 * Localized and child-friendly (tutoiement FR / du-form DE / casual EN) — this
 * is NOT the technical changelog. See CHANGELOG.md for the contributor-facing
 * log, and CLAUDE.md for the release ritual that keeps the two (and
 * package.json) in sync. The newest entry's `version` MUST equal package.json's
 * version, and every entry MUST carry fr/de/en notes — both enforced by
 * src/__tests__/releaseNotes.test.ts.
 */
import type { Language } from '../i18n/types';

export type ReleaseNote = {
  version: string;
  /** ISO date, YYYY-MM-DD. Shared across languages. */
  date: string;
  /** User-oriented change notes, one array per language. */
  changes: Record<Language, string[]>;
};

/** Newest first. */
export const releaseNotes: ReleaseNote[] = [
  {
    version: '0.10.0',
    date: '2026-09-05',
    changes: {
      fr: [
        'Tes données ne sont plus prisonnières du navigateur : dans les Paramètres, « Exporter mes données » enregistre tes réglages, tes tests et tes statistiques dans un fichier, et « Importer un fichier » les remet en place — pratique pour garder une copie ou continuer sur un autre appareil.',
      ],
      de: [
        'Deine Daten stecken nicht mehr im Browser fest: In den Einstellungen speichert « Meine Daten exportieren » deine Einstellungen, Tests und Statistiken in einer Datei, und « Datei importieren » holt sie zurück — praktisch für eine Kopie oder um auf einem anderen Gerät weiterzumachen.',
      ],
      en: [
        'Your data is no longer stuck in the browser: in Settings, "Export my data" saves your settings, tests and stats to a file, and "Import a file" puts them back — handy for keeping a copy or carrying on from another device.',
      ],
    },
  },
  {
    version: '0.9.0',
    date: '2026-06-15',
    changes: {
      fr: [
        'Les nouveautés s’affichent maintenant dans ta langue (français, allemand ou anglais) — fini les notes toujours en français.',
      ],
      de: [
        'Die Neuigkeiten erscheinen jetzt in deiner Sprache (Französisch, Deutsch oder Englisch) — keine Hinweise mehr nur auf Französisch.',
      ],
      en: [
        'What’s new now shows in your language (French, German or English) — no more notes stuck in French.',
      ],
    },
  },
  {
    version: '0.8.0',
    date: '2026-06-14',
    changes: {
      fr: [
        'Nouveau mode « Liste » : fais défiler une liste d’opérations avec leurs réponses cachées. Montre-les toutes d’un coup, ou tape une ligne pour voir une seule réponse. Le bouton « Nouvelle liste » en génère d’autres.',
      ],
      de: [
        'Neuer Modus « Liste »: Scrolle durch eine Liste von Aufgaben mit versteckten Antworten. Zeig alle auf einmal an oder tippe auf eine Zeile, um nur eine Antwort zu sehen. Mit « Neue Liste » bekommst du neue Aufgaben.',
      ],
      en: [
        'New "List" mode: scroll through a list of problems with their answers hidden. Show them all at once, or tap a row to reveal just one. The "New list" button gives you more.',
      ],
    },
  },
  {
    version: '0.7.1',
    date: '2026-06-14',
    changes: {
      fr: [
        'Si l’appli te plaît, dis-le à tes parents : depuis la page « À propos », ils peuvent la soutenir en m’offrant un café ☕.',
      ],
      de: [
        'Wenn dir die App gefällt, sag es deinen Eltern: Auf der Seite « Über » können sie die App mit einem Kaffee ☕ unterstützen.',
      ],
      en: [
        'If you like the app, tell your parents: on the "About" page they can support it with a coffee ☕.',
      ],
    },
  },
  {
    version: '0.7.0',
    date: '2026-06-14',
    changes: {
      fr: [
        'Tu peux maintenant changer la langue (FR, DE, EN) directement en haut de l’écran d’accueil, sans passer par les Paramètres.',
      ],
      de: [
        'Du kannst die Sprache (FR, DE, EN) jetzt direkt oben auf dem Startbildschirm wechseln, ohne in die Einstellungen zu gehen.',
      ],
      en: [
        'You can now switch the language (FR, DE, EN) right at the top of the home screen, without going into Settings.',
      ],
    },
  },
  {
    version: '0.6.0',
    date: '2026-06-13',
    changes: {
      fr: [
        'Nouveau mode « Entraînement » : pas de chrono. Après chaque réponse, tu vois tout de suite si c’est juste et la bonne réponse, puis tu passes à la suivante.',
        'Tes entraînements ont leur propre page de résultats : ouvre « Mes résultats » et choisis « Entraînement ».',
      ],
      de: [
        'Neuer Modus « Üben »: keine Stoppuhr. Nach jeder Antwort siehst du sofort, ob sie richtig ist und wie die richtige Antwort lautet, dann geht es zur nächsten.',
        'Deine Übungen haben ihre eigene Ergebnisseite: Öffne « Meine Ergebnisse » und wähle « Üben ».',
      ],
      en: [
        'New "Practice" mode: no timer. After each answer you see right away whether it’s correct and what the right answer is, then you go to the next one.',
        'Your practice sessions have their own results page: open "My results" and choose "Practice".',
      ],
    },
  },
  {
    version: '0.5.1',
    date: '2026-06-13',
    changes: {
      fr: [
        'Les boutons que tu as choisis (comme l’opération ou la langue) restent bien lisibles quand tu passes la souris dessus.',
      ],
      de: [
        'Die Schaltflächen, die du ausgewählt hast (wie die Rechenart oder die Sprache), bleiben gut lesbar, wenn du mit der Maus darüberfährst.',
      ],
      en: [
        'The buttons you’ve picked (like the operation or the language) stay easy to read when you hover over them.',
      ],
    },
  },
  {
    version: '0.5.0',
    date: '2026-06-13',
    changes: {
      fr: [
        'Tu peux maintenant choisir la langue : français, allemand ou anglais, dans les Paramètres.',
      ],
      de: [
        'Du kannst jetzt in den Einstellungen die Sprache wählen: Französisch, Deutsch oder Englisch.',
      ],
      en: [
        'You can now choose the language — French, German or English — in Settings.',
      ],
    },
  },
  {
    version: '0.4.0',
    date: '2026-06-13',
    changes: {
      fr: [
        "Nouvelle page « À propos » : la version de l'appli, les nouveautés, et où sont rangées tes données.",
      ],
      de: [
        'Neue Seite « Über »: die App-Version, die Neuigkeiten und wo deine Daten gespeichert sind.',
      ],
      en: [
        'New "About" page: the app version, what’s new, and where your data is kept.',
      ],
    },
  },
  {
    version: '0.3.0',
    date: '2026-06-13',
    changes: {
      fr: [
        "Installe l'appli sur ta tablette ou ton téléphone, et joue même hors connexion.",
      ],
      de: [
        'Installiere die App auf deinem Tablet oder Handy und spiele sogar ohne Internet.',
      ],
      en: [
        'Install the app on your tablet or phone, and play even when you’re offline.',
      ],
    },
  },
  {
    version: '0.2.0',
    date: '2026-06-13',
    changes: {
      fr: [
        'Nouvelle page « Mes résultats » : suis tes scores et repère les opérations à revoir.',
      ],
      de: [
        'Neue Seite « Meine Ergebnisse »: Verfolge deine Punkte und finde die Aufgaben, die du üben solltest.',
      ],
      en: [
        'New "My results" page: track your scores and spot the problems to review.',
      ],
    },
  },
  {
    version: '0.1.0',
    date: '2026-05-09',
    changes: {
      fr: [
        'Première version : entraînement chronométré aux tables de multiplication et de division, au clavier ou sur papier.',
      ],
      de: [
        'Erste Version: Training mit Stoppuhr für die Reihen der Multiplikation und Division, mit der Tastatur oder auf Papier.',
      ],
      en: [
        'First version: timed practice on the multiplication and division tables, with the keyboard or on paper.',
      ],
    },
  },
];
