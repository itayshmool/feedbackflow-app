// frontend/src/components/layout/Header.tsx

import { useState } from 'react'
import { Search, Menu, User, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
// import { cn } from '@/lib/utils'

interface HeaderProps {
  onMenuToggle?: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuthStore()
  const { profile } = useProfileStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  // Use avatar from profile store if available, fall back to auth store picture
  const avatarUrl = profile?.avatarUrl || user?.picture

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Mobile menu button + Search */}
          <div className="flex items-center gap-3 flex-1">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2 -ml-2"
              onClick={onMenuToggle}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            {/* Search - hidden on small mobile, visible on larger screens */}
            <div className="hidden sm:block flex-1 max-w-lg">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 w-full"
                />
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">

            {/* Theme Toggle */}
            <ThemeToggle size="sm" />

            {/* Notifications */}
            <NotificationBell />

            {/* User menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2"
              >
                {avatarUrl ? (
                  <img
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                    src={avatarUrl}
                    alt={user?.name || 'User'}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {user?.name}
                </span>
              </Button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-fade-in-down">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                    
                    <a
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="mr-3 h-4 w-4" />
                      Profile
                    </a>
                    
                    <a
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </a>
                    
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
