import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input, type InputProps } from '../ui/Input';

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  children?: React.ReactNode;
}

/**
 * FormField - Accessible form field wrapper with label, error, and hint support.
 * Implements WCAG 3.3.1 (Error Identification) and 3.3.2 (Labels or Instructions).
 *
 * Features:
 * - Proper id/htmlFor linking between label and input
 * - aria-invalid for error states
 * - aria-describedby linking errors and hints
 * - aria-required for required fields
 * - role="alert" for error messages
 */
const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, error, hint, required, children, id: providedId, ...props }, ref) => {
    const generatedId = React.useId();
    const fieldId = providedId || generatedId;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    const hasError = Boolean(error);
    const hasHint = Boolean(hint);

    // Determine aria-describedby
    const ariaDescribedBy = hasError ? errorId : hasHint ? hintId : undefined;

    // Clone child to inject accessibility props if it's a single element
    const child = React.Children.only(children) as React.ReactElement<{
      id?: string;
      'aria-invalid'?: boolean;
      'aria-describedby'?: string;
      'aria-required'?: boolean;
    }>;

    const enhancedChild = React.isValidElement(child)
      ? React.cloneElement(child, {
          id: fieldId,
          'aria-invalid': hasError,
          'aria-describedby': ariaDescribedBy,
          'aria-required': required,
        })
      : children;

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-neutral-700">
            {label}
            {required && (
              <span className="text-error-600 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        {enhancedChild}
        {hint && !error && (
          <p id={hintId} className="text-sm text-neutral-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-sm text-error-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';

export interface FormInputProps extends InputProps {
  label?: React.ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, required, className, ...props }, ref) => (
    <FormField label={label} error={error} hint={hint} required={required}>
      <Input
        ref={ref}
        className={cn(error && 'border-error-300 focus-visible:ring-error-500/40', className)}
        {...props}
      />
    </FormField>
  )
);
FormInput.displayName = 'FormInput';

export { FormField, FormInput };