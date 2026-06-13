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
        onOpenProgress={noop}
        onOpenInfo={noop}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: '✏️ Sur papier' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ answerMode: 'paper' }),
    );
  });
});

describe('HomeScreen — progress entry', () => {
  test('clicking the results button calls onOpenProgress', () => {
    const onOpenProgress = vi.fn();
    render(
      <HomeScreen
        settings={DEFAULT_SETTINGS}
        onChange={noop}
        onStart={noop}
        onOpenSettings={noop}
        onOpenProgress={onOpenProgress}
        onOpenInfo={noop}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'mes résultats' }));
    expect(onOpenProgress).toHaveBeenCalledOnce();
  });
});

describe('HomeScreen — info entry', () => {
  test('clicking the info button calls onOpenInfo', () => {
    const onOpenInfo = vi.fn();
    render(
      <HomeScreen
        settings={DEFAULT_SETTINGS}
        onChange={noop}
        onStart={noop}
        onOpenSettings={noop}
        onOpenProgress={noop}
        onOpenInfo={onOpenInfo}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'à propos' }));
    expect(onOpenInfo).toHaveBeenCalledOnce();
  });
});
