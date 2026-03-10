import * as React from 'react'
import { cn } from '@/lib/utils'
import { AvatarStack, type AvatarItem } from './AvatarStack'

export type TaskPriority = 'urgent' | 'high' | 'none'

export interface TaskItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onToggle'> {
  title: string
  category?: string
  /** Date label — shown in red when isUrgent is true */
  date?: string
  /** Marks the date label as red */
  isUrgent?: boolean
  /** Strikethrough + dimmed state */
  isCompleted?: boolean
  /** Left color bar (urgent=red, high=orange, none=gray) */
  priority?: TaskPriority
  /** Assignee avatars */
  assignees?: AvatarItem[]
  /** Fallback text avatar (e.g. initials "JS") when no avatars */
  assigneeFallback?: string
  /** Checkbox toggle callback */
  onToggle?: (completed: boolean) => void
}

const priorityBarColor: Record<TaskPriority, string> = {
  urgent: 'bg-error-500',
  high:   'bg-warning-400',
  none:   'bg-[color:var(--border-default)]',
}

const categoryColors = [
  'bg-secondary-100 text-secondary-700',
  'bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]',
  'bg-success-100 text-success-700',
  'bg-warning-100 text-warning-700',
]

export function TaskItem({
  title,
  category,
  date,
  isUrgent = false,
  isCompleted = false,
  priority = 'none',
  assignees = [],
  assigneeFallback,
  onToggle,
  className,
  ...props
}: TaskItemProps) {
  const isToggleEnabled = typeof onToggle === 'function'

  return (
    <div
      className={cn(
        'bg-[color:var(--surface-card)] p-4 rounded-xl border border-[color:var(--border-default)]',
        'flex items-center gap-4 shadow-sm',
        'hover:border-[color:var(--border-accent)] transition-all duration-[var(--motion-fast)]',
        isCompleted && 'opacity-70',
        className
      )}
      {...props}
    >
      {/* Priority bar */}
      <div
        className={cn(
          'w-1.5 h-10 rounded-full shrink-0',
          priorityBarColor[priority]
        )}
        aria-hidden="true"
      />

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={(e) => onToggle?.(e.target.checked)}
        disabled={!isToggleEnabled}
        readOnly={!isToggleEnabled}
        className={cn(
          'size-5 rounded border-[color:var(--border-strong)]',
          'text-primary focus:ring-primary focus:ring-offset-0',
          'shrink-0',
          isToggleEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
        )}
        aria-label={`Marcar "${title}" como ${isCompleted ? 'pendente' : 'concluída'}`}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-semibold text-sm text-[color:var(--text-strong)] truncate',
            isCompleted && 'line-through text-[color:var(--text-muted)]'
          )}
        >
          {title}
        </p>

        <div className="flex items-center gap-2 mt-1">
          {category && (
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide',
                categoryColors[0]
              )}
            >
              {category}
            </span>
          )}
          {date && (
            <span
              className={cn(
                'text-[10px] font-bold',
                isUrgent
                  ? 'text-error-500'
                  : 'text-[color:var(--text-muted)]'
              )}
            >
              {date}
            </span>
          )}
        </div>
      </div>

      {/* Assignees */}
      {assignees.length > 0 ? (
        <AvatarStack avatars={assignees} size="sm" max={3} />
      ) : assigneeFallback ? (
        <div className="size-7 rounded-full bg-[color:var(--accent-soft)] flex items-center justify-center text-[10px] font-bold text-[color:var(--accent-strong)] shrink-0">
          {assigneeFallback}
        </div>
      ) : null}
    </div>
  )
}
