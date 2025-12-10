// frontend/src/components/ui/Badge.tsx

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline' | 'destructive'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray' | 'purple'
  size?: 'sm' | 'md' | 'lg'
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, color, size = 'md', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full'
    
    // Map color to styles (takes precedence over variant if both provided)
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800',
      purple: 'bg-purple-100 text-purple-800',
    }
    
    const variantClasses: Record<string, string> = {
      primary: 'bg-blue-100 text-blue-800',
      secondary: 'bg-gray-100 text-gray-800',
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      destructive: 'bg-red-100 text-red-800',
      outline: 'border border-gray-300 bg-transparent text-gray-700',
    }
    
    const sizeClasses = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-0.5 text-xs',
      lg: 'px-3 py-1 text-sm',
    }

    // Determine the color/variant class to use
    const styleClass = color 
      ? colorClasses[color] 
      : variant 
        ? variantClasses[variant] 
        : variantClasses.primary
    
    return (
      <span
        ref={ref}
        className={cn(
          baseClasses,
          styleClass,
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'

export { Badge }
export default Badge
