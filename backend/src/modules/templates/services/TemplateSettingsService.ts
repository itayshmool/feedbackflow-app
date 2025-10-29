import { query } from '../../../config/database.js';

export interface TemplateSettings {
  maxFileSizeMB: number;
  allowedFileFormats: string[];
  virusScanningEnabled: boolean;
  storageProvider: 'local' | 's3' | 'azure' | 'gcs';
  autoDeleteAfterDays: number;
  maxTemplatesPerOrganization: number;
  allowPublicTemplates: boolean;
  requireApprovalForTemplates: boolean;
  defaultPermissions: {
    roles: string[];
    departments: string[];
    cycles: string[];
  };
  notificationSettings: {
    notifyOnUpload: boolean;
    notifyOnDownload: boolean;
    notifyOnAttachment: boolean;
    notifyOnApproval: boolean;
  };
  retentionPolicy: {
    keepTemplatesForDays: number;
    keepAttachmentsForDays: number;
    keepAnalyticsForDays: number;
  };
  securitySettings: {
    requireVirusScan: boolean;
    allowAnonymousDownloads: boolean;
    requireAuthenticationForDownloads: boolean;
    maxDownloadsPerUser: number;
  };
}

export interface TemplateSettingsUpdate {
  maxFileSizeMB?: number;
  allowedFileFormats?: string[];
  virusScanningEnabled?: boolean;
  storageProvider?: 'local' | 's3' | 'azure' | 'gcs';
  autoDeleteAfterDays?: number;
  maxTemplatesPerOrganization?: number;
  allowPublicTemplates?: boolean;
  requireApprovalForTemplates?: boolean;
  defaultPermissions?: {
    roles: string[];
    departments: string[];
    cycles: string[];
  };
  notificationSettings?: {
    notifyOnUpload: boolean;
    notifyOnDownload: boolean;
    notifyOnAttachment: boolean;
    notifyOnApproval: boolean;
  };
  retentionPolicy?: {
    keepTemplatesForDays: number;
    keepAttachmentsForDays: number;
    keepAnalyticsForDays: number;
  };
  securitySettings?: {
    requireVirusScan: boolean;
    allowAnonymousDownloads: boolean;
    requireAuthenticationForDownloads: boolean;
    maxDownloadsPerUser: number;
  };
}

export class TemplateSettingsService {
  private static readonly DEFAULT_SETTINGS: TemplateSettings = {
    maxFileSizeMB: parseInt(process.env.MAX_TEMPLATE_SIZE_MB || '10'),
    allowedFileFormats: ['.docx', '.pdf', '.doc'],
    virusScanningEnabled: process.env.VIRUS_SCANNING_ENABLED === 'true',
    storageProvider: (process.env.STORAGE_PROVIDER as any) || 'local',
    autoDeleteAfterDays: parseInt(process.env.AUTO_DELETE_AFTER_DAYS || '365'),
    maxTemplatesPerOrganization: parseInt(process.env.MAX_TEMPLATES_PER_ORG || '100'),
    allowPublicTemplates: false,
    requireApprovalForTemplates: false,
    defaultPermissions: {
      roles: ['admin', 'manager', 'employee'],
      departments: [],
      cycles: [],
    },
    notificationSettings: {
      notifyOnUpload: true,
      notifyOnDownload: false,
      notifyOnAttachment: true,
      notifyOnApproval: true,
    },
    retentionPolicy: {
      keepTemplatesForDays: 365,
      keepAttachmentsForDays: 180,
      keepAnalyticsForDays: 90,
    },
    securitySettings: {
      requireVirusScan: true,
      allowAnonymousDownloads: false,
      requireAuthenticationForDownloads: true,
      maxDownloadsPerUser: 100,
    },
  };

