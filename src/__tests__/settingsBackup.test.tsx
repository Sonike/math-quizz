import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithLanguage } from './renderWithLanguage';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DEFAULT_SETTINGS } from '../domain/session';
import type { SessionResult } from '../domain/session';
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_URL,
  createBackup,
  serializeBackup,
} from '../domain/backup';
import type { Backup } from '../domain/backup';

const session: SessionResult = {
  startedAt: '2026-05-09T08:01:00.000Z',
  durationPerQuestionMs: 4000,
  partialCreditFactor: 0.5,
  questionCount: 1,
  selectedTables: [7],
  mode: 'mul',
  answerMode: 'screen',
  answers: [
    { question: { a: 7, b: 8, op: 'mul', expected: 56 }, given: 56, elapsedMs: 1200 },
  ],
};

const backup: Backup = createBackup(
  {
    settings: { ...DEFAULT_SETTINGS, questionCount: 11 },
    history: [session],
    trainingHistory: [{ ...session, answerMode: 'training' }],
    errors: { '7x8': { attempts: 3, errors: 1, timeouts: 0 } },
  },
  { appVersion: '0.10.0', exportedAt: '2026-09-05T10:11:12.000Z', profile: 'default' },
);

const renderScreen = (over: Partial<Parameters<typeof SettingsScreen>[0]> = {}) => {
  const props = {
    settings: DEFAULT_SETTINGS,
    onSave: vi.fn(),
    onClearHistory: vi.fn(),
    onExport: vi.fn(() => backup),
    onImport: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
  renderWithLanguage(<SettingsScreen {...props} />, 'fr');
  return props;
};

/** jsdom 25 has no Blob.text(), so read the downloaded blob the long way. */
const blobText = (blob: Blob): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });

const uploadJson = (text: string) => {
  const input = screen.getByLabelText(/importer un fichier/i);
  const file = new File([text], 'backup.json', { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
};

describe('SettingsScreen — export', () => {
  let objectUrls: Blob[];
  let downloads: string[];

  beforeEach(() => {
    objectUrls = [];
    downloads = [];
    URL.createObjectURL = vi.fn((blob: Blob) => {
      objectUrls.push(blob);
      return 'blob:mock';
    });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('downloads a dated .json file built from the profile', async () => {
    const props = renderScreen();
    fireEvent.click(screen.getByRole('button', { name: /exporter mes données/i }));

    expect(props.onExport).toHaveBeenCalledOnce();
    expect(downloads).toEqual(['math-quizz-backup-2026-09-05.json']);

    const written = JSON.parse(await blobText(objectUrls[0]));
    expect(written.format).toBe(BACKUP_FORMAT);
    expect(written.data.history).toHaveLength(1);
    await screen.findByText(/fichier exporté/i);
  });

  it('links to the published JSON Schema so others can read the file', () => {
    renderScreen();
    expect(screen.getByRole('link', { name: /schéma json/i })).toHaveAttribute(
      'href',
      BACKUP_SCHEMA_URL,
    );
  });
});

describe('SettingsScreen — import', () => {
  it('asks for confirmation, showing what the file contains, before overwriting', async () => {
    const props = renderScreen();
    uploadJson(serializeBackup(backup));

    await screen.findByText(/remplacer tes données/i);
    expect(
      screen.getByText(/tests\s*:\s*1.*entraînements\s*:\s*1.*paires\s*:\s*1/i),
    ).toBeInTheDocument();
    expect(props.onImport).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /oui, importer/i }));
    expect(props.onImport).toHaveBeenCalledWith(
      expect.objectContaining({ format: BACKUP_FORMAT }),
    );
    await screen.findByText(/données importées/i);
  });

  it('refreshes the form fields, so a later Save cannot revert the import', async () => {
    const onSave = vi.fn();
    renderScreen({ onSave });

    const imported = createBackup(
      {
        settings: {
          ...DEFAULT_SETTINGS,
          questionCount: 33,
          durationPerQuestionMs: 7000,
          partialCreditFactor: 0.25,
        },
        history: [],
        trainingHistory: [],
        errors: {},
      },
      { appVersion: '0.10.0', exportedAt: '2026-09-05T10:11:12.000Z', profile: 'default' },
    );
    uploadJson(serializeBackup(imported));
    await screen.findByText(/remplacer tes données/i);
    fireEvent.click(screen.getByRole('button', { name: /oui, importer/i }));

    expect(screen.getByLabelText(/nombre de questions/i)).toHaveValue(33);
    expect(screen.getByLabelText(/temps cible par question/i)).toHaveValue(7);

    // And saving now persists the imported values, not the pre-import ones.
    fireEvent.click(screen.getByRole('button', { name: /^enregistrer$/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        questionCount: 33,
        durationPerQuestionMs: 7000,
        partialCreditFactor: 0.25,
      }),
    );
  });

  it('cancelling leaves the profile untouched', async () => {
    const props = renderScreen();
    uploadJson(serializeBackup(backup));

    await screen.findByText(/remplacer tes données/i);
    fireEvent.click(screen.getByRole('button', { name: /^annuler$/i }));

    expect(props.onImport).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText(/remplacer tes données/i)).not.toBeInTheDocument(),
    );
  });

  it.each([
    ['not JSON at all', 'hello', /pas lisible/i],
    ['a JSON file from another app', '{"foo":1}', /pas un export math quizz/i],
    [
      'a backup from a newer format version',
      JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 2, data: {} }),
      /version plus récente/i,
    ],
    [
      'a structurally broken backup',
      JSON.stringify({ format: BACKUP_FORMAT, formatVersion: 1, data: { history: 'nope' } }),
      /abîmé/i,
    ],
  ])('refuses %s with a specific message', async (_label, text, message) => {
    const props = renderScreen();
    uploadJson(text);

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(props.onImport).not.toHaveBeenCalled();
    expect(screen.queryByText(/remplacer tes données/i)).not.toBeInTheDocument();
  });

  it('surfaces a storage failure instead of pretending the import worked', async () => {
    const onImport = vi.fn(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    renderScreen({ onImport });
    uploadJson(serializeBackup(backup));

    await screen.findByText(/remplacer tes données/i);
    fireEvent.click(screen.getByRole('button', { name: /oui, importer/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/mémoire du navigateur/i);
    expect(screen.queryByText(/données importées/i)).not.toBeInTheDocument();
  });
});
