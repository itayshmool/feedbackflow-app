// frontend/src/components/ui/ScrollableTable.tsx
// Wrapper for tables that adds scroll shadows on mobile

import { useRef, useState, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ScrollableTableProps {
  children: ReactNode
  className?: string
}

export function ScrollableTable({ children, className }: ScrollableTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftShadow, setShowLeftShadow] = useState(false)
  const [showRightShadow, setShowRightShadow] = useState(false)

  const checkScroll = () => {
    const el = scrollRef.current
    if (!el) return

    const hasHorizontalScroll = el.scrollWidth > el.clientWidth
    const scrolledFromLeft = el.scrollLeft > 0
    const scrolledToEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1

    setShowLeftShadow(hasHorizontalScroll && scrolledFromLeft)
    setShowRightShadow(hasHorizontalScroll && !scrolledToEnd)
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  return (
    <div className={cn('relative', className)}>
      {/* Left shadow */}
      <div 
        className={cn(
          'absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 transition-opacity',
          showLeftShadow ? 'opacity-100' : 'opacity-0'
        )}
      />
      
      {/* Right shadow */}
      <div 
        className={cn(
          'absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 transition-opacity',
          showRightShadow ? 'opacity-100' : 'opacity-0'
        )}
      />
      
      {/* Scroll hint for mobile */}
      {showRightShadow && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-20 md:hidden animate-pulse">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      )}
      
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="overflow-x-auto"
      >
        {children}
      </div>
    </div>
  )
}

export default ScrollableTable







