import * as React from 'react'
import { cn } from '@/lib/utils'

interface DialogContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
  titleId: string
  descriptionId: string
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
  const titleId = React.useId()
  const descriptionId = React.useId()

  const handleOpenChange = (newOpen: boolean) => {
    if (isControlled) {
      onOpenChange?.(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  const currentOpen = isControlled ? open : internalOpen

  // ESC key handler
  React.useEffect(() => {
    if (!currentOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleOpenChange(false)
      }
    }

    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [currentOpen])

  // Prevent body scroll when open
  React.useEffect(() => {
    if (currentOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [currentOpen])

  return (
    <DialogContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange, titleId, descriptionId }}>
      {currentOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={() => handleOpenChange(false)}
        >
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
  const { onOpenChange, titleId, descriptionId } = useDialog()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        'app-surface mx-4 w-full max-w-md overflow-hidden rounded-[26px]',
        'animate-in fade-in-0 zoom-in-95 duration-200',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      <div className="relative">{children}</div>
      <button
        onClick={() => onOpenChange(false)}
        aria-label="Fechar diálogo"
        className="app-control absolute right-4 top-4 h-10 w-10 rounded-full p-0 text-neutral-400 hover:text-neutral-700"
      >
        ✕
      </button>
    </div>
  )
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn('border-b border-[color:var(--border-subtle)] p-6', className)} {...props} />
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

export function DialogTitle({ className, ...props }: DialogTitleProps) {
  const { titleId } = useDialog()
  return <h2 id={titleId} className={cn('text-xl font-semibold tracking-[-0.02em] text-neutral-900', className)} {...props} />
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  const { descriptionId } = useDialog()
  return <p id={descriptionId} className={cn('mt-1 text-sm leading-6 text-neutral-600', className)} {...props} />
}

interface DialogBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogBody({ className, ...props }: DialogBodyProps) {
  return <div className={cn('p-6', className)} {...props} />
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return <div className={cn('flex justify-end gap-3 border-t border-[color:var(--border-subtle)] p-6', className)} {...props} />
}
