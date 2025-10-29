import { TemplateDocumentService } from '../../../src/modules/templates/services/TemplateDocumentService.js';
import { TemplateDocumentModel } from '../../../src/modules/templates/models/TemplateDocument.model.js';
import { FileStorageService } from '../../../src/services/FileStorageService.js';
import { VirusScanService } from '../../../src/services/VirusScanService.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/modules/templates/models/TemplateDocument.model.js');
jest.mock('../../../src/services/FileStorageService.js');
jest.mock('../../../src/services/VirusScanService.js');

describe('TemplateDocumentService', () => {
  let mockTemplateDocumentModel: jest.Mocked<typeof TemplateDocumentModel>;
  let mockFileStorageService: jest.Mocked<typeof FileStorageService>;
  let mockVirusScanService: jest.Mocked<typeof VirusScanService>;

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
    mockFileStorageService = FileStorageService as jest.Mocked<typeof FileStorageService>;
    mockVirusScanService = VirusScanService as jest.Mocked<typeof VirusScanService>;
  });

  describe('createTemplate', () => {
    it('should create template successfully with file upload', async () => {
      const templateData = {
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        templateType: 'peer',
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
        description: 'Standard peer feedback template',
        template_type: 'peer',
        file_name: 'template.docx',
        file_path: 'templates/org-123/template.docx',
        file_size: 1024000,
        file_mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_format: '.docx',
        created_by: 'user-456',
        tags: ['standard', 'peer'],
        permissions: {
          roles: ['admin', 'manager', 'employee'],
          departments: [],
          cycles: []
        },
        availability_rules: {
          restrictToCycles: false,
          restrictToDepartments: false,
          restrictToRoles: false
        },
        is_default: false
      });

      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'templates/org-123/template.docx',
        url: '/uploads/templates/org-123/template.docx'
      });

      mockTemplateDocumentModel.create.mockResolvedValue(mockTemplate);

      const result = await TemplateDocumentService.uploadTemplate(mockFile, templateData, 'user-456');

      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringContaining('templates/org-123/'),
        mockFile.mimetype
      );

      expect(mockTemplateDocumentModel.create).toHaveBeenCalledWith({
        organization_id: 'org-123',
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        template_type: 'peer',
        file_name: mockFile.originalname,
        file_path: 'templates/org-123/template.docx',
        file_size: mockFile.size,
        file_mime_type: mockFile.mimetype,
        file_format: '.docx',
        created_by: 'user-456',
        tags: ['standard', 'peer'],
        permissions: {
          roles: ['admin', 'manager', 'employee'],
          departments: [],
          cycles: []
        },
        availability_rules: {
          restrictToCycles: false,
          restrictToDepartments: false,
          restrictToRoles: false
        },
        is_default: false
      });

      expect(result).toEqual(mockTemplate);
    });

    it('should handle file upload errors', async () => {
      const templateData = {
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        templateType: 'peer',
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

      mockFileStorageService.uploadFile.mockRejectedValue(new Error('Storage service unavailable'));

      await expect(TemplateDocumentService.uploadTemplate(mockFile, templateData, 'user-456'))
        .rejects.toThrow('Storage service unavailable');
    });

    it('should handle database creation errors', async () => {
      const templateData = {
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        templateType: 'peer',
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

      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'templates/org-123/template.docx',
        url: '/uploads/templates/org-123/template.docx'
      });

      mockTemplateDocumentModel.create.mockRejectedValue(new Error('Database constraint violation'));

      await expect(TemplateDocumentService.uploadTemplate(mockFile, templateData, 'user-456'))
        .rejects.toThrow('Database constraint violation');
    });
  });

  describe('getTemplateById', () => {
    it('should get template by ID successfully', async () => {
      const templateId = 'template-789';
      const mockTemplate = {
        id: templateId,
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        templateType: 'peer',
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx',
        fileSize: 1024000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileFormat: '.docx',
        version: 1,
        downloadCount: 25,
        isActive: true,
        isDefault: false,
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
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        archivedAt: null
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);

      const result = await TemplateDocumentService.getTemplateById(templateId, 'user-456', ['admin']);

      expect(mockTemplateDocumentModel.findById).toHaveBeenCalledWith(templateId);
      expect(result).toEqual(mockTemplate);
    });

    it('should handle template not found', async () => {
      const templateId = 'nonexistent-template';
      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(TemplateDocumentService.getTemplateById(templateId))
        .rejects.toThrow('Template document not found');
    });

    it('should handle database errors', async () => {
      const templateId = 'template-789';
      mockTemplateDocumentModel.findById.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateDocumentService.getTemplateById(templateId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('listTemplates', () => {
    it('should list templates successfully', async () => {
      const organizationId = 'org-123';
      const filters = {
        templateType: 'peer',
        isActive: true,
        page: 1,
        limit: 10
      };

      const mockTemplates = [
        {
          id: 'template-1',
          organizationId: 'org-123',
          name: 'Peer Template 1',
          templateType: 'peer',
          isActive: true,
          downloadCount: 25,
          createdAt: '2024-01-15T10:30:00Z'
        },
        {
          id: 'template-2',
          organizationId: 'org-123',
          name: 'Peer Template 2',
          templateType: 'peer',
          isActive: true,
          downloadCount: 15,
          createdAt: '2024-01-16T10:30:00Z'
        }
      ];

      mockTemplateDocumentModel.findAll.mockResolvedValue(mockTemplates);

      const result = await TemplateDocumentService.listTemplates(organizationId, filters);

      expect(mockTemplateDocumentModel.findAll).toHaveBeenCalledWith(organizationId, filters);
      expect(result).toEqual(mockTemplates);
    });

    it('should handle database errors during listing', async () => {
      const organizationId = 'org-123';
      const filters = { templateType: 'peer' };
      mockTemplateDocumentModel.findAll.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateDocumentService.listTemplates(organizationId, filters))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const templateId = 'template-789';
      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description',
        templateType: 'manager',
        tags: ['updated', 'manager'],
        isActive: false
      };

      const mockUpdatedTemplate = {
        id: templateId,
        ...updateData,
        organizationId: 'org-123',
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx',
        fileSize: 1024000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileFormat: '.docx',
        version: 1,
        downloadCount: 25,
        isDefault: false,
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
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        archivedAt: null
      };

      mockTemplateDocumentModel.update.mockResolvedValue(mockUpdatedTemplate);

      const result = await TemplateDocumentService.updateTemplate(templateId, updateData);

      expect(mockTemplateDocumentModel.update).toHaveBeenCalledWith(templateId, updateData);
      expect(result).toEqual(mockUpdatedTemplate);
    });

    it('should handle template not found during update', async () => {
      const templateId = 'nonexistent-template';
      const updateData = { name: 'Updated Name' };
      mockTemplateDocumentModel.update.mockRejectedValue(new Error('Template document not found'));

      await expect(TemplateDocumentService.updateTemplate(templateId, updateData))
        .rejects.toThrow('Template document not found');
    });

    it('should handle database errors during update', async () => {
      const templateId = 'template-789';
      const updateData = { name: 'Updated Name' };
      mockTemplateDocumentModel.update.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateDocumentService.updateTemplate(templateId, updateData))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      const templateId = 'template-789';
      const mockTemplate = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx'
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockFileStorageService.deleteFile.mockResolvedValue(undefined);
      mockTemplateDocumentModel.delete.mockResolvedValue(undefined);

      await TemplateDocumentService.deleteTemplate(templateId);

      expect(mockTemplateDocumentModel.findById).toHaveBeenCalledWith(templateId);
      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(mockTemplate.filePath);
      expect(mockTemplateDocumentModel.delete).toHaveBeenCalledWith(templateId);
    });

    it('should handle template not found during deletion', async () => {
      const templateId = 'nonexistent-template';
      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(TemplateDocumentService.deleteTemplate(templateId))
        .rejects.toThrow('Template document not found');
    });

    it('should handle file deletion errors', async () => {
      const templateId = 'template-789';
      const mockTemplate = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx'
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockFileStorageService.deleteFile.mockRejectedValue(new Error('File not found'));

      await expect(TemplateDocumentService.deleteTemplate(templateId))
        .rejects.toThrow('File not found');
    });

    it('should handle database deletion errors', async () => {
      const templateId = 'template-789';
      const mockTemplate = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx'
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockFileStorageService.deleteFile.mockResolvedValue(undefined);
      mockTemplateDocumentModel.delete.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateDocumentService.deleteTemplate(templateId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate template successfully', async () => {
      const templateId = 'template-789';
      const newName = 'Copy of Peer Feedback Template';
      const userId = 'user-456';

      const mockOriginalTemplate = {
        id: templateId,
        organizationId: 'org-123',
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        templateType: 'peer',
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx',
        fileSize: 1024000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileFormat: '.docx',
        version: 1,
        downloadCount: 25,
        isActive: true,
        isDefault: false,
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
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        archivedAt: null
      };

      const mockDuplicatedTemplate = {
        id: 'template-456',
        organizationId: 'org-123',
        name: newName,
        description: 'Copy of Peer Feedback Template',
        templateType: 'peer',
        fileName: 'template-copy.docx',
        filePath: 'templates/org-123/template-copy.docx',
        fileSize: 1024000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileFormat: '.docx',
        version: 1,
        downloadCount: 0,
        isActive: true,
        isDefault: false,
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
        createdBy: userId,
        createdAt: '2024-01-15T11:00:00Z',
        updatedAt: '2024-01-15T11:00:00Z',
        archivedAt: null
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockOriginalTemplate);
      mockFileStorageService.copyFile.mockResolvedValue(undefined);
      mockTemplateDocumentModel.create.mockResolvedValue(mockDuplicatedTemplate);

      const result = await TemplateDocumentService.duplicateTemplate(templateId, newName, userId);

      expect(mockTemplateDocumentModel.findById).toHaveBeenCalledWith(templateId);
      expect(mockFileStorageService.copyFile).toHaveBeenCalledWith(
        mockOriginalTemplate.filePath,
        expect.stringContaining('templates/org-123/')
      );
      expect(mockTemplateDocumentModel.create).toHaveBeenCalledWith({
        organizationId: mockOriginalTemplate.organizationId,
        name: newName,
        description: newName,
        templateType: mockOriginalTemplate.templateType,
        fileName: expect.stringContaining('template-copy.docx'),
        filePath: expect.stringContaining('templates/org-123/'),
        fileSize: mockOriginalTemplate.fileSize,
        fileMimeType: mockOriginalTemplate.fileMimeType,
        fileFormat: mockOriginalTemplate.fileFormat,
        version: 1,
        downloadCount: 0,
        isActive: true,
        isDefault: false,
        tags: mockOriginalTemplate.tags,
        permissions: mockOriginalTemplate.permissions,
        availabilityRules: mockOriginalTemplate.availabilityRules,
        createdBy: userId
      });

      expect(result).toEqual(mockDuplicatedTemplate);
    });

    it('should handle original template not found during duplication', async () => {
      const templateId = 'nonexistent-template';
      const newName = 'Copy of Template';
      const userId = 'user-456';

      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(TemplateDocumentService.duplicateTemplate(templateId, newName, userId))
        .rejects.toThrow('Template document not found');
    });

    it('should handle file copy errors during duplication', async () => {
      const templateId = 'template-789';
      const newName = 'Copy of Template';
      const userId = 'user-456';

      const mockOriginalTemplate = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx'
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockOriginalTemplate);
      mockFileStorageService.copyFile.mockRejectedValue(new Error('File copy failed'));

      await expect(TemplateDocumentService.duplicateTemplate(templateId, newName, userId))
        .rejects.toThrow('File copy failed');
    });
  });

  describe('replaceTemplateFile', () => {
    it('should replace template file successfully', async () => {
      const templateId = 'template-789';
      const mockFile = {
        originalname: 'new-template.docx',
        buffer: Buffer.from('new file content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048000
      } as Express.Multer.File;

      const mockTemplate = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx',
        fileSize: 1024000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileFormat: '.docx',
        version: 1
      };

      const mockUpdatedTemplate = {
        ...mockTemplate,
        fileName: 'new-template.docx',
        fileSize: 2048000,
        version: 2,
        updatedAt: '2024-01-15T11:30:00Z'
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockFileStorageService.deleteFile.mockResolvedValue(undefined);
      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'templates/org-123/new-template.docx',
        url: '/uploads/templates/org-123/new-template.docx'
      });
      mockTemplateDocumentModel.update.mockResolvedValue(mockUpdatedTemplate);

      const result = await TemplateDocumentService.replaceTemplateFile(templateId, mockFile);

      expect(mockTemplateDocumentModel.findById).toHaveBeenCalledWith(templateId);
      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(mockTemplate.filePath);
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringContaining('templates/org-123/'),
        mockFile.mimetype
      );
      expect(mockTemplateDocumentModel.update).toHaveBeenCalledWith(templateId, {
        fileName: mockFile.originalname,
        filePath: 'templates/org-123/new-template.docx',
        fileSize: mockFile.size,
        fileMimeType: mockFile.mimetype,
        version: mockTemplate.version + 1
      });

      expect(result).toEqual(mockUpdatedTemplate);
    });

    it('should handle template not found during file replacement', async () => {
      const templateId = 'nonexistent-template';
      const mockFile = {
        originalname: 'new-template.docx',
        buffer: Buffer.from('new file content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048000
      } as Express.Multer.File;

      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(TemplateDocumentService.replaceTemplateFile(templateId, mockFile))
        .rejects.toThrow('Template document not found');
    });

    it('should handle old file deletion errors during replacement', async () => {
      const templateId = 'template-789';
      const mockFile = {
        originalname: 'new-template.docx',
        buffer: Buffer.from('new file content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 2048000
      } as Express.Multer.File;

      const mockTemplate = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx'
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockFileStorageService.deleteFile.mockRejectedValue(new Error('File not found'));

      await expect(TemplateDocumentService.replaceTemplateFile(templateId, mockFile))
        .rejects.toThrow('File not found');
    });
  });

  describe('downloadTemplate', () => {
    it('should download template successfully', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const mockTemplate = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx',
        downloadCount: 25
      };

      const mockFileBuffer = Buffer.from('template file content');

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockFileStorageService.downloadFile.mockResolvedValue(mockFileBuffer);
      mockTemplateDocumentModel.incrementDownloadCount.mockResolvedValue({
        id: templateId,
        downloadCount: 26
      });

      const result = await TemplateDocumentService.downloadTemplate(templateId, userId);

      expect(mockTemplateDocumentModel.findById).toHaveBeenCalledWith(templateId);
      expect(mockFileStorageService.downloadFile).toHaveBeenCalledWith(mockTemplate.filePath);
      expect(mockTemplateDocumentModel.incrementDownloadCount).toHaveBeenCalledWith(templateId);

      expect(result).toEqual({
        template: mockTemplate,
        fileBuffer: mockFileBuffer,
        fileName: mockTemplate.fileName
      });
    });

    it('should handle template not found during download', async () => {
      const templateId = 'nonexistent-template';
      const userId = 'user-456';

      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(TemplateDocumentService.downloadTemplate(templateId, userId))
        .rejects.toThrow('Template document not found');
    });

    it('should handle file download errors', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const mockTemplate = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx'
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockFileStorageService.downloadFile.mockRejectedValue(new Error('File not found'));

      await expect(TemplateDocumentService.downloadTemplate(templateId, userId))
        .rejects.toThrow('File not found');
    });
  });

  describe('archiveTemplate', () => {
    it('should archive template successfully', async () => {
      const templateId = 'template-789';
      const mockArchivedTemplate = {
        id: templateId,
        archivedAt: '2024-01-15T12:00:00Z'
      };

      mockTemplateDocumentModel.archive.mockResolvedValue(mockArchivedTemplate);

      const result = await TemplateDocumentService.archiveTemplate(templateId);

      expect(mockTemplateDocumentModel.archive).toHaveBeenCalledWith(templateId);
      expect(result).toEqual(mockArchivedTemplate);
    });

    it('should handle template not found during archiving', async () => {
      const templateId = 'nonexistent-template';
      mockTemplateDocumentModel.archive.mockRejectedValue(new Error('Template document not found'));

      await expect(TemplateDocumentService.archiveTemplate(templateId))
        .rejects.toThrow('Template document not found');
    });

    it('should handle database errors during archiving', async () => {
      const templateId = 'template-789';
      mockTemplateDocumentModel.archive.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateDocumentService.archiveTemplate(templateId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getTemplateStats', () => {
    it('should get template statistics successfully', async () => {
      const templateId = 'template-789';
      const mockStats = {
        total_downloads: 25,
        unique_users: 15,
        total_attachments: 8,
        avg_downloads_per_user: 1.67,
        most_active_user: 'user-123',
        last_download: '2024-01-15T10:30:00Z'
      };

      mockTemplateDocumentModel.getUsageStats.mockResolvedValue(mockStats);

      const result = await TemplateDocumentService.getTemplateStats(templateId);

      expect(mockTemplateDocumentModel.getUsageStats).toHaveBeenCalledWith(templateId);
      expect(result).toEqual(mockStats);
    });

    it('should handle template not found during stats retrieval', async () => {
      const templateId = 'nonexistent-template';
      mockTemplateDocumentModel.getUsageStats.mockRejectedValue(new Error('Template document not found'));

      await expect(TemplateDocumentService.getTemplateStats(templateId))
        .rejects.toThrow('Template document not found');
    });

    it('should handle database errors during stats retrieval', async () => {
      const templateId = 'template-789';
      mockTemplateDocumentModel.getUsageStats.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateDocumentService.getTemplateStats(templateId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('checkPermissions', () => {
    it('should check user permissions successfully', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const userRole = 'manager';
      const userDepartment = 'engineering';

      const mockTemplate = {
        id: templateId,
        permissions: {
          roles: ['admin', 'manager', 'employee'],
          departments: ['engineering', 'marketing'],
          cycles: []
        },
        availabilityRules: {
          restrictToCycles: false,
          restrictToDepartments: false,
          restrictToRoles: false
        }
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);

      const result = await TemplateDocumentService.checkPermissions(templateId, userId, userRole, userDepartment);

      expect(mockTemplateDocumentModel.findById).toHaveBeenCalledWith(templateId);
      expect(result).toBe(true);
    });

    it('should deny access for restricted roles', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const userRole = 'employee';
      const userDepartment = 'engineering';

      const mockTemplate = {
        id: templateId,
        permissions: {
          roles: ['admin', 'manager'],
          departments: ['engineering', 'marketing'],
          cycles: []
        },
        availabilityRules: {
          restrictToCycles: false,
          restrictToDepartments: false,
          restrictToRoles: true
        }
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);

      const result = await TemplateDocumentService.checkPermissions(templateId, userId, userRole, userDepartment);

      expect(result).toBe(false);
    });

    it('should deny access for restricted departments', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const userRole = 'manager';
      const userDepartment = 'sales';

      const mockTemplate = {
        id: templateId,
        permissions: {
          roles: ['admin', 'manager', 'employee'],
          departments: ['engineering', 'marketing'],
          cycles: []
        },
        availabilityRules: {
          restrictToCycles: false,
          restrictToDepartments: true,
          restrictToRoles: false
        }
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);

      const result = await TemplateDocumentService.checkPermissions(templateId, userId, userRole, userDepartment);

      expect(result).toBe(false);
    });

    it('should handle template not found during permission check', async () => {
      const templateId = 'nonexistent-template';
      const userId = 'user-456';
      const userRole = 'manager';
      const userDepartment = 'engineering';

      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(TemplateDocumentService.checkPermissions(templateId, userId, userRole, userDepartment))
        .rejects.toThrow('Template document not found');
    });
  });
});
