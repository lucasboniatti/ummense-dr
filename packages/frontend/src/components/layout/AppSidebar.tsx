import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  KanbanSquare,
  Users,
  FolderOpen,
  Grid2x2,
  X,
} from 'lucide-react';

interface AppSidebarProps {
  isMobileOpen: boolean;
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
    href: '/',
    icon: Home,
    matches: (pathname) => pathname === '/' || pathname === '/Dashboard',
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

export default function AppSidebar({ isMobileOpen, onCloseMobile }: AppSidebarProps) {
  const router = useRouter();

  return (
    <>
      {isMobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 bg-neutral-950/40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={[
          'fixed left-0 top-0 z-50 h-screen w-64 border-r border-neutral-200 bg-white/95 backdrop-blur transition-transform duration-200',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                Synkra Ops
              </p>
              <h1 className="text-lg font-bold text-neutral-900">Meu Painel</h1>
            </div>
            <button
              type="button"
              aria-label="Fechar menu lateral"
              className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden"
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
                <Link key={item.label} href={item.href} passHref legacyBehavior>
                  <a
                    onClick={onCloseMobile}
                    className={[
                      'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                      active
                        ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
                    ].join(' ')}
                  >
                    <Icon size={18} className={active ? 'text-primary-700' : 'text-neutral-500 group-hover:text-neutral-800'} />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>

          <footer className="border-t border-neutral-200 px-4 py-4">
            <p className="text-xs text-neutral-500">Operação local sincronizada</p>
            <p className="mt-1 text-sm font-semibold text-neutral-800">Wave 6 - Product Parity</p>
          </footer>
        </div>
      </aside>
    </>
  );
}
