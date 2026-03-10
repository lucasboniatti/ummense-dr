import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const selectTriggerVariants = cva(
  'app-control inline-flex w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-3.5 text-left text-sm font-medium text-[color:var(--text-strong)] transition-[transform,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-60 data-[placeholder]:text-neutral-400',
  {
    variants: {
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11',
        lg: 'h-12 px-4 text-base',
      },
      state: {
        default: '',
        error: 'border-error-300 focus-visible:ring-error-500/30',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
    },
  }
);

const selectItemVariants = cva(
  'relative flex w-full cursor-default select-none items-center rounded-[14px] px-3 py-2.5 text-sm font-medium text-[color:var(--text-strong)] outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-[color:var(--accent-soft)] data-[highlighted]:text-[color:var(--accent-strong)]'
);

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;
const SelectLabel = SelectPrimitive.Label;
const SelectSeparator = SelectPrimitive.Separator;

type SelectTriggerProps = React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> &
  VariantProps<typeof selectTriggerVariants>;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>(({ className, children, size, state, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(selectTriggerVariants({ size, state }), className)}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown size={16} className="shrink-0 text-neutral-400" aria-hidden="true" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', sideOffset = 8, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={sideOffset}
      className={cn(
        'app-surface z-[90] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[20px] p-1 shadow-[var(--elevation-2)] motion-scale-in',
        className
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="max-h-72 w-full">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={cn(selectItemVariants(), className)} {...props}>
    <span className="absolute right-3 flex h-4 w-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check size={14} aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectLabelText = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-500',
      className
    )}
    {...props}
  />
));
SelectLabelText.displayName = SelectPrimitive.Label.displayName;

const SelectDivider = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('my-1 h-px bg-[color:var(--border-subtle)]', className)}
    {...props}
  />
));
SelectDivider.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectContent,
  SelectDivider,
  SelectGroup,
  SelectItem,
  SelectLabelText,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
