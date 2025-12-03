// frontend/src/components/auth/AdminRouteGuard.tsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
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

  // Check admin role
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('super_admin');
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
