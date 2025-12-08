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
  X
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cycles', href: '/cycles', icon: RotateCcw },
  { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  { name: 'Notifications', href: '/notifications', icon: Bell },
]

const managerNavigation = [
  { name: 'Team Feedback', href: '/team-feedback', icon: Users2 },
  { name: 'Templates', href: '/templates', icon: FileText },
]

// Base admin navigation (visible to all admins)
const baseAdminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: Settings },
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
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('super_admin')
  const isSuperAdmin = user?.roles?.includes('super_admin') || user?.isSuperAdmin
  const isManager = user?.roles?.includes('manager')
  
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
    <div className="flex flex-col flex-grow pt-5 bg-white dark:bg-gray-900 overflow-y-auto transition-colors duration-200">
      <div className="flex items-center justify-between flex-shrink-0 px-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">FF</span>
            </div>
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FeedbackFlow</h1>
          </div>
        </div>
        {/* Close button - mobile only */}
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
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
                    'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  )
                }
              >
                <Icon
                  className={cn(
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors',
                    'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </NavLink>
            )
          })}
          
          {isManager && (
            <>
              <div className="border-t border-gray-200 dark:border-gray-800 my-4"></div>
              <div className="px-2">
                <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Management
                </h3>
              </div>
              {managerNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      )
                    }
                  >
                    <Icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5 transition-colors',
                        'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300'
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
              <div className="border-t border-gray-200 dark:border-gray-800 my-4"></div>
              <div className="px-2">
                <h3 className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
                        'group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                      )
                    }
                  >
                    <Icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5 transition-colors',
                        'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300'
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
      <div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {user?.picture ? (
              <img
                className="h-8 w-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                src={user.picture}
                alt={user.name}
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar - always visible on md+ */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-gray-200 dark:border-gray-800 transition-colors duration-200">
        {sidebarContent}
      </div>
      
      {/* Desktop spacer - pushes content to the right */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0" />

      {/* Mobile Sidebar - slide-out drawer */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-gray-900/50 dark:bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity animate-fade-in"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          
          {/* Drawer */}
          <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 z-50 md:hidden shadow-xl transform transition-transform duration-300 ease-in-out animate-slide-in-right">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  )
}
