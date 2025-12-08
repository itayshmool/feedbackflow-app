import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

/**
 * Base Skeleton component with shimmer effect
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
        'bg-[length:200%_100%]',
        'animate-shimmer',
        'rounded-md',
        className
      )}
    />
  );
}

/**
 * Skeleton card variant for loading card content
 */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 p-6 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

/**
 * Skeleton avatar variant
 */
interface SkeletonAvatarProps extends SkeletonProps {
  size?: 'sm' | 'md' | 'lg';
}

export function SkeletonAvatar({ className, size = 'md' }: SkeletonAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <Skeleton className={cn('rounded-full', sizeClasses[size], className)} />
  );
}

/**
 * Skeleton table variant for loading table rows
 */
interface SkeletonTableProps extends SkeletonProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ className, rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-200">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-3 border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton list variant for loading list items
 */
interface SkeletonListProps extends SkeletonProps {
  items?: number;
  showAvatar?: boolean;
}

export function SkeletonList({ className, items = 5, showAvatar = true }: SkeletonListProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {showAvatar && <SkeletonAvatar size="md" />}
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton text block variant
 */
interface SkeletonTextProps extends SkeletonProps {
  lines?: number;
}

export function SkeletonText({ className, lines = 3 }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full' // Last line shorter
          )} 
        />
      ))}
    </div>
  );
}

export default Skeleton;

