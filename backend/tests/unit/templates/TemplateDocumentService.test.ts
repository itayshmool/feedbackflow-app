import { TemplateDocumentService } from '../../../src/modules/templates/services/TemplateDocumentService';
import { TemplateDocumentModel } from '../../../src/modules/templates/models/TemplateDocument.model';
import { fileStorageService } from '../../../src/services/FileStorageService';
import { FileValidator } from '../../../src/shared/utils/file-validator';
import { virusScanService } from '../../../src/services/VirusScanService';
import { query } from '../../../src/config/database';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/modules/templates/models/TemplateDocument.model');
jest.mock('../../../src/services/FileStorageService', () => ({
  fileStorageService: {
    uploadFile: jest.fn(),
    downloadFile: jest.fn(),
    deleteFile: jest.fn(),
  },
}));
jest.mock('../../../src/shared/utils/file-validator', () => ({
  FileValidator: {
    validateFile: jest.fn(),
    generateUniqueFileName: jest.fn(),
    getFileExtension: jest.fn(),
  },
}));
jest.mock('../../../src/services/VirusScanService', () => ({
  VirusScanService: {
    isEnabled: jest.fn(),
    scanFile: jest.fn(),
  },
  virusScanService: {
    isEnabled: jest.fn(),
    scanFile: jest.fn(),
  },
}));
jest.mock('../../../src/config/database', () => ({
  query: jest.fn(),
}));

