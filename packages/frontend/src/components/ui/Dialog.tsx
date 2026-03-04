import * as React from 'react'
import { cn } from '@/lib/utils'

interface DialogContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined)

export function useDialog() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within Dialog')
  }
  return context
}

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open = false, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(open)
  const isControlled = onOpenChange !== undefined

  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  const currentOpen = isControlled ? open : internalOpen

  return (
    <DialogContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange }}>
      {currentOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          {children}
        </div>
      )}
    </DialogContext.Provider>
  )
}

export function DialogTrigger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useDialog()

  return (
    <button onClick={() => onOpenChange(true)} {...props}>
      {children}
    </button>
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogContent({ className, children, ...props }: DialogContentProps) {
  const { onOpenChange } = useDialog()

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-lg max-w-md w-full mx-4 overflow-hidden',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      <div className="relative">{children}</div>
      <button
        onClick={() => onOpenChange(false)}
        className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"
      >
        ✕
      </button>
    </div>
  )
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn('p-6 border-b border-neutral-200', className)} {...props} />
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  return <h2 className={cn('text-xl font-semibold', className)} {...props} />
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <p className={cn('text-sm text-neutral-600 mt-1', className)} {...props} />
}

interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogBody({ className, ...props }: DialogBodyProps) {
  return <div className={cn('p-6', className)} {...props} />
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return <div className={cn('flex justify-end gap-3 p-6 border-t border-neutral-200', className)} {...props} />
}
