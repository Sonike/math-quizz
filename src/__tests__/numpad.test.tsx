import { describe, expect, test, vi } from 'vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { NumPad } from '../components/NumPad';
import { useNumericKeyboard } from '../hooks/useNumericKeyboard';

describe('NumPad', () => {
  test('clicking a digit calls onDigit with its value', () => {
    const onDigit = vi.fn();
    render(<NumPad onDigit={onDigit} onErase={() => {}} onValidate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'chiffre 5' }));
    expect(onDigit).toHaveBeenCalledWith(5);
  });

  test('clicking ⌫ calls onErase, ✓ calls onValidate', () => {
    const onErase = vi.fn();
    const onValidate = vi.fn();
    render(<NumPad onDigit={() => {}} onErase={onErase} onValidate={onValidate} />);
    fireEvent.click(screen.getByRole('button', { name: 'effacer' }));
    fireEvent.click(screen.getByRole('button', { name: 'valider' }));
    expect(onErase).toHaveBeenCalledTimes(1);
    expect(onValidate).toHaveBeenCalledTimes(1);
  });

  test('disabled prevents callbacks', () => {
    const onDigit = vi.fn();
    render(<NumPad disabled onDigit={onDigit} onErase={() => {}} onValidate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'chiffre 5' }));
    expect(onDigit).not.toHaveBeenCalled();
  });
});

describe('useNumericKeyboard', () => {
  test('digit keys forward to onDigit', () => {
    const onDigit = vi.fn();
    renderHook(() =>
      useNumericKeyboard({ onDigit, onErase: () => {}, onValidate: () => {} }),
    );
    fireEvent.keyDown(window, { key: '7' });
    expect(onDigit).toHaveBeenCalledWith(7);
  });

  test('Backspace and Enter map to erase / validate', () => {
    const onErase = vi.fn();
    const onValidate = vi.fn();
    renderHook(() =>
      useNumericKeyboard({ onDigit: () => {}, onErase, onValidate }),
    );
    fireEvent.keyDown(window, { key: 'Backspace' });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onErase).toHaveBeenCalledTimes(1);
    expect(onValidate).toHaveBeenCalledTimes(1);
  });

  test('non-numeric keys are ignored', () => {
    const onDigit = vi.fn();
    const onErase = vi.fn();
    const onValidate = vi.fn();
    renderHook(() =>
      useNumericKeyboard({ onDigit, onErase, onValidate }),
    );
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(onDigit).not.toHaveBeenCalled();
    expect(onErase).not.toHaveBeenCalled();
    expect(onValidate).not.toHaveBeenCalled();
  });

  test('enabled=false detaches listener', () => {
    const onDigit = vi.fn();
    renderHook(() =>
      useNumericKeyboard({
        onDigit,
        onErase: () => {},
        onValidate: () => {},
        enabled: false,
      }),
    );
    fireEvent.keyDown(window, { key: '3' });
    expect(onDigit).not.toHaveBeenCalled();
  });
});
