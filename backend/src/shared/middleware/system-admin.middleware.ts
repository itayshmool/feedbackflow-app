import { Request, Response, NextFunction } from 'express';

/**
 * Extended request interface for system admin checks
 */
export interface SystemAdminRequest extends Request {
  isSystemAdmin?: boolean;
}

/**
 * Middleware to require system administrator access
 * System admins are defined via SYSTEM_ADMINS environment variable (comma-separated emails)
 * 
 * @returns Express middleware function
 */
export function requireSystemAdmin() {
  return (req: SystemAdminRequest, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user || !user.email) {
      console.warn('[System Admin] Authentication required - no user in request');
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const systemAdminsEnv = process.env.SYSTEM_ADMINS || '';
    
    if (!systemAdminsEnv.trim()) {
      console.warn('[System Admin] SYSTEM_ADMINS environment variable is not set');
      return res.status(403).json({ 
        success: false,
        error: 'System admin access not configured',
        code: 'SYSTEM_ADMIN_NOT_CONFIGURED'
      });
    }

    const systemAdmins = systemAdminsEnv
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);

    const userEmail = user.email.toLowerCase();
    const isSystemAdmin = systemAdmins.includes(userEmail);

    if (!isSystemAdmin) {
      console.log(`[System Admin] Access denied for ${user.email}`);
      return res.status(403).json({ 
        success: false,
        error: 'System administrator access required',
        message: 'You must be a system administrator to access this resource',
        code: 'SYSTEM_ADMIN_REQUIRED'
      });
    }

    req.isSystemAdmin = true;
    console.log(`[System Admin] Access granted for ${user.email}`);
    next();
  };
}

/**
 * Helper function to check if an email is a system administrator
 * 
 * @param email - Email address to check
 * @returns True if the email is in the SYSTEM_ADMINS list
 */
export function isSystemAdmin(email: string): boolean {
  if (!email) return false;
  
  const systemAdminsEnv = process.env.SYSTEM_ADMINS || '';
  const systemAdmins = systemAdminsEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 0);
  
  return systemAdmins.includes(email.toLowerCase());
}

