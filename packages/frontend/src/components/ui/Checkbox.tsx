import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const checkboxVariants = cva(
  'app-control peer inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[8px] border text-[color:var(--text-strong)] transition-[transform,background-color,border-color,box-shadow] duration-200 data-[state=checked]:border-primary-600 data-[state=checked]:bg-primary-600 data-[state=checked]:text-white data-[state=indeterminate]:border-primary-600 data-[state=indeterminate]:bg-primary-600 data-[state=indeterminate]:text-white disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      state: {
        default: '',
        error: 'border-error-300 focus-visible:ring-error-500/30',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> &
  VariantProps<typeof checkboxVariants>;

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, state, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(checkboxVariants({ state }), className)}
    {...props}
  >
    <CheckboxPrimitive.Indicator asChild>
      <span className="flex items-center justify-center">
        {props.checked === 'indeterminate' ? (
          <Minus size={14} aria-hidden="true" />
        ) : (
          <Check size={14} aria-hidden="true" />
        )}
      </span>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

interface CheckboxFieldProps extends CheckboxProps {
  label: React.ReactNode;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

const CheckboxField = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  CheckboxFieldProps
>(({ className, label, hint, error, wrapperClassName, state, ...props }, ref) => (
  <label className={cn('flex items-start gap-3', wrapperClassName)}>
    <Checkbox
      ref={ref}
      className={className}
      state={error ? 'error' : state}
      {...props}
    />
    <span className="space-y-1">
      <span className="block text-sm font-medium text-[color:var(--text-strong)]">{label}</span>
      {hint && <span className="block text-sm text-[color:var(--text-muted)]">{hint}</span>}
      {error && <span className="block text-sm text-error-600">{error}</span>}
    </span>
  </label>
));
CheckboxField.displayName = 'CheckboxField';

export { Checkbox, CheckboxField };
