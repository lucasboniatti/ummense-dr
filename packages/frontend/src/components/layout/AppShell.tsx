import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

interface AppShellProps {
  children: ReactNode;
}

function resolvePageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '/Dashboard') return 'Painel Operacional';
  if (pathname.startsWith('/dashboard/automations')) return 'Fluxos';
  if (pathname.startsWith('/flows')) return 'Fluxos';
  if (pathname.startsWith('/cards')) return 'Card Workspace';
  if (pathname.startsWith('/dashboard/webhooks')) return 'Contatos & Webhooks';
  if (pathname.startsWith('/automations/history')) return 'Arquivos de Execução';
  if (pathname.startsWith('/admin')) return 'Mais Configurações';
  return 'Synkra Operations';
}

export default function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [priorityValue, setPriorityValue] = useState('all');

  const pageTitle = useMemo(() => resolvePageTitle(router.pathname), [router.pathname]);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const q = typeof router.query.q === 'string' ? router.query.q : '';
    const priority = typeof router.query.priority === 'string' ? router.query.priority : 'all';

    setSearchValue(q);
    setPriorityValue(priority || 'all');
  }, [router.isReady, router.query.q, router.query.priority]);

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

  const handleQuickAction = async (action: 'new-task' | 'new-flow' | 'open-webhooks') => {
    if (action === 'new-task') {
      await router.push('/?q=nova+tarefa');
      return;
    }

    if (action === 'new-flow') {
      await router.push('/dashboard/automations');
      return;
    }

    await router.push('/dashboard/webhooks');
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-neutral-900">
      <AppSidebar isMobileOpen={isMobileOpen} onCloseMobile={() => setIsMobileOpen(false)} />

      <div className="lg:pl-64">
        <AppTopbar
          pageTitle={pageTitle}
          searchValue={searchValue}
          priorityValue={priorityValue}
          notificationsCount={3}
          onOpenMobileMenu={() => setIsMobileOpen(true)}
          onSearchChange={setSearchValue}
          onPriorityChange={setPriorityValue}
          onApplyFilters={applyFilters}
          onClearFilters={clearFilters}
          onQuickAction={handleQuickAction}
        />

        <main className="px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
