// frontend/src/components/ui/Button.tsx

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import LoadingSpinner from './LoadingSpinner'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'default' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode | React.ElementType
  rightIcon?: React.ReactNode | React.ElementType
  icon?: React.ReactNode | React.ElementType
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    leftIcon,
    rightIcon,
    icon,
    children, 
    disabled,
    ...props 
  }, ref) => {
    const baseClasses = 'btn'
    
    const variantClasses = {
      primary: 'btn-primary',
      secondary: 'btn-secondary',
      outline: 'btn-outline',
      ghost: 'btn-ghost',
      danger: 'btn-danger',
      success: 'btn-success',
      default: 'btn-primary',
      destructive: 'btn-danger',
    }
    
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    }
    
    const isDisabled = disabled || loading
    
    const renderIcon = (iconProp: React.ReactNode | React.ElementType) => {
      if (!iconProp) return null;
      if (typeof iconProp === 'function' || (typeof iconProp === 'object' && 'render' in iconProp)) {
         const Icon = iconProp as React.ElementType;
         return <Icon className="w-4 h-4" />;
      }
      return iconProp as React.ReactNode;
    };

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <LoadingSpinner size="sm" className="mr-2" />
        )}
        {!loading && (leftIcon || icon) && (
          <span className={children ? "mr-2" : ""}>{renderIcon(leftIcon || icon)}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="ml-2">{renderIcon(rightIcon)}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
export default Button
