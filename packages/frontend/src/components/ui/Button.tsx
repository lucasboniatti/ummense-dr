import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'app-control pressable inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-control)] text-sm font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'border-transparent bg-primary-600 text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.95)] hover:bg-primary-700 hover:shadow-[0_20px_30px_-20px_rgba(37,99,235,0.98)] active:bg-primary-800',
        default:
          'border-transparent bg-primary-600 text-white shadow-[0_16px_28px_-18px_rgba(37,99,235,0.95)] hover:bg-primary-700 hover:shadow-[0_20px_30px_-20px_rgba(37,99,235,0.98)] active:bg-primary-800',
        secondary:
          'border-transparent bg-secondary-600 text-white shadow-[0_16px_28px_-18px_rgba(8,145,178,0.78)] hover:bg-secondary-700 active:bg-secondary-800',
        destructive:
          'border-transparent bg-error-600 text-white shadow-[0_16px_28px_-18px_rgba(220,38,38,0.68)] hover:bg-error-700 active:bg-error-800',
        outline:
          'border-transparent bg-white/95 text-neutral-800 hover:bg-neutral-100 hover:text-neutral-900',
        ghost: 'border-transparent bg-transparent shadow-none hover:bg-white/72 hover:text-neutral-900',
        link: 'link-underline border-transparent bg-transparent px-0 text-primary-700 shadow-none underline-offset-4',
        success:
          'border-transparent bg-success-600 text-white shadow-[0_16px_28px_-18px_rgba(22,163,74,0.7)] hover:bg-success-700 active:bg-success-800',
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
