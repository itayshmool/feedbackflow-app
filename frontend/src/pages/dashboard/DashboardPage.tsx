// frontend/src/pages/dashboard/DashboardPage.tsx

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import AdminDashboard from './AdminDashboard'
import ManagerDashboard from './ManagerDashboard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    console.log('DashboardPage - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'user:', user)
    if (!isLoading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) {
    console.log('DashboardPage - showing loading spinner')
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('DashboardPage - not authenticated, returning null')
    return null
  }

  console.log('DashboardPage - user roles:', user?.roles)
  
  // Route to appropriate dashboard based on user role
  if (user?.roles?.includes('admin')) {
    console.log('DashboardPage - rendering AdminDashboard')
    return <AdminDashboard />
  }

  console.log('DashboardPage - rendering ManagerDashboard')
  return <ManagerDashboard />
}
