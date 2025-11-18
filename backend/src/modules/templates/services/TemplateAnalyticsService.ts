import { query } from '../../../config/database.js';

export interface TemplateAnalytics {
  templateId: string;
  totalDownloads: number;
  uniqueUsers: number;
  totalViews: number;
  totalAttachments: number;
  attachmentRate: number; // percentage of downloads that became attachments
  averageRating?: number;
  mostActiveUsers: Array<{
    userId: string;
    userName: string;
    downloadCount: number;
    attachmentCount: number;
  }>;
  usageByType: Record<string, number>;
  usageByDepartment: Record<string, number>;
  usageByRole: Record<string, number>;
  timeSeriesData: Array<{
    date: string;
    downloads: number;
    views: number;
    attachments: number;
  }>;
}

export interface OrganizationTemplateStats {
  totalTemplates: number;
  activeTemplates: number;
  totalDownloads: number;
  totalViews: number;
  totalAttachments: number;
  uniqueUsers: number;
  averageTemplatesPerUser: number;
  mostPopularTemplates: Array<{
    templateId: string;
    templateName: string;
    downloadCount: number;
    attachmentCount: number;
  }>;
  usageByTemplateType: Record<string, number>;
  usageByFileFormat: Record<string, number>;
  usageByDepartment: Record<string, number>;
  usageByRole: Record<string, number>;
  timeSeriesData: Array<{
    date: string;
    downloads: number;
    views: number;
    attachments: number;
  }>;
}

export interface TrendData {
  period: string;
  downloads: number;
  views: number;
  attachments: number;
  uniqueUsers: number;
}

export interface UserTemplateStats {
  userId: string;
  totalDownloads: number;
  totalViews: number;
  totalAttachments: number;
  favoriteTemplates: Array<{
    templateId: string;
    templateName: string;
    downloadCount: number;
    attachmentCount: number;
  }>;
  usageByTemplateType: Record<string, number>;
  usageByFileFormat: Record<string, number>;
  timeSeriesData: Array<{
    date: string;
    downloads: number;
    views: number;
    attachments: number;
  }>;
}

