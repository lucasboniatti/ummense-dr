import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'app-control pressable inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] text-sm font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-primary text-white shadow-primary hover:bg-primary-600 hover:shadow-primary active:bg-primary-700',
        default:
          'border-transparent bg-primary text-white shadow-primary hover:bg-primary-600 hover:shadow-primary active:bg-primary-700',
        secondary:
          'border-[color:var(--border-default)] bg-[color:var(--surface-muted)] text-[color:var(--text-secondary)] shadow-none hover:bg-[color:var(--surface-emphasis)] hover:text-[color:var(--text-strong)]',
        destructive:
          'border-transparent bg-error-600 text-white shadow-[0_18px_30px_-20px_rgba(220,38,38,0.42)] hover:bg-error-700 active:bg-error-700',
        outline:
          'border-[color:var(--border-default)] bg-[color:var(--surface-raised)] text-[color:var(--text-strong)] shadow-none hover:bg-[color:var(--surface-emphasis)]',
        ghost: 'border-transparent bg-transparent text-[color:var(--text-secondary)] shadow-none hover:bg-[color:var(--surface-emphasis)] hover:text-[color:var(--text-strong)]',
        link: 'link-underline border-transparent bg-transparent px-0 text-[color:var(--text-accent)] shadow-none underline-offset-4 hover:text-primary-600',
        success:
          'border-transparent bg-success-600 text-white shadow-[0_18px_30px_-20px_rgba(16,185,129,0.42)] hover:bg-success-700 active:bg-success-700',
      },
      size: {
        default: 'h-11 px-4 py-2.5',
        sm: 'h-9 px-3.5 text-xs',
        lg: 'h-12 px-5 text-[0.95rem]',
        icon: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
