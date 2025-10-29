// frontend/src/components/layout/Sidebar.tsx

import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  RotateCcw, 
  MessageSquare, 
  Settings, 
  Users,
  Bell,
  Zap,
  Building,
  TreePine,
  Users2,
  FileText
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Cycles', href: '/cycles', icon: RotateCcw },
  { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Integrations', href: '/integrations', icon: Zap },
]

const managerNavigation = [
  { name: 'Team Feedback', href: '/team-feedback', icon: Users2 },
]

const adminNavigation = [
  { name: 'Admin Dashboard', href: '/admin', icon: Settings },
  { name: 'Organizations', href: '/admin/organizations', icon: Building },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Hierarchy', href: '/admin/hierarchy', icon: TreePine },
  { name: 'Templates', href: '/admin/templates', icon: FileText },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('super_admin')
  const isManager = user?.roles?.includes('manager')

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
        <div className="flex items-center flex-shrink-0 px-4">
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
        </div>
        
        <div className="mt-8 flex-grow flex flex-col">
          <nav className="flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
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
                <div className="px-2">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Management
                  </h3>
                </div>
                {managerNavigation.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
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
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
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
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
