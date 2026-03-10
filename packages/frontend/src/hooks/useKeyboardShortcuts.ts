import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  description: string;
  action: (event: KeyboardEvent) => void;
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  allowInInput?: boolean;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (isEditableTarget(event.target) && !shortcut.allowInInput) {
          continue;
        }

        const normalizedKey = event.key.toLowerCase();
        const shortcutKey = shortcut.key.toLowerCase();
        const matchesMod = shortcut.mod ? event.metaKey || event.ctrlKey : !event.metaKey && !event.ctrlKey;
        const matchesShift = Boolean(shortcut.shift) === event.shiftKey;
        const matchesAlt = Boolean(shortcut.alt) === event.altKey;

        if (
          normalizedKey === shortcutKey &&
          matchesMod &&
          matchesShift &&
          matchesAlt
        ) {
          event.preventDefault();
          shortcut.action(event);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}
