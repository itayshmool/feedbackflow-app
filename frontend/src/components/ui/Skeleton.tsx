// Skeleton Component - Modern loading placeholders

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circular' | 'rectangular' | 'text';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = 'default',
  width,
  height,
  lines = 1,
  animate = true,
}: SkeletonProps) {
  const baseClasses = cn(
    'bg-gray-200 dark:bg-gray-800',
    animate && 'animate-pulse',
    variant === 'circular' && 'rounded-full',
    variant === 'rectangular' && 'rounded-lg',
    variant === 'text' && 'rounded h-4',
    variant === 'default' && 'rounded-md',
    className
  );

  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  if (lines > 1 && variant === 'text') {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClasses, i === lines - 1 && 'w-3/4')}
            style={style}
          />
        ))}
      </div>
    );
  }

  return <div className={baseClasses} style={style} />;
}

// Pre-built skeleton components for common UI patterns
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6', className)}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return <Skeleton variant="circular" className={sizeClasses[size]} />;
}

export function SkeletonButton({ width = 100 }: { width?: number | string }) {
  return <Skeleton className="h-10 rounded-lg" width={width} />;
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 last:border-b-0"
        >
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton variant="circular" className="h-10 w-10" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SkeletonCard className="h-80" />
        </div>
        <div>
          <SkeletonList items={4} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonFeedbackCard() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SkeletonAvatar />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export default Skeleton;

