// frontend/src/components/auth/AdminRouteGuard.tsx

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface AdminRouteGuardProps {
  children: React.ReactNode;
}

export default function AdminRouteGuard({ children }: AdminRouteGuardProps) {
  const { user, isLoading, isAuthenticated, hasHydrated } = useAuthStore();

  // Debug logging
  console.log('AdminRouteGuard - State:', { user, isLoading, isAuthenticated, hasHydrated });

  // Wait for store to rehydrate from localStorage
  if (!hasHydrated || isLoading) {
    console.log('AdminRouteGuard - Waiting for hydration...');
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Now safe to check authentication
  if (!isAuthenticated) {
    console.log('AdminRouteGuard - Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Check admin role
  const isAdmin = user?.roles?.includes('admin') || user?.roles?.includes('super_admin');
  console.log('AdminRouteGuard - User roles:', user?.roles, 'Is admin:', isAdmin);

  // Redirect to dashboard if not admin
  if (!isAdmin) {
    console.log('AdminRouteGuard - Not admin, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  // Render admin content if user is admin
  console.log('AdminRouteGuard - Rendering admin content');
  return <>{children}</>;
}
