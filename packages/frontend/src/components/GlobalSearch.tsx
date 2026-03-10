import * as React from 'react';
import { useDeferredValue } from 'react';
import { useRouter } from 'next/router';
import { Clock3, FolderKanban, Link2, Search, SquarePen } from 'lucide-react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './ui/Command';
import { apiClient } from '@/services/api.client';
import { flowsService } from '@/services/flows.service';
import { webhookService } from '@/services/webhook.service';

type SearchGroup = 'Ações' | 'Recentes' | 'Tarefas' | 'Fluxos' | 'Webhooks';

interface SearchEntry {
  id: string;
  group: SearchGroup;
  label: string;
  description: string;
  href?: string;
  action?: () => void;
}

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTask: () => void;
}

const RECENT_SEARCHES_KEY = 'tasksflow_recent_searches';

function getStoredToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  return (
    window.localStorage.getItem('tasksflow_dev_token') ||
    window.localStorage.getItem('token') ||
    ''
  );
}

function readRecentEntries(): SearchEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SearchEntry[]) : [];
  } catch {
    return [];
  }
}

function persistRecentEntry(entry: SearchEntry) {
  if (typeof window === 'undefined') {
    return;
  }

  const nextEntries = [
    entry,
    ...readRecentEntries().filter((current) => current.id !== entry.id),
  ].slice(0, 6);

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(nextEntries));
}

