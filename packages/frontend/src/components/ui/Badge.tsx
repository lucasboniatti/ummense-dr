import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-100 text-primary-800',
        secondary: 'border-transparent bg-secondary-100 text-secondary-800',
        error: 'border-transparent bg-error-100 text-error-800',
        destructive: 'border-transparent bg-error-100 text-error-800',
        outline: 'border-neutral-300 bg-white text-neutral-700',
        success: 'border-transparent bg-success-100 text-success-800',
        warning: 'border-transparent bg-warning-100 text-warning-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
