import * as React from 'react';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const radioItemVariants = cva(
  'app-control flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-[transform,background-color,border-color,box-shadow] duration-200 data-[state=checked]:border-primary-600 data-[state=checked]:bg-white disabled:cursor-not-allowed disabled:opacity-50'
);

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-3', className)} {...props} />
));
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName;

interface RadioItemProps extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

const RadioItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioItemProps
>(({ className, label, description, ...props }, ref) => (
  <label
    className={cn(
      'group flex cursor-pointer items-start gap-3 rounded-[18px] border border-[color:var(--border-subtle)] bg-[color:var(--surface-raised)] px-4 py-3 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[color:var(--border-strong)] hover:shadow-[var(--elevation-1)]',
      props.disabled && 'cursor-not-allowed opacity-60',
      className
    )}
  >
    <RadioGroupPrimitive.Item ref={ref} className={radioItemVariants()} {...props}>
      <RadioGroupPrimitive.Indicator>
        <span className="block h-2.5 w-2.5 rounded-full bg-primary-600" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-[color:var(--text-strong)]">{label}</span>
      {description && (
        <span className="mt-1 block text-sm leading-6 text-[color:var(--text-muted)]">
          {description}
        </span>
      )}
    </span>
  </label>
));
RadioItem.displayName = 'RadioItem';

export { RadioGroup, RadioItem };
