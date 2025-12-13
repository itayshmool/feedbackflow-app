// frontend/src/components/layout/Layout.tsx

import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileBottomNav from './MobileBottomNav'
import { useAuthStore } from '@/stores/authStore'
import { useHierarchyStore } from '@/stores/hierarchyStore'

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuthStore()
  const { fetchDirectReports, directReports } = useHierarchyStore()
  
  const isManager = user?.roles?.includes('manager')

  // Fetch direct reports early for sidebar navigation (conditional Team Feedback tab)
  useEffect(() => {
    if (user?.id && isManager && directReports.length === 0) {
      fetchDirectReports(user.id)
    }
  }, [user?.id, isManager, fetchDirectReports, directReports.length])

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar - Desktop (always visible) + Mobile (drawer for advanced options) */}
        <Sidebar 
          isMobileOpen={isMobileMenuOpen} 
          onMobileClose={closeMobileMenu} 
        />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuToggle={toggleMobileMenu} />
          {/* Added pb-20 on mobile for bottom nav clearance, md:pb-6 preserves desktop */}
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation - only visible on mobile (md:hidden inside component) */}
      <MobileBottomNav />
    </div>
  )
}
