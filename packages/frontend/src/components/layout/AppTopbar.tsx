import { Bell, ChevronDown, Filter, Menu, Plus, Search } from 'lucide-react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { Breadcrumb, type BreadcrumbItem } from '../ui/Breadcrumb';
import { Input } from '../ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/Select';

interface AppTopbarProps {
  breadcrumbs: BreadcrumbItem[];
  isSidebarVisible: boolean;
  pageTitle: string;
  searchValue: string;
  priorityValue: string;
  onOpenMobileMenu: () => void;
  onOpenGlobalSearch: () => void;
  onSearchChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  onQuickAction: (action: 'new-task' | 'new-flow' | 'open-webhooks') => void;
}

export default function AppTopbar({
  breadcrumbs,
  isSidebarVisible,
  pageTitle,
  searchValue,
  priorityValue,
  onOpenMobileMenu,
  onOpenGlobalSearch,
  onSearchChange,
  onPriorityChange,
  onApplyFilters,
  onClearFilters,
  onQuickAction,
}: AppTopbarProps) {
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement | null>(null);
  const hasActivePageFilters = Boolean(searchValue.trim()) || priorityValue !== 'all';
  const activeFiltersCount = (searchValue.trim() ? 1 : 0) + (priorityValue !== 'all' ? 1 : 0);

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
    <header className="sticky top-0 z-30 border-b border-[color:var(--border-default)] bg-[color:var(--surface-header)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3.5 px-3 py-3.5 sm:px-4 md:px-6 xl:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3 lg:max-w-[24rem]">
            <Button
              type="button"
              onClick={onOpenMobileMenu}
              variant="outline"
              size="icon"
              className={isSidebarVisible ? 'lg:hidden' : ''}
              aria-label="Abrir menu"
            >
              <Menu size={18} />
            </Button>

            <div className="min-w-0">
              <div className="hidden sm:block">
                <Breadcrumb items={breadcrumbs} className="mb-1" />
              </div>
              <p className="app-kicker">Operação em foco</p>
              <h2 className="truncate font-display text-lg font-bold tracking-[-0.03em] text-[color:var(--text-strong)] sm:text-[1.2rem] md:text-[1.35rem]">
                {pageTitle}
              </h2>
            </div>
          </div>
          <div
            className="flex items-center gap-2 self-start lg:self-auto"
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
                <span className="hidden sm:inline">Criar</span>
                <ChevronDown size={15} />
              </Button>

              {isQuickActionsOpen && (
                <div className="app-surface elevation-2 absolute right-0 top-[calc(100%+0.75rem)] z-20 w-56 p-2 motion-scale-in">
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-emphasis)] hover:text-[color:var(--text-strong)]"
                    onClick={() => {
                      onQuickAction('new-task');
                      setIsQuickActionsOpen(false);
                    }}
                  >
                    Nova tarefa
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-emphasis)] hover:text-[color:var(--text-strong)]"
                    onClick={() => {
                      onQuickAction('new-flow');
                      setIsQuickActionsOpen(false);
                    }}
                  >
                    Ir para automações
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[color:var(--text-secondary)] transition-colors hover:bg-[color:var(--surface-emphasis)] hover:text-[color:var(--text-strong)]"
                    onClick={() => {
                      onQuickAction('open-webhooks');
                      setIsQuickActionsOpen(false);
                    }}
                  >
                    Ir para webhooks
                  </button>
                </div>
              )}
            </div>

            <Button type="button" variant="outline" size="icon" aria-label="Notificações">
              <Bell size={18} />
            </Button>
          </div>
        </div>

        <div className="flex gap-2 lg:hidden">
          <Button
            type="button"
            onClick={onOpenGlobalSearch}
            variant="outline"
            className="min-w-0 flex-1 justify-between gap-2"
          >
            <span className="flex items-center gap-2 truncate">
              <Search size={16} />
              Busca global
            </span>
            <span className="app-status-pill app-status-pill-neutral px-2 py-1 text-[11px]">
              Cmd/Ctrl+K
            </span>
          </Button>
          <Button
            type="button"
            onClick={() => setIsMobileFiltersOpen((previous) => !previous)}
            variant={isMobileFiltersOpen || hasActivePageFilters ? 'primary' : 'outline'}
            className="gap-2"
          >
            <Filter size={15} />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>

        {isMobileFiltersOpen && (
          <div className="app-toolbar flex flex-col gap-2 p-3 lg:hidden">
            <label className="relative min-w-0">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                aria-hidden="true"
              />
              <Input
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Filtrar por palavra"
                aria-label="Filtrar por palavra"
                className="h-11 bg-[color:var(--surface-card)] pl-10"
              />
            </label>

            <div className="relative min-w-0">
              <Filter
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                aria-hidden="true"
              />
              <Select value={priorityValue} onValueChange={onPriorityChange}>
                <SelectTrigger
                  aria-label="Filtrar por prioridade"
                  className="pl-10 pr-8 text-sm font-medium text-[color:var(--text-secondary)]"
                >
                  <SelectValue placeholder="Todas prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas prioridades</SelectItem>
                  <SelectItem value="P1">P1</SelectItem>
                  <SelectItem value="P2">P2</SelectItem>
                  <SelectItem value="P3">P3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => {
                  onApplyFilters();
                  setIsMobileFiltersOpen(false);
                }}
                variant="primary"
                className="flex-1"
              >
                Filtrar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onClearFilters();
                  setIsMobileFiltersOpen(false);
                }}
                variant="outline"
                className="flex-1"
              >
                Limpar
              </Button>
            </div>
          </div>
        )}

        <div className="hidden lg:block">
          <div className="app-toolbar flex w-full flex-col gap-2 p-2 xl:flex-row xl:items-center">
            <Button
              type="button"
              onClick={onOpenGlobalSearch}
              variant="outline"
              className="justify-between gap-3 xl:min-w-[16rem] 2xl:min-w-[18rem]"
            >
              <span className="flex items-center gap-2">
                <Search size={16} />
                Busca global no workspace
              </span>
              <span className="app-status-pill app-status-pill-neutral px-2 py-1 text-[11px]">
                Cmd/Ctrl+K
              </span>
            </Button>

            <label className="relative min-w-0 flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                aria-hidden="true"
              />
              <Input
                type="text"
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Filtrar por palavra"
                aria-label="Filtrar por palavra"
                className="h-11 bg-[color:var(--surface-card)] pl-10"
              />
            </label>

            <div className="relative xl:min-w-[11rem] 2xl:min-w-[12rem]">
              <Filter
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]"
                aria-hidden="true"
              />
              <Select
                value={priorityValue}
                onValueChange={onPriorityChange}
              >
                <SelectTrigger
                  aria-label="Filtrar por prioridade"
                  className="pl-10 pr-8 text-sm font-medium text-[color:var(--text-secondary)]"
                >
                  <SelectValue placeholder="Todas prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas prioridades</SelectItem>
                  <SelectItem value="P1">P1</SelectItem>
                  <SelectItem value="P2">P2</SelectItem>
                  <SelectItem value="P3">P3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
              <Button type="button" onClick={onApplyFilters} variant="primary">
                Filtrar
              </Button>
              <Button type="button" onClick={onClearFilters} variant="outline">
                Limpar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
