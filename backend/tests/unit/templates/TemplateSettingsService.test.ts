import { TemplateSettingsService } from '../../../src/modules/templates/services/TemplateSettingsService.js';
import { query } from '../../../src/config/database.js';
import { jest } from '@jest/globals';

// Mock database query function
jest.mock('../../../src/config/database.js', () => ({
  query: jest.fn()
}));

describe('TemplateSettingsService', () => {
  let templateSettingsService: TemplateSettingsService;
  let mockQuery: jest.MockedFunction<typeof query>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = query as jest.MockedFunction<typeof query>;
    templateSettingsService = new TemplateSettingsService();
  });

  describe('getGlobalSettings', () => {
    it('should get global settings successfully', async () => {
      const mockSettings = {
        maxFileSizeMB: 10,
        allowedFileFormats: ['.docx', '.pdf', '.doc'],
        virusScanningEnabled: true,
        storageProvider: 'local',
        autoDeleteAfterDays: 365,
        maxTemplatesPerOrganization: 100,
        allowPublicTemplates: false,
        requireApprovalForTemplates: false,
        defaultPermissions: {
          roles: ['admin', 'manager', 'employee'],
          departments: [],
          cycles: []
        },
        notificationSettings: {
          notifyOnUpload: true,
          notifyOnDownload: false,
          notifyOnAttachment: true,
          notifyOnApproval: true
        },
        retentionPolicy: {
          keepTemplatesForDays: 365,
          keepAttachmentsForDays: 180,
          keepAnalyticsForDays: 90
        },
        securitySettings: {
          requireVirusScan: true,
          allowAnonymousDownloads: false,
          requireAuthenticationForDownloads: true,
          maxDownloadsPerUser: 100
        }
      };

      mockQuery.mockResolvedValue({ rows: [mockSettings] });

      const result = await templateSettingsService.getGlobalSettings();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM template_settings WHERE setting_type = $1'),
        ['global']
      );

      expect(result).toEqual(mockSettings);
    });

    it('should return default settings when no settings found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await templateSettingsService.getGlobalSettings();

      expect(result).toEqual({
        maxFileSizeMB: 10,
        allowedFileFormats: ['.docx', '.pdf', '.doc'],
        virusScanningEnabled: false,
        storageProvider: 'local',
        autoDeleteAfterDays: 365,
        maxTemplatesPerOrganization: 100,
        allowPublicTemplates: false,
        requireApprovalForTemplates: false,
        defaultPermissions: {
          roles: ['admin', 'manager', 'employee'],
          departments: [],
          cycles: []
        },
        notificationSettings: {
          notifyOnUpload: true,
          notifyOnDownload: false,
          notifyOnAttachment: true,
          notifyOnApproval: true
        },
        retentionPolicy: {
          keepTemplatesForDays: 365,
          keepAttachmentsForDays: 180,
          keepAnalyticsForDays: 90
        },
        securitySettings: {
          requireVirusScan: false,
          allowAnonymousDownloads: false,
          requireAuthenticationForDownloads: true,
          maxDownloadsPerUser: 100
        }
      });
    });

    it('should handle database errors during settings retrieval', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.getGlobalSettings())
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('updateGlobalSettings', () => {
    it('should update global settings successfully', async () => {
      const updateData = {
        maxFileSizeMB: 15,
        virusScanningEnabled: false,
        maxTemplatesPerOrganization: 150,
        securitySettings: {
          requireVirusScan: false,
          maxDownloadsPerUser: 200
        }
      };

      const mockUpdatedSettings = {
        id: 'settings-123',
        ...updateData,
        updatedAt: '2024-01-15T12:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedSettings] });

      const result = await templateSettingsService.updateGlobalSettings(updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE template_settings SET'),
        expect.arrayContaining([
          JSON.stringify(updateData),
          'global'
        ])
      );

      expect(result).toEqual(mockUpdatedSettings);
    });

    it('should create new settings if none exist', async () => {
      const updateData = {
        maxFileSizeMB: 15,
        virusScanningEnabled: false
      };

      const mockNewSettings = {
        id: 'settings-123',
        settingType: 'global',
        settings: JSON.stringify(updateData),
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z'
      };

      // First call returns empty (no existing settings)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Second call returns the created settings
      mockQuery.mockResolvedValueOnce({ rows: [mockNewSettings] });

      const result = await templateSettingsService.updateGlobalSettings(updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO template_settings'),
        ['global', JSON.stringify(updateData)]
      );

      expect(result).toEqual(mockNewSettings);
    });

    it('should handle database errors during settings update', async () => {
      const updateData = {
        maxFileSizeMB: 15,
        virusScanningEnabled: false
      };

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.updateGlobalSettings(updateData))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults successfully', async () => {
      const mockResetSettings = {
        id: 'settings-123',
        settingType: 'global',
        settings: JSON.stringify({
          maxFileSizeMB: 10,
          allowedFileFormats: ['.docx', '.pdf', '.doc'],
          virusScanningEnabled: false,
          storageProvider: 'local',
          autoDeleteAfterDays: 365,
          maxTemplatesPerOrganization: 100,
          allowPublicTemplates: false,
          requireApprovalForTemplates: false
        }),
        updatedAt: '2024-01-15T12:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockResetSettings] });

      const result = await templateSettingsService.resetSettings();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE template_settings SET'),
        expect.arrayContaining(['global'])
      );

      expect(result).toEqual(mockResetSettings);
    });

    it('should handle database errors during settings reset', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.resetSettings())
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getStorageConfig', () => {
    it('should get storage configuration successfully', async () => {
      const mockStorageConfig = {
        provider: 's3',
        config: {
          bucket: 'feedbackflow-templates',
          region: 'us-east-1',
          accessKeyId: 'AKIA...',
          secretAccessKey: '***'
        }
      };

      mockQuery.mockResolvedValue({ rows: [mockStorageConfig] });

      const result = await templateSettingsService.getStorageConfig();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT storage_provider, storage_config FROM template_settings'),
        ['global']
      );

      expect(result).toEqual(mockStorageConfig);
    });

    it('should return default storage config when none found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await templateSettingsService.getStorageConfig();

      expect(result).toEqual({
        provider: 'local',
        config: {
          path: './uploads'
        }
      });
    });

    it('should handle database errors during storage config retrieval', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.getStorageConfig())
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getOrganizationSettings', () => {
    it('should get organization settings successfully', async () => {
      const organizationId = 'org-123';
      const mockOrgSettings = {
        maxFileSizeMB: 15,
        allowedFileFormats: ['.docx', '.pdf'],
        virusScanningEnabled: true,
        maxTemplatesPerOrganization: 200,
        defaultPermissions: {
          roles: ['admin', 'manager'],
          departments: ['engineering', 'marketing'],
          cycles: []
        }
      };

      mockQuery.mockResolvedValue({ rows: [mockOrgSettings] });

      const result = await templateSettingsService.getOrganizationSettings(organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM template_settings WHERE organization_id = $1'),
        [organizationId]
      );

      expect(result).toEqual(mockOrgSettings);
    });

    it('should return null when no organization settings found', async () => {
      const organizationId = 'org-123';
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await templateSettingsService.getOrganizationSettings(organizationId);

      expect(result).toBeNull();
    });

    it('should handle database errors during organization settings retrieval', async () => {
      const organizationId = 'org-123';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.getOrganizationSettings(organizationId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('updateOrganizationSettings', () => {
    it('should update organization settings successfully', async () => {
      const organizationId = 'org-123';
      const updateData = {
        maxFileSizeMB: 20,
        virusScanningEnabled: true,
        maxTemplatesPerOrganization: 300
      };

      const mockUpdatedSettings = {
        id: 'org-settings-123',
        organizationId,
        ...updateData,
        updatedAt: '2024-01-15T12:00:00Z'
      };

      mockQuery.mockResolvedValue({ rows: [mockUpdatedSettings] });

      const result = await templateSettingsService.updateOrganizationSettings(organizationId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE template_settings SET'),
        expect.arrayContaining([
          JSON.stringify(updateData),
          organizationId
        ])
      );

      expect(result).toEqual(mockUpdatedSettings);
    });

    it('should create new organization settings if none exist', async () => {
      const organizationId = 'org-123';
      const updateData = {
        maxFileSizeMB: 20,
        virusScanningEnabled: true
      };

      const mockNewSettings = {
        id: 'org-settings-123',
        organizationId,
        settings: JSON.stringify(updateData),
        createdAt: '2024-01-15T12:00:00Z',
        updatedAt: '2024-01-15T12:00:00Z'
      };

      // First call returns empty (no existing settings)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      // Second call returns the created settings
      mockQuery.mockResolvedValueOnce({ rows: [mockNewSettings] });

      const result = await templateSettingsService.updateOrganizationSettings(organizationId, updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO template_settings'),
        [organizationId, JSON.stringify(updateData)]
      );

      expect(result).toEqual(mockNewSettings);
    });

    it('should handle database errors during organization settings update', async () => {
      const organizationId = 'org-123';
      const updateData = {
        maxFileSizeMB: 20,
        virusScanningEnabled: true
      };

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.updateOrganizationSettings(organizationId, updateData))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getValidationRules', () => {
    it('should get validation rules successfully', async () => {
      const mockValidationRules = {
        maxSizeMB: 10,
        allowedTypes: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/pdf',
          'application/msword'
        ],
        allowedExtensions: ['.docx', '.pdf', '.doc'],
        maxFileNameLength: 255,
        sanitizeFileName: true,
        checkFileContent: false
      };

      mockQuery.mockResolvedValue({ rows: [mockValidationRules] });

      const result = await templateSettingsService.getValidationRules();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT validation_rules FROM template_settings'),
        ['global']
      );

      expect(result).toEqual(mockValidationRules);
    });

    it('should return default validation rules when none found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await templateSettingsService.getValidationRules();

      expect(result).toEqual({
        maxSizeMB: 10,
        allowedTypes: [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/pdf',
          'application/msword'
        ],
        allowedExtensions: ['.docx', '.pdf', '.doc'],
        maxFileNameLength: 255,
        sanitizeFileName: true,
        checkFileContent: false
      });
    });

    it('should handle database errors during validation rules retrieval', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.getValidationRules())
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('checkUploadPermissions', () => {
    it('should check upload permissions successfully', async () => {
      const userId = 'user-456';
      const userRole = 'admin';
      const organizationId = 'org-123';

      const mockPermissions = {
        canUpload: true,
        maxFileSizeMB: 10,
        allowedFormats: ['.docx', '.pdf', '.doc'],
        remainingUploads: 95
      };

      mockQuery.mockResolvedValue({ rows: [mockPermissions] });

      const result = await templateSettingsService.checkUploadPermissions(userId, userRole, organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId, userRole, organizationId]
      );

      expect(result).toEqual(mockPermissions);
    });

    it('should deny upload permissions for non-admin users', async () => {
      const userId = 'user-456';
      const userRole = 'employee';
      const organizationId = 'org-123';

      const mockPermissions = {
        canUpload: false,
        reason: 'Admin role required for template uploads'
      };

      mockQuery.mockResolvedValue({ rows: [mockPermissions] });

      const result = await templateSettingsService.checkUploadPermissions(userId, userRole, organizationId);

      expect(result).toEqual(mockPermissions);
    });

    it('should handle database errors during permission check', async () => {
      const userId = 'user-456';
      const userRole = 'admin';
      const organizationId = 'org-123';

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.checkUploadPermissions(userId, userRole, organizationId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getSettingsSummary', () => {
    it('should get settings summary successfully', async () => {
      const organizationId = 'org-123';
      const mockSummary = {
        globalSettings: {
          maxFileSizeMB: 10,
          virusScanningEnabled: false,
          storageProvider: 'local'
        },
        organizationSettings: {
          maxFileSizeMB: 15,
          virusScanningEnabled: true,
          maxTemplatesPerOrganization: 200
        },
        effectiveSettings: {
          maxFileSizeMB: 15,
          virusScanningEnabled: true,
          storageProvider: 'local',
          maxTemplatesPerOrganization: 200
        },
        templateCount: 5,
        attachmentCount: 25,
        storageUsage: '2.5GB'
      };

      mockQuery.mockResolvedValue({ rows: [mockSummary] });

      const result = await templateSettingsService.getSettingsSummary(organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId]
      );

      expect(result).toEqual(mockSummary);
    });

    it('should handle database errors during summary retrieval', async () => {
      const organizationId = 'org-123';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.getSettingsSummary(organizationId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getNotificationSettings', () => {
    it('should get notification settings successfully', async () => {
      const mockNotificationSettings = {
        notifyOnUpload: true,
        notifyOnDownload: false,
        notifyOnAttachment: true,
        notifyOnApproval: true,
        notifyOnVirusDetection: true,
        emailNotifications: true,
        webhookUrl: 'https://hooks.slack.com/...',
        notificationChannels: ['email', 'webhook']
      };

      mockQuery.mockResolvedValue({ rows: [mockNotificationSettings] });

      const result = await templateSettingsService.getNotificationSettings();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT notification_settings FROM template_settings'),
        ['global']
      );

      expect(result).toEqual(mockNotificationSettings);
    });

    it('should return default notification settings when none found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await templateSettingsService.getNotificationSettings();

      expect(result).toEqual({
        notifyOnUpload: true,
        notifyOnDownload: false,
        notifyOnAttachment: true,
        notifyOnApproval: true,
        notifyOnVirusDetection: true,
        emailNotifications: true,
        webhookUrl: null,
        notificationChannels: ['email']
      });
    });

    it('should handle database errors during notification settings retrieval', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.getNotificationSettings())
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getRetentionPolicy', () => {
    it('should get retention policy successfully', async () => {
      const mockRetentionPolicy = {
        keepTemplatesForDays: 365,
        keepAttachmentsForDays: 180,
        keepAnalyticsForDays: 90,
        autoDeleteEnabled: true,
        deleteSchedule: 'daily',
        archiveBeforeDelete: true,
        retentionExceptions: {
          adminTemplates: 730,
          defaultTemplates: 1095
        }
      };

      mockQuery.mockResolvedValue({ rows: [mockRetentionPolicy] });

      const result = await templateSettingsService.getRetentionPolicy();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT retention_policy FROM template_settings'),
        ['global']
      );

      expect(result).toEqual(mockRetentionPolicy);
    });

    it('should return default retention policy when none found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await templateSettingsService.getRetentionPolicy();

      expect(result).toEqual({
        keepTemplatesForDays: 365,
        keepAttachmentsForDays: 180,
        keepAnalyticsForDays: 90,
        autoDeleteEnabled: false,
        deleteSchedule: 'weekly',
        archiveBeforeDelete: true,
        retentionExceptions: {}
      });
    });

    it('should handle database errors during retention policy retrieval', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.getRetentionPolicy())
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getSecuritySettings', () => {
    it('should get security settings successfully', async () => {
      const mockSecuritySettings = {
        requireVirusScan: true,
        allowAnonymousDownloads: false,
        requireAuthenticationForDownloads: true,
        maxDownloadsPerUser: 100,
        ipWhitelist: ['192.168.1.0/24'],
        allowedDomains: ['company.com'],
        encryptionEnabled: true,
        auditLogging: true,
        sessionTimeout: 3600
      };

      mockQuery.mockResolvedValue({ rows: [mockSecuritySettings] });

      const result = await templateSettingsService.getSecuritySettings();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT security_settings FROM template_settings'),
        ['global']
      );

      expect(result).toEqual(mockSecuritySettings);
    });

    it('should return default security settings when none found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await templateSettingsService.getSecuritySettings();

      expect(result).toEqual({
        requireVirusScan: false,
        allowAnonymousDownloads: false,
        requireAuthenticationForDownloads: true,
        maxDownloadsPerUser: 100,
        ipWhitelist: [],
        allowedDomains: [],
        encryptionEnabled: false,
        auditLogging: true,
        sessionTimeout: 3600
      });
    });

    it('should handle database errors during security settings retrieval', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateSettingsService.getSecuritySettings())
        .rejects.toThrow('Database connection failed');
    });
  });
});