export class TemplateAnalyticsService {
  /**
   * Track template action (download, view, attach)
   */
  static async trackAction(
    templateId: string,
    userId: string,
    action: 'download' | 'view' | 'attach',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await query(
        'INSERT INTO feedback_template_analytics (template_document_id, user_id, action, metadata) VALUES ($1, $2, $3, $4)',
        [templateId, userId, action, JSON.stringify(metadata || {})]
      );
    } catch (error) {
      console.error('Failed to track template action:', error);
    }
  }

  /**
   * Get analytics for a specific template
   */
  static async getTemplateAnalytics(
    templateId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<TemplateAnalytics> {
    // Get template basic info
    const templateResult = await query(
      'SELECT name FROM feedback_template_documents WHERE id = $1',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      throw new Error('Template not found');
    }

    const templateName = templateResult.rows[0].name;

    // Build date filter
    let dateFilter = '';
    let queryParams: any[] = [templateId];
    let paramIndex = 2;

    if (startDate) {
      dateFilter += ` AND created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateFilter += ` AND created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    // Get basic analytics
    const analyticsResult = await query(
      `SELECT 
        COUNT(*) as total_actions,
        COUNT(CASE WHEN action = 'download' THEN 1 END) as total_downloads,
        COUNT(CASE WHEN action = 'view' THEN 1 END) as total_views,
        COUNT(CASE WHEN action = 'attach' THEN 1 END) as total_attachments,
        COUNT(DISTINCT user_id) as unique_users
       FROM feedback_template_analytics 
       WHERE template_document_id = $1 ${dateFilter}`,
      queryParams
    );

    const analytics = analyticsResult.rows[0];
    const totalDownloads = parseInt(analytics.total_downloads) || 0;
    const totalAttachments = parseInt(analytics.total_attachments) || 0;
    const attachmentRate = totalDownloads > 0 ? (totalAttachments / totalDownloads) * 100 : 0;

    // Get most active users
    const activeUsersResult = await query(
      `SELECT 
        u.id as user_id,
        u.name as user_name,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as download_count,
        COUNT(CASE WHEN fta.action = 'attach' THEN 1 END) as attachment_count
       FROM feedback_template_analytics fta
       JOIN users u ON fta.user_id = u.id
       WHERE fta.template_document_id = $1 ${dateFilter}
       GROUP BY u.id, u.name
       ORDER BY download_count DESC, attachment_count DESC
       LIMIT 10`,
      queryParams
    );

    const mostActiveUsers = activeUsersResult.rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      downloadCount: parseInt(row.download_count),
      attachmentCount: parseInt(row.attachment_count),
    }));

    // Get usage by template type (this would be from the template itself)
    const templateTypeResult = await query(
      'SELECT template_type FROM feedback_template_documents WHERE id = $1',
      [templateId]
    );
    const templateType = templateTypeResult.rows[0]?.template_type || 'unknown';

    // Get usage by department
    const departmentResult = await query(
      `SELECT 
        d.name as department_name,
        COUNT(*) as usage_count
       FROM feedback_template_analytics fta
       JOIN users u ON fta.user_id = u.id
       JOIN organization_members om ON u.id = om.user_id
       JOIN departments d ON om.department_id = d.id
       WHERE fta.template_document_id = $1 ${dateFilter}
       GROUP BY d.name
       ORDER BY usage_count DESC`,
      queryParams
    );

    const usageByDepartment: Record<string, number> = {};
    departmentResult.rows.forEach(row => {
      usageByDepartment[row.department_name] = parseInt(row.usage_count);
    });

    // Get usage by role
    const roleResult = await query(
      `SELECT 
        r.name as role_name,
        COUNT(*) as usage_count
       FROM feedback_template_analytics fta
       JOIN users u ON fta.user_id = u.id
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       WHERE fta.template_document_id = $1 ${dateFilter}
       GROUP BY r.name
       ORDER BY usage_count DESC`,
      queryParams
    );

    const usageByRole: Record<string, number> = {};
    roleResult.rows.forEach(row => {
      usageByRole[row.role_name] = parseInt(row.usage_count);
    });

    // Get time series data
    const timeSeriesResult = await query(
      `SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(CASE WHEN action = 'download' THEN 1 END) as downloads,
        COUNT(CASE WHEN action = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN action = 'attach' THEN 1 END) as attachments
       FROM feedback_template_analytics 
       WHERE template_document_id = $1 ${dateFilter}
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date DESC
       LIMIT 30`,
      queryParams
    );

    const timeSeriesData = timeSeriesResult.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      downloads: parseInt(row.downloads),
      views: parseInt(row.views),
      attachments: parseInt(row.attachments),
    }));

    return {
      templateId,
      totalDownloads,
      uniqueUsers: parseInt(analytics.unique_users) || 0,
      totalViews: parseInt(analytics.total_views) || 0,
      totalAttachments,
      attachmentRate,
      mostActiveUsers,
      usageByType: { [templateType]: parseInt(analytics.total_actions) || 0 },
      usageByDepartment,
      usageByRole,
      timeSeriesData,
    };
  }

  /**
   * Get organization-wide template analytics
   */
  static async getOrganizationAnalytics(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<OrganizationTemplateStats> {
    // Build date filter
    let dateFilter = '';
    let queryParams: any[] = [organizationId];
    let paramIndex = 2;

    if (startDate) {
      dateFilter += ` AND fta.created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateFilter += ` AND fta.created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    // Get basic organization stats
    const orgStatsResult = await query(
      `SELECT 
        COUNT(DISTINCT ftd.id) as total_templates,
        COUNT(DISTINCT CASE WHEN ftd.is_active = true THEN ftd.id END) as active_templates,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as total_downloads,
        COUNT(CASE WHEN fta.action = 'view' THEN 1 END) as total_views,
        COUNT(CASE WHEN fta.action = 'attach' THEN 1 END) as total_attachments,
        COUNT(DISTINCT fta.user_id) as unique_users
       FROM feedback_template_documents ftd
       LEFT JOIN feedback_template_analytics fta ON ftd.id = fta.template_document_id ${dateFilter}
       WHERE ftd.organization_id = $1 AND ftd.archived_at IS NULL`,
      queryParams
    );

    const orgStats = orgStatsResult.rows[0];
    const uniqueUsers = parseInt(orgStats.unique_users) || 0;
    const totalTemplates = parseInt(orgStats.total_templates) || 0;
    const averageTemplatesPerUser = uniqueUsers > 0 ? totalTemplates / uniqueUsers : 0;

    // Get most popular templates
    const popularTemplatesResult = await query(
      `SELECT 
        ftd.id as template_id,
        ftd.name as template_name,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as download_count,
        COUNT(CASE WHEN fta.action = 'attach' THEN 1 END) as attachment_count
       FROM feedback_template_documents ftd
       LEFT JOIN feedback_template_analytics fta ON ftd.id = fta.template_document_id ${dateFilter}
       WHERE ftd.organization_id = $1 AND ftd.archived_at IS NULL
       GROUP BY ftd.id, ftd.name
       ORDER BY download_count DESC, attachment_count DESC
       LIMIT 10`,
      queryParams
    );

    const mostPopularTemplates = popularTemplatesResult.rows.map(row => ({
      templateId: row.template_id,
      templateName: row.template_name,
      downloadCount: parseInt(row.download_count),
      attachmentCount: parseInt(row.attachment_count),
    }));

    // Get usage by template type
    const templateTypeResult = await query(
      `SELECT 
        ftd.template_type,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as usage_count
       FROM feedback_template_documents ftd
       LEFT JOIN feedback_template_analytics fta ON ftd.id = fta.template_document_id ${dateFilter}
       WHERE ftd.organization_id = $1 AND ftd.archived_at IS NULL
       GROUP BY ftd.template_type
       ORDER BY usage_count DESC`,
      queryParams
    );

    const usageByTemplateType: Record<string, number> = {};
    templateTypeResult.rows.forEach(row => {
      usageByTemplateType[row.template_type] = parseInt(row.usage_count);
    });

    // Get usage by file format
    const fileFormatResult = await query(
      `SELECT 
        ftd.file_format,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as usage_count
       FROM feedback_template_documents ftd
       LEFT JOIN feedback_template_analytics fta ON ftd.id = fta.template_document_id ${dateFilter}
       WHERE ftd.organization_id = $1 AND ftd.archived_at IS NULL
       GROUP BY ftd.file_format
       ORDER BY usage_count DESC`,
      queryParams
    );

    const usageByFileFormat: Record<string, number> = {};
    fileFormatResult.rows.forEach(row => {
      usageByFileFormat[row.file_format] = parseInt(row.usage_count);
    });

    // Get usage by department
    const departmentResult = await query(
      `SELECT 
        d.name as department_name,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as usage_count
       FROM feedback_template_analytics fta
       JOIN users u ON fta.user_id = u.id
       JOIN organization_members om ON u.id = om.user_id
       JOIN departments d ON om.department_id = d.id
       JOIN feedback_template_documents ftd ON fta.template_document_id = ftd.id
       WHERE ftd.organization_id = $1 ${dateFilter}
       GROUP BY d.name
       ORDER BY usage_count DESC`,
      queryParams
    );

    const usageByDepartment: Record<string, number> = {};
    departmentResult.rows.forEach(row => {
      usageByDepartment[row.department_name] = parseInt(row.usage_count);
    });

    // Get usage by role
    const roleResult = await query(
      `SELECT 
        r.name as role_name,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as usage_count
       FROM feedback_template_analytics fta
       JOIN users u ON fta.user_id = u.id
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles r ON ur.role_id = r.id
       JOIN feedback_template_documents ftd ON fta.template_document_id = ftd.id
       WHERE ftd.organization_id = $1 ${dateFilter}
       GROUP BY r.name
       ORDER BY usage_count DESC`,
      queryParams
    );

    const usageByRole: Record<string, number> = {};
    roleResult.rows.forEach(row => {
      usageByRole[row.role_name] = parseInt(row.usage_count);
    });

    // Get time series data
    const timeSeriesResult = await query(
      `SELECT 
        DATE_TRUNC('day', fta.created_at) as date,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as downloads,
        COUNT(CASE WHEN fta.action = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN fta.action = 'attach' THEN 1 END) as attachments
       FROM feedback_template_analytics fta
       JOIN feedback_template_documents ftd ON fta.template_document_id = ftd.id
       WHERE ftd.organization_id = $1 ${dateFilter}
       GROUP BY DATE_TRUNC('day', fta.created_at)
       ORDER BY date DESC
       LIMIT 30`,
      queryParams
    );

    const timeSeriesData = timeSeriesResult.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      downloads: parseInt(row.downloads),
      views: parseInt(row.views),
      attachments: parseInt(row.attachments),
    }));

    return {
      totalTemplates,
      activeTemplates: parseInt(orgStats.active_templates) || 0,
      totalDownloads: parseInt(orgStats.total_downloads) || 0,
      totalViews: parseInt(orgStats.total_views) || 0,
      totalAttachments: parseInt(orgStats.total_attachments) || 0,
      uniqueUsers,
      averageTemplatesPerUser,
      mostPopularTemplates,
      usageByTemplateType,
      usageByFileFormat,
      usageByDepartment,
      usageByRole,
      timeSeriesData,
    };
  }

  /**
   * Get usage trends for a template
   */
  static async getTemplateTrends(
    templateId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    limit: number = 30
  ): Promise<TrendData[]> {
    const dateTrunc = period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : 'day';

    const result = await query(
      `SELECT 
        DATE_TRUNC($2, created_at) as period,
        COUNT(CASE WHEN action = 'download' THEN 1 END) as downloads,
        COUNT(CASE WHEN action = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN action = 'attach' THEN 1 END) as attachments,
        COUNT(DISTINCT user_id) as unique_users
       FROM feedback_template_analytics 
       WHERE template_document_id = $1
       GROUP BY DATE_TRUNC($2, created_at)
       ORDER BY period DESC
       LIMIT $3`,
      [templateId, dateTrunc, limit]
    );

    return result.rows.map(row => ({
      period: row.period.toISOString(),
      downloads: parseInt(row.downloads),
      views: parseInt(row.views),
      attachments: parseInt(row.attachments),
      uniqueUsers: parseInt(row.unique_users),
    }));
  }

  /**
   * Get user-specific template analytics
   */
  static async getUserAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserTemplateStats> {
    // Build date filter
    let dateFilter = '';
    let queryParams: any[] = [userId];
    let paramIndex = 2;

    if (startDate) {
      dateFilter += ` AND created_at >= $${paramIndex}`;
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      dateFilter += ` AND created_at <= $${paramIndex}`;
      queryParams.push(endDate);
      paramIndex++;
    }

    // Get basic user stats
    const userStatsResult = await query(
      `SELECT 
        COUNT(CASE WHEN action = 'download' THEN 1 END) as total_downloads,
        COUNT(CASE WHEN action = 'view' THEN 1 END) as total_views,
        COUNT(CASE WHEN action = 'attach' THEN 1 END) as total_attachments
       FROM feedback_template_analytics 
       WHERE user_id = $1 ${dateFilter}`,
      queryParams
    );

    const userStats = userStatsResult.rows[0];

    // Get favorite templates
    const favoriteTemplatesResult = await query(
      `SELECT 
        ftd.id as template_id,
        ftd.name as template_name,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as download_count,
        COUNT(CASE WHEN fta.action = 'attach' THEN 1 END) as attachment_count
       FROM feedback_template_analytics fta
       JOIN feedback_template_documents ftd ON fta.template_document_id = ftd.id
       WHERE fta.user_id = $1 ${dateFilter}
       GROUP BY ftd.id, ftd.name
       ORDER BY download_count DESC, attachment_count DESC
       LIMIT 10`,
      queryParams
    );

    const favoriteTemplates = favoriteTemplatesResult.rows.map(row => ({
      templateId: row.template_id,
      templateName: row.template_name,
      downloadCount: parseInt(row.download_count),
      attachmentCount: parseInt(row.attachment_count),
    }));

    // Get usage by template type
    const templateTypeResult = await query(
      `SELECT 
        ftd.template_type,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as usage_count
       FROM feedback_template_analytics fta
       JOIN feedback_template_documents ftd ON fta.template_document_id = ftd.id
       WHERE fta.user_id = $1 ${dateFilter}
       GROUP BY ftd.template_type
       ORDER BY usage_count DESC`,
      queryParams
    );

    const usageByTemplateType: Record<string, number> = {};
    templateTypeResult.rows.forEach(row => {
      usageByTemplateType[row.template_type] = parseInt(row.usage_count);
    });

    // Get usage by file format
    const fileFormatResult = await query(
      `SELECT 
        ftd.file_format,
        COUNT(CASE WHEN fta.action = 'download' THEN 1 END) as usage_count
       FROM feedback_template_analytics fta
       JOIN feedback_template_documents ftd ON fta.template_document_id = ftd.id
       WHERE fta.user_id = $1 ${dateFilter}
       GROUP BY ftd.file_format
       ORDER BY usage_count DESC`,
      queryParams
    );

    const usageByFileFormat: Record<string, number> = {};
    fileFormatResult.rows.forEach(row => {
      usageByFileFormat[row.file_format] = parseInt(row.usage_count);
    });

    // Get time series data
    const timeSeriesResult = await query(
      `SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(CASE WHEN action = 'download' THEN 1 END) as downloads,
        COUNT(CASE WHEN action = 'view' THEN 1 END) as views,
        COUNT(CASE WHEN action = 'attach' THEN 1 END) as attachments
       FROM feedback_template_analytics 
       WHERE user_id = $1 ${dateFilter}
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date DESC
       LIMIT 30`,
      queryParams
    );

    const timeSeriesData = timeSeriesResult.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      downloads: parseInt(row.downloads),
      views: parseInt(row.views),
      attachments: parseInt(row.attachments),
    }));

    return {
      userId,
      totalDownloads: parseInt(userStats.total_downloads) || 0,
      totalViews: parseInt(userStats.total_views) || 0,
      totalAttachments: parseInt(userStats.total_attachments) || 0,
      favoriteTemplates,
      usageByTemplateType,
      usageByFileFormat,
      timeSeriesData,
    };
  }

  /**
   * Get download history for a template
   */
  static async getDownloadHistory(
    templateId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    downloads: Array<{
      userId: string;
      userName: string;
      userEmail: string;
      downloadedAt: Date;
      metadata?: any;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM feedback_template_analytics WHERE template_document_id = $1 AND action = $2',
      [templateId, 'download']
    );
    const total = parseInt(countResult.rows[0].total);

    // Get downloads
    const downloadsResult = await query(
      `SELECT 
        fta.user_id,
        u.name as user_name,
        u.email as user_email,
        fta.created_at as downloaded_at,
        fta.metadata
       FROM feedback_template_analytics fta
       JOIN users u ON fta.user_id = u.id
       WHERE fta.template_document_id = $1 AND fta.action = $2
       ORDER BY fta.created_at DESC
       LIMIT $3 OFFSET $4`,
      [templateId, 'download', limit, offset]
    );

    const downloads = downloadsResult.rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      downloadedAt: row.downloaded_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      downloads,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Generate usage reports
   */
  static async generateUsageReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ): Promise<any> {
    const analytics = await this.getOrganizationAnalytics(organizationId, startDate, endDate);

    if (format === 'csv') {
      // Convert to CSV format
      const csvRows = [
        ['Metric', 'Value'],
        ['Total Templates', analytics.totalTemplates.toString()],
        ['Active Templates', analytics.activeTemplates.toString()],
        ['Total Downloads', analytics.totalDownloads.toString()],
        ['Total Views', analytics.totalViews.toString()],
        ['Total Attachments', analytics.totalAttachments.toString()],
        ['Unique Users', analytics.uniqueUsers.toString()],
        ['Average Templates Per User', analytics.averageTemplatesPerUser.toFixed(2)],
      ];

      // Add most popular templates
      csvRows.push(['', '']);
      csvRows.push(['Most Popular Templates', '']);
      csvRows.push(['Template Name', 'Downloads', 'Attachments']);
      analytics.mostPopularTemplates.forEach(template => {
        csvRows.push([template.templateName, template.downloadCount.toString(), template.attachmentCount.toString()]);
      });

      return csvRows.map(row => row.join(',')).join('\n');
    }

    return analytics;
  }
}




