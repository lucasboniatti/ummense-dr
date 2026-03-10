import * as React from 'react'
import { cn } from '@/lib/utils'

export type ProgressSegmentColor = 'primary' | 'info' | 'warning' | 'success' | 'error'

export interface ProgressSegmentsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of filled segments */
  filled: number
  /** Total segments (default: 4) */
  total?: number
  /** Color of filled segments */
  color?: ProgressSegmentColor
}

const colorClasses: Record<ProgressSegmentColor, string> = {
  primary: 'bg-primary',
  info:    'bg-secondary-500',
  warning: 'bg-warning-400',
  success: 'bg-success-500',
  error:   'bg-error-500',
}

export function ProgressSegments({
  filled,
  total = 4,
  color = 'primary',
  className,
  ...props
}: ProgressSegmentsProps) {
  return (
    <div className={cn('flex gap-1 h-1.5', className)} {...props}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 rounded-full',
            i < filled ? colorClasses[color] : 'bg-[color:var(--border-default)]'
          )}
        />
      ))}
    </div>
  )
}
