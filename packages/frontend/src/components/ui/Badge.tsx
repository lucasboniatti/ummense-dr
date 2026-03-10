import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[color:var(--tone-info-bg)] text-[color:var(--tone-info-text)]',
        secondary: 'border-transparent bg-[color:var(--tone-neutral-bg)] text-[color:var(--tone-neutral-text)]',
        error: 'border-transparent bg-[color:var(--tone-error-bg)] text-[color:var(--tone-error-text)]',
        destructive: 'border-transparent bg-[color:var(--tone-error-bg)] text-[color:var(--tone-error-text)]',
        outline: 'border-[color:var(--border-default)] bg-[color:var(--surface-raised)] text-[color:var(--text-secondary)]',
        success: 'border-transparent bg-[color:var(--tone-success-bg)] text-[color:var(--tone-success-text)]',
        warning: 'border-transparent bg-[color:var(--tone-warning-bg)] text-[color:var(--tone-warning-text)]',
        pro: 'border-transparent bg-[color:var(--color-pro)]/15 text-[#0a7c44]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'pro'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  tone?: BadgeTone
}

const toneToVariant: Record<BadgeTone, NonNullable<BadgeProps['variant']>> = {
  neutral: 'secondary',
  info: 'default',
  success: 'success',
  warning: 'warning',
  error: 'error',
  pro: 'pro',
}

function Badge({ className, variant, tone, ...props }: BadgeProps) {
  const resolvedVariant = tone ? toneToVariant[tone] : variant
  return (
    <div className={cn(badgeVariants({ variant: resolvedVariant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
