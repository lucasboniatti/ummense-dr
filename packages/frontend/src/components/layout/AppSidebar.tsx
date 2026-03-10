import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FolderOpen,
  Grid2x2,
  Home,
  KanbanSquare,
  LogOut,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';
import { ThemeToggle } from '../ui/ThemeToggle';

interface AppSidebarProps {
  isMobileOpen: boolean;
  isDesktopVisible: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: typeof Home;
  matches: (pathname: string) => boolean;
}

const navItems: NavItem[] = [
  {
    label: 'Painel',
    href: '/dashboard',
    icon: Home,
    matches: (pathname) => pathname === '/' || pathname === '/dashboard',
  },
  {
    label: 'Fluxos',
    href: '/dashboard/automations',
    icon: KanbanSquare,
    matches: (pathname) =>
      pathname.startsWith('/dashboard/automations') ||
      pathname.startsWith('/flows') ||
      pathname.startsWith('/cards'),
  },
  {
    label: 'Contatos',
    href: '/dashboard/webhooks',
    icon: Users,
    matches: (pathname) => pathname.startsWith('/dashboard/webhooks'),
  },
  {
    label: 'Arquivos',
    href: '/automations/history',
    icon: FolderOpen,
    matches: (pathname) => pathname.startsWith('/automations/history'),
  },
  {
    label: 'Mais',
    href: '/admin/rate-limits',
    icon: Grid2x2,
    matches: (pathname) => pathname.startsWith('/admin'),
  },
];

export default function AppSidebar({
  isMobileOpen,
  isDesktopVisible,
  onCloseMobile,
}: AppSidebarProps) {
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-neutral-950/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
          'fixed left-0 top-0 z-50 h-screen w-64 border-r border-[color:var(--border-subtle)] bg-[linear-gradient(180deg,var(--surface-raised),var(--surface-panel))] shadow-[var(--shadow-shell)] backdrop-blur-xl transition-transform duration-200',
          isMobileOpen || isDesktopVisible ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between border-b border-[color:var(--border-subtle)] px-4 py-4">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div className="min-w-0">
                <p className="app-kicker">Tasks Flow</p>
                <h1 className="truncate text-lg font-bold tracking-[-0.02em] text-[color:var(--text-strong)]">
                  Meu Painel
                </h1>
                <p className="mt-1 text-xs font-medium text-[color:var(--text-muted)]">
                  Gestao de tarefas
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar menu lateral"
              className="app-control rounded-[var(--radius-control)] p-2 text-[color:var(--text-muted)] lg:hidden"
              onClick={onCloseMobile}
            >
              <X size={18} />
            </button>
          </header>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.matches(router.pathname);

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onCloseMobile}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'app-sidebar-link',
                    active ? 'app-sidebar-link-active' : '',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className={`app-sidebar-link-indicator ${active ? 'opacity-100' : 'opacity-0'}`}
                  />
                  <span className="app-sidebar-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <footer className="border-t border-[color:var(--border-subtle)] px-4 py-4">
            <div className="mb-3 flex items-center justify-between rounded-[18px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-muted)] px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[color:var(--text-muted)]">
                  Tema
                </p>
                <p className="text-xs text-[color:var(--text-muted)]">Claro ou escuro</p>
              </div>
              <ThemeToggle />
            </div>
            <div className="app-surface-muted flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)]">
                <span className="text-sm font-bold text-[color:var(--accent-strong)]">
                  {user?.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[color:var(--text-strong)]">
                  {user?.name || user?.email || 'Usuário'}
                </p>
                <p className="truncate text-xs font-medium text-[color:var(--text-muted)]">
                  Sessao operacional ativa
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sair"
                className="app-control rounded-[var(--radius-control)] p-2 text-[color:var(--text-muted)] transition-colors hover:text-error-600"
              >
                <LogOut size={16} />
              </button>
            </div>
          </footer>
        </div>
      </aside>
    </>
  );
}
