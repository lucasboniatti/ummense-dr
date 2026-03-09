import { Bell, ChevronDown, Filter, Menu, Plus, Search } from 'lucide-react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface AppTopbarProps {
  pageTitle: string;
  searchValue: string;
  priorityValue: string;
  onOpenMobileMenu: () => void;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onQuickAction: (action: 'new-task' | 'new-flow' | 'open-webhooks') => void;
}

export default function AppTopbar({
  pageTitle,
  searchValue,
  priorityValue,
  onOpenMobileMenu,
  onSearchChange,
  onPriorityChange,
  onApplyFilters,
  onClearFilters,
  onQuickAction,
}: AppTopbarProps) {
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement | null>(null);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onApplyFilters();
    }
  };

  useEffect(() => {
    if (!isQuickActionsOpen) {
      return undefined;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!quickActionsRef.current?.contains(event.target as Node)) {
        setIsQuickActionsOpen(false);
      }
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsQuickActionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isQuickActionsOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--border-subtle)] bg-white/72 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between xl:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:max-w-[18rem]">
          <Button
            type="button"
            onClick={onOpenMobileMenu}
            variant="outline"
            size="icon"
            className="lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu size={18} />
          </Button>

          <div className="min-w-0">
            <p className="app-kicker">Workspace operacional</p>
            <h2 className="truncate text-lg font-bold tracking-[-0.02em] text-neutral-900 md:text-[1.35rem]">
              {pageTitle}
            </h2>
          </div>
        </div>

        <div className="order-3 flex w-full flex-col gap-2 lg:order-2 lg:min-w-0 lg:flex-1 lg:px-4">
          <div className="app-toolbar flex w-full flex-col gap-2 p-2 md:flex-row md:items-center">
            <label className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <Input
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Filtrar por palavra"
                aria-label="Filtrar por palavra"
                className="h-11 bg-white pl-10"
              />
            </label>

            <div className="relative min-w-[11rem]">
              <Filter
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
              <select
                value={priorityValue}
                onChange={(event) => onPriorityChange(event.target.value)}
                aria-label="Filtrar por prioridade"
                className="app-control h-11 w-full appearance-none bg-white pl-10 pr-8 text-sm font-medium text-neutral-700"
              >
                <option value="all">Todas prioridades</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
              <Button type="button" onClick={onApplyFilters} variant="primary">
                Filtrar
              </Button>
              <Button type="button" onClick={onClearFilters} variant="outline">
                Limpar
              </Button>
            </div>
          </div>
        </div>

        <div
          className="order-2 flex items-center gap-2 self-start lg:order-3 lg:self-auto"
          ref={quickActionsRef}
        >
          <div className="relative">
            <Button
              type="button"
              onClick={() => setIsQuickActionsOpen((previous) => !previous)}
              variant="primary"
              className="gap-2"
              aria-haspopup="menu"
              aria-expanded={isQuickActionsOpen}
            >
              <Plus size={16} />
              Adicionar
              <ChevronDown size={15} />
            </Button>

            {isQuickActionsOpen && (
              <div className="app-surface absolute right-0 top-[calc(100%+0.75rem)] z-20 w-56 p-2">
                <button
                  type="button"
                  className="app-sidebar-link w-full rounded-[16px] px-3 py-2 text-left text-sm"
                  onClick={() => {
                    onQuickAction('new-task');
                    setIsQuickActionsOpen(false);
                  }}
                >
                  Nova tarefa
                </button>
                <button
                  type="button"
                  className="app-sidebar-link w-full rounded-[16px] px-3 py-2 text-left text-sm"
                  onClick={() => {
                    onQuickAction('new-flow');
                    setIsQuickActionsOpen(false);
                  }}
                >
                  Abrir fluxos
                </button>
                <button
                  type="button"
                  className="app-sidebar-link w-full rounded-[16px] px-3 py-2 text-left text-sm"
                  onClick={() => {
                    onQuickAction('open-webhooks');
                    setIsQuickActionsOpen(false);
                  }}
                >
                  Abrir webhooks
                </button>
              </div>
            )}
          </div>

          <Button type="button" variant="outline" size="icon" aria-label="Notificações">
            <Bell size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
}
