// frontend/src/components/layout/Header.tsx

import { useState } from 'react'
import { Menu, User, LogOut, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import Button from '@/components/ui/Button'
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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Mobile menu button */}
          <div className="flex items-center gap-3">
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
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">

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
                    className="h-8 w-8 rounded-full object-cover"
                    src={avatarUrl}
                    alt={user?.name || 'User'}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.name}
                </span>
              </Button>

              {/* User dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    
                    <a
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="mr-3 h-4 w-4" />
                      Profile
                    </a>
                    
                    <a
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="mr-3 h-4 w-4" />
                      Settings
                    </a>
                    
                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
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