  /**
   * Get global template settings
   */
  static async getGlobalSettings(): Promise<TemplateSettings> {
    try {
      const result = await query(
        'SELECT settings FROM system_settings WHERE key = $1',
        ['template_settings']
      );

      if (result.rows.length === 0) {
        // Return default settings if none exist
        return this.DEFAULT_SETTINGS;
      }

      const settings = result.rows[0].settings;
      return { ...this.DEFAULT_SETTINGS, ...settings };
    } catch (error) {
      console.error('Failed to get template settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  /**
   * Update global template settings
   */
  static async updateGlobalSettings(settings: TemplateSettingsUpdate): Promise<TemplateSettings> {
    try {
      // Get current settings
      const currentSettings = await this.getGlobalSettings();
      
      // Merge with new settings
      const updatedSettings = { ...currentSettings, ...settings };

      // Validate settings
      this.validateSettings(updatedSettings);

      // Store in database
      await query(
        `INSERT INTO system_settings (key, settings, updated_at) 
         VALUES ($1, $2, NOW()) 
         ON CONFLICT (key) 
         DO UPDATE SET settings = $2, updated_at = NOW()`,
        ['template_settings', JSON.stringify(updatedSettings)]
      );

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update template settings:', error);
      throw error;
    }
  }

  /**
   * Get organization-specific template settings
   */
  static async getOrganizationSettings(organizationId: string): Promise<TemplateSettings> {
    try {
      const result = await query(
        'SELECT template_settings FROM organizations WHERE id = $1',
        [organizationId]
      );

      if (result.rows.length === 0) {
        throw new Error('Organization not found');
      }

      const orgSettings = result.rows[0].template_settings;
      const globalSettings = await this.getGlobalSettings();

      // Merge organization settings with global settings
      return { ...globalSettings, ...orgSettings };
    } catch (error) {
      console.error('Failed to get organization template settings:', error);
      return await this.getGlobalSettings();
    }
  }

  /**
   * Update organization-specific template settings
   */
  static async updateOrganizationSettings(
    organizationId: string,
    settings: TemplateSettingsUpdate
  ): Promise<TemplateSettings> {
    try {
      // Get current organization settings
      const currentSettings = await this.getOrganizationSettings(organizationId);
      
      // Merge with new settings
      const updatedSettings = { ...currentSettings, ...settings };

      // Validate settings
      this.validateSettings(updatedSettings);

      // Store in database
      await query(
        'UPDATE organizations SET template_settings = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(updatedSettings), organizationId]
      );

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update organization template settings:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  static async resetToDefaults(organizationId?: string): Promise<TemplateSettings> {
    if (organizationId) {
      return await this.updateOrganizationSettings(organizationId, this.DEFAULT_SETTINGS);
    } else {
      return await this.updateGlobalSettings(this.DEFAULT_SETTINGS);
    }
  }

  /**
   * Get storage configuration
   */
  static async getStorageConfig(): Promise<{
    provider: string;
    config: Record<string, any>;
  }> {
    const settings = await this.getGlobalSettings();
    
    const config: Record<string, any> = {};
    
    switch (settings.storageProvider) {
      case 's3':
        config.bucket = process.env.AWS_S3_BUCKET;
        config.region = process.env.AWS_S3_REGION || 'us-east-1';
        config.accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID;
        config.secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY;
        break;
      case 'azure':
        config.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        config.accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        config.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
        break;
      case 'gcs':
        config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        config.bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME;
        config.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILENAME;
        break;
      case 'local':
      default:
        config.path = process.env.STORAGE_LOCAL_PATH || './uploads';
        break;
    }

    return {
      provider: settings.storageProvider,
      config,
    };
  }

  /**
   * Get file validation rules
   */
  static async getFileValidationRules(): Promise<{
    maxSizeMB: number;
    allowedTypes: string[];
    allowedExtensions: string[];
  }> {
    const settings = await this.getGlobalSettings();
    
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf', // .pdf
      'application/msword', // .doc
    ];

    return {
      maxSizeMB: settings.maxFileSizeMB,
      allowedTypes,
      allowedExtensions: settings.allowedFileFormats,
    };
  }

  /**
   * Check if user can upload templates
   */
  static async canUserUploadTemplates(
    userId: string,
    organizationId: string
  ): Promise<{ canUpload: boolean; reason?: string }> {
    try {
      const settings = await this.getOrganizationSettings(organizationId);
      
      // Check if user has required role
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
        return { canUpload: false, reason: 'User not found' };
      }

      const userRoles = userResult.rows[0].roles || [];
      const hasRequiredRole = settings.defaultPermissions.roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return { canUpload: false, reason: 'Insufficient permissions' };
      }

      // Check template limit
      const templateCountResult = await query(
        'SELECT COUNT(*) as count FROM feedback_template_documents WHERE organization_id = $1 AND archived_at IS NULL',
        [organizationId]
      );

      const templateCount = parseInt(templateCountResult.rows[0].count);
      if (templateCount >= settings.maxTemplatesPerOrganization) {
        return { canUpload: false, reason: 'Organization template limit reached' };
      }

      return { canUpload: true };
    } catch (error) {
      console.error('Failed to check upload permissions:', error);
      return { canUpload: false, reason: 'Error checking permissions' };
    }
  }

  /**
   * Get notification settings
   */
  static async getNotificationSettings(organizationId: string): Promise<TemplateSettings['notificationSettings']> {
    const settings = await this.getOrganizationSettings(organizationId);
    return settings.notificationSettings;
  }

  /**
   * Get retention policy
   */
  static async getRetentionPolicy(organizationId: string): Promise<TemplateSettings['retentionPolicy']> {
    const settings = await this.getOrganizationSettings(organizationId);
    return settings.retentionPolicy;
  }

  /**
   * Get security settings
   */
  static async getSecuritySettings(organizationId: string): Promise<TemplateSettings['securitySettings']> {
    const settings = await this.getOrganizationSettings(organizationId);
    return settings.securitySettings;
  }

  /**
   * Validate settings
   */
  private static validateSettings(settings: TemplateSettings): void {
    if (settings.maxFileSizeMB < 1 || settings.maxFileSizeMB > 100) {
      throw new Error('Max file size must be between 1 and 100 MB');
    }

    if (settings.allowedFileFormats.length === 0) {
      throw new Error('At least one file format must be allowed');
    }

    if (settings.autoDeleteAfterDays < 1 || settings.autoDeleteAfterDays > 3650) {
      throw new Error('Auto delete days must be between 1 and 3650');
    }

    if (settings.maxTemplatesPerOrganization < 1 || settings.maxTemplatesPerOrganization > 10000) {
      throw new Error('Max templates per organization must be between 1 and 10000');
    }

    if (settings.defaultPermissions.roles.length === 0) {
      throw new Error('At least one role must be specified in default permissions');
    }

    if (settings.retentionPolicy.keepTemplatesForDays < 1) {
      throw new Error('Template retention days must be at least 1');
    }

    if (settings.retentionPolicy.keepAttachmentsForDays < 1) {
      throw new Error('Attachment retention days must be at least 1');
    }

    if (settings.retentionPolicy.keepAnalyticsForDays < 1) {
      throw new Error('Analytics retention days must be at least 1');
    }

    if (settings.securitySettings.maxDownloadsPerUser < 1) {
      throw new Error('Max downloads per user must be at least 1');
    }
  }

  /**
   * Get settings summary for dashboard
   */
  static async getSettingsSummary(organizationId: string): Promise<{
    totalTemplates: number;
    maxTemplates: number;
    storageUsed: number;
    storageLimit: number;
    virusScanningEnabled: boolean;
    retentionDays: number;
    lastUpdated: Date;
  }> {
    const settings = await this.getOrganizationSettings(organizationId);
    
    // Get template count
    const templateCountResult = await query(
      'SELECT COUNT(*) as count FROM feedback_template_documents WHERE organization_id = $1 AND archived_at IS NULL',
      [organizationId]
    );
    const totalTemplates = parseInt(templateCountResult.rows[0].count);

    // Get storage usage (simplified - would need actual storage calculation)
    const storageResult = await query(
      'SELECT SUM(file_size) as total_size FROM feedback_template_documents WHERE organization_id = $1 AND archived_at IS NULL',
      [organizationId]
    );
    const storageUsed = parseInt(storageResult.rows[0].total_size) || 0;
    const storageLimit = settings.maxTemplatesPerOrganization * settings.maxFileSizeMB * 1024 * 1024; // Rough estimate

    // Get last updated
    const lastUpdatedResult = await query(
      'SELECT updated_at FROM organizations WHERE id = $1',
      [organizationId]
    );
    const lastUpdated = lastUpdatedResult.rows[0]?.updated_at || new Date();

    return {
      totalTemplates,
      maxTemplates: settings.maxTemplatesPerOrganization,
      storageUsed,
      storageLimit,
      virusScanningEnabled: settings.virusScanningEnabled,
      retentionDays: settings.retentionPolicy.keepTemplatesForDays,
      lastUpdated,
    };
  }
}
