import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { GlobalSearch } from '../GlobalSearch';
import { KeyboardShortcutsHelp } from '../KeyboardShortcutsHelp';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useKeyboardShortcuts, type KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

interface AppShellProps {
  children: ReactNode;
}

function resolvePageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '/dashboard') return 'Painel Operacional';
  if (pathname.startsWith('/dashboard/automations')) return 'Automacoes';
  if (pathname.startsWith('/flows')) return 'Automacoes';
  if (pathname.startsWith('/cards')) return 'Cards';
  if (pathname.startsWith('/dashboard/webhooks')) return 'Webhooks';
  if (pathname.startsWith('/dashboard/integrations')) return 'Integrações';
  if (pathname.startsWith('/automations/history')) return 'Historico de execuções';
  if (pathname.startsWith('/admin')) return 'Administração';
  return 'Tasks Flow';
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [priorityValue, setPriorityValue] = useState('all');

  const pageTitle = useMemo(() => resolvePageTitle(router.pathname), [router.pathname]);
  const breadcrumbs = useBreadcrumbs();

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const q = typeof router.query.q === 'string' ? router.query.q : '';
    const priority = typeof router.query.priority === 'string' ? router.query.priority : 'all';

    setSearchValue(q);
    setPriorityValue(priority || 'all');
  }, [router.isReady, router.query.q, router.query.priority]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (router.pathname === '/cards/[cardId]' && typeof router.query.cardId === 'string') {
      window.localStorage.setItem('tasksflow_last_card_id', router.query.cardId);
    }
  }, [router.pathname, router.query.cardId]);

  const applyFilters = async () => {
    const nextQuery = { ...router.query };

    if (searchValue.trim()) {
      nextQuery.q = searchValue.trim();
    } else {
      delete nextQuery.q;
    }

    if (priorityValue !== 'all') {
      nextQuery.priority = priorityValue;
    } else {
      delete nextQuery.priority;
    }

    await router.push({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });
  };

  const clearFilters = async () => {
    setSearchValue('');
    setPriorityValue('all');

    const nextQuery = { ...router.query };
    delete nextQuery.q;
    delete nextQuery.priority;

    await router.push({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });
  };

  const createTaskFromContext = useCallback(async () => {
    if (typeof window !== 'undefined') {
      const lastCardId = window.localStorage.getItem('tasksflow_last_card_id');

      if (lastCardId) {
        await router.push(`/cards/${lastCardId}?newTask=1`);
        return;
      }
    }

    await router.push('/dashboard/automations');
  }, [router]);

  const handleQuickAction = useCallback(async (action: 'new-task' | 'new-flow' | 'open-webhooks') => {
    if (action === 'new-task') {
      await createTaskFromContext();
      return;
    }

    if (action === 'new-flow') {
      await router.push('/dashboard/automations');
      return;
    }

    await router.push('/dashboard/webhooks');
  }, [createTaskFromContext, router]);

  const shortcuts = useMemo<KeyboardShortcut[]>(
    () => [
      {
        key: 'k',
        mod: true,
        description: 'Abrir busca global',
        action: () => setIsGlobalSearchOpen(true),
      },
      {
        key: 'n',
        mod: true,
        description: 'Criar nova tarefa',
        action: () => void createTaskFromContext(),
      },
      {
        key: '/',
        mod: true,
        description: 'Alternar sidebar',
        action: () => setIsDesktopSidebarVisible((previous) => !previous),
      },
      {
        key: '?',
        description: 'Abrir ajuda de atalhos',
        shift: true,
        action: () => setIsShortcutsHelpOpen(true),
      },
      {
        key: 'escape',
        description: 'Fechar modais e menus',
        action: () => {
          setIsGlobalSearchOpen(false);
          setIsShortcutsHelpOpen(false);
          setIsMobileOpen(false);
        },
        allowInInput: true,
      },
    ],
    [createTaskFromContext]
  );

  useKeyboardShortcuts(shortcuts);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[color:var(--surface-app)] text-[color:var(--text-strong)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:inline-flex focus:items-center focus:gap-2 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-primary focus:outline-none"
      >
        Pular para o conteúdo principal
      </a>

      <div aria-live="polite" aria-atomic="true" className="sr-only" id="app-announcer" />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-56 opacity-90"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(13, 96, 184, 0.14), transparent 38%), radial-gradient(circle at top right, rgba(58, 131, 216, 0.08), transparent 28%)',
        }}
      />

      <AppSidebar
        isMobileOpen={isMobileOpen}
        isDesktopVisible={isDesktopSidebarVisible}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <div className={`relative z-10 min-h-screen ${isDesktopSidebarVisible ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <AppTopbar
          breadcrumbs={breadcrumbs}
          isSidebarVisible={isDesktopSidebarVisible}
          pageTitle={pageTitle}
          searchValue={searchValue}
          priorityValue={priorityValue}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          onSearchChange={setSearchValue}
          onPriorityChange={setPriorityValue}
          onApplyFilters={applyFilters}
          onClearFilters={clearFilters}
          onQuickAction={handleQuickAction}
        />

        <main id="main-content" className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>

      <GlobalSearch
        open={isGlobalSearchOpen}
        onOpenChange={setIsGlobalSearchOpen}
        onCreateTask={() => void createTaskFromContext()}
      />
      <KeyboardShortcutsHelp
        open={isShortcutsHelpOpen}
        onOpenChange={setIsShortcutsHelpOpen}
        shortcuts={shortcuts.filter((shortcut) => shortcut.key !== 'escape')}
      />
    </div>
  );
}
