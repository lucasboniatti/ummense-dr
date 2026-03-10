import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  History,
  Home,
  KanbanSquare,
  LogOut,
  Settings2,
  Webhook,
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
    label: 'Automações',
    href: '/dashboard/automations',
    icon: KanbanSquare,
    matches: (pathname) =>
      pathname.startsWith('/dashboard/automations') ||
      pathname.startsWith('/flows') ||
      pathname.startsWith('/cards'),
  },
  {
    label: 'Webhooks',
    href: '/dashboard/webhooks',
    icon: Webhook,
    matches: (pathname) => pathname.startsWith('/dashboard/webhooks'),
  },
  {
    label: 'Histórico',
    href: '/automations/history',
    icon: History,
    matches: (pathname) => pathname.startsWith('/automations/history'),
  },
  {
    label: 'Administração',
    href: '/admin/rate-limits',
    icon: Settings2,
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
          className="fixed inset-0 z-40 bg-[#061224]/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
          'app-shell-sidebar fixed left-0 top-0 z-50 h-screen w-64 border-r border-white/5 shadow-[0_24px_64px_-28px_rgba(0,0,0,0.55)] transition-transform duration-200',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          isDesktopVisible ? 'lg:translate-x-0' : 'lg:-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between border-b border-white/6 px-4 py-4">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary-300">Tasks Flow</p>
                <h1 className="truncate text-lg font-bold tracking-[-0.02em] text-white">
                  Central de operação
                </h1>
                <p className="mt-1 text-xs font-medium text-white/45">
                  Fluxos, webhooks e integrações
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar menu lateral"
              className="rounded-lg border border-white/8 bg-white/5 p-2 text-white/55 transition-colors hover:text-white lg:hidden"
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

          <footer className="border-t border-white/7 px-4 py-4">
            <div className="mb-3 flex items-center justify-between rounded-xl border border-white/8 bg-white/5 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/35">
                  Experiência
                </p>
                <p className="text-xs text-white/45">Claro ou escuro</p>
              </div>
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/5 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
                <span className="text-sm font-bold text-primary-100">
                  {user?.email?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {user?.name || user?.email || 'Usuário'}
                </p>
                <p className="truncate text-xs font-medium text-white/45">
                  Conta ativa
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                title="Sair"
                className="rounded-lg border border-white/8 bg-white/5 p-2 text-white/45 transition-colors hover:text-white"
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
