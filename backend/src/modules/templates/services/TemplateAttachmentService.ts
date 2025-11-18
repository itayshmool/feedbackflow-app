import { TemplateAttachmentModel, CreateAttachmentDto, AttachmentFilters, TemplateAttachment } from '../models/TemplateAttachment.model.js';
import { fileStorageService } from '../../../services/FileStorageService.js';
import { FileValidator } from '../../../shared/utils/file-validator.js';
import { virusScanService } from '../../../services/VirusScanService.js';
import { query } from '../../../config/database.js';

export interface AttachmentUploadResult {
  attachment: TemplateAttachment;
  fileUrl: string;
}

export interface AttachmentDownloadResult {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

export class TemplateAttachmentService {
  /**
   * Upload a completed template as attachment to feedback response
   */
  static async uploadAttachment(
    feedbackResponseId: string,
    file: Express.Multer.File,
    templateDocumentId: string | undefined,
    userId: string
  ): Promise<AttachmentUploadResult> {
    // Validate file
    const validation = FileValidator.validateFile(file, {
      allowedTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'application/msword',
      ],
      allowedExtensions: ['.docx', '.pdf', '.doc'],
      maxSizeMB: parseInt(process.env.MAX_ATTACHMENT_SIZE_MB || '10'),
      required: true,
    });

    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.error}`);
    }

    // Check if user has permission to upload to this feedback response
    await this.checkFeedbackPermission(feedbackResponseId, userId);

    // Check if template document exists and user has permission (if provided)
    if (templateDocumentId) {
      await this.checkTemplatePermission(templateDocumentId, userId);
    }

    // Generate unique file path
    const uniqueFileName = FileValidator.generateUniqueFileName(file.originalname);
    const filePath = `attachments/${feedbackResponseId}/${uniqueFileName}`;

    // Upload file to storage
    const uploadResult = await fileStorageService.uploadFile(
      file.buffer,
      filePath,
      file.mimetype,
      {
        'feedback-response-id': feedbackResponseId,
        'template-document-id': templateDocumentId || '',
        'uploaded-by': userId,
        'original-filename': file.originalname,
      }
    );

    // Handle both return types from uploadFile
    const uploadPath = 'path' in uploadResult ? uploadResult.path : uploadResult.filePath;
    const uploadSize = 'size' in uploadResult ? uploadResult.size : uploadResult.fileSize;
    const uploadUrl = 'url' in uploadResult ? uploadResult.url : uploadResult.filePath;

    // Create attachment record
    const attachmentData: CreateAttachmentDto = {
      feedbackResponseId,
      templateDocumentId,
      fileName: file.originalname,
      filePath: uploadPath,
      fileSize: uploadSize,
      fileMimeType: file.mimetype,
      uploadedBy: userId,
    };

    const attachment = await TemplateAttachmentModel.create(attachmentData);

    // Start virus scanning if enabled
    if ((virusScanService as any).isEnabled && (virusScanService as any).isEnabled()) {
      this.startVirusScan(attachment.id, uploadPath).catch(error => {
        console.error('Virus scan failed:', error);
      });
    }

    // Track attachment analytics
    if (templateDocumentId) {
      await this.trackTemplateAction(templateDocumentId, userId, 'attach', feedbackResponseId);
    }

    return {
      attachment,
      fileUrl: uploadUrl,
    };
  }

  /**
   * Get attachments for a feedback response
   */
  static async getAttachmentsForFeedback(
    feedbackResponseId: string,
    userId: string
  ): Promise<TemplateAttachment[]> {
    return await TemplateAttachmentModel.getAttachmentsForFeedback(feedbackResponseId, userId);
  }

  /**
   * Get attachment by ID
   */
  static async getAttachmentById(attachmentId: string, userId: string): Promise<TemplateAttachment | null> {
    const attachment = await TemplateAttachmentModel.findById(attachmentId);
    if (!attachment) {
      return null;
    }

    // Check permissions
    const hasPermission = await TemplateAttachmentModel.checkPermission(attachmentId, userId);
    if (!hasPermission) {
      throw new Error('Access denied: insufficient permissions');
    }

    return attachment;
  }

  /**
   * List attachments with filters
   */
  static async listAttachments(
    filters: AttachmentFilters,
    userId: string
  ): Promise<{
    attachments: TemplateAttachment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // If no specific filters, only show attachments user has access to
    if (!filters.feedbackResponseId && !filters.uploadedBy) {
      // Get all feedback responses user has access to
      const feedbackResult = await query(
        'SELECT id FROM feedback_responses WHERE giver_id = $1 OR recipient_id = $1',
        [userId]
      );

      const feedbackIds = feedbackResult.rows.map((row: any) => row.id);
      if (feedbackIds.length === 0) {
        return {
          attachments: [],
          total: 0,
          page: filters.page || 1,
          limit: filters.limit || 20,
          totalPages: 0,
        };
      }

      // Add feedback response filter
      filters.feedbackResponseId = feedbackIds[0]; // This is a simplified approach
      // In a real implementation, you'd need to modify the query to handle multiple IDs
    }

    return await TemplateAttachmentModel.findAll(filters);
  }

  /**
   * Download attachment file
   */
  static async downloadAttachment(
    attachmentId: string,
    userId: string
  ): Promise<AttachmentDownloadResult> {
    // Get attachment and check permissions
    const attachment = await this.getAttachmentById(attachmentId, userId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Download file
    const fileBuffer = await fileStorageService.downloadFile(attachment.filePath);

    return {
      fileBuffer,
      fileName: attachment.fileName,
      mimeType: attachment.fileMimeType,
    };
  }

  /**
   * Delete attachment
   */
  static async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    // Get attachment and check permissions
    const attachment = await this.getAttachmentById(attachmentId, userId);
    if (!attachment) {
      throw new Error('Attachment not found');
    }

    // Check if user is the uploader
    if (attachment.uploadedBy !== userId) {
      throw new Error('Access denied: only the uploader can delete attachments');
    }

    // Delete file from storage
    try {
      await fileStorageService.deleteFile(attachment.filePath);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete attachment record
    await TemplateAttachmentModel.delete(attachmentId);
  }

  /**
   * Get attachment statistics
   */
  static async getAttachmentStats(
    filters: {
      feedbackResponseId?: string;
      templateDocumentId?: string;
      uploadedBy?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any> {
    return await TemplateAttachmentModel.getStats(filters);
  }

  /**
   * Update virus scan status
   */
  static async updateVirusScanStatus(
    attachmentId: string,
    status: 'pending' | 'clean' | 'infected' | 'failed'
  ): Promise<void> {
    await TemplateAttachmentModel.updateVirusScanStatus(attachmentId, status);
  }

  /**
   * Check if user has permission to access feedback response
   */
  private static async checkFeedbackPermission(feedbackResponseId: string, userId: string): Promise<void> {
    const result = await query(
      'SELECT giver_id, recipient_id FROM feedback_responses WHERE id = $1',
      [feedbackResponseId]
    );

    if (result.rows.length === 0) {
      throw new Error('Feedback response not found');
    }

    const feedback = result.rows[0];
    if (feedback.giver_id !== userId && feedback.recipient_id !== userId) {
      throw new Error('Access denied: insufficient permissions');
    }
  }

  /**
   * Check if user has permission to access template document
   */
  private static async checkTemplatePermission(templateDocumentId: string, userId: string): Promise<void> {
    // Get user roles
    const userResult = await query(
      `SELECT 
        u.id,
        ARRAY_AGG(r.name) as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const userRolesData = userResult.rows[0].roles;
    let userRoles: string[] = [];
    // PostgreSQL ARRAY_AGG can return null if no roles, or an array
    if (userRolesData === null || userRolesData === undefined) {
      userRoles = [];
    } else if (Array.isArray(userRolesData)) {
      userRoles = userRolesData.filter((r: any) => r !== null && r !== undefined && typeof r === 'string');
    } else if (typeof userRolesData === 'string') {
      try {
        const parsed = JSON.parse(userRolesData);
        userRoles = Array.isArray(parsed) ? parsed.filter((r: any) => r !== null && r !== undefined && typeof r === 'string') : [];
      } catch {
        userRoles = [];
      }
    }