describe('TemplateDocumentService', () => {
  let mockTemplateDocumentModel: jest.Mocked<typeof TemplateDocumentModel>;
  let mockFileStorageService: jest.Mocked<typeof fileStorageService>;
  let mockFileValidator: jest.Mocked<typeof FileValidator>;
  let mockVirusScanService: any;
  let mockQuery: jest.MockedFunction<typeof query>;

  // Helper function to create mock TemplateDocument
  const createMockTemplateDocument = (overrides: Partial<any> = {}) => ({
    id: 'template-123',
    organization_id: 'org-123',
    name: 'Peer Feedback Template',
    description: 'Standard peer feedback template',
    template_type: 'peer' as const,
    file_name: 'peer-feedback.docx',
    file_path: '/uploads/templates/peer-feedback.docx',
    file_size: 1024,
    file_mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_format: '.docx' as const,
    version: 1,
    download_count: 0,
    is_active: true,
    is_default: false,
    tags: [],
    permissions: {
      roles: ['employee'],
      departments: ['engineering'],
      cycles: ['q1-2024']
    },
    availability_rules: {
      restrictToCycles: false,
      restrictToDepartments: false,
      restrictToRoles: false
    },
    created_by: 'user-456',
    created_at: new Date('2024-01-15T10:00:00Z'),
    updated_at: new Date('2024-01-15T10:00:00Z'),
    archived_at: undefined,
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTemplateDocumentModel = TemplateDocumentModel as jest.Mocked<typeof TemplateDocumentModel>;
    mockFileStorageService = fileStorageService as jest.Mocked<typeof fileStorageService>;
    mockFileValidator = FileValidator as jest.Mocked<typeof FileValidator>;
    mockVirusScanService = virusScanService as any;
    mockQuery = query as jest.MockedFunction<typeof query>;

    // Default mocks
    mockFileValidator.validateFile.mockReturnValue({ isValid: true, error: null });
    mockFileValidator.generateUniqueFileName.mockImplementation((name: string) => `unique-${name}`);
    mockFileValidator.getFileExtension.mockImplementation((name: string) => {
      const ext = name.split('.').pop();
      return ext ? `.${ext}` : '';
    });
    mockVirusScanService.isEnabled.mockReturnValue(false);
    
    // Default database query mocks
    mockQuery.mockResolvedValue({ rows: [{ count: '0' }] });
  });

  describe('uploadTemplate', () => {
    it('should upload template successfully with file upload', async () => {
      const templateData = {
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        templateType: 'peer' as const,
        tags: ['standard', 'peer'],
        permissions: {
          roles: ['admin', 'manager', 'employee'],
          departments: [],
          cycles: []
        },
        availabilityRules: {
          restrictToCycles: false,
          restrictToDepartments: false,
          restrictToRoles: false
        },
        createdBy: 'user-456',
        isDefault: false
      };

      const mockFile = {
        originalname: 'template.docx',
        buffer: Buffer.from('test file content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024000
      } as Express.Multer.File;

      const mockTemplate = createMockTemplateDocument({
        id: 'template-789',
        organization_id: 'org-123',
        name: 'Peer Feedback Template',
        file_name: 'template.docx',
        file_path: 'templates/org-123/unique-template.docx',
        file_size: 1024000,
      });

      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'templates/org-123/unique-template.docx',
        url: '/uploads/templates/org-123/unique-template.docx',
        size: 1024000
      } as any);

      mockTemplateDocumentModel.create.mockResolvedValue(mockTemplate);

      const result = await TemplateDocumentService.uploadTemplate(mockFile, templateData, 'user-456');

      expect(mockFileValidator.validateFile).toHaveBeenCalled();
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringContaining('templates/org-123/'),
        mockFile.mimetype,
        expect.any(Object)
      );

      expect(result.template).toEqual(mockTemplate);
      expect(result.fileUrl).toBeDefined();
    });

    it('should handle file validation errors', async () => {
      const templateData = {
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        templateType: 'peer' as const,
        createdBy: 'user-456',
        isDefault: false
      };

      const mockFile = {
        originalname: 'template.exe',
        buffer: Buffer.from('test file content'),
        mimetype: 'application/x-msdownload',
        size: 1024000
      } as Express.Multer.File;

      mockFileValidator.validateFile.mockReturnValue({
        isValid: false,
        error: 'Invalid file type'
      });

      await expect(
        TemplateDocumentService.uploadTemplate(mockFile, templateData, 'user-456')
      ).rejects.toThrow('File validation failed');
    });

    it('should handle file upload errors', async () => {
      const templateData = {
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        templateType: 'peer' as const,
        createdBy: 'user-456',
        isDefault: false
      };

      const mockFile = {
        originalname: 'template.docx',
        buffer: Buffer.from('test file content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024000
      } as Express.Multer.File;

      mockFileStorageService.uploadFile.mockRejectedValue(new Error('Storage service unavailable'));

      await expect(
        TemplateDocumentService.uploadTemplate(mockFile, templateData, 'user-456')
      ).rejects.toThrow('Storage service unavailable');
    });

    it('should handle database creation errors', async () => {
      const templateData = {
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        templateType: 'peer' as const,
        createdBy: 'user-456',
        isDefault: false
      };

      const mockFile = {
        originalname: 'template.docx',
        buffer: Buffer.from('test file content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024000
      } as Express.Multer.File;

      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'templates/org-123/template.docx',
        url: '/uploads/templates/org-123/template.docx',
        size: 1024000
      } as any);

      mockTemplateDocumentModel.create.mockRejectedValue(new Error('Database constraint violation'));

      await expect(
        TemplateDocumentService.uploadTemplate(mockFile, templateData, 'user-456')
      ).rejects.toThrow('Database constraint violation');
    });
  });

  describe('getTemplateById', () => {
    it('should get template by ID successfully', async () => {
      const templateId = 'template-789';
      const mockTemplate = createMockTemplateDocument({ id: templateId });

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);

      const result = await TemplateDocumentService.getTemplateById(templateId, 'user-456', ['admin']);

      expect(mockTemplateDocumentModel.findById).toHaveBeenCalledWith(templateId);
      expect(mockTemplateDocumentModel.checkPermission).toHaveBeenCalledWith(templateId, 'user-456', ['admin']);
      expect(result).toEqual(mockTemplate);
    });

    it('should handle template not found', async () => {
      const templateId = 'nonexistent-template';
      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(
        TemplateDocumentService.getTemplateById(templateId, 'user-456', ['admin'])
      ).resolves.toBeNull();
    });

    it('should handle permission denied', async () => {
      const templateId = 'template-789';
      const mockTemplate = createMockTemplateDocument({ id: templateId });

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(false);

      await expect(
        TemplateDocumentService.getTemplateById(templateId, 'user-456', ['employee'])
      ).rejects.toThrow('Access denied: insufficient permissions');
    });
  });

  describe('listTemplates', () => {
    it('should list templates successfully', async () => {
      const filters = {
        organizationId: 'org-123',
        templateType: 'peer',
        isActive: true,
        page: 1,
        limit: 10
      };

      const mockTemplates = [
        createMockTemplateDocument({ id: 'template-1', name: 'Peer Template 1' }),
        createMockTemplateDocument({ id: 'template-2', name: 'Peer Template 2' })
      ];

      mockTemplateDocumentModel.findAllWithPagination.mockResolvedValue({
        templates: mockTemplates,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);

      const result = await TemplateDocumentService.listTemplates(filters, 'user-456', ['admin']);

      expect(mockTemplateDocumentModel.findAllWithPagination).toHaveBeenCalled();
      expect(result.templates).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter out templates without permission', async () => {
      const filters = {
        organizationId: 'org-123',
        page: 1,
        limit: 10
      };

      const mockTemplates = [
        createMockTemplateDocument({ id: 'template-1' }),
        createMockTemplateDocument({ id: 'template-2' })
      ];

      mockTemplateDocumentModel.findAllWithPagination.mockResolvedValue({
        templates: mockTemplates,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      // First template has permission, second doesn't
      mockTemplateDocumentModel.checkPermission
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await TemplateDocumentService.listTemplates(filters, 'user-456', ['employee']);

      expect(result.templates).toHaveLength(1);
      expect(result.templates[0].id).toBe('template-1');
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const templateId = 'template-789';
      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description'
      };

      const mockTemplate = createMockTemplateDocument({ id: templateId });
      const mockUpdatedTemplate = { ...mockTemplate, ...updateData };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);
      mockTemplateDocumentModel.update.mockResolvedValue(mockUpdatedTemplate);

      const result = await TemplateDocumentService.updateTemplate(
        templateId,
        updateData,
        'user-456',
        ['admin']
      );

      expect(mockTemplateDocumentModel.update).toHaveBeenCalledWith(templateId, updateData);
      expect(result).toEqual(mockUpdatedTemplate);
    });

    it('should handle template not found during update', async () => {
      const templateId = 'nonexistent-template';
      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(
        TemplateDocumentService.updateTemplate(templateId, { name: 'Updated' }, 'user-456', ['admin'])
      ).rejects.toThrow('Template document not found');
    });

    it('should handle permission denied for update', async () => {
      const templateId = 'template-789';
      const mockTemplate = createMockTemplateDocument({ id: templateId, created_by: 'other-user' });

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);

      await expect(
        TemplateDocumentService.updateTemplate(templateId, { name: 'Updated' }, 'user-456', ['employee'])
      ).rejects.toThrow('Access denied');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      const templateId = 'template-789';
      const mockTemplate = createMockTemplateDocument({
        id: templateId,
        file_path: 'templates/org-123/template.docx'
      });

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);
      mockFileStorageService.deleteFile.mockResolvedValue(undefined);
      mockTemplateDocumentModel.delete.mockResolvedValue(true);

      // Mock checkTemplateUsage - no attachments, no downloads
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // attachment count
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }); // download count

      await TemplateDocumentService.deleteTemplate(templateId, 'user-456', ['admin']);

      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(mockTemplate.file_path);
      expect(mockTemplateDocumentModel.delete).toHaveBeenCalledWith(templateId);
    });

    it('should handle template not found during deletion', async () => {
      const templateId = 'nonexistent-template';
      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(
        TemplateDocumentService.deleteTemplate(templateId, 'user-456', ['admin'])
      ).rejects.toThrow('Template document not found');
    });
  });

  describe('downloadTemplate', () => {
    it('should download template successfully', async () => {
      const templateId = 'template-789';
      const mockTemplate = createMockTemplateDocument({
        id: templateId,
        file_path: 'templates/org-123/template.docx',
        file_name: 'template.docx'
      });

      const mockFileBuffer = Buffer.from('template file content');

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);
      mockTemplateDocumentModel.incrementDownloadCount.mockResolvedValue(true);
      mockFileStorageService.downloadFile.mockResolvedValue(mockFileBuffer);

      const result = await TemplateDocumentService.downloadTemplate(templateId, 'user-456', ['admin']);

      expect(mockTemplateDocumentModel.incrementDownloadCount).toHaveBeenCalledWith(templateId);
      expect(mockFileStorageService.downloadFile).toHaveBeenCalledWith(mockTemplate.file_path);
      expect(result.fileBuffer).toEqual(mockFileBuffer);
      expect(result.fileName).toBe(mockTemplate.file_name);
    });

    it('should handle template not found during download', async () => {
      const templateId = 'nonexistent-template';
      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(
        TemplateDocumentService.downloadTemplate(templateId, 'user-456', ['admin'])
      ).rejects.toThrow('Template document not found');
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate template successfully', async () => {
      const templateId = 'template-789';
      const newName = 'Copy of Peer Feedback Template';
      const userId = 'user-456';

      const mockOriginalTemplate = createMockTemplateDocument({
        id: templateId,
        file_path: 'templates/org-123/template.docx'
      });

      const mockDuplicatedTemplate = createMockTemplateDocument({
        id: 'template-456',
        name: newName,
        file_path: 'templates/org-123/unique-template.docx'
      });

      mockTemplateDocumentModel.findById.mockResolvedValue(mockOriginalTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);
      mockFileStorageService.downloadFile.mockResolvedValue(Buffer.from('file content'));
      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'templates/org-123/unique-template.docx',
        url: '/uploads/templates/org-123/unique-template.docx',
        size: 1024
      } as any);
      mockTemplateDocumentModel.create.mockResolvedValue(mockDuplicatedTemplate);

      const result = await TemplateDocumentService.duplicateTemplate(
        templateId,
        newName,
        userId,
        ['admin']
      );

      expect(mockFileStorageService.downloadFile).toHaveBeenCalledWith(mockOriginalTemplate.file_path);
      expect(mockTemplateDocumentModel.create).toHaveBeenCalled();
      expect(result.duplicatedTemplate.name).toBe(newName);
    });
  });

  describe('archiveTemplate', () => {
    it('should archive template successfully', async () => {
      const templateId = 'template-789';
      const mockTemplate = createMockTemplateDocument({ id: templateId });
      const mockArchivedTemplate = { ...mockTemplate, archived_at: new Date() };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);
      mockTemplateDocumentModel.archive.mockResolvedValue(mockArchivedTemplate);

      await TemplateDocumentService.archiveTemplate(templateId, 'user-456', ['admin']);

      expect(mockTemplateDocumentModel.archive).toHaveBeenCalledWith(templateId);
    });
  });

  describe('getTemplateStats', () => {
    it('should get template statistics successfully', async () => {
      const templateId = 'template-789';
      const mockTemplate = createMockTemplateDocument({ id: templateId });
      const mockStats = {
        downloadCount: 25,
        attachmentCount: 8,
        lastDownloaded: new Date()
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockTemplateDocumentModel.checkPermission.mockResolvedValue(true);
      mockTemplateDocumentModel.getUsageStats.mockResolvedValue(mockStats);

      const result = await TemplateDocumentService.getTemplateStats(templateId, 'user-456', ['admin']);

      expect(mockTemplateDocumentModel.getUsageStats).toHaveBeenCalledWith(templateId);
      expect(result).toEqual(mockStats);
    });
  });
});
