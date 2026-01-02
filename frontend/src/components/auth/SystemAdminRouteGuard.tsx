import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { systemAdminService } from '../../services/system-admin.service';
import { Loader2 } from 'lucide-react';

interface SystemAdminRouteGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard that ensures only system administrators can access protected routes
 * System admins are defined in SYSTEM_ADMINS environment variable on the backend
 */
const SystemAdminRouteGuard: React.FC<SystemAdminRouteGuardProps> = ({ children }) => {
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const hasAccess = await systemAdminService.checkAccess();
      setIsSystemAdmin(hasAccess);
    } catch (error) {
      console.error('[System Admin Guard] Error checking access:', error);
      setIsSystemAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying system admin access...</p>
        </div>
      </div>
    );
  }

  if (!isSystemAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default SystemAdminRouteGuard;

