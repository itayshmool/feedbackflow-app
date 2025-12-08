import React from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-in' | 'fade-in-up' | 'fade-in-down' | 'slide-in' | 'scale-in';
  delay?: number;
}

/**
 * Wrapper component for page transitions
 */
export function PageTransition({ 
  children, 
  className, 
  animation = 'fade-in-up',
  delay = 0 
}: PageTransitionProps) {
  const animationClass = {
    'fade-in': 'animate-fade-in',
    'fade-in-up': 'animate-fade-in-up',
    'fade-in-down': 'animate-fade-in-down',
    'slide-in': 'animate-slide-in',
    'scale-in': 'animate-scale-in',
  };

  return (
    <div 
      className={cn(animationClass[animation], className)}
      style={{ animationDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </div>
  );
}

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

/**
 * Container for staggered animations on child elements
 */
export function StaggerContainer({ 
  children, 
  className, 
  staggerDelay = 50 
}: StaggerContainerProps) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return (
          <div 
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * staggerDelay}ms` }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

/**
 * Card wrapper with hover animation effects
 */
export function AnimatedCard({ 
  children, 
  className, 
  hoverEffect = true 
}: AnimatedCardProps) {
  return (
    <div 
      className={cn(
        'transition-all duration-200',
        hoverEffect && 'hover:shadow-lg hover:-translate-y-1',
        className
      )}
    >
      {children}
    </div>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  baseDelay?: number;
}

/**
 * List item with staggered animation based on index
 */
export function AnimatedListItem({ 
  children, 
  className, 
  index = 0,
  baseDelay = 50 
}: AnimatedListItemProps) {
  return (
    <div 
      className={cn('animate-fade-in-up', className)}
      style={{ animationDelay: `${index * baseDelay}ms` }}
    >
      {children}
    </div>
  );
}

export default PageTransition;

