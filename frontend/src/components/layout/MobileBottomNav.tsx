// frontend/src/components/layout/MobileBottomNav.tsx
// Mobile Bottom Navigation - 5 core items + More drawer
// Only visible on mobile (md:hidden), does not affect desktop

import { NavLink, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users,
  Settings,
  MoreHorizontal,
  Bell,
  RotateCcw,
  FileText,
  TreePine,
  Building,
  User as UserIcon,
  X
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useHierarchyStore } from '@/stores/hierarchyStore'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export default function MobileBottomNav() {
  const { user } = useAuthStore()
  const { stats } = useNotificationStore()
  const { directReports } = useHierarchyStore()
  const [showMore, setShowMore] = useState(false)
  const location = useLocation()
  
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('super_admin')
  const isSuperAdmin = user?.roles?.includes('super_admin') || user?.isSuperAdmin
  const isManager = user?.roles?.includes('manager')
  const hasManagerReports = directReports.some(dr => dr.isManager)
  
  // Close "More" drawer when navigating
  useEffect(() => {
    setShowMore(false)
  }, [location.pathname])
  
  // Core navigation (always visible in bottom bar)
  const coreNav: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  ]
  
  // Add Team Feedback for managers of managers or admins
  if (hasManagerReports || isAdmin) {
    coreNav.push({ name: 'Team', href: '/team-feedback', icon: Users })
  }
  
  // Add Notifications with badge
  coreNav.push({ 
    name: 'Alerts', 
    href: '/notifications', 
    icon: Bell,
    badge: stats?.unread && stats.unread > 0 ? stats.unread : undefined
  })
  
  // Secondary navigation (shown in "More" drawer)
  const moreNav: NavItem[] = []
  
  // Personal section items
  if (isManager) {
    moreNav.push({ name: 'Myself', href: '/myself', icon: UserIcon })
    moreNav.push({ name: 'Templates', href: '/templates', icon: FileText })
  }
  
  // Admin section items
  if (isAdmin) {
    moreNav.push({ name: 'Admin', href: '/admin', icon: Settings })
    moreNav.push({ name: 'Cycles', href: '/cycles', icon: RotateCcw })
    moreNav.push({ name: 'Users', href: '/admin/users', icon: Users })
    moreNav.push({ name: 'Hierarchy', href: '/admin/hierarchy', icon: TreePine })
    moreNav.push({ name: 'Template Mgmt', href: '/admin/templates', icon: FileText })
  }
  
  // Super admin items
  if (isSuperAdmin) {
    moreNav.push({ name: 'Organizations', href: '/admin/organizations', icon: Building })
  }

  // Check if any "more" items are active
  const isMoreActive = moreNav.some(item => location.pathname.startsWith(item.href))

  // Check if a nav item is active
  const isNavActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <>
      {/* More Drawer Overlay - only on mobile */}
      {showMore && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={() => setShowMore(false)}
        />
      )}
      
      {/* More Drawer - Full screen on mobile */}
      <div className={cn(
        "fixed inset-x-0 bottom-[72px] mx-3 bg-white rounded-2xl shadow-2xl z-50 md:hidden",
        "transform transition-all duration-300 ease-out",
        "border border-gray-200",
        showMore 
          ? "translate-y-0 opacity-100" 
          : "translate-y-4 opacity-0 pointer-events-none"
      )}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">More Options</span>
          <button 
            onClick={() => setShowMore(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {/* Drawer Content */}
        <div className="p-3 max-h-[50vh] overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            {moreNav.map((item) => {
              const Icon = item.icon
              const isActive = isNavActive(item.href)
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl transition-all",
                    "min-h-[72px] active:scale-95",
                    isActive 
                      ? "bg-primary-50 text-primary-600" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className={cn("h-6 w-6 mb-1.5", isActive && "stroke-[2.5px]")} />
                  <span className="text-xs font-medium text-center leading-tight">{item.name}</span>
                </NavLink>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation Bar - only on mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
        {/* Safe area padding for devices with home indicator */}
        <div className="flex items-center justify-around h-[72px] px-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {coreNav.map((item) => {
            const Icon = item.icon
            const isActive = isNavActive(item.href)
            return (
              <NavLink
                key={item.href}
                to={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 px-1",
                  "min-h-[56px] rounded-xl transition-colors active:scale-95",
                  isActive 
                    ? "text-primary-600" 
                    : "text-gray-500"
                )}
              >
                <div className="relative">
                  <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-1 font-medium",
                  isActive && "font-semibold"
                )}>{item.name}</span>
              </NavLink>
            )
          })}
          
          {/* More Button - only show if there are more items */}
          {moreNav.length > 0 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1",
                "min-h-[56px] rounded-xl transition-colors active:scale-95",
                (showMore || isMoreActive) ? "text-primary-600" : "text-gray-500"
              )}
            >
              <MoreHorizontal className={cn("h-6 w-6", (showMore || isMoreActive) && "stroke-[2.5px]")} />
              <span className={cn(
                "text-[10px] mt-1 font-medium",
                (showMore || isMoreActive) && "font-semibold"
              )}>More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}

