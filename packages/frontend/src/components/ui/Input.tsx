import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'app-control focus-ring-animated flex h-11 w-full rounded-[var(--radius-control)] px-3.5 py-2.5 text-sm leading-5 placeholder:text-[color:var(--text-muted)] focus-visible:bg-[color:var(--surface-raised)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
