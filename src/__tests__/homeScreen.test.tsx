import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeScreen } from '../screens/HomeScreen';
import { DEFAULT_SETTINGS } from '../domain/session';

const noop = () => {};

describe('HomeScreen — Saisie toggle', () => {
  test('selecting "Sur papier" emits settings with answerMode=paper', () => {
    const onChange = vi.fn();
    render(
      <HomeScreen
        settings={DEFAULT_SETTINGS}
        onChange={onChange}
        onStart={noop}
        onOpenSettings={noop}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: '✏️ Sur papier' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ answerMode: 'paper' }),
    );
  });
});
