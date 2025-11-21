// frontend/src/pages/dashboard/DashboardPage.tsx

import { useAuthStore } from '@/stores/authStore'
import AdminDashboard from './AdminDashboard'
import ManagerDashboard from './ManagerDashboard'
import EmployeeDashboard from './EmployeeDashboard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DashboardPage() {
  const { user, isLoading } = useAuthStore()

  // Wait for user to be loaded
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Route to appropriate dashboard based on user role
  // ProtectedRoute already handles authentication checks
  if (user.roles?.includes('admin')) {
    return <AdminDashboard />
  }

  if (user.roles?.includes('manager')) {
    return <ManagerDashboard />
  }

  // Default to employee dashboard for regular employees
  return <EmployeeDashboard />
}
