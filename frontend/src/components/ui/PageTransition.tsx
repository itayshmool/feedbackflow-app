// Page Transition Component - Smooth page animations

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  animation?: 'fade' | 'fade-up' | 'fade-down' | 'slide-right' | 'scale';
  delay?: number;
  duration?: 'fast' | 'normal' | 'slow';
}

export function PageTransition({
  children,
  className,
  animation = 'fade-up',
  delay = 0,
  duration = 'normal',
}: PageTransitionProps) {
  const animationClasses = {
    'fade': 'animate-fade-in',
    'fade-up': 'animate-fade-in-up',
    'fade-down': 'animate-fade-in-down',
    'slide-right': 'animate-slide-in-right',
    'scale': 'animate-scale-in',
  };

  const durationClasses = {
    fast: '[animation-duration:200ms]',
    normal: '[animation-duration:400ms]',
    slow: '[animation-duration:600ms]',
  };

  return (
    <div
      className={cn(
        animationClasses[animation],
        durationClasses[duration],
        className
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {children}
    </div>
  );
}

// Stagger animation for lists
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 50,
}: StaggerContainerProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.isArray(children)
        ? children.map((child, index) => (
            <PageTransition
              key={index}
              animation="fade-up"
              delay={index * staggerDelay}
            >
              {child}
            </PageTransition>
          ))
        : children}
    </div>
  );
}

// Card with hover animation
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export function AnimatedCard({
  children,
  className,
  onClick,
  hover = true,
}: AnimatedCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200 dark:border-gray-800',
        'bg-white dark:bg-gray-900',
        'transition-all duration-300 ease-out',
        hover && 'hover:shadow-lg hover:-translate-y-1 hover:border-gray-300 dark:hover:border-gray-700',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Fade-in wrapper for content that loads
interface FadeInProps {
  children: ReactNode;
  className?: string;
  show?: boolean;
  duration?: number;
}

export function FadeIn({
  children,
  className,
  show = true,
  duration = 300,
}: FadeInProps) {
  return (
    <div
      className={cn(
        'transition-opacity',
        show ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

export default PageTransition;

