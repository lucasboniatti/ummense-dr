import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
  compactLabel?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-sm text-[color:var(--text-muted)]', className)}>
      <ol className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        <li className={cn(items.length > 0 && 'hidden sm:flex')}>
          <Link
            href="/"
            className="flex items-center text-neutral-500 transition-colors hover:text-neutral-700"
            aria-label="Página inicial"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {items.map((item, index) => (
          <li
            key={`${item.label}-${index}`}
            className={cn(
              'min-w-0 items-center gap-1.5',
              index < items.length - 1 ? 'hidden sm:flex' : 'flex'
            )}
          >
            <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            {item.href && !item.current ? (
              <Link
                href={item.href}
                className="truncate text-neutral-500 transition-colors hover:text-neutral-700"
              >
                {item.compactLabel || item.label}
              </Link>
            ) : (
              <span
                className="truncate font-medium text-[color:var(--text-strong)]"
                aria-current="page"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
