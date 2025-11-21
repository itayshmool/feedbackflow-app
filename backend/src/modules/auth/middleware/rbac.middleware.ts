// backend/src/modules/auth/middleware/rbac.middleware.ts

import { Request, Response, NextFunction } from 'express';

export function rbacMiddleware(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user from request (set by auth middleware)
      const user = (req as any).user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      // Check if user has any of the allowed roles
      const userRoles = user.roles || [];
      
      // Normalize roles to lowercase for comparison
      const normalizedUserRoles = userRoles.map((r: string) => r.toLowerCase());
      const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
      
      // Check if user has at least one of the required roles
      const hasPermission = normalizedAllowedRoles.some(role => 
        normalizedUserRoles.includes(role)
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: `Required roles: ${allowedRoles.join(', ')}`
        });
      }
      
      // User has permission, continue
      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed'
      });
    }
  };
}


