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
  User,
  Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useHierarchyStore } from '@/stores/hierarchyStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { cn } from '@/lib/utils'
import { GrowthPulseLogoIcon } from '@/components/ui/GrowthPulseLogo'

// Section header component
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 pt-4 pb-2">
    <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.1em]">
      {children}
    </h3>
  </div>
)

// Divider component
const SectionDivider = () => (
  <div className="my-4 mx-3 border-t border-gray-200" />
)

// Navigation item type
interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
}

// Navigation item component
const NavItem = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
  const Icon = item.icon
  return (
    <NavLink
      to={item.href}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'group flex items-center px-3 py-2.5 text-sm rounded-md transition-all duration-150',
          isActive
            ? 'bg-blue-50 text-blue-700 font-semibold border-l-[3px] border-blue-600 ml-0 pl-[9px]'
            : 'text-gray-700 hover:bg-gray-50 border-l-[3px] border-transparent ml-0 pl-[9px]'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'mr-3 flex-shrink-0 h-5 w-5',
              isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
            )}
            aria-hidden="true"
          />
          <span className="flex-1">{item.name}</span>
          {item.badge !== undefined && item.badge !== 0 && (
            <span className={cn(
              'ml-2 px-2 py-0.5 text-xs font-medium rounded-full',
              isActive 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600'
            )}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

interface SidebarProps {
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const { user } = useAuthStore()
  const { directReports } = useHierarchyStore()
  const { stats } = useNotificationStore()
  
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('super_admin')
  const isSuperAdmin = user?.roles?.includes('super_admin') || user?.isSuperAdmin
  const isManager = user?.roles?.includes('manager')
  
  // Check if any direct reports are managers (Manager of Managers)
  const hasManagerReports = directReports.some(dr => dr.isManager)
  
  // Determine if user should see "MANAGEMENT" section header
  // Manager of Managers and Admins get the MANAGEMENT header
  const showManagementHeader = hasManagerReports || isAdmin

  // Handle nav link click - close mobile menu
  const handleNavClick = () => {
    if (onMobileClose) {
      onMobileClose()
    }
  }

  // Core navigation items (visible to all)
  const coreNavigation: NavItem[] = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ]
  
  // Add "My Team" for managers only (after Dashboard)
  if (isManager) {
    coreNavigation.push({ 
      name: 'My Team', 
      href: '/team', 
      icon: Users2,
      badge: directReports.length > 0 ? directReports.length : undefined
    })
  }
  
  // Feedback for everyone
  coreNavigation.push({ name: 'Feedback', href: '/feedback', icon: MessageSquare })
  
  // Manager's Feedback - only for manager of managers or admins
  if (hasManagerReports || isAdmin) {
    coreNavigation.push({ name: "Manager's Feedback", href: '/team-feedback', icon: Users2 })
  }
  
  // Growth Quotes - for employees only (managers see it in Personal section)
  if (!isManager) {
    coreNavigation.push({ name: 'Growth Quotes', href: '/quotes', icon: Sparkles })
  }
  
  // Notifications always at end of core/management section
  coreNavigation.push({ 
    name: 'Notifications', 
    href: '/notifications', 
    icon: Bell, 
    badge: stats?.unread && stats.unread > 0 ? stats.unread : undefined 
  })

  // Personal section (managers only)
  const personalNavigation: NavItem[] = [
    { name: 'Myself', href: '/myself', icon: User },
    { name: 'Growth Quotes', href: '/quotes', icon: Sparkles },
  ]

  // Resources section
  const resourcesNavigation: NavItem[] = [
    { name: 'Templates', href: '/templates', icon: FileText },
  ]

  // Admin navigation
  const adminNavigation: NavItem[] = [
    { name: 'Admin Dashboard', href: '/admin', icon: Settings },
    ...(isSuperAdmin ? [{ name: 'Organizations', href: '/admin/organizations', icon: Building }] : []),
    { name: 'Cycles', href: '/cycles', icon: RotateCcw },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Hierarchy', href: '/admin/hierarchy', icon: TreePine },
    { name: 'Template Management', href: '/admin/templates', icon: FileText },
  ]

  const sidebarContent = (
    <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto">
      {/* Logo Header */}
      <div className="flex items-center justify-between flex-shrink-0 px-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <GrowthPulseLogoIcon size={36} />
          </div>
          <div className="ml-2">
            <h1 className="text-base font-bold text-gray-800 tracking-tight">
              GROWTH<span className="font-normal text-gray-500">PULSE</span>
            </h1>
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
      
      <div className="mt-6 flex-grow flex flex-col">
        <nav className="flex-1 px-2 space-y-1">
          
          {/* MANAGEMENT Section (for Manager of Managers & Admins) or Core items (for regular managers) */}
          {showManagementHeader && <SectionHeader>Management</SectionHeader>}
          
          {coreNavigation.map((item) => (
            <NavItem key={item.name} item={item} onClick={handleNavClick} />
          ))}
          
          {/* PERSONAL Section - for managers */}
          {isManager && (
            <>
              <SectionDivider />
              <SectionHeader>Personal</SectionHeader>
              {personalNavigation.map((item) => (
                <NavItem key={item.name} item={item} onClick={handleNavClick} />
              ))}
            </>
          )}
          
          {/* RESOURCES Section - for managers */}
          {isManager && (
            <>
              <SectionDivider />
              <SectionHeader>Resources</SectionHeader>
              {resourcesNavigation.map((item) => (
                <NavItem key={item.name} item={item} onClick={handleNavClick} />
              ))}
            </>
          )}
          
          {/* ADMINISTRATION Section - for admins only */}
          {isAdmin && (
            <>
              <SectionDivider />
              <SectionHeader>Administration</SectionHeader>
              {adminNavigation.map((item) => (
                <NavItem key={item.name} item={item} onClick={handleNavClick} />
              ))}
            </>
          )}
        </nav>
      </div>
      
      {/* User info */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {user?.picture ? (
              <img
                className="h-10 w-10 rounded-full"
                src={user.picture}
                alt={user.name}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="ml-3 min-w-0 flex-1">
            {isAdmin && (
              <p className="text-xs font-medium text-blue-600 mb-0.5">Admin</p>
            )}
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
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
