import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InfoScreen } from '../screens/InfoScreen';
import { releaseNotes } from '../domain/releaseNotes';

describe('InfoScreen', () => {
  test('shows the app version it is given', () => {
    render(<InfoScreen version="9.9.9" onBack={() => {}} />);
    expect(screen.getByText(/9\.9\.9/)).toBeInTheDocument();
  });

  test('lists the latest release note (version + change text)', () => {
    render(<InfoScreen version="9.9.9" onBack={() => {}} />);
    const latest = releaseNotes[0];
    expect(screen.getByText(latest.changes[0])).toBeInTheDocument();
    expect(
      screen.getAllByText(new RegExp(latest.version.replace(/\./g, '\\.'))).length,
    ).toBeGreaterThan(0);
  });

  test('explains where the user data is stored', () => {
    render(<InfoScreen version="9.9.9" onBack={() => {}} />);
    expect(
      screen.getByText(/cet appareil|ce navigateur|rien n'est envoyé/i),
    ).toBeInTheDocument();
  });

  test('back button calls onBack', () => {
    const onBack = vi.fn();
    render(<InfoScreen version="9.9.9" onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: /retour/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
