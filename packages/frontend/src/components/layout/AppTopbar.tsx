import { Bell, Filter, Menu, Plus, Search } from 'lucide-react';
import { KeyboardEvent, useState } from 'react';

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

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onApplyFilters();
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="rounded-lg border border-neutral-200 p-2 text-neutral-700 hover:bg-neutral-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>

        <div className="min-w-[160px] flex-1">
          <h2 className="text-base font-bold text-neutral-900 md:text-lg">{pageTitle}</h2>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <label className="relative min-w-[220px] flex-1 lg:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Filtrar por palavra"
              className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-200"
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
            <Filter size={15} className="text-neutral-500" />
            <select
              value={priorityValue}
              onChange={(event) => onPriorityChange(event.target.value)}
              className="bg-transparent text-sm outline-none"
            >
              <option value="all">Todas prioridades</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onApplyFilters}
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Filtrar
          </button>

          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
          >
            Limpar
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen((previous) => !previous)}
              className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              <Plus size={16} />
              Adicionar
            </button>

            {isQuickActionsOpen && (
              <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100"
                  onClick={() => {
                    onQuickAction('new-task');
                    setIsQuickActionsOpen(false);
                  }}
                >
                  Nova tarefa
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100"
                  onClick={() => {
                    onQuickAction('new-flow');
                    setIsQuickActionsOpen(false);
                  }}
                >
                  Abrir fluxos
                </button>
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-100"
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

          <button
            type="button"
            className="relative rounded-lg border border-neutral-200 bg-white p-2 text-neutral-700 hover:bg-neutral-100"
            aria-label="Notificações"
          >
            <Bell size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
