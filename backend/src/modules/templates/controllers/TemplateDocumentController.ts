import { Request, Response, NextFunction } from 'express';
import { TemplateDocumentService } from '../services/TemplateDocumentService.js';
import { TemplateAnalyticsService } from '../services/TemplateAnalyticsService.js';
import { FileValidator } from '../../../shared/utils/file-validator.js';
import { query } from '../../../config/database.js';
import { z } from 'zod';

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  templateType: z.enum(['manager', 'peer', 'self', 'project', '360']),
  tags: z.array(z.string()).optional(),
  permissions: z.object({
    roles: z.array(z.string()),
    departments: z.array(z.string()),
    cycles: z.array(z.string()),
  }).optional(),
  availabilityRules: z.object({
    restrictToCycles: z.boolean(),
    restrictToDepartments: z.boolean(),
    restrictToRoles: z.boolean(),
  }).optional(),
  isDefault: z.boolean().optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  templateType: z.enum(['manager', 'peer', 'self', 'project', '360']).optional(),
  tags: z.array(z.string()).optional(),
  permissions: z.object({
    roles: z.array(z.string()),
    departments: z.array(z.string()),
    cycles: z.array(z.string()),
  }).optional(),
  availabilityRules: z.object({
    restrictToCycles: z.boolean(),
    restrictToDepartments: z.boolean(),
    restrictToRoles: z.boolean(),
  }).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

const templateFiltersSchema = z.object({
  templateType: z.enum(['manager', 'peer', 'self', 'project', '360']).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  fileFormat: z.enum(['.docx', '.pdf', '.doc']).optional(),
  tags: z.array(z.string()).optional(),
  search: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'downloadCount']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const duplicateTemplateSchema = z.object({
  newName: z.string().min(1).max(255),
});

export class TemplateDocumentController {
  /**
   * Upload new template document
   * POST /api/v1/templates
   */
  static async uploadTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      // Validate request body
      const validation = createTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: (validation.error as any).errors,
        });
      }

      const metadata = validation.data;
      
      // Get organization ID from user
      const orgResult = await query(
        'SELECT organization_id FROM organization_members WHERE user_id = $1 AND is_active = true',
        [userId]
      );
      
      if (orgResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'User not associated with any organization',
        });
      }
      
      const organizationId = orgResult.rows[0].organization_id;

      const result = await TemplateDocumentService.uploadTemplate(
        file,
        {
          ...metadata,
          organizationId,
          createdBy: userId,
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List template documents
   * GET /api/v1/templates
   */
  static async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      // Get organization ID from user
      const orgResult = await query(
        'SELECT organization_id FROM organization_members WHERE user_id = $1 AND is_active = true',
        [userId]
      );
      
      if (orgResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'User not associated with any organization',
        });
      }
      
      const organizationId = orgResult.rows[0].organization_id;

      // Validate query parameters
      const validation = templateFiltersSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: (validation.error as any).errors,
        });
      }

      const filters = {
        organizationId,
        ...validation.data,
      };

      const result = await TemplateDocumentService.listTemplates(filters, userId, userRoles);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template document by ID
   * GET /api/v1/templates/:id
   */
  static async getTemplateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      const template = await TemplateDocumentService.getTemplateById(id, userId, userRoles);

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template document not found',
        });
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update template document metadata
   * PUT /api/v1/templates/:id
   */
  static async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      // Validate request body
      const validation = updateTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: (validation.error as any).errors,
        });
      }

      const template = await TemplateDocumentService.updateTemplate(
        id,
        validation.data,
        userId,
        userRoles
      );

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete template document
   * DELETE /api/v1/templates/:id
   */
  static async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      await TemplateDocumentService.deleteTemplate(id, userId, userRoles);

      res.json({
        success: true,
        message: 'Template document deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Duplicate template document
   * POST /api/v1/templates/:id/duplicate
   */
  static async duplicateTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      // Validate request body
      const validation = duplicateTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: (validation.error as any).errors,
        });
      }

      const result = await TemplateDocumentService.duplicateTemplate(
        id,
        validation.data.newName,
        userId,
        userRoles
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Replace template file
   * PUT /api/v1/templates/:id/file
   */
  static async replaceTemplateFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      const template = await TemplateDocumentService.replaceTemplateFile(
        id,
        file,
        userId,
        userRoles
      );

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download template file
   * GET /api/v1/templates/:id/download
   */
  static async downloadTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      const result = await TemplateDocumentService.downloadTemplate(id, userId, userRoles);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.fileBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template usage statistics
   * GET /api/v1/templates/:id/analytics
   */
  static async getTemplateStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      const stats = await TemplateDocumentService.getTemplateStats(id, userId, userRoles);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Archive template document
   * POST /api/v1/templates/:id/archive
   */
  static async archiveTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      await TemplateDocumentService.archiveTemplate(id, userId, userRoles);

      res.json({
        success: true,
        message: 'Template document archived successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get overall template analytics
   * GET /api/v1/templates/analytics
   */
  static async getOverallAnalytics(req: Request, res: Response, next: NextFunction) {
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

      // Parse date filters
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analytics = await TemplateAnalyticsService.getOrganizationAnalytics(
        organizationId,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template download history
   * GET /api/v1/templates/:id/downloads
   */
  static async getDownloadHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      // Check if user has permission to view template
      const template = await TemplateDocumentService.getTemplateById(id, userId, userRoles);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template document not found',
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const downloadHistory = await TemplateAnalyticsService.getDownloadHistory(id, page, limit);

      res.json({
        success: true,
        data: downloadHistory,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate usage reports
   * GET /api/v1/templates/reports
   */
  static async generateUsageReport(req: Request, res: Response, next: NextFunction) {
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

      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);
      const format = (req.query.format as string) || 'json';

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD format.',
        });
      }

      const report = await TemplateAnalyticsService.generateUsageReport(
        organizationId,
        startDate,
        endDate,
        format as 'json' | 'csv'
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="template-usage-report-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv"`);
        res.send(report);
      } else {
        res.json({
          success: true,
          data: report,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template trends
   * GET /api/v1/templates/:id/trends
   */
  static async getTemplateTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      const userRoles = (req as any).user.roles || [];
      
      // Get user ID from database
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
        });
      }
      
      const userId = userResult.rows[0].id;

      // Check if user has permission to view template
      const template = await TemplateDocumentService.getTemplateById(id, userId, userRoles);
      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template document not found',
        });
      }

      const period = (req.query.period as string) || 'daily';
      const limit = parseInt(req.query.limit as string) || 30;

      const trends = await TemplateAnalyticsService.getTemplateTrends(
        id,
        period as 'daily' | 'weekly' | 'monthly',
        limit
      );

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }
}
