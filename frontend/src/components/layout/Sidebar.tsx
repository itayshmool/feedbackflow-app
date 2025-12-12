// frontend/src/components/layout/Sidebar.tsx

import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  RotateCcw, 
  MessageSquare, 
  Settings, 
  Users,
  Bell,
  Building,
  TreePine,
  Users2,
  FileText,
  X,
  User
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useHierarchyStore } from '@/stores/hierarchyStore'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  { name: 'Notifications', href: '/notifications', icon: Bell },
]

const managerNavigation = [
  { name: 'Myself', href: '/myself', icon: User },
  { name: "Team's Given Feedback", href: '/team-feedback', icon: Users2 },
  { name: 'Templates', href: '/templates', icon: FileText },
]

// Base admin navigation (visible to all admins)
const baseAdminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: Settings },
  { name: 'Cycles', href: '/cycles', icon: RotateCcw },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Hierarchy', href: '/admin/hierarchy', icon: TreePine },
  { name: 'Templates', href: '/admin/templates', icon: FileText },
]

// Super admin only navigation (cross-org features)
const superAdminNavigation = [
  { name: 'Organizations', href: '/admin/organizations', icon: Building },
]

interface SidebarProps {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const { user } = useAuthStore()
  const { directReports } = useHierarchyStore()
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('super_admin')
  const isSuperAdmin = user?.roles?.includes('super_admin') || user?.isSuperAdmin
  const isManager = user?.roles?.includes('manager')
  
  // Check if any direct reports are managers (needed for Team Feedback tab)
  const hasManagerReports = directReports.some(dr => dr.isManager)
  
  // Build admin navigation based on role
  // Super admin sees all items, org-scoped admin sees only their org's items
  const adminNavigation = isSuperAdmin 
    ? [baseAdminNavigation[0], ...superAdminNavigation, ...baseAdminNavigation.slice(1)]
    : baseAdminNavigation

  // Handle nav link click - close mobile menu
  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  const sidebarContent = (
    <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto">
      <div className="flex items-center justify-between flex-shrink-0 px-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">FF</span>
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">FeedbackFlow</h1>
          </div>
        </div>
        {/* Close button - mobile only */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      <div className="mt-8 flex-grow flex flex-col">
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )
                }
              >
                <Icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5',
                    'text-gray-400 group-hover:text-gray-500'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            )
          })}
          
          {isManager && (
            <>
              <div className="border-t border-gray-200 my-4"></div>
              {managerNavigation
                // Only show "Team Feedback" if user has managers reporting to them
                .filter(item => item.href !== '/team-feedback' || hasManagerReports)
                .map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    <Icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        'text-gray-400 group-hover:text-gray-500'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </NavLink>
                )
              })}
            </>
          )}
          
          {isAdmin && (
            <>
              <div className="border-t border-gray-200 my-4"></div>
              <div className="px-2">
                <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </h3>
              </div>
              {adminNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors',
                        isActive
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )
                    }
                  >
                    <Icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        'text-gray-400 group-hover:text-gray-500'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </NavLink>
                )
              })}
            </>
          )}
        </nav>
      </div>
      
      {/* User info */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {user?.picture ? (
              <img
                className="h-8 w-8 rounded-full"
                src={user.picture}
                alt={user.name}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar - always visible on md+ */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200">
        {sidebarContent}
      </div>
      
      {/* Desktop spacer - pushes content to the right */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0" />

      {/* Mobile Sidebar - slide-out drawer */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 md:hidden transition-opacity"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden shadow-xl transform transition-transform duration-300 ease-in-out">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
