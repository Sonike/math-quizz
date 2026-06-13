# Language-on-home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the UI language as a 3-way segmented toggle (FR/DE/EN code badges + native names) as the first widget on the home page, and reuse the same component in Settings.

**Architecture:** A new presentational `LanguageToggle` component renders the existing `LANGUAGES` list as a `mode-toggle` radiogroup with an `aria-hidden` code badge. It's dropped into HomeScreen (first widget, bare row) and into SettingsScreen (replacing the inline selector). Switching calls the existing `onChange`/`onSave`, which already persist `settings.language` and re-render via `LanguageProvider`. No new state, store keys, or i18n keys.

**Tech Stack:** React 18 + TypeScript, Vite, Vitest + Testing Library, plain CSS. See `docs/superpowers/specs/2026-06-14-language-on-home-design.md`.

---

## File structure

- Create `src/components/LanguageToggle.tsx` — the reusable toggle.
- Create `src/components/LanguageToggle.css` — badge-over-name layout (layers on `ModeToggle.css`).
- Create `src/__tests__/languageToggle.test.tsx` — unit test.
- Modify `src/screens/HomeScreen.tsx` — render the toggle as the first widget.
- Modify `src/__tests__/homeScreen.test.tsx` — add a language-switch test.
- Modify `src/screens/SettingsScreen.tsx` — swap inline selector for `LanguageToggle`; drop the now-unused `LANGUAGES` import.
- Modify `package.json`, `CHANGELOG.md`, `src/domain/releaseNotes.ts` — 0.7.0 release (drift guard).

Existing tests that must stay green: `settingsLanguage.test.tsx`, `languageSwitch.test.tsx`, `i18n.test.ts`, the App flow tests.

---

### Task 1: `LanguageToggle` component

**Files:**
- Create: `src/components/LanguageToggle.tsx`
- Create: `src/components/LanguageToggle.css`
- Test: `src/__tests__/languageToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/languageToggle.test.tsx`:

```tsx
import { describe, expect, test, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithLanguage } from './renderWithLanguage';
import { LanguageToggle } from '../components/LanguageToggle';

describe('LanguageToggle', () => {
  test('marks the active language and emits its code on click', () => {
    const onChange = vi.fn();
    renderWithLanguage(<LanguageToggle value="fr" onChange={onChange} />, 'fr');

    expect(
      screen.getByRole('radio', { name: 'Français' }),
    ).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('radio', { name: 'Deutsch' }));
    expect(onChange).toHaveBeenCalledWith('de');
  });

  test('exposes all three languages by native name (code badge is a11y-hidden)', () => {
    renderWithLanguage(<LanguageToggle value="en" onChange={() => {}} />, 'en');
    expect(screen.getByRole('radio', { name: 'Français' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Deutsch' })).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: 'English' }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- languageToggle`
Expected: FAIL — `../components/LanguageToggle` does not exist.

- [ ] **Step 3: Create `src/components/LanguageToggle.tsx`**

```tsx
import type { Language } from '../i18n/types';
import { LANGUAGES } from '../i18n';
import { useI18n } from '../i18n/I18nContext';
import './ModeToggle.css';
import './LanguageToggle.css';

type Props = {
  value: Language;
  onChange: (next: Language) => void;
};

export const LanguageToggle = ({ value, onChange }: Props) => {
  const { t } = useI18n();
  return (
    <div
      className="mode-toggle language-toggle"
      role="radiogroup"
      aria-label={t('settings.language')}
    >
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          role="radio"
          aria-checked={value === l.code}
          className={`mode-toggle__option language-toggle__option${
            value === l.code ? ' mode-toggle__option--on' : ''
          }`}
          onClick={() => onChange(l.code)}
        >
          <span className="language-toggle__badge" aria-hidden="true">
            {l.code.toUpperCase()}
          </span>
          {l.nativeLabel}
        </button>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Create `src/components/LanguageToggle.css`**

```css
.language-toggle__option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.language-toggle__badge {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 0.08rem 0.4rem;
  border-radius: 6px;
  background: var(--color-chip-border);
  color: var(--color-fg-muted);
}

