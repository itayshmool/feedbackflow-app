// frontend/src/components/auth/SuperAdminRouteGuard.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface SuperAdminRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that only allows super_admin users.
 * Used for cross-organization features like organization management.
 */
export default function SuperAdminRouteGuard({ children }: SuperAdminRouteGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuthStore();
  
  // Use Zustand's built-in hydration check
  const hasHydrated = (useAuthStore as any).persist?.hasHydrated?.() ?? true;

  // Wait for hydration
  if (!hasHydrated || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check super_admin role specifically
  const isSuperAdmin = user?.roles?.includes('super_admin') || user?.isSuperAdmin;
  
  if (!isSuperAdmin) {
    // Redirect org-scoped admins to admin dashboard
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

