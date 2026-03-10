import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarItem {
  src?: string
  fallback: string
  alt?: string
}

export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  avatars: AvatarItem[]
  max?: number
  size?: 'xs' | 'sm' | 'md'
}

const sizeClasses = {
  xs: 'size-6 text-[9px]',
  sm: 'size-7 text-[10px]',
  md: 'size-8 text-xs',
}

export function AvatarStack({ avatars, max = 4, size = 'sm', className, ...props }: AvatarStackProps) {
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - max

  return (
    <div className={cn('flex -space-x-2', className)} {...props}>
      {visible.map((avatar, i) => (
        <div
          key={i}
          className={cn(
            sizeClasses[size],
            'rounded-full border-2 border-[color:var(--surface-raised)] bg-[color:var(--surface-muted)] overflow-hidden shrink-0'
          )}
        >
          {avatar.src ? (
            <img
              src={avatar.src}
              alt={avatar.alt ?? avatar.fallback}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-[color:var(--text-muted)]">
              {avatar.fallback.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            sizeClasses[size],
            'rounded-full border-2 border-[color:var(--surface-raised)] bg-[color:var(--surface-muted)] flex items-center justify-center font-bold text-[color:var(--text-muted)] shrink-0'
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
