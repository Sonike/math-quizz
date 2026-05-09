import { useEffect } from 'react';

type Handlers = {
  onDigit: (d: number) => void;
  onErase: () => void;
  onValidate: () => void;
  enabled?: boolean;
};

export const useNumericKeyboard = ({
  onDigit,
  onErase,
  onValidate,
  enabled = true,
}: Handlers): void => {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        onDigit(Number(event.key));
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        onErase();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        onValidate();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDigit, onErase, onValidate, enabled]);
};
