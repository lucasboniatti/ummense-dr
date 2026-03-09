import { useCallback, useState } from 'react';

/**
 * Hook for announcing dynamic content changes to screen readers.
 * Uses the aria-live region in AppShell.
 *
 * @example
 * const { announce } = useAnnouncement();
 * announce('Tarefa criada com sucesso');
 */
export function useAnnouncement() {
  const [message, setMessage] = useState('');

  const announce = useCallback((text: string, politeness: 'polite' | 'assertive' = 'polite') => {
    // Clear first to ensure same message can be announced again
    setMessage('');

    // Small delay to ensure the clear takes effect
    setTimeout(() => {
      setMessage(text);

      // Also update the global announcer if available
      const announcer = document.getElementById('app-announcer');
      if (announcer) {
        announcer.setAttribute('aria-live', politeness);
        announcer.textContent = text;
      }
    }, 50);
  }, []);

  const clear = useCallback(() => {
    setMessage('');
    const announcer = document.getElementById('app-announcer');
    if (announcer) {
      announcer.textContent = '';
    }
  }, []);

  return { message, announce, clear };
}