/* On the selected (accent) segment, keep the badge readable on the accent fill. */
.mode-toggle__option--on .language-toggle__badge {
  background: rgba(255, 255, 255, 0.25);
  color: white;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm test -- languageToggle`
Expected: PASS (both tests). The `aria-hidden` badge keeps each radio's accessible name equal to its native label.

- [ ] **Step 6: Commit**

```bash
git add src/components/LanguageToggle.tsx src/components/LanguageToggle.css src/__tests__/languageToggle.test.tsx
git commit -m "feat(i18n): reusable LanguageToggle (FR/DE/EN badges + native names)"
```

---

### Task 2: Render the toggle as the first home widget

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Test: `src/__tests__/homeScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a new describe block to `src/__tests__/homeScreen.test.tsx`:

```tsx
describe('HomeScreen — language selector', () => {
  test('switching language emits settings with the new language', () => {
    const onChange = vi.fn();
    render(
      <HomeScreen
        settings={DEFAULT_SETTINGS}
        onChange={onChange}
        onStart={noop}
        onOpenSettings={noop}
        onOpenProgress={noop}
        onOpenInfo={noop}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Deutsch' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'de' }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- homeScreen`
Expected: FAIL — no radio named "Deutsch" on the home screen yet.

- [ ] **Step 3: Add the import and render the toggle**

In `src/screens/HomeScreen.tsx`, add the import alongside the others:

```tsx
import { LanguageToggle } from '../components/LanguageToggle';
```

Then insert the toggle immediately after the closing `</header>` and before the first Tables `<section className="home__panel">`:

```tsx
      </header>
      <LanguageToggle
        value={settings.language}
        onChange={(language) => onChange({ ...settings, language })}
      />
      <section className="home__panel">
        <TableSelector
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test -- homeScreen languageSwitch`
Expected: PASS — the new test passes and the existing `languageSwitch`/`homeScreen` tests still pass (start-button and answer-mode queries don't collide with the language radios).

- [ ] **Step 5: Commit**

```bash
git add src/screens/HomeScreen.tsx src/__tests__/homeScreen.test.tsx
git commit -m "feat(home): language toggle as the first widget under the title"
```

---

### Task 3: Reuse the component in Settings (one source of truth)

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Test (unchanged, must stay green): `src/__tests__/settingsLanguage.test.tsx`

- [ ] **Step 1: Confirm the existing Settings test still describes the target behaviour**

Run: `pnpm test -- settingsLanguage`
Expected: PASS now (before the change). It clicks the "Deutsch" radio and expects `onSave` with `language: 'de'` and no `onBack`. The refactor must preserve this.

- [ ] **Step 2: Swap the inline selector for `LanguageToggle`**

In `src/screens/SettingsScreen.tsx`:

Replace the import line
```tsx
import { LANGUAGES } from '../i18n';
```
with
```tsx
import { LanguageToggle } from '../components/LanguageToggle';
```

Replace the language `settings__field` block (the `<div className="settings__field">` containing the inline `.mode-toggle` map, currently ~lines 85–103) with:

```tsx
      <div className="settings__field">
        <span className="settings__label">{t('settings.language')}</span>
        <LanguageToggle
          value={settings.language}
          onChange={(language) => onSave({ ...settings, language })}
        />
      </div>
```

- [ ] **Step 3: Run the test to verify it still passes**

Run: `pnpm test -- settingsLanguage`
Expected: PASS — clicking "Deutsch" still calls `onSave` with `language: 'de'` (the `aria-hidden` badge keeps the radio name "Deutsch"); `onBack` is not called.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx
git commit -m "refactor(settings): use the shared LanguageToggle component"
```

---

### Task 4: Release 0.7.0 (version + changelog + notes, drift guard)

**Files:**
- Modify: `package.json` (`version`)
- Modify: `CHANGELOG.md`
- Modify: `src/domain/releaseNotes.ts`

These three MUST change together or `pnpm test` (the `releaseNotes` drift guard) fails.

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.6.0"` to `"version": "0.7.0"`.

- [ ] **Step 2: Prepend the changelog section**

In `CHANGELOG.md`, insert directly above `## [0.6.0] - 2026-06-13`:

```markdown
## [0.7.0] - 2026-06-14

### Added
- **Language selector on the home page**: a 3-way segmented toggle showing the
  language code (FR / DE / EN) above the native name, placed as the first widget
  under the title — the UI language is now changeable without opening Settings.
  New reusable `src/components/LanguageToggle.tsx`; the code badge is
  `aria-hidden` so each option's accessible name stays the native label.

### Changed
- The Settings language selector now renders the same `LanguageToggle`
  component (a single source of truth) and gains the matching FR/DE/EN badges.
```

- [ ] **Step 3: Prepend the French release note**

In `src/domain/releaseNotes.ts`, add as the first element of `releaseNotes` (before the `0.6.0` entry):

```ts
  {
    version: '0.7.0',
    date: '2026-06-14',
    changes: [
      'Tu peux maintenant changer la langue (FR, DE, EN) directement en haut de l’écran d’accueil, sans passer par les Paramètres.',
    ],
  },
```

- [ ] **Step 4: Run the drift guard**

Run: `pnpm test -- releaseNotes`
Expected: PASS — top note version `0.7.0` matches `package.json`; `CHANGELOG.md` contains `## [0.7.0]`.

- [ ] **Step 5: Commit**

```bash
git add package.json CHANGELOG.md src/domain/releaseNotes.ts
git commit -m "chore(release): 0.7.0 — language selector on the home page"
```

---

### Task 5: Full verification

- [ ] **Step 1: Run the entire test suite**

Run: `pnpm test`
Expected: PASS — all suites green, including i18n parity, the drift guard, `settingsLanguage`, `languageSwitch`, and the App flow tests.

- [ ] **Step 2: Typecheck + production build**

Run: `pnpm build`
Expected: `tsc --noEmit` clean (no unused `LANGUAGES` import left in SettingsScreen) and the Vite build succeeds.

- [ ] **Step 3: If anything fails, fix and re-run before proceeding.**

---

## Self-review notes (checked against the spec)

- **Spec coverage:** `LanguageToggle` with `aria-hidden` badge (Task 1), first-home-widget placement (Task 2), Settings reuse replacing the inline selector (Task 3), 0.7.0 release ritual (Task 4). All mapped.
- **No new i18n keys:** badge is `code.toUpperCase()`; group label reuses `t('settings.language')`, which already exists in fr/de/en — so the i18n parity test is unaffected.
- **A11y/test interaction:** the `aria-hidden` badge is the single fact that keeps both the new and existing `getByRole('radio', { name: <native> })` queries valid; called out in Tasks 1 and 3.
- **Greenness:** version stays `0.6.0` through Tasks 1–3, so the drift guard passes; it's bumped atomically with changelog + notes in Task 4.
