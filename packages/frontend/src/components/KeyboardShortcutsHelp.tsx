import * as React from 'react';
import { Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import type { KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: KeyboardShortcut[];
}

function formatShortcut(shortcut: KeyboardShortcut): string {
  const keys: string[] = [];

  if (shortcut.mod) {
    keys.push('Cmd/Ctrl');
  }

  if (shortcut.shift) {
    keys.push('Shift');
  }

  if (shortcut.alt) {
    keys.push('Alt');
  }

  keys.push(shortcut.key === '?' ? '?' : shortcut.key.toUpperCase());
  return keys.join(' + ');
}

export function KeyboardShortcutsHelp({
  open,
  onOpenChange,
  shortcuts,
}: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[color:var(--accent-soft)] p-3 text-[color:var(--accent-strong)]">
              <Keyboard size={18} aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>Atalhos de teclado</DialogTitle>
              <DialogDescription>
                Use estes atalhos para navegar e agir sem tirar as mãos do teclado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody>
          <div className="overflow-hidden rounded-[20px] border border-[color:var(--border-subtle)]">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[color:var(--surface-muted)]">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                    Atalho
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-neutral-500">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-subtle)]">
                {shortcuts.map((shortcut) => (
                  <tr key={`${shortcut.key}-${shortcut.description}`}>
                    <td className="px-4 py-3">
                      <kbd className="inline-flex rounded-[12px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-2.5 py-1 text-xs font-semibold text-[color:var(--text-strong)] shadow-[var(--elevation-1)]">
                        {formatShortcut(shortcut)}
                      </kbd>
                    </td>
                    <td className="px-4 py-3 text-sm text-[color:var(--text-strong)]">
                      {shortcut.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
