import { query, transaction } from '../../../config/database.js';

export interface TemplateAttachment {
  id: string;
  feedbackResponseId: string;
  templateDocumentId?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileMimeType: string;
  uploadedBy: string;
  uploadedAt: Date;
  virusScanStatus: 'pending' | 'clean' | 'infected' | 'failed';
  virusScanAt?: Date;
  createdAt: Date;
}

export interface CreateAttachmentDto {
  feedbackResponseId: string;
  templateDocumentId?: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileMimeType: string;
  uploadedBy: string;
}

export interface AttachmentFilters {
  feedbackResponseId?: string;
  templateDocumentId?: string;
  uploadedBy?: string;
  virusScanStatus?: 'pending' | 'clean' | 'infected' | 'failed';
  page?: number;
  limit?: number;
  sortBy?: 'fileName' | 'uploadedAt' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

export interface AttachmentStats {
  totalAttachments: number;
  pendingScans: number;
  cleanFiles: number;
  infectedFiles: number;
  failedScans: number;
  totalSize: number;
  averageSize: number;
  attachmentsByType: Record<string, number>;
  attachmentsByUser: Record<string, number>;
}

export class TemplateAttachmentModel {
  /**
   * Create a new template attachment
   */
  static async create(data: CreateAttachmentDto): Promise<TemplateAttachment> {
    const {
      feedbackResponseId,
      templateDocumentId,
      fileName,
      filePath,
      fileSize,
      fileMimeType,
      uploadedBy,
    } = data;

    const result = await query(
      `INSERT INTO feedback_template_attachments (
        feedback_response_id, template_document_id, file_name, file_path,
        file_size, file_mime_type, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        feedbackResponseId,
        templateDocumentId,
        fileName,
        filePath,
        fileSize,
        fileMimeType,
        uploadedBy,
      ]
    );

    return this.mapToTemplateAttachment(result.rows[0]);
  }

  /**
   * Find attachment by ID
   */
  static async findById(id: string): Promise<TemplateAttachment | null> {
    const result = await query(
      'SELECT * FROM feedback_template_attachments WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToTemplateAttachment(result.rows[0]);
  }

  /**
   * Find attachments by feedback response ID
   */
  static async findByFeedbackResponseId(feedbackResponseId: string): Promise<TemplateAttachment[]> {
    const result = await query(
      'SELECT * FROM feedback_template_attachments WHERE feedback_response_id = $1 ORDER BY uploaded_at DESC',
      [feedbackResponseId]
    );

    return result.rows.map((row: any) => this.mapToTemplateAttachment(row));
  }

  /**
   * Find attachments by template document ID
   */
  static async findByTemplateDocumentId(templateDocumentId: string): Promise<TemplateAttachment[]> {
    const result = await query(
      'SELECT * FROM feedback_template_attachments WHERE template_document_id = $1 ORDER BY uploaded_at DESC',
      [templateDocumentId]
    );

    return result.rows.map((row: any) => this.mapToTemplateAttachment(row));
  }

  /**
   * Find all attachments with filters
   */
  static async findAll(filters: AttachmentFilters): Promise<{
    attachments: TemplateAttachment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      feedbackResponseId,
      templateDocumentId,
      uploadedBy,
      virusScanStatus,
      page = 1,
      limit = 20,
      sortBy = 'uploadedAt',
      sortOrder = 'desc',
    } = filters;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (feedbackResponseId) {
      whereConditions.push(`feedback_response_id = $${paramIndex}`);
      queryParams.push(feedbackResponseId);
      paramIndex++;
    }

    if (templateDocumentId) {
      whereConditions.push(`template_document_id = $${paramIndex}`);
      queryParams.push(templateDocumentId);
      paramIndex++;
    }

    if (uploadedBy) {
      whereConditions.push(`uploaded_by = $${paramIndex}`);
      queryParams.push(uploadedBy);
      paramIndex++;
    }

    if (virusScanStatus) {
      whereConditions.push(`virus_scan_status = $${paramIndex}`);
      queryParams.push(virusScanStatus);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, (page - 1) * limit);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM feedback_template_attachments ${whereClause}`,
      queryParams.slice(0, -2) // Remove limit and offset for count
    );
    const total = parseInt(countResult.rows[0].total);

    // Get attachments
    const result = await query(
      `SELECT * FROM feedback_template_attachments ${whereClause} ${orderClause} ${limitClause}`,
      queryParams
    );

    const attachments = result.rows.map((row: any) => this.mapToTemplateAttachment(row));
    const totalPages = Math.ceil(total / limit);

    return {
      attachments,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update virus scan status
   */
  static async updateVirusScanStatus(
    id: string,
    status: 'pending' | 'clean' | 'infected' | 'failed'
  ): Promise<void> {
    await query(
      'UPDATE feedback_template_attachments SET virus_scan_status = $1, virus_scan_at = NOW() WHERE id = $2',
      [status, id]
    );
  }

  /**
   * Delete attachment
   */
  static async delete(id: string): Promise<void> {
    const result = await query(
      'DELETE FROM feedback_template_attachments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Attachment not found');
    }
  }

  /**
   * Get attachment statistics
   */
  static async getStats(filters: {
    feedbackResponseId?: string;
    templateDocumentId?: string;
    uploadedBy?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<AttachmentStats> {
    const {
      feedbackResponseId,
      templateDocumentId,
      uploadedBy,
      startDate,
      endDate,
    } = filters;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    if (feedbackResponseId) {
      whereConditions.push(`feedback_response_id = $${paramIndex}`);
      queryParams.push(feedbackResponseId);
      paramIndex++;
    }

    if (templateDocumentId) {
      whereConditions.push(`template_document_id = $${paramIndex}`);
      queryParams.push(templateDocumentId);
      paramIndex++;
    }

    if (uploadedBy) {
      whereConditions.push(`uploaded_by = $${paramIndex}`);
      queryParams.push(uploadedBy);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`uploaded_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`uploaded_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get basic stats
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_attachments,
        COUNT(CASE WHEN virus_scan_status = 'pending' THEN 1 END) as pending_scans,
        COUNT(CASE WHEN virus_scan_status = 'clean' THEN 1 END) as clean_files,
        COUNT(CASE WHEN virus_scan_status = 'infected' THEN 1 END) as infected_files,
        COUNT(CASE WHEN virus_scan_status = 'failed' THEN 1 END) as failed_scans,
        SUM(file_size) as total_size,
        AVG(file_size) as average_size
       FROM feedback_template_attachments ${whereClause}`,
      queryParams
    );

    const stats = statsResult.rows[0];

    // Get attachments by file type
    const typeResult = await query(
      `SELECT 
        CASE 
          WHEN file_mime_type LIKE '%word%' THEN 'word'
          WHEN file_mime_type LIKE '%pdf%' THEN 'pdf'
          ELSE 'other'
        END as file_type,
        COUNT(*) as count
       FROM feedback_template_attachments ${whereClause}
       GROUP BY file_type`,
      queryParams
    );

    const attachmentsByType: Record<string, number> = {};
    typeResult.rows.forEach((row: any) => {
      attachmentsByType[row.file_type] = parseInt(row.count);
    });

    // Get attachments by user
    const userResult = await query(
      `SELECT uploaded_by, COUNT(*) as count
       FROM feedback_template_attachments ${whereClause}
       GROUP BY uploaded_by
       ORDER BY count DESC
       LIMIT 10`,
      queryParams
    );

    const attachmentsByUser: Record<string, number> = {};
    userResult.rows.forEach((row: any) => {
      attachmentsByUser[row.uploaded_by] = parseInt(row.count);
    });

    return {
      totalAttachments: parseInt(stats.total_attachments) || 0,
      pendingScans: parseInt(stats.pending_scans) || 0,
      cleanFiles: parseInt(stats.clean_files) || 0,
      infectedFiles: parseInt(stats.infected_files) || 0,
      failedScans: parseInt(stats.failed_scans) || 0,
      totalSize: parseInt(stats.total_size) || 0,
      averageSize: parseFloat(stats.average_size) || 0,
      attachmentsByType,
      attachmentsByUser,
    };
  }

  /**
   * Check if user has permission to access attachment
   */
  static async checkPermission(attachmentId: string, userId: string): Promise<boolean> {
    // Check if user is the uploader
    const uploaderResult = await query(
      'SELECT uploaded_by FROM feedback_template_attachments WHERE id = $1',
      [attachmentId]
    );

    if (uploaderResult.rows.length === 0) {
      return false;
    }

    if (uploaderResult.rows[0].uploaded_by === userId) {
      return true;
    }

    // Check if user has access to the feedback response
    const feedbackResult = await query(
      `SELECT fr.giver_id, fr.recipient_id 
       FROM feedback_template_attachments fta
       JOIN feedback_responses fr ON fta.feedback_response_id = fr.id
       WHERE fta.id = $1`,
      [attachmentId]
    );

    if (feedbackResult.rows.length === 0) {
      return false;
    }

    const feedback = feedbackResult.rows[0];
    return feedback.giver_id === userId || feedback.recipient_id === userId;
  }

  /**
   * Get attachments for a specific feedback response with user permission check
   */
  static async getAttachmentsForFeedback(
    feedbackResponseId: string,
    userId: string
  ): Promise<TemplateAttachment[]> {
    // First check if user has access to the feedback response
    const feedbackResult = await query(
      'SELECT giver_id, recipient_id FROM feedback_responses WHERE id = $1',
      [feedbackResponseId]
    );

    if (feedbackResult.rows.length === 0) {
      throw new Error('Feedback response not found');
    }

    const feedback = feedbackResult.rows[0];
    if (feedback.giver_id !== userId && feedback.recipient_id !== userId) {
      throw new Error('Access denied: insufficient permissions');
    }

    return await this.findByFeedbackResponseId(feedbackResponseId);
  }

  /**
   * Map database row to TemplateAttachment interface
   */
  private static mapToTemplateAttachment(row: any): TemplateAttachment {
    return {
      id: row.id,
      feedbackResponseId: row.feedback_response_id,
      templateDocumentId: row.template_document_id,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: parseInt(row.file_size),
      fileMimeType: row.file_mime_type,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      virusScanStatus: row.virus_scan_status,
      virusScanAt: row.virus_scan_at,
      createdAt: row.created_at,
    };
  }
}




