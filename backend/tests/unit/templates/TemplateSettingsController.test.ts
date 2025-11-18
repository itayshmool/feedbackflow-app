import { TemplateSettingsController } from '../../../src/modules/templates/controllers/TemplateSettingsController';
import { TemplateSettingsService } from '../../../src/modules/templates/services/TemplateSettingsService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/modules/templates/services/TemplateSettingsService', () => ({
  TemplateSettingsService: {
    getGlobalSettings: jest.fn(),
    updateGlobalSettings: jest.fn(),
    getOrganizationSettings: jest.fn(),
    updateOrganizationSettings: jest.fn(),
    resetToDefaults: jest.fn(),
    getNotificationSettings: jest.fn(),
    getRetentionPolicy: jest.fn(),
    getSecuritySettings: jest.fn(),
    getFileValidationRules: jest.fn(),
    canUserUploadTemplates: jest.fn(),
    getSettingsSummary: jest.fn(),
  },
}));

describe('TemplateSettingsController', () => {
  let templateSettingsController: TemplateSettingsController;
  let mockTemplateSettingsService: jest.Mocked<typeof TemplateSettingsService>;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTemplateSettingsService = TemplateSettingsService as jest.Mocked<typeof TemplateSettingsService>;
    
    templateSettingsController = new TemplateSettingsController();
    
    // Mock Express request/response objects
    mockRequest = {
      params: {},
      body: {},
      user: {
        id: 'user-456',
        email: 'admin@example.com',
        role: 'admin',
        organizationId: 'org-123'
      },
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('getGlobalSettings', () => {
    it('should get global settings successfully', async () => {
      const mockSettings = {
        maxFileSizeMB: 10,
        allowedFileFormats: ['.docx', '.pdf', '.doc'],
        virusScanningEnabled: true,
        storageProvider: 'local' as const,
        autoDeleteAfterDays: 365,
        maxTemplatesPerOrganization: 100,
        allowPublicTemplates: false,
        requireApprovalForTemplates: false,
        defaultPermissions: {
          roles: ['admin', 'manager', 'employee'],
          departments: [] as string[],
          cycles: [] as string[]
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

      mockTemplateSettingsService.getGlobalSettings.mockResolvedValue(mockSettings);

      await TemplateSettingsController.getGlobalSettings(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.getGlobalSettings).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSettings
      });
    });

    it('should handle service errors during settings retrieval', async () => {
      mockTemplateSettingsService.getGlobalSettings.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.getGlobalSettings(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      const mockUpdatedSettings: any = {
        id: 'settings-123',
        ...updateData,
        updatedAt: '2024-01-15T12:00:00Z'
      };

      mockRequest.body = updateData;

      mockTemplateSettingsService.updateGlobalSettings.mockResolvedValue(mockUpdatedSettings);

      await TemplateSettingsController.updateGlobalSettings(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.updateGlobalSettings).toHaveBeenCalledWith(updateData);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSettings
      });
    });

    it('should handle service errors during settings update', async () => {
      const updateData = {
        maxFileSizeMB: 15,
        virusScanningEnabled: false
      };

      mockRequest.body = updateData;

      mockTemplateSettingsService.updateGlobalSettings.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.updateGlobalSettings(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('resetSettings', () => {
    it('should reset settings to defaults successfully', async () => {
      const mockResetSettings: any = {
        id: 'settings-123',
        settingType: 'global',
        settings: JSON.stringify({
          maxFileSizeMB: 10,
          allowedFileFormats: ['.docx', '.pdf', '.doc'],
          virusScanningEnabled: false,
          storageProvider: 'local' as const,
          autoDeleteAfterDays: 365,
          maxTemplatesPerOrganization: 100,
          allowPublicTemplates: false,
          requireApprovalForTemplates: false
        }),
        updatedAt: '2024-01-15T12:00:00Z'
      };

      mockTemplateSettingsService.resetToDefaults.mockResolvedValue(mockResetSettings);

      await TemplateSettingsController.resetSettings(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.resetToDefaults).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockResetSettings
      });
    });

    it('should handle service errors during settings reset', async () => {
      mockTemplateSettingsService.resetToDefaults.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.resetSettings(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockTemplateSettingsService.getStorageConfig.mockResolvedValue(mockStorageConfig);

      await TemplateSettingsController.getStorageConfig(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.getStorageConfig).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStorageConfig
      });
    });

    it('should handle service errors during storage config retrieval', async () => {
      mockTemplateSettingsService.getStorageConfig.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.getStorageConfig(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getOrganizationSettings', () => {
    it('should get organization settings successfully', async () => {
      const organizationId = 'org-123';
      const mockOrgSettings: any = {
        maxFileSizeMB: 15,
        allowedFileFormats: ['.docx', '.pdf'],
        virusScanningEnabled: true,
        storageProvider: 'local' as const,
        autoDeleteAfterDays: 365,
        maxTemplatesPerOrganization: 200,
        allowPublicTemplates: false,
        requireApprovalForTemplates: false,
        defaultPermissions: {
          roles: ['admin', 'manager'],
          departments: ['engineering', 'marketing'],
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

      mockRequest.params.organizationId = organizationId;

      mockTemplateSettingsService.getOrganizationSettings.mockResolvedValue(mockOrgSettings);

      await TemplateSettingsController.getOrganizationSettings(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.getOrganizationSettings).toHaveBeenCalledWith(organizationId);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrgSettings
      });
    });

    it('should handle organization settings not found', async () => {
      const organizationId = 'org-123';
      mockRequest.params.organizationId = organizationId;

      mockTemplateSettingsService.getOrganizationSettings.mockRejectedValue(new Error('Organization not found'));

      await TemplateSettingsController.getOrganizationSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Organization settings not found'
      });
    });

    it('should handle service errors during organization settings retrieval', async () => {
      const organizationId = 'org-123';
      mockRequest.params.organizationId = organizationId;

      mockTemplateSettingsService.getOrganizationSettings.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.getOrganizationSettings(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('updateOrganizationSettings', () => {
    it('should update organization settings successfully', async () => {
      const organizationId = 'org-123';
      const updateData = {
        maxFileSizeMB: 20,
        virusScanningEnabled: true,
        maxTemplatesPerOrganization: 300,
        defaultPermissions: {
          roles: ['admin', 'manager'],
          departments: [] as string[],
          cycles: [] as string[]
        }
      };

      const mockUpdatedSettings: any = {
        id: 'org-settings-123',
        organizationId,
        ...updateData,
        updatedAt: '2024-01-15T12:00:00Z'
      };

      mockRequest.params.organizationId = organizationId;
      mockRequest.body = updateData;

      mockTemplateSettingsService.updateOrganizationSettings.mockResolvedValue(mockUpdatedSettings);

      await TemplateSettingsController.updateOrganizationSettings(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.updateOrganizationSettings).toHaveBeenCalledWith(organizationId, updateData);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSettings
      });
    });

    it('should handle service errors during organization settings update', async () => {
      const organizationId = 'org-123';
      const updateData = {
        maxFileSizeMB: 20,
        virusScanningEnabled: true
      };

      mockRequest.params.organizationId = organizationId;
      mockRequest.body = updateData;

      mockTemplateSettingsService.updateOrganizationSettings.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.updateOrganizationSettings(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockTemplateSettingsService.getFileValidationRules.mockResolvedValue(mockValidationRules);

      await TemplateSettingsController.getValidationRules(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.getFileValidationRules).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockValidationRules
      });
    });

    it('should handle service errors during validation rules retrieval', async () => {
      mockTemplateSettingsService.getFileValidationRules.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.getValidationRules(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockRequest.params.userId = userId;
      mockRequest.query = { userRole, organizationId };

      mockTemplateSettingsService.canUserUploadTemplates.mockResolvedValue(mockPermissions);

      await TemplateSettingsController.checkUploadPermissions(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.canUserUploadTemplates).toHaveBeenCalledWith(userId, organizationId);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermissions
      });
    });

    it('should handle denied upload permissions', async () => {
      const userId = 'user-456';
      const userRole = 'employee';
      const organizationId = 'org-123';

      const mockPermissions = {
        canUpload: false,
        reason: 'Admin role required for template uploads'
      };

      mockRequest.params.userId = userId;
      mockRequest.query = { userRole, organizationId };

      mockTemplateSettingsService.canUserUploadTemplates.mockResolvedValue(mockPermissions);

      await TemplateSettingsController.checkUploadPermissions(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockPermissions
      });
    });

    it('should handle service errors during permission check', async () => {
      const userId = 'user-456';
      const userRole = 'admin';
      const organizationId = 'org-123';

      mockRequest.params.userId = userId;
      mockRequest.query = { userRole, organizationId };

      mockTemplateSettingsService.canUserUploadTemplates.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.checkUploadPermissions(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getSettingsSummary', () => {
    it('should get settings summary successfully', async () => {
      const organizationId = 'org-123';
      const mockSummary: any = {
        totalTemplates: 5,
        maxTemplates: 200,
        storageUsed: 2621440000, // 2.5GB in bytes
        storageLimit: 10737418240, // 10GB in bytes
        virusScanningEnabled: true,
        retentionDays: 365,
        lastUpdated: new Date()
      };

      mockRequest.params.organizationId = organizationId;

      mockTemplateSettingsService.getSettingsSummary.mockResolvedValue(mockSummary);

      await TemplateSettingsController.getSettingsSummary(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.getSettingsSummary).toHaveBeenCalledWith(organizationId);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSummary
      });
    });

    it('should handle service errors during summary retrieval', async () => {
      const organizationId = 'org-123';
      mockRequest.params.organizationId = organizationId;

      mockTemplateSettingsService.getSettingsSummary.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.getSettingsSummary(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockTemplateSettingsService.getNotificationSettings.mockResolvedValue(mockNotificationSettings);

      await TemplateSettingsController.getNotificationSettings(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.getNotificationSettings).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockNotificationSettings
      });
    });

    it('should handle service errors during notification settings retrieval', async () => {
      mockTemplateSettingsService.getNotificationSettings.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.getNotificationSettings(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockTemplateSettingsService.getRetentionPolicy.mockResolvedValue(mockRetentionPolicy);

      await TemplateSettingsController.getRetentionPolicy(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.getRetentionPolicy).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRetentionPolicy
      });
    });

    it('should handle service errors during retention policy retrieval', async () => {
      mockTemplateSettingsService.getRetentionPolicy.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.getRetentionPolicy(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockTemplateSettingsService.getSecuritySettings.mockResolvedValue(mockSecuritySettings);

      await TemplateSettingsController.getSecuritySettings(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.getSecuritySettings).toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSecuritySettings
      });
    });

    it('should handle service errors during security settings retrieval', async () => {
      mockTemplateSettingsService.getSecuritySettings.mockRejectedValue(new Error('Database connection failed'));

      await TemplateSettingsController.getSecuritySettings(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required parameters', async () => {
      mockRequest.params = {}; // Missing organizationId
      mockRequest.body = {};

      await TemplateSettingsController.getOrganizationSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Organization ID is required'
      });
    });

    it('should handle invalid request body', async () => {
      mockRequest.body = null;

      await TemplateSettingsController.updateGlobalSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request body is required'
      });
    });

    it('should handle empty request body for updates', async () => {
      mockRequest.body = {};

      await TemplateSettingsController.updateGlobalSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'At least one setting must be provided for update'
      });
    });
  });

  describe('Authorization Checks', () => {
    it('should check admin role for global settings operations', async () => {
      mockRequest.user.role = 'employee'; // Non-admin user

      await TemplateSettingsController.updateGlobalSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Admin role required for global settings operations'
      });
    });

    it('should check admin role for settings reset', async () => {
      mockRequest.user.role = 'manager'; // Non-admin user

      await TemplateSettingsController.resetSettings(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Admin role required for settings reset'
      });
    });

    it('should allow manager role for organization settings', async () => {
      const organizationId = 'org-123';
      const updateData = { maxFileSizeMB: 20 };

      mockRequest.user.role = 'manager';
      mockRequest.params.organizationId = organizationId;
      mockRequest.body = updateData;

      const mockUpdatedSettings: any = {
        id: 'org-settings-123',
        organizationId,
        ...updateData,
        updatedAt: '2024-01-15T12:00:00Z'
      };

      mockTemplateSettingsService.updateOrganizationSettings.mockResolvedValue(mockUpdatedSettings);

      await TemplateSettingsController.updateOrganizationSettings(mockRequest, mockResponse, mockNext);

      expect(mockTemplateSettingsService.updateOrganizationSettings).toHaveBeenCalledWith(organizationId, updateData);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedSettings
      });
    });
  });
});




