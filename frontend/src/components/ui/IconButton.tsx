// frontend/src/components/ui/IconButton.tsx
// Icon-only button with tooltip support, responsive sizing for mobile

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon to display */
  icon: React.ReactNode;
  /** Tooltip text shown on hover (desktop) */
  tooltip?: string;
  /** Tooltip position */
  tooltipPosition?: 'top' | 'bottom' | 'left' | 'right';
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'primary';
  /** Button size - responsive by default (44px mobile, 40px desktop) */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  loading?: boolean;
  /** Custom hover color class (e.g., 'hover:bg-blue-500 hover:text-white') */
  hoverClassName?: string;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      tooltip,
      tooltipPosition = 'top',
      variant = 'outline',
      size = 'md',
      loading = false,
      disabled,
      className,
      hoverClassName,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    // Base styles
    const baseStyles = cn(
      'relative inline-flex items-center justify-center',
      'rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      // Touch-friendly: 44px on mobile (Apple HIG), 40px on desktop
      'group'
    );

    // Size variants - mobile-first responsive
    const sizeStyles = {
      sm: 'w-9 h-9 md:w-8 md:h-8', // 36px mobile, 32px desktop
      md: 'w-11 h-11 md:w-10 md:h-10', // 44px mobile, 40px desktop
      lg: 'w-14 h-14 md:w-12 md:h-12', // 56px mobile, 48px desktop
    };

    // Icon size based on button size
    const iconSizeStyles = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
    };

    // Variant styles
    const variantStyles = {
      default: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent',
      outline: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400',
      ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent',
      primary: 'bg-blue-600 text-white hover:bg-blue-700 border border-transparent',
    };

    // Tooltip position styles
    const tooltipPositionStyles = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    // Tooltip arrow position
    const tooltipArrowStyles = {
      top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent border-4',
      bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent border-4',
      left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent border-4',
      right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent border-4',
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={isDisabled}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          hoverClassName,
          className
        )}
        aria-label={tooltip}
        {...props}
      >
        {/* Icon or Loading Spinner */}
        {loading ? (
          <Loader2 className={cn(iconSizeStyles[size], 'animate-spin')} />
        ) : (
          <span className={iconSizeStyles[size]}>{icon}</span>
        )}

        {/* Tooltip - hidden on touch devices, shown on hover for desktop */}
        {tooltip && !isDisabled && (
          <span
            className={cn(
              'absolute z-50 pointer-events-none',
              'px-2 py-1 text-xs font-medium text-white bg-gray-800 rounded',
              'whitespace-nowrap',
              'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100',
              'transition-all duration-150',
              // Hide on touch devices (no hover)
              'hidden md:block',
              tooltipPositionStyles[tooltipPosition]
            )}
            role="tooltip"
          >
            {tooltip}
            {/* Arrow */}
            <span
              className={cn(
                'absolute w-0 h-0',
                tooltipArrowStyles[tooltipPosition]
              )}
            />
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';

export { IconButton };
export default IconButton;

