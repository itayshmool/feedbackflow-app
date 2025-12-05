// frontend/src/components/layout/Layout.tsx

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen)
  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar - Desktop (always visible) + Mobile (drawer) */}
        <Sidebar 
          isMobileOpen={isMobileMenuOpen} 
          onMobileClose={closeMobileMenu} 
        />
        
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuToggle={toggleMobileMenu} />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
