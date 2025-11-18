import { TemplateDocumentController } from '../../../src/modules/templates/controllers/TemplateDocumentController';
import { TemplateDocumentService } from '../../../src/modules/templates/services/TemplateDocumentService';
import { TemplateAnalyticsService } from '../../../src/modules/templates/services/TemplateAnalyticsService';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/modules/templates/services/TemplateDocumentService', () => ({
  TemplateDocumentService: {
    uploadTemplate: jest.fn(),
    getTemplateById: jest.fn(),
    listTemplates: jest.fn(),
    updateTemplate: jest.fn(),
    deleteTemplate: jest.fn(),
    downloadTemplate: jest.fn(),
    duplicateTemplate: jest.fn(),
    archiveTemplate: jest.fn(),
    getTemplateStats: jest.fn(),
    replaceTemplateFile: jest.fn(),
  },
}));
jest.mock('../../../src/modules/templates/services/TemplateAnalyticsService', () => ({
  TemplateAnalyticsService: {
    getTemplateAnalytics: jest.fn(),
    getOrganizationAnalytics: jest.fn(),
    getTemplateTrends: jest.fn(),
    getUserAnalytics: jest.fn(),
    getDownloadHistory: jest.fn(),
    generateUsageReport: jest.fn(),
  },
}));

describe('TemplateDocumentController', () => {
  let templateDocumentController: TemplateDocumentController;
  let mockTemplateDocumentService: jest.Mocked<typeof TemplateDocumentService>;
  let mockTemplateAnalyticsService: jest.Mocked<typeof TemplateAnalyticsService>;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTemplateDocumentService = TemplateDocumentService as jest.Mocked<typeof TemplateDocumentService>;
    mockTemplateAnalyticsService = TemplateAnalyticsService as jest.Mocked<typeof TemplateAnalyticsService>;
    
    templateDocumentController = new TemplateDocumentController();
    
    // Mock Express request/response objects
    mockRequest = {
      params: {},
      body: {},
      file: null,
      user: {
        id: 'user-456',
        email: 'user@example.com',
        role: 'admin',
        organizationId: 'org-123'
      },
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
  });

  describe('uploadTemplate', () => {
    it('should upload template successfully', async () => {
      const mockFile = {
        originalname: 'template.docx',
        buffer: Buffer.from('template content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024000
      } as Express.Multer.File;

      const mockTemplate: any = {
        id: 'template-789',
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
        createdBy: 'user-456',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
        archivedAt: null
      };

      mockRequest.file = mockFile;
      mockRequest.body = {
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        templateType: 'peer',
        tags: ['standard', 'peer'],
        isDefault: false
      };

      mockTemplateDocumentService.uploadTemplate.mockResolvedValue({ template: mockTemplate as any, fileUrl: '/uploads/template.docx' });

      await TemplateDocumentController.uploadTemplate(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.uploadTemplate).toHaveBeenCalledWith(
        {
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
        },
        mockFile
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          template: mockTemplate,
          fileUrl: `/uploads/${mockTemplate.filePath}`
        }
      });
    });

    it('should handle missing file error', async () => {
      mockRequest.file = null;
      mockRequest.body = {
        name: 'Peer Feedback Template',
        templateType: 'peer'
      };

      await TemplateDocumentController.uploadTemplate(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'No file uploaded'
      });
    });

    it('should handle service errors', async () => {
      const mockFile = {
        originalname: 'template.docx',
        buffer: Buffer.from('template content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024000
      } as Express.Multer.File;

      mockRequest.file = mockFile;
      mockRequest.body = {
        name: 'Peer Feedback Template',
        templateType: 'peer'
      };

      mockTemplateDocumentService.uploadTemplate.mockRejectedValue(new Error('Storage service unavailable'));

      await TemplateDocumentController.uploadTemplate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('listTemplates', () => {
    it('should list templates successfully', async () => {
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
          name: 'Manager Template 2',
          templateType: 'manager',
          isActive: true,
          downloadCount: 15,
          createdAt: '2024-01-16T10:30:00Z'
        }
      ];

      mockRequest.query = {
        templateType: 'peer',
        isActive: 'true',
        page: '1',
        limit: '10'
      };

      mockTemplateDocumentService.listTemplates.mockResolvedValue({
        templates: mockTemplates as any,
        total: mockTemplates.length,
        page: 1,
        limit: 10,
        totalPages: 1
      });

      await TemplateDocumentController.listTemplates(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.listTemplates).toHaveBeenCalledWith(
        'org-123',
        {
          templateType: 'peer',
          isActive: true,
          page: 1,
          limit: 10
        }
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          templates: mockTemplates as any,
          total: mockTemplates.length,
          page: 1,
          limit: 10,
          totalPages: 1
        }
      });
    });

    it('should handle service errors during listing', async () => {
      mockRequest.query = {};

      mockTemplateDocumentService.listTemplates.mockRejectedValue(new Error('Database connection failed'));

      await TemplateDocumentController.listTemplates(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getTemplateById', () => {
    it('should get template by ID successfully', async () => {
      const templateId = 'template-789';
      const mockTemplate: any = {
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

      mockRequest.params.id = templateId;

      mockTemplateDocumentService.getTemplateById.mockResolvedValue(mockTemplate as any);

      await TemplateDocumentController.getTemplateById(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.getTemplateById).toHaveBeenCalledWith(templateId);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockTemplate
      });
    });

    it('should handle template not found', async () => {
      const templateId = 'nonexistent-template';
      mockRequest.params.id = templateId;

      mockTemplateDocumentService.getTemplateById.mockRejectedValue(new Error('Template document not found'));

      await TemplateDocumentController.getTemplateById(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockRequest.params.id = templateId;
      mockRequest.body = updateData;

      mockTemplateDocumentService.updateTemplate.mockResolvedValue(mockUpdatedTemplate as any);

      await TemplateDocumentController.updateTemplate(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.updateTemplate).toHaveBeenCalledWith(templateId, updateData);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedTemplate
      });
    });

    it('should handle template not found during update', async () => {
      const templateId = 'nonexistent-template';
      const updateData = { name: 'Updated Name' };

      mockRequest.params.id = templateId;
      mockRequest.body = updateData;

      mockTemplateDocumentService.updateTemplate.mockRejectedValue(new Error('Template document not found'));

      await TemplateDocumentController.updateTemplate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      const templateId = 'template-789';
      mockRequest.params.id = templateId;

      mockTemplateDocumentService.deleteTemplate.mockResolvedValue(undefined);

      await TemplateDocumentController.deleteTemplate(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.deleteTemplate).toHaveBeenCalledWith(templateId);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Template document deleted successfully'
      });
    });

    it('should handle template not found during deletion', async () => {
      const templateId = 'nonexistent-template';
      mockRequest.params.id = templateId;

      mockTemplateDocumentService.deleteTemplate.mockRejectedValue(new Error('Template document not found'));

      await TemplateDocumentController.deleteTemplate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('duplicateTemplate', () => {
    it('should duplicate template successfully', async () => {
      const templateId = 'template-789';
      const newName = 'Copy of Peer Feedback Template';
      const userId = 'user-456';

      const mockDuplicatedTemplate: any = {
        id: 'template-456',
        organizationId: 'org-123',
        name: newName,
        description: newName,
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

      mockRequest.params.id = templateId;
      mockRequest.body = { newName };
      mockRequest.user.id = userId;

      const mockOriginalTemplate: any = {
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
      mockTemplateDocumentService.duplicateTemplate.mockResolvedValue({ originalTemplate: mockOriginalTemplate as any, duplicatedTemplate: mockDuplicatedTemplate });

      await TemplateDocumentController.duplicateTemplate(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.duplicateTemplate).toHaveBeenCalledWith(templateId, newName, userId);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          originalTemplate: mockOriginalTemplate,
          duplicatedTemplate: mockDuplicatedTemplate
        }
      });
    });

    it('should handle template not found during duplication', async () => {
      const templateId = 'nonexistent-template';
      const newName = 'Copy of Template';

      mockRequest.params.id = templateId;
      mockRequest.body = { newName };

      mockTemplateDocumentService.duplicateTemplate.mockRejectedValue(new Error('Template document not found'));

      await TemplateDocumentController.duplicateTemplate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      const mockUpdatedTemplate = {
        id: templateId,
        fileName: 'new-template.docx',
        filePath: 'templates/org-123/new-template.docx',
        fileSize: 2048000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileFormat: '.docx',
        version: 2,
        updatedAt: '2024-01-15T11:30:00Z'
      };

      mockRequest.params.id = templateId;
      mockRequest.file = mockFile;

      mockTemplateDocumentService.replaceTemplateFile.mockResolvedValue(mockUpdatedTemplate as any);

      await TemplateDocumentController.replaceTemplateFile(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.replaceTemplateFile).toHaveBeenCalledWith(templateId, mockFile);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedTemplate
      });
    });

    it('should handle missing file error', async () => {
      const templateId = 'template-789';
      mockRequest.params.id = templateId;
      mockRequest.file = null;

      await TemplateDocumentController.replaceTemplateFile(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'No file uploaded'
      });
    });
  });

  describe('downloadTemplate', () => {
    it('should download template successfully', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const mockTemplate: any = {
        id: templateId,
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx',
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        downloadCount: 25
      };

      const mockFileBuffer = Buffer.from('template file content');

      mockRequest.params.id = templateId;
      mockRequest.user.id = userId;

      mockTemplateDocumentService.downloadTemplate.mockResolvedValue({
        fileBuffer: mockFileBuffer,
        fileName: mockTemplate.fileName as any,
        mimeType: mockTemplate.fileMimeType as any
      });

      await TemplateDocumentController.downloadTemplate(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.downloadTemplate).toHaveBeenCalledWith(templateId, userId);

      expect(mockResponse.set).toHaveBeenCalledWith({
        'Content-Type': mockTemplate.fileMimeType,
        'Content-Disposition': `attachment; filename="${mockTemplate.fileName}"`,
        'Content-Length': mockFileBuffer.length.toString()
      });

      expect(mockResponse.send).toHaveBeenCalledWith(mockFileBuffer);
    });

    it('should handle template not found during download', async () => {
      const templateId = 'nonexistent-template';
      const userId = 'user-456';

      mockRequest.params.id = templateId;
      mockRequest.user.id = userId;

      mockTemplateDocumentService.downloadTemplate.mockRejectedValue(new Error('Template document not found'));

      await TemplateDocumentController.downloadTemplate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getTemplateStats', () => {
    it('should get template statistics successfully', async () => {
      const templateId = 'template-789';
      const mockStats = {
        total_downloads: 25,
        unique_users: 15,
        total_attachments: 8,
        total_views: 50,
        avg_downloads_per_user: 1.67,
        most_active_user: 'user-123',
        last_download: '2024-01-15T10:30:00Z',
        last_attachment: '2024-01-15T12:00:00Z',
        last_view: '2024-01-15T09:00:00Z',
        download_trend: 'increasing',
        attachment_rate: 0.32
      };

      mockRequest.params.id = templateId;

      mockTemplateDocumentService.getTemplateStats.mockResolvedValue(mockStats);

      await TemplateDocumentController.getTemplateStats(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.getTemplateStats).toHaveBeenCalledWith(templateId);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should handle template not found during stats retrieval', async () => {
      const templateId = 'nonexistent-template';
      mockRequest.params.id = templateId;

      mockTemplateDocumentService.getTemplateStats.mockRejectedValue(new Error('Template document not found'));

      await TemplateDocumentController.getTemplateStats(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('archiveTemplate', () => {
    it('should archive template successfully', async () => {
      const templateId = 'template-789';
      const mockArchivedTemplate = {
        id: templateId,
        archivedAt: '2024-01-15T12:00:00Z'
      };

      mockRequest.params.id = templateId;

      mockTemplateDocumentService.archiveTemplate.mockResolvedValue(undefined);

      await TemplateDocumentController.archiveTemplate(mockRequest, mockResponse, mockNext);

      expect(mockTemplateDocumentService.archiveTemplate).toHaveBeenCalledWith(templateId);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockArchivedTemplate
      });
    });

    it('should handle template not found during archiving', async () => {
      const templateId = 'nonexistent-template';
      mockRequest.params.id = templateId;

      mockTemplateDocumentService.archiveTemplate.mockRejectedValue(new Error('Template document not found'));

      await TemplateDocumentController.archiveTemplate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Static Methods', () => {
    describe('getOverallAnalytics', () => {
      it('should get overall analytics successfully', async () => {
        const organizationId = 'org-123';
        const mockAnalytics = {
          total_templates: 5,
          active_templates: 4,
          total_downloads: 150,
          total_views: 300,
          total_attachments: 45,
          unique_users: 25,
          average_templates_per_user: 0.2,
          most_popular_templates: [
            {
              template_id: 'template-123',
              template_name: 'Peer Feedback Template',
              download_count: 50,
              attachment_count: 15
            }
          ],
          usage_by_template_type: {
            'peer': 100,
            'manager': 30,
            'self': 20
          },
          usage_by_file_format: {
            '.docx': 120,
            '.pdf': 30
          }
        };

        mockRequest.user.organizationId = organizationId;

        mockTemplateAnalyticsService.getOrganizationAnalytics.mockResolvedValue(mockAnalytics as any);

        await TemplateDocumentController.getOverallAnalytics(mockRequest, mockResponse, mockNext);

        expect(mockTemplateAnalyticsService.getOrganizationAnalytics).toHaveBeenCalledWith(organizationId);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockAnalytics
        });
      });

      it('should handle service errors during analytics retrieval', async () => {
        const organizationId = 'org-123';
        mockRequest.user.organizationId = organizationId;

        mockTemplateAnalyticsService.getOrganizationAnalytics.mockRejectedValue(new Error('Database connection failed'));

        await TemplateDocumentController.getOverallAnalytics(mockRequest, mockResponse, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    describe('getDownloadHistory', () => {
      it('should get download history successfully', async () => {
        const templateId = 'template-789';
        const mockDownloads = [
          {
            user_id: 'user-123',
            user_name: 'John Doe',
            user_email: 'john@example.com',
            downloaded_at: '2024-01-15T10:30:00Z',
            metadata: {
              timestamp: '2024-01-15T10:30:00Z',
              userAgent: 'Mozilla/5.0...'
            }
          },
          {
            user_id: 'user-456',
            user_name: 'Jane Smith',
            user_email: 'jane@example.com',
            downloaded_at: '2024-01-14T14:20:00Z',
            metadata: {
              timestamp: '2024-01-14T14:20:00Z',
              userAgent: 'Chrome/91.0...'
            }
          }
        ];

        mockRequest.params.id = templateId;
        mockRequest.query = { page: '1', limit: '10' };

        mockTemplateAnalyticsService.getDownloadHistory.mockResolvedValue({
          downloads: mockDownloads.map((d: any) => ({
            userId: d.user_id,
            userName: d.user_name,
            userEmail: d.user_email,
            downloadedAt: new Date(d.downloaded_at),
            metadata: d.metadata
          })),
          total: mockDownloads.length,
          page: 1,
          limit: 10,
          totalPages: 1
        });

        await TemplateDocumentController.getDownloadHistory(mockRequest, mockResponse, mockNext);

        expect(mockTemplateAnalyticsService.getDownloadHistory).toHaveBeenCalledWith(templateId, 1, 10);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: {
            downloads: mockDownloads,
            total: mockDownloads.length,
            page: 1,
            limit: 10,
            totalPages: 1
          }
        });
      });
    });

    describe('generateUsageReport', () => {
      it('should generate usage report successfully', async () => {
        const organizationId = 'org-123';
        const startDate = '2024-01-01';
        const endDate = '2024-01-31';
        const format = 'json';

        const mockReport = {
          organization_id: organizationId,
          report_period: {
            start_date: startDate,
            end_date: endDate
          },
          summary: {
            total_templates: 5,
            active_templates: 4,
            total_downloads: 150,
            total_views: 300,
            total_attachments: 45,
            unique_users: 25
          },
          template_breakdown: [
            {
              template_id: 'template-123',
              template_name: 'Peer Feedback Template',
              downloads: 50,
              views: 100,
              attachments: 15,
              unique_users: 20
            }
          ],
          user_breakdown: [
            {
              user_id: 'user-123',
              user_name: 'John Doe',
              downloads: 10,
              attachments: 3,
              most_used_template: 'Peer Feedback Template'
            }
          ],
          trends: {
            downloads_trend: 'increasing',
            attachments_trend: 'stable',
            user_adoption_trend: 'increasing'
          }
        };

        mockRequest.user.organizationId = organizationId;
        mockRequest.query = { startDate, endDate, format };

        mockTemplateAnalyticsService.generateUsageReport.mockResolvedValue(mockReport);

        await TemplateDocumentController.generateUsageReport(mockRequest, mockResponse, mockNext);

        expect(mockTemplateAnalyticsService.generateUsageReport).toHaveBeenCalledWith(organizationId, startDate, endDate, format);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockReport
        });
      });
    });

    describe('getTemplateTrends', () => {
      it('should get template trends successfully', async () => {
        const templateId = 'template-789';
        const period = 'daily';
        const limit = 30;

        const mockTrends = [
          {
            period: '2024-01-15T00:00:00Z',
            downloads: 5,
            views: 10,
            attachments: 2,
            unique_users: 3
          },
          {
            period: '2024-01-14T00:00:00Z',
            downloads: 3,
            views: 8,
            attachments: 1,
            unique_users: 2
          }
        ];

        mockRequest.params.id = templateId;
        mockRequest.query = { period, limit };

        mockTemplateAnalyticsService.getTemplateTrends.mockResolvedValue(mockTrends as any);

        await TemplateDocumentController.getTemplateTrends(mockRequest, mockResponse, mockNext);

        expect(mockTemplateAnalyticsService.getTemplateTrends).toHaveBeenCalledWith(templateId, period, limit);

        expect(mockResponse.json).toHaveBeenCalledWith({
          success: true,
          data: mockTrends
        });
      });
    });
  });
});




