import { query } from '../../../config/real-database';
import { validateSortColumn, validateSortOrder } from '../../../shared/utils/sql-security';

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
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateTemplateDocumentDto {
  organizationId: string;
  name: string;
  description?: string;
  templateType: 'manager' | 'peer' | 'self' | 'project' | '360';
  fileName: string;
  filePath: string;
  fileSize: number;
  fileMimeType: string;
  fileFormat: '.docx' | '.pdf' | '.doc';
  tags?: string[];
  permissions?: {
    roles: string[];
    departments: string[];
    cycles: string[];
  };
  availabilityRules?: {
    restrictToCycles: boolean;
    restrictToDepartments: boolean;
    restrictToRoles: boolean;
  };
  createdBy: string;
  isDefault?: boolean;
}

export interface UpdateTemplateDocumentDto {
  name?: string;
  description?: string;
  templateType?: 'manager' | 'peer' | 'self' | 'project' | '360';
  tags?: string[];
  permissions?: {
    roles: string[];
    departments: string[];
    cycles: string[];
  };
  availabilityRules?: {
    restrictToCycles: boolean;
    restrictToDepartments: boolean;
    restrictToRoles: boolean;
  };
  isActive?: boolean;
  isDefault?: boolean;
  fileName?: string;
  filePath?: string;
  fileSize?: number;
  fileMimeType?: string;
  fileFormat?: '.docx' | '.pdf' | '.doc';
}

export class TemplateDocumentModel {
  static async create(data: Omit<TemplateDocument, 'id' | 'created_at' | 'updated_at'> | CreateTemplateDocumentDto): Promise<TemplateDocument> {
    // Handle both DTO format (camelCase) and direct format (snake_case)
    const organization_id = (data as any).organizationId || (data as any).organization_id;
    const name = (data as any).name;
    const description = (data as any).description;
    const template_type = (data as any).templateType || (data as any).template_type;
    const file_name = (data as any).fileName || (data as any).file_name;
    const file_path = (data as any).filePath || (data as any).file_path;
    const file_size = (data as any).fileSize || (data as any).file_size;
    const file_mime_type = (data as any).fileMimeType || (data as any).file_mime_type;
    const file_format = (data as any).fileFormat || (data as any).file_format;
    const created_by = (data as any).createdBy || (data as any).created_by;
    
    // Handle optional fields
    const tags = (data as any).tags || [];
    const permissions = (data as any).permissions || { roles: [], departments: [], cycles: [] };
    const availability_rules = (data as any).availabilityRules || (data as any).availability_rules || {
      restrictToCycles: false,
      restrictToDepartments: false,
      restrictToRoles: false
    };
    const is_default = (data as any).isDefault !== undefined ? (data as any).isDefault : (data as any).is_default || false;

    const result = await query(
      `INSERT INTO feedback_template_documents 
       (organization_id, name, description, template_type, file_name, file_path, 
        file_size, file_mime_type, file_format, created_by, tags, permissions, availability_rules, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
        created_by,
        JSON.stringify(tags),
        JSON.stringify(permissions),
        JSON.stringify(availability_rules),
        is_default
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

  /**
   * Check if user has permission to access template
   */
  static async checkPermission(id: string, userId: string, userRoles: string[]): Promise<boolean> {
    const template = await this.findById(id);
    if (!template) {
      return false;
    }

    // If template is archived, deny access
    if (template.archived_at) {
      return false;
    }

    // Parse permissions (they might be stored as JSON string in DB)
    const permissions = typeof template.permissions === 'string' 
      ? JSON.parse(template.permissions) 
      : template.permissions;

    // Check if user has required role
    const hasRequiredRole = permissions.roles?.some((role: string) => userRoles.includes(role));
    
    // If no role restrictions or user has required role, allow access
    if (!template.availability_rules?.restrictToRoles || hasRequiredRole) {
      return true;
    }

    return false;
  }

  /**
   * Find all templates with pagination
   */
  static async findAllWithPagination(filters: TemplateFilters & {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    templates: TemplateDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      ...restFilters
    } = filters;

    // SECURITY: Validate sort parameters to prevent SQL injection
    const safeSortBy = validateSortColumn('feedback_template_documents', sortBy);
    const safeSortOrder = validateSortOrder(sortOrder);

    // Build WHERE clause
    let whereConditions: string[] = ['archived_at IS NULL'];
    const params: any[] = [];
    let paramCount = 0;

    if (restFilters.organizationId) {
      paramCount++;
      whereConditions.push(`organization_id = $${paramCount}`);
      params.push(restFilters.organizationId);
    }

    if (restFilters.templateType) {
      paramCount++;
      whereConditions.push(`template_type = $${paramCount}`);
      params.push(restFilters.templateType);
    }

    if (restFilters.isActive !== undefined) {
      paramCount++;
      whereConditions.push(`is_active = $${paramCount}`);
      params.push(restFilters.isActive);
    }

    if (restFilters.isDefault !== undefined) {
      paramCount++;
      whereConditions.push(`is_default = $${paramCount}`);
      params.push(restFilters.isDefault);
    }

    if (restFilters.createdBy) {
      paramCount++;
      whereConditions.push(`created_by = $${paramCount}`);
      params.push(restFilters.createdBy);
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM feedback_template_documents WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results with validated ORDER BY
    paramCount++;
    const offset = (page - 1) * limit;
    const result = await query(
      `SELECT * FROM feedback_template_documents 
       WHERE ${whereClause} 
       ORDER BY ${safeSortBy} ${safeSortOrder} 
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    const totalPages = Math.ceil(total / limit);

    return {
      templates: result.rows,
      total,
      page,
      limit,
      totalPages,
    };
  }
}