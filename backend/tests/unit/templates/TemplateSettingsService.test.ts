import { TemplateSettingsService } from '../../../src/modules/templates/services/TemplateSettingsService.js';
import { query } from '../../../src/config/database.js';
import { jest } from '@jest/globals';

// Mock database query function
jest.mock('../../../src/config/database.js', () => ({
  query: jest.fn()
}));

describe('TemplateSettingsService', () => {
  let mockQuery: jest.MockedFunction<typeof query>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = query as jest.MockedFunction<typeof query>;
  });

  describe('getGlobalSettings', () => {
    it('should get global settings successfully', async () => {
      const mockSettings = {
        settings: {
          maxFileSizeMB: 15,
          allowedFileFormats: ['.docx', '.pdf'],
          virusScanningEnabled: true
        }
      };

      mockQuery.mockResolvedValue({ rows: [mockSettings] });

      const result = await TemplateSettingsService.getGlobalSettings();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT settings FROM system_settings'),
        ['template_settings']
      );

      expect(result.maxFileSizeMB).toBe(15);
    });

    it('should return default settings when none found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await TemplateSettingsService.getGlobalSettings();

      expect(result.maxFileSizeMB).toBeDefined();
      expect(result.allowedFileFormats).toContain('.docx');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      // Should return defaults on error
      const result = await TemplateSettingsService.getGlobalSettings();
      expect(result).toBeDefined();
    });
  });

  describe('updateGlobalSettings', () => {
    it('should update global settings successfully', async () => {
      const updateData = {
        maxFileSizeMB: 15,
        virusScanningEnabled: false
      };

      // Mock getGlobalSettings call
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await TemplateSettingsService.updateGlobalSettings(updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO system_settings'),
        expect.arrayContaining(['template_settings'])
      );

      expect(result.maxFileSizeMB).toBe(15);
    });

    it('should validate settings', async () => {
      const invalidUpdateData = {
        maxFileSizeMB: 200 // Exceeds max of 100
      };

      // Mock getGlobalSettings call
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        TemplateSettingsService.updateGlobalSettings(invalidUpdateData)
      ).rejects.toThrow('Max file size must be between 1 and 100 MB');
    });
  });

  describe('getOrganizationSettings', () => {
    it('should get organization settings successfully', async () => {
      const organizationId = 'org-123';
      const mockOrgSettings = {
        template_settings: {
          maxFileSizeMB: 20,
          maxTemplatesPerOrganization: 200
        }
      };

      // Mock getGlobalSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock organization settings query
      mockQuery.mockResolvedValueOnce({ rows: [mockOrgSettings] });

      const result = await TemplateSettingsService.getOrganizationSettings(organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT template_settings FROM organizations'),
        [organizationId]
      );

      expect(result.maxFileSizeMB).toBe(20);
    });

    it('should handle organization not found', async () => {
      const organizationId = 'nonexistent-org';

      // Mock getGlobalSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock organization not found
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        TemplateSettingsService.getOrganizationSettings(organizationId)
      ).rejects.toThrow('Organization not found');
    });
  });

  describe('updateOrganizationSettings', () => {
    it('should update organization settings successfully', async () => {
      const organizationId = 'org-123';
      const updateData = {
        maxFileSizeMB: 20,
        maxTemplatesPerOrganization: 300
      };

      // Mock getOrganizationSettings (calls getGlobalSettings first)
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ template_settings: {} }] });

      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await TemplateSettingsService.updateOrganizationSettings(
        organizationId,
        updateData
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE organizations SET template_settings'),
        expect.arrayContaining([organizationId])
      );

      expect(result.maxFileSizeMB).toBe(20);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset global settings to defaults', async () => {
      // Mock getGlobalSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await TemplateSettingsService.resetToDefaults();

      expect(result).toBeDefined();
      expect(result.maxFileSizeMB).toBeDefined();
    });

    it('should reset organization settings to defaults', async () => {
      const organizationId = 'org-123';

      // Mock getOrganizationSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ template_settings: {} }] });

      // Mock update query
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await TemplateSettingsService.resetToDefaults(organizationId);

      expect(result).toBeDefined();
    });
  });

  describe('getStorageConfig', () => {
    it('should get storage configuration successfully', async () => {
      // Mock getGlobalSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await TemplateSettingsService.getStorageConfig();

      expect(result.provider).toBeDefined();
      expect(result.config).toBeDefined();
    });
  });

  describe('getFileValidationRules', () => {
    it('should get file validation rules successfully', async () => {
      // Mock getGlobalSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await TemplateSettingsService.getFileValidationRules();

      expect(result.maxSizeMB).toBeDefined();
      expect(result.allowedTypes).toContain('application/pdf');
      expect(result.allowedExtensions).toContain('.docx');
    });
  });

  describe('canUserUploadTemplates', () => {
    it('should allow upload for user with required role', async () => {
      const userId = 'user-456';
      const organizationId = 'org-123';

      // Mock getOrganizationSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ template_settings: {} }] });

      // Mock user roles query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: userId, roles: ['admin', 'manager'] }]
      });

      // Mock template count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }]
      });

      const result = await TemplateSettingsService.canUserUploadTemplates(userId, organizationId);

      expect(result.canUpload).toBe(true);
    });

    it('should deny upload when template limit reached', async () => {
      const userId = 'user-456';
      const organizationId = 'org-123';

      // Mock getOrganizationSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          template_settings: {
            maxTemplatesPerOrganization: 100
          }
        }]
      });

      // Mock user roles query
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: userId, roles: ['admin'] }]
      });

      // Mock template count query - limit reached
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '100' }]
      });

      const result = await TemplateSettingsService.canUserUploadTemplates(userId, organizationId);

      expect(result.canUpload).toBe(false);
      expect(result.reason).toContain('template limit');
    });
  });

  describe('getSettingsSummary', () => {
    it('should get settings summary successfully', async () => {
      const organizationId = 'org-123';

      // Mock getOrganizationSettings
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ template_settings: {} }] });

      // Mock template count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }]
      });

      // Mock storage usage query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total_size: '10485760' }] // 10MB
      });

      // Mock last updated query
      mockQuery.mockResolvedValueOnce({
        rows: [{ updated_at: new Date() }]
      });

      const result = await TemplateSettingsService.getSettingsSummary(organizationId);

      expect(result.totalTemplates).toBe(5);
      expect(result.storageUsed).toBeDefined();
    });
  });
});
