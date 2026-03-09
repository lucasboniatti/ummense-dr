import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className = '' }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
      <ol className="flex items-center gap-1">
        <li>
          <Link
            href="/"
            className="flex items-center text-neutral-500 hover:text-neutral-700 transition-colors"
            aria-label="Página inicial"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            {item.href ? (
              <Link
                href={item.href}
                className="text-neutral-500 hover:text-neutral-700 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-neutral-900 font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}