export function GlobalSearch({ open, onOpenChange, onCreateTask }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [recentEntries, setRecentEntries] = React.useState<SearchEntry[]>([]);
  const [entries, setEntries] = React.useState<SearchEntry[]>([]);
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setRecentEntries(readRecentEntries());
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadEntries() {
      setLoading(true);
      const token = getStoredToken();

      const [tasksResult, flowsResult, webhooksResult] = await Promise.allSettled([
        apiClient.get('/api/tasks?limit=30&offset=0'),
        token ? flowsService.list(token) : Promise.resolve([]),
        webhookService.listWebhooks(),
      ]);

      if (cancelled) {
        return;
      }

      const nextEntries: SearchEntry[] = [
        {
          id: 'action-new-task',
          group: 'Ações',
          label: 'Nova tarefa',
          description: 'Abrir o fluxo mais recente para criar uma nova tarefa.',
          action: onCreateTask,
        },
        {
          id: 'action-open-flows',
          group: 'Ações',
          label: 'Abrir fluxos',
          description: 'Ir para a workspace de fluxos.',
          href: '/dashboard/automations',
        },
        {
          id: 'action-open-webhooks',
          group: 'Ações',
          label: 'Abrir webhooks',
          description: 'Ir para a página de webhooks.',
          href: '/dashboard/webhooks',
        },
      ];

      if (tasksResult.status === 'fulfilled') {
        const items = Array.isArray(tasksResult.value.data?.items) ? tasksResult.value.data.items : [];
        nextEntries.push(
          ...items.map((task: any) => ({
            id: `task-${task.id}`,
            group: 'Tarefas' as const,
            label: String(task.title || `Tarefa ${task.id}`),
            description: `Card #${task.card_id || task.cardId || '-'} · ${task.priority || 'Sem prioridade'}`,
            href: `/cards/${task.card_id || task.cardId}?taskId=${task.id}`,
          }))
        );
      }

      if (flowsResult.status === 'fulfilled') {
        nextEntries.push(
          ...flowsResult.value.map((flow) => ({
            id: `flow-${flow.id}`,
            group: 'Fluxos' as const,
            label: flow.name,
            description: `${flow.cardsCount} cards · ${flow.columnsCount} colunas`,
            href: `/flows/${flow.id}`,
          }))
        );
      }

      if (webhooksResult.status === 'fulfilled') {
        nextEntries.push(
          ...webhooksResult.value.map((webhook: any) => ({
            id: `webhook-${webhook.id}`,
            group: 'Webhooks' as const,
            label: String(webhook.description || webhook.url),
            description: webhook.url,
            href: `/dashboard/webhooks/${webhook.id}`,
          }))
        );
      }

      setEntries(nextEntries);
      setLoading(false);
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [onCreateTask, open]);

  const filteredEntries = React.useMemo(() => {
    if (!deferredQuery) {
      return entries;
    }

    return entries.filter((entry) => {
      const haystack = `${entry.label} ${entry.description}`.toLowerCase();
      return haystack.includes(deferredQuery);
    });
  }, [deferredQuery, entries]);

  const groupedEntries = React.useMemo(() => {
    const groups: Record<SearchGroup, SearchEntry[]> = {
      Ações: [],
      Recentes: recentEntries,
      Tarefas: [],
      Fluxos: [],
      Webhooks: [],
    };

    filteredEntries.forEach((entry) => {
      groups[entry.group].push(entry);
    });

    return groups;
  }, [filteredEntries, recentEntries]);

  const handleSelect = React.useCallback(
    async (entry: SearchEntry) => {
      if (entry.group !== 'Ações') {
        persistRecentEntry(entry);
        setRecentEntries(readRecentEntries());
      }

      onOpenChange(false);
      setQuery('');

      if (entry.action) {
        entry.action();
        return;
      }

      if (entry.href) {
        await router.push(entry.href);
      }
    },
    [onOpenChange, router]
  );

  const hasAnyResults =
    groupedEntries.Recentes.length > 0 ||
    groupedEntries.Ações.length > 0 ||
    groupedEntries.Tarefas.length > 0 ||
    groupedEntries.Fluxos.length > 0 ||
    groupedEntries.Webhooks.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <Command label="Busca global">
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar tarefas, fluxos e webhooks..."
          autoFocus
        />
        <CommandList>
          {!loading && !hasAnyResults && (
            <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
          )}

          {groupedEntries.Recentes.length > 0 && !deferredQuery && (
            <CommandGroup heading="Recentes">
              {groupedEntries.Recentes.map((entry) => (
                <CommandItem key={entry.id} value={entry.label} onSelect={() => void handleSelect(entry)}>
                  <Clock3 size={16} className="text-neutral-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="m-0 font-medium">{entry.label}</p>
                    <p className="m-0 truncate text-xs text-neutral-500">{entry.description}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {groupedEntries.Ações.length > 0 && (
            <CommandGroup heading="Ações">
              {groupedEntries.Ações.map((entry) => (
                <CommandItem key={entry.id} value={entry.label} onSelect={() => void handleSelect(entry)}>
                  <SquarePen size={16} className="text-neutral-400" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="m-0 font-medium">{entry.label}</p>
                    <p className="m-0 truncate text-xs text-neutral-500">{entry.description}</p>
                  </div>
                  {entry.id === 'action-new-task' && <CommandShortcut>Cmd/Ctrl + N</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {loading && (
            <div className="px-4 py-8 text-sm text-[color:var(--text-muted)]">
              Carregando índice de busca...
            </div>
          )}

          {!loading && groupedEntries.Tarefas.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Tarefas">
                {groupedEntries.Tarefas.map((entry) => (
                  <CommandItem key={entry.id} value={entry.label} onSelect={() => void handleSelect(entry)}>
                    <Search size={16} className="text-neutral-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="m-0 font-medium">{entry.label}</p>
                      <p className="m-0 truncate text-xs text-neutral-500">{entry.description}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!loading && groupedEntries.Fluxos.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Fluxos">
                {groupedEntries.Fluxos.map((entry) => (
                  <CommandItem key={entry.id} value={entry.label} onSelect={() => void handleSelect(entry)}>
                    <FolderKanban size={16} className="text-neutral-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="m-0 font-medium">{entry.label}</p>
                      <p className="m-0 truncate text-xs text-neutral-500">{entry.description}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {!loading && groupedEntries.Webhooks.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Webhooks">
                {groupedEntries.Webhooks.map((entry) => (
                  <CommandItem key={entry.id} value={entry.label} onSelect={() => void handleSelect(entry)}>
                    <Link2 size={16} className="text-neutral-400" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="m-0 font-medium">{entry.label}</p>
                      <p className="m-0 truncate text-xs text-neutral-500">{entry.description}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
