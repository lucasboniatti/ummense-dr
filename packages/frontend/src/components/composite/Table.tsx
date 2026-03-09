import * as React from 'react'
import { cn } from '@/lib/utils'

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  caption?: string
}

export function Table({ className, caption, ...props }: TableProps) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={cn('w-full text-sm text-neutral-700', className)}
        role="grid"
        aria-label={caption}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        {props.children}
      </table>
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('border-b border-[color:var(--border-subtle)] bg-neutral-50/90', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('divide-y divide-[color:var(--border-subtle)]', className)} {...props} />
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={cn('border-t border-[color:var(--border-subtle)] bg-neutral-50/90', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn('hover:bg-neutral-50 transition-colors', className)} {...props} />
  )
}

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sortDirection?: 'asc' | 'desc' | 'none'
}

export function TableHead({ className, sortable, sortDirection, children, ...props }: SortableTableHeadProps) {
  const ariaSort = sortable ? (sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none') : undefined

  return (
    <th
      className={cn('h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-[0.08em] text-neutral-500', className)}
      scope="col"
      aria-sort={ariaSort}
      {...props}
    >
      {children}
      {sortable && sortDirection !== 'none' && (
        <span className="sr-only">
          {sortDirection === 'asc' ? ' (ordenado ascendente)' : ' (ordenado descendente)'}
        </span>
      )}
    </th>
  )
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('px-4 py-3.5 align-middle', className)} {...props} />
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn('mt-4 text-sm text-neutral-600', className)} {...props} />
}