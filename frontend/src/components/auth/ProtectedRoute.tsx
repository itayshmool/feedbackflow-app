// frontend/src/components/auth/ProtectedRoute.tsx

import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const { isMaintenanceMode, isChecking: isCheckingMaintenance } = useMaintenanceMode()
  const location = useLocation()

  // Wait for auth check and maintenance check to complete
  if (isLoading || isCheckingMaintenance) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Simple auth check
  if (!isAuthenticated) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If authenticated but in maintenance mode, redirect to maintenance page
  if (isMaintenanceMode && location.pathname !== '/maintenance') {
    return <Navigate to="/maintenance" replace />
  }

  return <>{children}</>
}
