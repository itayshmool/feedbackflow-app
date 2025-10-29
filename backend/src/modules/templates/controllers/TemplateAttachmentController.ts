import { Request, Response, NextFunction } from 'express';
import { TemplateAttachmentService } from '../services/TemplateAttachmentService.js';
import { FileValidator } from '../../../shared/utils/file-validator.js';
import { query } from '../../../config/database.js';
import { z } from 'zod';

// Validation schemas
const createAttachmentSchema = z.object({
  templateDocumentId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

const attachmentFiltersSchema = z.object({
  templateDocumentId: z.string().uuid().optional(),
  uploadedBy: z.string().uuid().optional(),
  virusScanStatus: z.enum(['pending', 'clean', 'infected', 'failed']).optional(),
  page: z.number().int().min(1).max(1000).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(['fileName', 'uploadedAt', 'fileSize']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export class TemplateAttachmentController {
  /**
   * Upload attachment to feedback response
   * POST /api/v1/feedback/:feedbackId/attachments
   */
  static async uploadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      const userEmail = (req as any).user.email;
      
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
      const validation = createAttachmentSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: validation.error.errors,
        });
      }

      const { templateDocumentId } = validation.data;

      const result = await TemplateAttachmentService.uploadAttachment(
        feedbackId,
        file,
        templateDocumentId,
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
   * List attachments for feedback response
   * GET /api/v1/feedback/:feedbackId/attachments
   */
  static async listAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const userEmail = (req as any).user.email;
      
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

      const attachments = await TemplateAttachmentService.getAttachmentsForFeedback(
        feedbackId,
        userId
      );

      res.json({
        success: true,
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attachment details
   * GET /api/v1/feedback/:feedbackId/attachments/:id
   */
  static async getAttachmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      
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

      const attachment = await TemplateAttachmentService.getAttachmentById(id, userId);

      if (!attachment) {
        return res.status(404).json({
          success: false,
          error: 'Attachment not found',
        });
      }

      res.json({
        success: true,
        data: attachment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete attachment
   * DELETE /api/v1/feedback/:feedbackId/attachments/:id
   */
  static async deleteAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      
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

      await TemplateAttachmentService.deleteAttachment(id, userId);

      res.json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download attachment file
   * GET /api/v1/feedback/:feedbackId/attachments/:id/download
   */
  static async downloadAttachment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userEmail = (req as any).user.email;
      
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

      const result = await TemplateAttachmentService.downloadAttachment(id, userId);

      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
      res.send(result.fileBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attachment statistics
   * GET /api/v1/feedback/:feedbackId/attachments/stats
   */
  static async getAttachmentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { feedbackId } = req.params;
      const userEmail = (req as any).user.email;
      
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

      const stats = await TemplateAttachmentService.getFeedbackAttachmentStats(feedbackId, userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all attachments with filters
   * GET /api/v1/attachments
   */
  static async listAllAttachments(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
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

      // Validate query parameters
      const validation = attachmentFiltersSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: validation.error.errors,
        });
      }

      const result = await TemplateAttachmentService.listAttachments(validation.data, userId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user attachment statistics
   * GET /api/v1/attachments/stats
   */
  static async getUserAttachmentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userEmail = (req as any).user.email;
      
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

      const stats = await TemplateAttachmentService.getUserAttachmentStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get attachments by template document
   * GET /api/v1/templates/:templateId/attachments
   */
  static async getAttachmentsByTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const { templateId } = req.params;
      const userEmail = (req as any).user.email;
      
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

      const attachments = await TemplateAttachmentService.getAttachmentsByTemplate(templateId, userId);

      res.json({
        success: true,
        data: attachments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get template attachment statistics
   * GET /api/v1/templates/:templateId/attachments/stats
   */
  static async getTemplateAttachmentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { templateId } = req.params;
      const userEmail = (req as any).user.email;
      
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

      const stats = await TemplateAttachmentService.getTemplateAttachmentStats(templateId, userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
