import { useState } from 'react';
import {
  MAX_PROFILES,
  MAX_NAME_LENGTH,
  addProfile,
  deleteProfile,
  isNameTaken,
  profileLabel,
  renameProfile,
} from '../storage/profileRegistry';
import type { ProfileRegistry } from '../storage/profileRegistry';
import { useI18n } from '../i18n/I18nContext';
import type { TranslationKey } from '../i18n/types';
import './ProfileManager.css';

type Props = {
  registry: ProfileRegistry;
  onChange: (next: ProfileRegistry) => void;
  /** Downloads that profile's backup. Offered before a delete, never after. */
  onExportProfile: (profileId: string) => void;
};

/**
 * Create / rename / delete, in Settings. Switching lives on the home screen
 * instead: it is the frequent gesture and the one a child does alone.
 *
 * Deleting is the only irreversible thing this app can do — there is no
 * server, so a deleted history is gone. The confirmation therefore offers the
 * export **first**, in the same dialog, rather than trusting the reader to
 * have thought of it.
 */
export const ProfileManager = ({ registry, onChange, onExportProfile }: Props) => {
  const { t } = useI18n();
  const [newName, setNewName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);

  const unnamed = t('profiles.unnamed');
  const label = (id: string) =>
    profileLabel(
      registry.profiles.find((entry) => entry.id === id),
      unnamed,
    );
  const canDelete = registry.profiles.length > 1;
  const isFull = registry.profiles.length >= MAX_PROFILES;

  const submitNew = () => {
    if (newName.trim() === '') return setError('profiles.errorEmpty');
    if (isNameTaken(registry.profiles, newName)) return setError('profiles.errorTaken');
    if (isFull) return setError('profiles.full');
    onChange(addProfile(registry, newName));
    setNewName('');
    setError(null);
  };

  const startRename = (id: string) => {
    setDeletingId(null);
    setError(null);
    setRenamingId(id);
    // Seeded with the stored name, not the "Sans nom" placeholder: renaming
    // the migrated profile should start from an empty field, not from a label
    // the child would have to clear first.
    setRenameValue(registry.profiles.find((entry) => entry.id === id)?.name ?? '');
  };

  const submitRename = () => {
    if (renamingId === null) return;
    if (renameValue.trim() === '') return setError('profiles.errorEmpty');
    if (isNameTaken(registry.profiles, renameValue, renamingId)) {
      return setError('profiles.errorTaken');
    }
    onChange(renameProfile(registry, renamingId, renameValue));
    setRenamingId(null);
    setError(null);
  };

  const confirmDelete = (id: string) => {
    onChange(deleteProfile(registry, id));
    setDeletingId(null);
    setError(null);
  };

  return (
    <section className="settings__section">
      <h3 className="settings__section-title">{t('profiles.title')}</h3>
      <p className="settings__hint">{t('profiles.hint')}</p>

      <ul className="profile-manager__list">
        {registry.profiles.map((profile) => (
          <li key={profile.id} className="profile-manager__item">
            {renamingId === profile.id ? (
              <div className="profile-manager__row">
                <input
                  className="profile-manager__input"
                  type="text"
                  maxLength={MAX_NAME_LENGTH}
                  value={renameValue}
                  placeholder={t('profiles.newName')}
                  aria-label={t('profiles.renameAria', { name: label(profile.id) })}
                  onChange={(event) => setRenameValue(event.target.value)}
                />
                <button
                  type="button"
                  className="settings__secondary profile-manager__action"
                  onClick={submitRename}
                >
                  {t('profiles.confirmRename')}
                </button>
                <button
                  type="button"
                  className="settings__secondary profile-manager__action"
                  onClick={() => {
                    setRenamingId(null);
                    setError(null);
                  }}
                >
                  {t('settings.cancel')}
                </button>
              </div>
            ) : (
              <div className="profile-manager__row">
                <span
                  className="profile-manager__name"
                  aria-current={profile.id === registry.active ? 'true' : undefined}
                >
                  {profile.id === registry.active && (
                    <span aria-hidden="true">👤 </span>
                  )}
                  {profileLabel(profile, unnamed)}
                </span>
                <button
                  type="button"
                  className="profile-manager__icon-btn"
                  aria-label={t('profiles.renameAria', { name: profileLabel(profile, unnamed) })}
                  onClick={() => startRename(profile.id)}
                >
                  ✏️
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className="profile-manager__icon-btn"
                    aria-label={t('profiles.deleteAria', {
                      name: profileLabel(profile, unnamed),
                    })}
                    onClick={() => {
                      setRenamingId(null);
                      setError(null);
                      setDeletingId(profile.id);
                    }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}

            {deletingId === profile.id && (
              <div className="settings__confirm">
                <p>
                  {t('profiles.deleteConfirm', { name: profileLabel(profile, unnamed) })}
                </p>
                <div className="settings__confirm-row">
                  <button
                    type="button"
                    className="settings__secondary"
                    onClick={() => onExportProfile(profile.id)}
                  >
                    {`⬇️ ${t('profiles.exportFirst')}`}
                  </button>
                  <button
                    type="button"
                    className="settings__danger"
                    onClick={() => confirmDelete(profile.id)}
                  >
                    {t('profiles.deleteYes')}
                  </button>
                  <button
                    type="button"
                    className="settings__secondary"
                    onClick={() => setDeletingId(null)}
                  >
                    {t('settings.cancel')}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="profile-manager__row">
        <input
          className="profile-manager__input"
          type="text"
          maxLength={MAX_NAME_LENGTH}
          value={newName}
          placeholder={t('profiles.newName')}
          aria-label={t('profiles.newName')}
          disabled={isFull}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button
          type="button"
          className="settings__secondary profile-manager__action"
          disabled={isFull}
          onClick={submitNew}
        >
          {`➕ ${t('profiles.add')}`}
        </button>
      </div>

      {isFull && (
        <p className="settings__hint">{t('profiles.full', { max: MAX_PROFILES })}</p>
      )}

      {error && (
        <p className="settings__notice settings__notice--error" role="alert">
          {t(error, { max: MAX_PROFILES })}
        </p>
      )}
    </section>
  );
};
