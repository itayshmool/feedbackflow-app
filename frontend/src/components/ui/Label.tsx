import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  variant?: 'default' | 'error' | 'success'
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const baseClasses = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
    
    const variantClasses = {
      default: 'text-gray-700',
      error: 'text-red-600',
      success: 'text-green-600',
    }
    
    return (
      <label
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], className)}
        {...props}
      />
    )
  }
)

Label.displayName = 'Label'

export { Label }
