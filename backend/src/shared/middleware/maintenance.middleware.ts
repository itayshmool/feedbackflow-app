// backend/src/shared/middleware/maintenance.middleware.ts

import { Request, Response, NextFunction } from 'express';

/**
 * Maintenance Mode Middleware
 * 
 * When MAINTENANCE_MODE=true, blocks all API requests except:
 * - Authentication endpoints (login, logout, token refresh)
 * - Health check endpoint
 * - Maintenance status endpoint
 * 
 * Returns 503 Service Unavailable for blocked requests.
 */
export const checkMaintenanceMode = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  
  // Skip maintenance check for these endpoints
  const allowedPaths = [
    '/api/v1/auth',           // All auth endpoints (login, logout, refresh, etc.)
    '/api/v1/health',         // Health check
    '/api/v1/maintenance-status', // Maintenance status check
    '/health',                // Alternative health check path
  ];
  
  const isAllowedPath = allowedPaths.some(path => req.path.startsWith(path));
  
  if (isMaintenanceMode && !isAllowedPath) {
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable - system maintenance in progress',
      maintenance: true,
      message: 'We are currently performing system maintenance to improve security and performance. Please check back soon.'
    });
    return;
  }
  
  next();
};

