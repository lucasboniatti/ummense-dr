import * as React from 'react'
import { Clock, Lock, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AvatarStack, type AvatarItem } from './AvatarStack'
import { ProgressSegments, type ProgressSegmentColor } from './ProgressSegments'

export interface KanbanCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card / client title */
  title: string
  /** Secondary meta line (e.g. "AGROCENTER S... | SAMUEL") */
  meta?: string
  /** Number of filled progress segments (0–progressTotal) */
  progressFilled?: number
  /** Total progress segments (default: 4) */
  progressTotal?: number
  /** Color of filled segments */
  progressColor?: ProgressSegmentColor
  /** Team avatars */
  avatars?: AvatarItem[]
  /** Shows a lock icon on the top-right */
  isLocked?: boolean
  /**
   * Power/status indicator:
   * - true  → green (active)
   * - false → red (inactive / canceling)
   * - null  → hidden
   */
  isActive?: boolean | null
  /** Shows a schedule (clock) icon */
  hasSchedule?: boolean
}

export function KanbanCard({
  title,
  meta,
  progressFilled = 0,
  progressTotal = 4,
  progressColor = 'primary',
  avatars = [],
  isLocked = false,
  isActive = null,
  hasSchedule = false,
  className,
  ...props
}: KanbanCardProps) {
  return (
    <div
      className={cn(
        'bg-[color:var(--surface-card)] rounded-xl shadow-sm border border-[color:var(--border-default)] p-4 space-y-3',
        'hover:border-[color:var(--border-accent)] hover:shadow-md',
        'transition-all duration-[var(--motion-fast)] cursor-pointer',
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-bold text-sm text-[color:var(--text-strong)] leading-tight line-clamp-2">
          {title}
        </h3>
        {isLocked && (
          <Lock size={14} className="text-[color:var(--text-muted)] shrink-0 mt-0.5" />
        )}
      </div>

      {/* Meta */}
      {meta && (
        <p className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-tight truncate">
          {meta}
        </p>
      )}

      {/* Progress segments */}
      <ProgressSegments
        filled={progressFilled}
        total={progressTotal}
        color={progressColor}
      />

      {/* Footer: avatars + actions */}
      <div className="flex justify-between items-center pt-1">
        {avatars.length > 0 ? (
          <AvatarStack avatars={avatars} size="xs" max={3} />
        ) : (
          <div />
        )}

        <div className="flex gap-2 items-center text-[color:var(--text-muted)]">
          {hasSchedule && <Clock size={14} />}
          {isActive !== null && (
            <Power
              size={14}
              className={
                isActive
                  ? 'text-success-500'
                  : 'text-error-500'
              }
            />
          )}
        </div>
      </div>
    </div>
  )
}
