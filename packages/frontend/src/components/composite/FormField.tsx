import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input, type InputProps } from '../ui/Input'

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode
  error?: string
  hint?: string
  required?: boolean
  children?: React.ReactNode
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ className, label, error, hint, required, children, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props}>
      {label && (
        <label className="block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-600 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-sm text-error-600">{error}</p>}
      {hint && !error && <p className="text-sm text-neutral-500">{hint}</p>}
    </div>
  )
)
FormField.displayName = 'FormField'

export interface FormInputProps extends InputProps {
  label?: React.ReactNode
  error?: string
  hint?: string
  required?: boolean
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, required, ...props }, ref) => (
    <FormField label={label} error={error} hint={hint} required={required}>
      <Input ref={ref} {...props} />
    </FormField>
  )
)
FormInput.displayName = 'FormInput'

export { FormField, FormInput }
