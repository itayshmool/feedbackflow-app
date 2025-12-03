import { Request, Response, NextFunction } from 'express';
import { TemplateSettingsService } from '../services/TemplateSettingsService.js';
import { query } from '../../../config/database.js';
import { z } from 'zod';

// Validation schemas
const templateSettingsUpdateSchema = z.object({
  maxFileSizeMB: z.number().int().min(1).max(100).optional(),
  allowedFileFormats: z.array(z.string()).min(1).optional(),
  virusScanningEnabled: z.boolean().optional(),
  storageProvider: z.enum(['local', 's3', 'azure', 'gcs']).optional(),
  autoDeleteAfterDays: z.number().int().min(1).max(3650).optional(),
  maxTemplatesPerOrganization: z.number().int().min(1).max(10000).optional(),
  allowPublicTemplates: z.boolean().optional(),
  requireApprovalForTemplates: z.boolean().optional(),
  defaultPermissions: z.object({
    roles: z.array(z.string()).min(1),
    departments: z.array(z.string()).optional(),
    cycles: z.array(z.string()).optional(),
  }).optional(),
  notificationSettings: z.object({
    notifyOnUpload: z.boolean(),
    notifyOnDownload: z.boolean(),
    notifyOnAttachment: z.boolean(),
    notifyOnApproval: z.boolean(),
  }).optional(),
  retentionPolicy: z.object({
    keepTemplatesForDays: z.number().int().min(1),
    keepAttachmentsForDays: z.number().int().min(1),
    keepAnalyticsForDays: z.number().int().min(1),
  }).optional(),
  securitySettings: z.object({
    requireVirusScan: z.boolean(),
    allowAnonymousDownloads: z.boolean(),
    requireAuthenticationForDownloads: z.boolean(),
    maxDownloadsPerUser: z.number().int().min(1),
  }).optional(),
});

export class TemplateSettingsController {
  /**
   * Get global template settings
   * GET /api/v1/templates/settings
   */
  static async getGlobalSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Check if user is admin
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Admin role required',
        });
      }

      const settings = await TemplateSettingsService.getGlobalSettings();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update global template settings
   * PUT /api/v1/templates/settings
   */
  static async updateGlobalSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Check if user is admin
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Admin role required',
        });
      }

      // Validate request body
      const validation = templateSettingsUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: (validation.error as any).errors,
        });
      }

      const settings = await TemplateSettingsService.updateGlobalSettings(validation.data as any);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization template settings
   * GET /api/v1/templates/settings/organization
   */
  static async getOrganizationSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
      // Get user ID and organization ID from database
      const userResult = await query(
        `SELECT 
          u.id,
          om.organization_id
         FROM users u
         JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
         WHERE u.email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const { organization_id: organizationId } = userResult.rows[0];

      const settings = await TemplateSettingsService.getOrganizationSettings(organizationId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization template settings
   * PUT /api/v1/templates/settings/organization
   */
  static async updateOrganizationSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Check if user is admin or manager
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
      const isManager = userRoles.includes('manager');
      
      if (!isAdmin && !isManager) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Admin or Manager role required',
        });
      }

      // Get user ID and organization ID from database
      const userResult = await query(
        `SELECT 
          u.id,
          om.organization_id
         FROM users u
         JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
         WHERE u.email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const { organization_id: organizationId } = userResult.rows[0];

      // Validate request body
      const validation = templateSettingsUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: (validation.error as any).errors,
        });
      }

      const settings = await TemplateSettingsService.updateOrganizationSettings(
        organizationId,
        validation.data as any
      );

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset settings to defaults
   * POST /api/v1/templates/settings/reset
   */
  static async resetSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Check if user is admin
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Admin role required',
        });
      }

      const { organizationId } = req.body;

      const settings = await TemplateSettingsService.resetToDefaults(organizationId);

      res.json({
        success: true,
        data: settings,
        message: 'Settings reset to defaults successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get storage configuration
   * GET /api/v1/templates/settings/storage
   */
  static async getStorageConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Check if user is admin
      const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Admin role required',
        });
      }

      const config = await TemplateSettingsService.getStorageConfig();

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get file validation rules
   * GET /api/v1/templates/settings/validation
   */
  static async getValidationRules(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
      // Get user ID and organization ID from database
      const userResult = await query(
        `SELECT 
          u.id,
          om.organization_id
         FROM users u
         JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
         WHERE u.email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const { organization_id: organizationId } = userResult.rows[0];

      const rules = await TemplateSettingsService.getFileValidationRules();

      res.json({
        success: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check upload permissions
   * GET /api/v1/templates/settings/permissions
   */
  static async checkUploadPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
      // Get user ID and organization ID from database
      const userResult = await query(
        `SELECT 
          u.id,
          om.organization_id
         FROM users u
         JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
         WHERE u.email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const { id: userId, organization_id: organizationId } = userResult.rows[0];

      const result = await TemplateSettingsService.canUserUploadTemplates(userId, organizationId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get settings summary
   * GET /api/v1/templates/settings/summary
   */
  static async getSettingsSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
      // Get user ID and organization ID from database
      const userResult = await query(
        `SELECT 
          u.id,
          om.organization_id
         FROM users u
         JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
         WHERE u.email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const { organization_id: organizationId } = userResult.rows[0];

      const summary = await TemplateSettingsService.getSettingsSummary(organizationId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notification settings
   * GET /api/v1/templates/settings/notifications
   */
  static async getNotificationSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
      // Get user ID and organization ID from database
      const userResult = await query(
        `SELECT 
          u.id,
          om.organization_id
         FROM users u
         JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
         WHERE u.email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const { organization_id: organizationId } = userResult.rows[0];

      const settings = await TemplateSettingsService.getNotificationSettings(organizationId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get retention policy
   * GET /api/v1/templates/settings/retention
   */
  static async getRetentionPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
      // Get user ID and organization ID from database
      const userResult = await query(
        `SELECT 
          u.id,
          om.organization_id
         FROM users u
         JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
         WHERE u.email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const { organization_id: organizationId } = userResult.rows[0];

      const policy = await TemplateSettingsService.getRetentionPolicy(organizationId);

      res.json({
        success: true,
        data: policy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get security settings
   * GET /api/v1/templates/settings/security
   */
  static async getSecuritySettings(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
      // Get user ID and organization ID from database
      const userResult = await query(
        `SELECT 
          u.id,
          om.organization_id
         FROM users u
         JOIN organization_members om ON u.id = om.user_id AND om.is_active = true
         WHERE u.email = $1`,
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const { organization_id: organizationId } = userResult.rows[0];

      const settings = await TemplateSettingsService.getSecuritySettings(organizationId);

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }
}




