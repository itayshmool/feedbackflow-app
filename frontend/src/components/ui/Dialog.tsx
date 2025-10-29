import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface DialogProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ className, open = false, onOpenChange, children, ...props }, ref) => {
    if (!open) return null

    return (
      <div
        ref={ref}
        className={cn('fixed inset-0 z-50 flex items-center justify-center', className)}
        {...props}
      >
        <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange?.(false)} />
        <div className="relative z-50">
          {children}
        </div>
      </div>
    )
  }
)

Dialog.displayName = 'Dialog'

const DialogContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 p-6',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)

DialogContent.displayName = 'DialogContent'

const DialogHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
      {...props}
    />
  )
)

DialogHeader.displayName = 'DialogHeader'

const DialogTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)

DialogTitle.displayName = 'DialogTitle'

const DialogDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-gray-500', className)}
      {...props}
    />
  )
)

DialogDescription.displayName = 'DialogDescription'

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription }
