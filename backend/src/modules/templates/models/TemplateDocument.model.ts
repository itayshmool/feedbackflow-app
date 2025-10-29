import { query } from '../../../config/real-database';

export interface TemplateDocument {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  template_type: 'manager' | 'peer' | 'self' | 'project' | '360';
  file_name: string;
  file_path: string;
  file_size: number;
  file_mime_type: string;
  file_format: '.docx' | '.pdf' | '.doc';
  version: number;
  download_count: number;
  is_active: boolean;
  is_default: boolean;
  tags: string[];
  permissions: {
    roles: string[];
    departments: string[];
    cycles: string[];
  };
  availability_rules: {
    restrictToCycles: boolean;
    restrictToDepartments: boolean;
    restrictToRoles: boolean;
  };
  created_by: string;
  created_at: Date;
  updated_at: Date;
  archived_at?: Date;
}

export interface TemplateFilters {
  organizationId?: string;
  templateType?: string;
  isActive?: boolean;
  isDefault?: boolean;
  createdBy?: string;
  tags?: string[];
}

export class TemplateDocumentModel {
  static async create(data: Omit<TemplateDocument, 'id' | 'created_at' | 'updated_at'>): Promise<TemplateDocument> {
    const {
      organization_id,
      name,
      description,
      template_type,
      file_name,
      file_path,
      file_size,
      file_mime_type,
      file_format,
      created_by
    } = data;

    const result = await query(
      `INSERT INTO feedback_template_documents 
       (organization_id, name, description, template_type, file_name, file_path, 
        file_size, file_mime_type, file_format, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        organization_id,
        name,
        description || null,
        template_type,
        file_name,
        file_path,
        file_size,
        file_mime_type,
        file_format,
        created_by
      ]
    );

    return result.rows[0];
  }

  static async findById(id: string): Promise<TemplateDocument | null> {
    const result = await query(
      'SELECT * FROM feedback_template_documents WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  static async findAll(filters: TemplateFilters = {}): Promise<TemplateDocument[]> {
    let queryStr = 'SELECT * FROM feedback_template_documents WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (filters.organizationId) {
      paramCount++;
      queryStr += ` AND organization_id = $${paramCount}`;
      params.push(filters.organizationId);
    }

    if (filters.templateType) {
      paramCount++;
      queryStr += ` AND template_type = $${paramCount}`;
      params.push(filters.templateType);
    }

    if (filters.isActive !== undefined) {
      paramCount++;
      queryStr += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
    }

    if (filters.isDefault !== undefined) {
      paramCount++;
      queryStr += ` AND is_default = $${paramCount}`;
      params.push(filters.isDefault);
    }

    if (filters.createdBy) {
      paramCount++;
      queryStr += ` AND created_by = $${paramCount}`;
      params.push(filters.createdBy);
    }

    queryStr += ' ORDER BY created_at DESC';

    const result = await query(queryStr, params);
    return result.rows;
  }

  static async update(id: string, data: Partial<TemplateDocument>): Promise<TemplateDocument | null> {
    const fields = Object.keys(data).filter(key => key !== 'id' && key !== 'created_at');
    
    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const params = fields.map(field => data[field as keyof TemplateDocument]);
    params.push(id);

    const result = await query(
      `UPDATE feedback_template_documents 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $${params.length}
       RETURNING *`,
      params
    );

    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM feedback_template_documents WHERE id = $1',
      [id]
    );

    return (result.rowCount || 0) > 0;
  }

  static async archive(id: string): Promise<TemplateDocument | null> {
    const result = await query(
      `UPDATE feedback_template_documents 
       SET archived_at = NOW(), is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async incrementDownloadCount(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE feedback_template_documents SET download_count = download_count + 1 WHERE id = $1',
      [id]
    );

    return (result.rowCount || 0) > 0;
  }

  static async getUsageStats(id: string): Promise<{
    downloadCount: number;
    attachmentCount: number;
    lastDownloaded?: Date;
  }> {
    const result = await query(
      `SELECT 
         download_count,
         (SELECT COUNT(*) FROM feedback_template_attachments WHERE template_document_id = $1) as attachment_count,
         (SELECT MAX(created_at) FROM feedback_template_analytics 
          WHERE template_document_id = $1 AND action = 'download') as last_downloaded
       FROM feedback_template_documents 
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || { downloadCount: 0, attachmentCount: 0 };
  }
}