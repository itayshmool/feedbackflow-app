// frontend/src/components/ui/Card.tsx

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantClasses = {
      default: 'card',
      outlined: 'border-2 border-gray-200 bg-white',
      elevated: 'shadow-lg border border-gray-200 bg-white',
    }
    
    return (
      <div
        ref={ref}
        className={cn(variantClasses[variant], className)}
        {...props}
      />
    )
  }
)

Card.displayName = 'Card'

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('card-header', className)}
      {...props}
    />
  )
)

CardHeader.displayName = 'CardHeader'

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('card-content', className)}
      {...props}
    />
  )
)

CardContent.displayName = 'CardContent'

const CardTitle = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('card-title', className)}
      {...props}
    />
  )
)

CardTitle.displayName = 'CardTitle'

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('card-footer', className)}
      {...props}
    />
  )
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardContent, CardTitle, CardFooter }
