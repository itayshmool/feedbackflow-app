import { Router, Request, Response } from 'express';
import { requireSystemAdmin, isSystemAdmin } from '../../../shared/middleware/system-admin.middleware.js';
import { SecuritySettingsService } from '../services/security-settings.service.js';

const router = Router();

/**
 * Check if current user has system admin access
 * GET /api/v1/system/check-access
 */
router.get('/check-access', (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    if (!user || !user.email) {
      return res.json({
        success: true,
        data: { isSystemAdmin: false }
      });
    }

    const hasAccess = isSystemAdmin(user.email);
    
    res.json({
      success: true,
      data: { 
        isSystemAdmin: hasAccess,
        email: user.email
      }
    });
  } catch (error) {
    console.error('[System Admin] Error checking access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system admin access'
    });
  }
});

/**
 * Get current security settings
 * GET /api/v1/system/security-settings
 * Requires system admin access
 */
router.get('/security-settings', requireSystemAdmin(), async (req: Request, res: Response) => {
  try {
    const settings = await SecuritySettingsService.getSettings();
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('[System Admin] Error fetching security settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security settings'
    });
  }
});

/**
 * Update security settings
 * PUT /api/v1/system/security-settings
 * Requires system admin access
 */
router.put('/security-settings', requireSystemAdmin(), async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { settings, reason } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: 'Settings are required'
      });
    }

    // Validate settings structure
    if (!settings.maintenance || !settings.emailWhitelist || !settings.ipWhitelist) {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings structure. Must include maintenance, emailWhitelist, and ipWhitelist'
      });
    }

    const updatedSettings = await SecuritySettingsService.updateSettings(
      settings,
      user.email,
      reason
    );

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Security settings updated successfully'
    });
  } catch (error) {
    console.error('[System Admin] Error updating security settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update security settings'
    });
  }
});

/**
 * Get audit log for security settings changes
 * GET /api/v1/system/security-settings/audit
 * Requires system admin access
 */
router.get('/security-settings/audit', requireSystemAdmin(), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const auditLog = await SecuritySettingsService.getAuditLog(limit);
    
    res.json({
      success: true,
      data: auditLog
    });
  } catch (error) {
    console.error('[System Admin] Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log'
    });
  }
});

export default router;

