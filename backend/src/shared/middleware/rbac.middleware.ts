import { Request, Response, NextFunction } from 'express';

// Extended request interface with organization context
export interface OrgScopedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    organizationId?: string; // The user's organization (from membership)
    adminOrganizationId?: string | null; // The org this admin is scoped to (null for super_admin)
  };
  // Effective organization ID for the current request
  // For super_admin: can be overridden via query param
  // For org-scoped admin: always their assigned org
  effectiveOrganizationId?: string | null;
  // Whether the user has cross-org access (super_admin)
  isSuperAdmin?: boolean;
}

/**
 * Basic role-based access control middleware
 * Checks if user has any of the allowed roles
 */
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRoles = user.roles || [];
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Organization-scoped admin middleware
 * 
 * - super_admin: Has access to all organizations, can optionally filter by org
 * - admin: Only has access to their assigned organization
 * 
 * This middleware:
 * 1. Checks if user is admin or super_admin
 * 2. Sets effectiveOrganizationId on the request
 * 3. Sets isSuperAdmin flag for downstream use
 */
export function requireOrgScopedAdmin() {
  return (req: OrgScopedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const userRoles = user.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');
    const isOrgAdmin = userRoles.includes('admin');

    // Must be either super_admin or admin
    if (!isSuperAdmin && !isOrgAdmin) {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required',
        message: 'You must be an admin or super_admin to access this resource'
      });
    }

    // Set the super admin flag
    req.isSuperAdmin = isSuperAdmin;

    if (isSuperAdmin) {
      // Super admin can access any org
      // Allow them to optionally filter by org via query param
      const requestedOrgId = req.query.organizationId as string | undefined;
      req.effectiveOrganizationId = requestedOrgId || null; // null means all orgs
    } else {
      // Org-scoped admin must have an assigned organization
      const adminOrgId = user.adminOrganizationId;
      
      if (!adminOrgId) {
        return res.status(403).json({ 
          success: false,
          error: 'Organization assignment required',
          message: 'Your admin account is not assigned to any organization. Please contact a super administrator.'
        });
      }

      // Check if trying to access a different org than assigned
      const requestedOrgId = req.query.organizationId as string | undefined;
      if (requestedOrgId && requestedOrgId !== adminOrgId) {
        return res.status(403).json({ 
          success: false,
          error: 'Organization access denied',
          message: 'You do not have permission to access this organization'
        });
      }

      // Set the effective org to admin's assigned org
      req.effectiveOrganizationId = adminOrgId;
    }

    next();
  };
}

/**
 * Middleware to check if user can access a specific organization
 * Use this for routes that operate on a specific org (e.g., /orgs/:orgId/...)
 */
export function requireOrgAccess() {
  return (req: OrgScopedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    const targetOrgId = req.params.orgId || req.params.organizationId;

    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const userRoles = user.roles || [];
    const isSuperAdmin = userRoles.includes('super_admin');

    // Super admin can access any org
    if (isSuperAdmin) {
      req.isSuperAdmin = true;
      req.effectiveOrganizationId = targetOrgId || null;
      return next();
    }

    // Org-scoped admin can only access their assigned org
    const isOrgAdmin = userRoles.includes('admin');
    if (isOrgAdmin) {
      const adminOrgId = user.adminOrganizationId;
      
      if (!adminOrgId) {
        return res.status(403).json({ 
          success: false,
          error: 'Organization assignment required',
          message: 'Your admin account is not assigned to any organization'
        });
      }

      if (targetOrgId && targetOrgId !== adminOrgId) {
        return res.status(403).json({ 
          success: false,
          error: 'Organization access denied',
          message: 'You do not have permission to access this organization'
        });
      }

      req.isSuperAdmin = false;
      req.effectiveOrganizationId = adminOrgId;
      return next();
    }

    // Non-admin users - check if they belong to the org via membership
    // This handles managers/employees accessing their own org data
    const userOrgId = user.organizationId || user.adminOrganizationId;
    
    if (!userOrgId) {
      return res.status(403).json({ 
        success: false,
        error: 'Organization membership required',
        message: 'You are not assigned to any organization'
      });
    }
    
    if (targetOrgId && userOrgId === targetOrgId) {
      req.effectiveOrganizationId = targetOrgId;
      return next();
    }

    return res.status(403).json({ 
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to access this organization'
    });
  };
}

/**
 * Helper function to check if a user can perform admin actions on an organization
 */
export function canAdminOrganization(user: OrgScopedRequest['user'], targetOrgId: string): boolean {
  if (!user) return false;
  
  const userRoles = user.roles || [];
  
  // Super admin can admin any org
  if (userRoles.includes('super_admin')) {
    return true;
  }
  
  // Org-scoped admin can only admin their assigned org
  if (userRoles.includes('admin')) {
    return user.adminOrganizationId === targetOrgId;
  }
  
  return false;
}
