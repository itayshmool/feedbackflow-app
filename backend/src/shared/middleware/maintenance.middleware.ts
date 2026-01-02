// backend/src/shared/middleware/maintenance.middleware.ts

import { Request, Response, NextFunction } from 'express';
import { settingsCache } from '../utils/settings-cache.js';

/**
 * Maintenance Mode Middleware
 * 
 * NEW: Reads from database (via Security Settings)
 * Fallback: MAINTENANCE_MODE environment variable
 * 
 * When enabled, blocks all API requests except:
 * - Authentication endpoints (login, logout, token refresh)
 * - Health check endpoint
 * - Maintenance status endpoint
 * - System admin endpoints (for managing settings)
 * - Whitelisted users (if specified in settings)
 * 
 * Returns 503 Service Unavailable for blocked requests.
 */
export const checkMaintenanceMode = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get settings from cache (avoids DB query on every request)
    const settings = await settingsCache.getSettings();
    const { maintenance } = settings;

    // If maintenance mode is disabled, proceed
    if (!maintenance.enabled) {
      return next();
    }

    // Skip maintenance check for these endpoints
    const allowedPaths = [
      '/api/v1/auth',           // All auth endpoints (login, logout, refresh, etc.)
      '/api/v1/health',         // Health check
      '/api/v1/maintenance-status', // Maintenance status check
      '/health',                // Alternative health check path
      '/api/v1/system',         // System admin endpoints (to manage settings)
    ];
    
    const isAllowedPath = allowedPaths.some(path => req.path.startsWith(path));
    
    if (isAllowedPath) {
      return next();
    }

    // Check if user is in allowed list (bypass maintenance)
    const reqUser = (req as any).user;
    if (reqUser && reqUser.email && maintenance.allowedUsers.length > 0) {
      const normalizedEmail = reqUser.email.toLowerCase().trim();
      const isAllowedUser = maintenance.allowedUsers
        .map(email => email.toLowerCase().trim())
        .includes(normalizedEmail);
      
      if (isAllowedUser) {
        console.log(`✅ Maintenance bypass for whitelisted user: ${reqUser.email}`);
        return next();
      }
    }

    // Block request - maintenance mode active
    console.warn(`🚧 Maintenance mode: Blocking ${req.method} ${req.path}`);
    
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable - system maintenance in progress',
      maintenance: true,
      message: maintenance.message || 'We are currently performing system maintenance to improve security and performance. Please check back soon.'
    });
    return;
  } catch (error) {
    console.error('[Maintenance Mode] Error checking settings:', error);
    // On error, allow request (fail open for safety)
    console.warn('[Maintenance Mode] Allowing request due to error (fail-open)');
    return next();
  }
};

