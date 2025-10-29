import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'error'
  onCheckedChange?: (checked: boolean) => void
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, variant = 'default', onCheckedChange, onChange, ...props }, ref) => {
    const baseClasses = 'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50'
    
    const variantClasses = {
      default: 'data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200',
      error: 'data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-red-200',
    }
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked)
      }
      if (onChange) {
        onChange(e)
      }
    }
    
    return (
      <input
        type="checkbox"
        className={cn(baseClasses, variantClasses[variant], className)}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)

Switch.displayName = 'Switch'

export { Switch }
