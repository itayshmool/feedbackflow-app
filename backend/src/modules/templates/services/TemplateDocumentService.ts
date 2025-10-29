import { TemplateDocumentModel, CreateTemplateDocumentDto, UpdateTemplateDocumentDto, TemplateFilters, TemplateDocument } from '../models/TemplateDocument.model.js';
import { fileStorageService } from '../../../services/FileStorageService.js';
import { FileValidator } from '../../../shared/utils/file-validator.js';
import { virusScanService } from '../../../services/VirusScanService.js';
import { query } from '../../../config/database.js';

export interface TemplateUploadResult {
  template: TemplateDocument;
  fileUrl: string;
}

export interface TemplateDuplicationResult {
  originalTemplate: TemplateDocument;
  duplicatedTemplate: TemplateDocument;
}

export class TemplateDocumentService {
  /**
   * Upload a new template document
   */
  static async uploadTemplate(
    file: Express.Multer.File,
    metadata: Omit<CreateTemplateDocumentDto, 'fileName' | 'filePath' | 'fileSize' | 'fileMimeType' | 'fileFormat'>,
    userId: string
  ): Promise<TemplateUploadResult> {
    // Validate file
    const validation = FileValidator.validateFile(file, {
      allowedTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'application/msword',
      ],
      allowedExtensions: ['.docx', '.pdf', '.doc'],
      maxSizeMB: parseInt(process.env.MAX_TEMPLATE_SIZE_MB || '10'),
      required: true,
    });

    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.error}`);
    }

    // Generate unique file path
    const uniqueFileName = FileValidator.generateUniqueFileName(file.originalname);
    const filePath = `templates/${metadata.organizationId}/${uniqueFileName}`;

    // Upload file to storage
    const uploadResult = await fileStorageService.uploadFile(
      file.buffer,
      filePath,
      file.mimetype,
      {
        'template-name': metadata.name,
        'template-type': metadata.templateType,
        'uploaded-by': userId,
      }
    );

    // Create template document record
    const templateData: CreateTemplateDocumentDto = {
      ...metadata,
      fileName: file.originalname,
      filePath: uploadResult.path,
      fileSize: uploadResult.size,
      fileMimeType: file.mimetype,
      fileFormat: FileValidator.getFileExtension(file.originalname) as '.docx' | '.pdf' | '.doc',
      createdBy: userId,
    };

    const template = await TemplateDocumentModel.create(templateData);

    // Start virus scanning if enabled
    if (virusScanService.isEnabled()) {
      this.startVirusScan(template.id, uploadResult.path).catch(error => {
        console.error('Virus scan failed:', error);
      });
    }

    return {
      template,
      fileUrl: uploadResult.url,
    };
  }

  /**
   * Get template document by ID
   */
  static async getTemplateById(id: string, userId: string, userRoles: string[]): Promise<TemplateDocument | null> {
    const template = await TemplateDocumentModel.findById(id);
    if (!template) {
      return null;
    }

    // Check permissions
    const hasPermission = await TemplateDocumentModel.checkPermission(id, userId, userRoles);
    if (!hasPermission) {
      throw new Error('Access denied: insufficient permissions');
    }

    return template;
  }

  /**
   * List template documents with filters
   */
  static async listTemplates(filters: TemplateFilters, userId: string, userRoles: string[]): Promise<{
    templates: TemplateDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Filter templates based on user permissions
    const filteredTemplates = await TemplateDocumentModel.findAll(filters);
    
    // Filter out templates user doesn't have permission to see
    const accessibleTemplates = [];
    for (const template of filteredTemplates.templates) {
      try {
        const hasPermission = await TemplateDocumentModel.checkPermission(template.id, userId, userRoles);
        if (hasPermission) {
          accessibleTemplates.push(template);
        }
      } catch (error) {
        // Skip templates without permission
        continue;
      }
    }

    return {
      ...filteredTemplates,
      templates: accessibleTemplates,
    };
  }

  /**
   * Update template document metadata
   */
  static async updateTemplate(
    id: string,
    data: UpdateTemplateDocumentDto,
    userId: string,
    userRoles: string[]
  ): Promise<TemplateDocument> {
    // Check if template exists and user has permission
    const existingTemplate = await this.getTemplateById(id, userId, userRoles);
    if (!existingTemplate) {
      throw new Error('Template document not found');
    }

    // Check if user is admin or creator
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
    const isCreator = existingTemplate.createdBy === userId;
    
    if (!isAdmin && !isCreator) {
      throw new Error('Access denied: only admins or template creators can update templates');
    }

    return await TemplateDocumentModel.update(id, data);
  }

  /**
   * Delete template document
   */
  static async deleteTemplate(id: string, userId: string, userRoles: string[]): Promise<void> {
    // Check if template exists and user has permission
    const existingTemplate = await this.getTemplateById(id, userId, userRoles);
    if (!existingTemplate) {
      throw new Error('Template document not found');
    }

    // Check if user is admin or creator
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
    const isCreator = existingTemplate.createdBy === userId;
    
    if (!isAdmin && !isCreator) {
      throw new Error('Access denied: only admins or template creators can delete templates');
    }

    // Check if template is being used
    const usageCheck = await this.checkTemplateUsage(id);
    if (usageCheck.isUsed) {
      throw new Error(`Cannot delete template: ${usageCheck.reason}`);
    }

    // Delete file from storage
    try {
      await fileStorageService.deleteFile(existingTemplate.filePath);
    } catch (error) {
      console.error('Failed to delete file from storage:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Soft delete template
    await TemplateDocumentModel.delete(id);
  }

  /**
   * Duplicate template document
   */
  static async duplicateTemplate(
    id: string,
    newName: string,
    userId: string,
    userRoles: string[]
  ): Promise<TemplateDuplicationResult> {
    // Get original template
    const originalTemplate = await this.getTemplateById(id, userId, userRoles);
    if (!originalTemplate) {
      throw new Error('Template document not found');
    }

    // Download original file
    const fileBuffer = await fileStorageService.downloadFile(originalTemplate.filePath);

    // Generate new file path
    const newFileName = FileValidator.generateUniqueFileName(originalTemplate.fileName);
    const newFilePath = `templates/${originalTemplate.organizationId}/${newFileName}`;

    // Upload duplicated file
    const uploadResult = await fileStorageService.uploadFile(
      fileBuffer,
      newFilePath,
      originalTemplate.fileMimeType,
      {
        'template-name': newName,
        'template-type': originalTemplate.templateType,
        'uploaded-by': userId,
        'duplicated-from': originalTemplate.id,
      }
    );

    // Create new template document
    const duplicatedTemplateData: CreateTemplateDocumentDto = {
      organizationId: originalTemplate.organizationId,
      name: newName,
      description: `Copy of ${originalTemplate.name}`,
      templateType: originalTemplate.templateType,
      fileName: originalTemplate.fileName,
      filePath: uploadResult.path,
      fileSize: uploadResult.size,
      fileMimeType: originalTemplate.fileMimeType,
      fileFormat: originalTemplate.fileFormat,
      tags: [...originalTemplate.tags],
      permissions: { ...originalTemplate.permissions },
      availabilityRules: { ...originalTemplate.availabilityRules },
      createdBy: userId,
      isDefault: false, // Duplicated templates are never default
    };

    const duplicatedTemplate = await TemplateDocumentModel.create(duplicatedTemplateData);

    return {
      originalTemplate,
      duplicatedTemplate,
    };
  }

  /**
   * Replace template file
   */
  static async replaceTemplateFile(
    id: string,
    file: Express.Multer.File,
    userId: string,
    userRoles: string[]
  ): Promise<TemplateDocument> {
    // Get existing template
    const existingTemplate = await this.getTemplateById(id, userId, userRoles);
    if (!existingTemplate) {
      throw new Error('Template document not found');
    }

    // Check if user is admin or creator
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
    const isCreator = existingTemplate.createdBy === userId;
    
    if (!isAdmin && !isCreator) {
      throw new Error('Access denied: only admins or template creators can replace template files');
    }

    // Validate new file
    const validation = FileValidator.validateFile(file, {
      allowedTypes: [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'application/msword',
      ],
      allowedExtensions: ['.docx', '.pdf', '.doc'],
      maxSizeMB: parseInt(process.env.MAX_TEMPLATE_SIZE_MB || '10'),
      required: true,
    });

    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.error}`);
    }

    // Generate new file path
    const newFileName = FileValidator.generateUniqueFileName(file.originalname);
    const newFilePath = `templates/${existingTemplate.organizationId}/${newFileName}`;

    // Upload new file
    const uploadResult = await fileStorageService.uploadFile(
      file.buffer,
      newFilePath,
      file.mimetype,
      {
        'template-name': existingTemplate.name,
        'template-type': existingTemplate.templateType,
        'uploaded-by': userId,
        'replaced-template': existingTemplate.id,
      }
    );

    // Update template with new file info
    const updatedTemplate = await TemplateDocumentModel.update(id, {
      fileName: file.originalname,
      filePath: uploadResult.path,
      fileSize: uploadResult.size,
      fileMimeType: file.mimetype,
      fileFormat: FileValidator.getFileExtension(file.originalname) as '.docx' | '.pdf' | '.doc',
    });

    // Delete old file
    try {
      await fileStorageService.deleteFile(existingTemplate.filePath);
    } catch (error) {
      console.error('Failed to delete old file:', error);
    }

    // Start virus scanning for new file
    if (virusScanService.isEnabled()) {
      this.startVirusScan(id, uploadResult.path).catch(error => {
        console.error('Virus scan failed:', error);
      });
    }

    return updatedTemplate;
  }

  /**
   * Download template file
   */
  static async downloadTemplate(id: string, userId: string, userRoles: string[]): Promise<{
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    // Get template and check permissions
    const template = await this.getTemplateById(id, userId, userRoles);
    if (!template) {
      throw new Error('Template document not found');
    }

    // Increment download count
    await TemplateDocumentModel.incrementDownloadCount(id);

    // Track download analytics
    await this.trackTemplateAction(id, userId, 'download');

    // Download file
    const fileBuffer = await fileStorageService.downloadFile(template.filePath);

    return {
      fileBuffer,
      fileName: template.fileName,
      mimeType: template.fileMimeType,
    };
  }

  /**
   * Get template usage statistics
   */
  static async getTemplateStats(id: string, userId: string, userRoles: string[]): Promise<any> {
    // Check if template exists and user has permission
    const template = await this.getTemplateById(id, userId, userRoles);
    if (!template) {
      throw new Error('Template document not found');
    }

    return await TemplateDocumentModel.getUsageStats(id);
  }

  /**
   * Archive template
   */
  static async archiveTemplate(id: string, userId: string, userRoles: string[]): Promise<void> {
    // Check if template exists and user has permission
    const existingTemplate = await this.getTemplateById(id, userId, userRoles);
    if (!existingTemplate) {
      throw new Error('Template document not found');
    }

    // Check if user is admin or creator
    const isAdmin = userRoles.includes('admin') || userRoles.includes('super_admin');
    const isCreator = existingTemplate.createdBy === userId;
    
    if (!isAdmin && !isCreator) {
      throw new Error('Access denied: only admins or template creators can archive templates');
    }

    await TemplateDocumentModel.archive(id);
  }

  /**
   * Check if template is being used
   */
  private static async checkTemplateUsage(id: string): Promise<{ isUsed: boolean; reason?: string }> {
    // Check if template has attachments
    const attachmentsResult = await query(
      'SELECT COUNT(*) as count FROM feedback_template_attachments WHERE template_document_id = $1',
      [id]
    );

    const attachmentCount = parseInt(attachmentsResult.rows[0].count);
    if (attachmentCount > 0) {
      return {
        isUsed: true,
        reason: `Template is attached to ${attachmentCount} feedback response(s)`,
      };
    }

    // Check if template has analytics (downloads)
    const analyticsResult = await query(
      'SELECT COUNT(*) as count FROM feedback_template_analytics WHERE template_document_id = $1 AND action = $2',
      [id, 'download']
    );

    const downloadCount = parseInt(analyticsResult.rows[0].count);
    if (downloadCount > 0) {
      return {
        isUsed: true,
        reason: `Template has been downloaded ${downloadCount} time(s)`,
      };
    }

    return { isUsed: false };
  }

  /**
   * Start virus scanning for a template
   */
  private static async startVirusScan(templateId: string, filePath: string): Promise<void> {
    try {
      const scanResult = await virusScanService.scanFile(filePath);
      
      // Update template with scan result
      await query(
        'UPDATE feedback_template_documents SET virus_scan_status = $1, virus_scan_at = NOW() WHERE id = $2',
        [scanResult.status, templateId]
      );

      console.log(`Virus scan completed for template ${templateId}: ${scanResult.status}`);
    } catch (error) {
      console.error(`Virus scan failed for template ${templateId}:`, error);
      
      // Mark as failed
      await query(
        'UPDATE feedback_template_documents SET virus_scan_status = $1, virus_scan_at = NOW() WHERE id = $2',
        ['failed', templateId]
      );
    }
  }

  /**
   * Track template action for analytics
   */
  private static async trackTemplateAction(templateId: string, userId: string, action: 'download' | 'view' | 'attach'): Promise<void> {
    try {
      await query(
        'INSERT INTO feedback_template_analytics (template_document_id, user_id, action, metadata) VALUES ($1, $2, $3, $4)',
        [templateId, userId, action, JSON.stringify({ timestamp: new Date().toISOString() })]
      );
    } catch (error) {
      console.error('Failed to track template action:', error);
    }
  }
}