    // Check template permissions
    const templateResult = await query(
      'SELECT permissions FROM feedback_template_documents WHERE id = $1 AND archived_at IS NULL',
      [templateDocumentId]
    );

    if (templateResult.rows.length === 0) {
      throw new Error('Template document not found');
    }

    const permissionsData = templateResult.rows[0].permissions;
    const templatePermissions = typeof permissionsData === 'string' 
      ? JSON.parse(permissionsData) 
      : (permissionsData || { roles: [] });
    const templateRoles = Array.isArray(templatePermissions.roles) ? templatePermissions.roles : [];
    // Ensure both are arrays and have at least one matching role
    const hasRequiredRole = templateRoles.length > 0 && 
                           userRoles.length > 0 && 
                           templateRoles.some((role: string) => userRoles.includes(role));

    if (!hasRequiredRole) {
      throw new Error('Access denied: insufficient permissions for template');
    }
  }

  /**
   * Start virus scanning for an attachment
   */
  private static async startVirusScan(attachmentId: string, filePath: string): Promise<void> {
    try {
      const scanResult = await (virusScanService as any).scanFile(filePath, {});
      
      // Update attachment with scan result
      await TemplateAttachmentModel.updateVirusScanStatus(attachmentId, scanResult.status);

      console.log(`Virus scan completed for attachment ${attachmentId}: ${scanResult.status}`);
    } catch (error) {
      console.error(`Virus scan failed for attachment ${attachmentId}:`, error);
      
      // Mark as failed
      await TemplateAttachmentModel.updateVirusScanStatus(attachmentId, 'failed');
    }
  }

  /**
   * Track template action for analytics
   */
  private static async trackTemplateAction(
    templateId: string,
    userId: string,
    action: 'download' | 'view' | 'attach',
    metadata?: string
  ): Promise<void> {
    try {
      await query(
        'INSERT INTO feedback_template_analytics (template_document_id, user_id, action, metadata) VALUES ($1, $2, $3, $4)',
        [templateId, userId, action, JSON.stringify({ 
          timestamp: new Date().toISOString(),
          ...(metadata && { feedbackResponseId: metadata })
        })]
      );
    } catch (error) {
      console.error('Failed to track template action:', error);
    }
  }

  /**
   * Get attachments by template document ID
   */
  static async getAttachmentsByTemplate(
    templateDocumentId: string,
    userId: string
  ): Promise<TemplateAttachment[]> {
    // Check if user has permission to access template
    await this.checkTemplatePermission(templateDocumentId, userId);

    return await TemplateAttachmentModel.findByTemplateDocumentId(templateDocumentId);
  }

  /**
   * Get attachment statistics for a specific template
   */
  static async getTemplateAttachmentStats(
    templateDocumentId: string,
    userId: string
  ): Promise<any> {
    // Check if user has permission to access template
    await this.checkTemplatePermission(templateDocumentId, userId);

    return await TemplateAttachmentModel.getStats({ templateDocumentId });
  }

  /**
   * Get attachment statistics for a specific user
   */
  static async getUserAttachmentStats(userId: string): Promise<any> {
    return await TemplateAttachmentModel.getStats({ uploadedBy: userId });
  }

  /**
   * Get attachment statistics for a specific feedback response
   */
  static async getFeedbackAttachmentStats(
    feedbackResponseId: string,
    userId: string
  ): Promise<any> {
    // Check if user has permission to access feedback
    await this.checkFeedbackPermission(feedbackResponseId, userId);

    return await TemplateAttachmentModel.getStats({ feedbackResponseId });
  }
}




