import { TemplateAttachmentService } from '../../../src/modules/templates/services/TemplateAttachmentService.js';
import { TemplateAttachmentModel } from '../../../src/modules/templates/models/TemplateAttachment.model.js';
import { TemplateDocumentModel } from '../../../src/modules/templates/models/TemplateDocument.model.js';
import { FileStorageService } from '../../../src/services/FileStorageService.js';
import { VirusScanService } from '../../../src/services/VirusScanService.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/modules/templates/models/TemplateAttachment.model.js');
jest.mock('../../../src/modules/templates/models/TemplateDocument.model.js');
jest.mock('../../../src/services/FileStorageService.js');
jest.mock('../../../src/services/VirusScanService.js');

describe('TemplateAttachmentService', () => {
  let templateAttachmentService: TemplateAttachmentService;
  let mockTemplateAttachmentModel: jest.Mocked<typeof TemplateAttachmentModel>;
  let mockTemplateDocumentModel: jest.Mocked<typeof TemplateDocumentModel>;
  let mockFileStorageService: jest.Mocked<FileStorageService>;
  let mockVirusScanService: jest.Mocked<VirusScanService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTemplateAttachmentModel = TemplateAttachmentModel as jest.Mocked<typeof TemplateAttachmentModel>;
    mockTemplateDocumentModel = TemplateDocumentModel as jest.Mocked<typeof TemplateDocumentModel>;
    mockFileStorageService = new FileStorageService() as jest.Mocked<FileStorageService>;
    mockVirusScanService = new VirusScanService() as jest.Mocked<VirusScanService>;
    
    templateAttachmentService = new TemplateAttachmentService();
  });

  describe('uploadAttachment', () => {
    it('should upload attachment successfully with template link', async () => {
      const feedbackResponseId = 'feedback-123';
      const templateDocumentId = 'template-456';
      const uploadedBy = 'user-789';
      const description = 'Completed peer feedback';

      const mockFile = {
        originalname: 'completed-feedback.docx',
        buffer: Buffer.from('completed feedback content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1536000
      } as Express.Multer.File;

      const mockTemplate = {
        id: templateDocumentId,
        organizationId: 'org-123',
        fileName: 'template.docx',
        filePath: 'templates/org-123/template.docx'
      };

      const mockAttachment = {
        id: 'attachment-789',
        feedbackResponseId,
        templateDocumentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        fileSize: 1536000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedBy,
        uploadedAt: '2024-01-15T12:00:00Z',
        virusScanStatus: 'pending',
        virusScanAt: null,
        createdAt: '2024-01-15T12:00:00Z'
      };

      mockTemplateDocumentModel.findById.mockResolvedValue(mockTemplate);
      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'attachments/feedback-123/completed-feedback.docx',
        url: '/uploads/attachments/feedback-123/completed-feedback.docx'
      });
      mockTemplateAttachmentModel.create.mockResolvedValue(mockAttachment);
      mockVirusScanService.scanFile.mockResolvedValue({ status: 'clean' });

      const result = await templateAttachmentService.uploadAttachment(
        feedbackResponseId,
        mockFile,
        uploadedBy,
        templateDocumentId,
        description
      );

      expect(mockTemplateDocumentModel.findById).toHaveBeenCalledWith(templateDocumentId);
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringContaining('attachments/feedback-123/'),
        mockFile.mimetype
      );
      expect(mockTemplateAttachmentModel.create).toHaveBeenCalledWith({
        feedbackResponseId,
        templateDocumentId,
        fileName: mockFile.originalname,
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        fileSize: mockFile.size,
        fileMimeType: mockFile.mimetype,
        uploadedBy,
        virusScanStatus: 'pending'
      });

      expect(result).toEqual(mockAttachment);
    });

    it('should upload attachment without template link', async () => {
      const feedbackResponseId = 'feedback-123';
      const uploadedBy = 'user-789';
      const description = 'Completed feedback without template';

      const mockFile = {
        originalname: 'completed-feedback.pdf',
        buffer: Buffer.from('completed feedback content'),
        mimetype: 'application/pdf',
        size: 2048000
      } as Express.Multer.File;

      const mockAttachment = {
        id: 'attachment-789',
        feedbackResponseId,
        templateDocumentId: null,
        fileName: 'completed-feedback.pdf',
        filePath: 'attachments/feedback-123/completed-feedback.pdf',
        fileSize: 2048000,
        fileMimeType: 'application/pdf',
        uploadedBy,
        uploadedAt: '2024-01-15T12:00:00Z',
        virusScanStatus: 'pending',
        virusScanAt: null,
        createdAt: '2024-01-15T12:00:00Z'
      };

      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'attachments/feedback-123/completed-feedback.pdf',
        url: '/uploads/attachments/feedback-123/completed-feedback.pdf'
      });
      mockTemplateAttachmentModel.create.mockResolvedValue(mockAttachment);

      const result = await templateAttachmentService.uploadAttachment(
        feedbackResponseId,
        mockFile,
        uploadedBy,
        null,
        description
      );

      expect(mockTemplateDocumentModel.findById).not.toHaveBeenCalled();
      expect(mockFileStorageService.uploadFile).toHaveBeenCalledWith(
        mockFile.buffer,
        expect.stringContaining('attachments/feedback-123/'),
        mockFile.mimetype
      );
      expect(mockTemplateAttachmentModel.create).toHaveBeenCalledWith({
        feedbackResponseId,
        templateDocumentId: null,
        fileName: mockFile.originalname,
        filePath: 'attachments/feedback-123/completed-feedback.pdf',
        fileSize: mockFile.size,
        fileMimeType: mockFile.mimetype,
        uploadedBy,
        virusScanStatus: 'pending'
      });

      expect(result).toEqual(mockAttachment);
    });

    it('should handle template not found', async () => {
      const feedbackResponseId = 'feedback-123';
      const templateDocumentId = 'nonexistent-template';
      const uploadedBy = 'user-789';
      const description = 'Completed feedback';

      const mockFile = {
        originalname: 'completed-feedback.docx',
        buffer: Buffer.from('completed feedback content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1536000
      } as Express.Multer.File;

      mockTemplateDocumentModel.findById.mockResolvedValue(null);

      await expect(templateAttachmentService.uploadAttachment(
        feedbackResponseId,
        mockFile,
        uploadedBy,
        templateDocumentId,
        description
      )).rejects.toThrow('Template document not found');
    });

    it('should handle file upload errors', async () => {
      const feedbackResponseId = 'feedback-123';
      const uploadedBy = 'user-789';
      const description = 'Completed feedback';

      const mockFile = {
        originalname: 'completed-feedback.docx',
        buffer: Buffer.from('completed feedback content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1536000
      } as Express.Multer.File;

      mockFileStorageService.uploadFile.mockRejectedValue(new Error('Storage service unavailable'));

      await expect(templateAttachmentService.uploadAttachment(
        feedbackResponseId,
        mockFile,
        uploadedBy,
        null,
        description
      )).rejects.toThrow('Storage service unavailable');
    });

    it('should handle database creation errors', async () => {
      const feedbackResponseId = 'feedback-123';
      const uploadedBy = 'user-789';
      const description = 'Completed feedback';

      const mockFile = {
        originalname: 'completed-feedback.docx',
        buffer: Buffer.from('completed feedback content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1536000
      } as Express.Multer.File;

      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'attachments/feedback-123/completed-feedback.docx',
        url: '/uploads/attachments/feedback-123/completed-feedback.docx'
      });
      mockTemplateAttachmentModel.create.mockRejectedValue(new Error('Database constraint violation'));

      await expect(templateAttachmentService.uploadAttachment(
        feedbackResponseId,
        mockFile,
        uploadedBy,
        null,
        description
      )).rejects.toThrow('Database constraint violation');
    });
  });

  describe('getAttachmentsByFeedback', () => {
    it('should get attachments by feedback response ID successfully', async () => {
      const feedbackResponseId = 'feedback-123';
      const mockAttachments = [
        {
          id: 'attachment-1',
          feedbackResponseId,
          templateDocumentId: 'template-456',
          fileName: 'completed-feedback-1.docx',
          filePath: 'attachments/feedback-123/completed-feedback-1.docx',
          fileSize: 1536000,
          fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          uploadedBy: 'user-789',
          uploadedAt: '2024-01-15T12:00:00Z',
          virusScanStatus: 'clean',
          virusScanAt: '2024-01-15T12:05:00Z',
          createdAt: '2024-01-15T12:00:00Z'
        },
        {
          id: 'attachment-2',
          feedbackResponseId,
          templateDocumentId: 'template-789',
          fileName: 'completed-feedback-2.pdf',
          filePath: 'attachments/feedback-123/completed-feedback-2.pdf',
          fileSize: 2048000,
          fileMimeType: 'application/pdf',
          uploadedBy: 'user-789',
          uploadedAt: '2024-01-15T12:30:00Z',
          virusScanStatus: 'clean',
          virusScanAt: '2024-01-15T12:35:00Z',
          createdAt: '2024-01-15T12:30:00Z'
        }
      ];

      mockTemplateAttachmentModel.findByFeedbackResponseId.mockResolvedValue(mockAttachments);

      const result = await templateAttachmentService.getAttachmentsByFeedback(feedbackResponseId);

      expect(mockTemplateAttachmentModel.findByFeedbackResponseId).toHaveBeenCalledWith(feedbackResponseId);
      expect(result).toEqual(mockAttachments);
    });

    it('should return empty array when no attachments found', async () => {
      const feedbackResponseId = 'feedback-123';
      mockTemplateAttachmentModel.findByFeedbackResponseId.mockResolvedValue([]);

      const result = await templateAttachmentService.getAttachmentsByFeedback(feedbackResponseId);

      expect(result).toEqual([]);
    });

    it('should handle database errors during retrieval', async () => {
      const feedbackResponseId = 'feedback-123';
      mockTemplateAttachmentModel.findByFeedbackResponseId.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAttachmentService.getAttachmentsByFeedback(feedbackResponseId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getAttachmentById', () => {
    it('should get attachment by ID successfully', async () => {
      const attachmentId = 'attachment-789';
      const mockAttachment = {
        id: attachmentId,
        feedbackResponseId: 'feedback-123',
        templateDocumentId: 'template-456',
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        fileSize: 1536000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedBy: 'user-789',
        uploadedAt: '2024-01-15T12:00:00Z',
        virusScanStatus: 'clean',
        virusScanAt: '2024-01-15T12:05:00Z',
        createdAt: '2024-01-15T12:00:00Z'
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);

      const result = await templateAttachmentService.getAttachmentById(attachmentId);

      expect(mockTemplateAttachmentModel.findById).toHaveBeenCalledWith(attachmentId);
      expect(result).toEqual(mockAttachment);
    });

    it('should handle attachment not found', async () => {
      const attachmentId = 'nonexistent-attachment';
      mockTemplateAttachmentModel.findById.mockResolvedValue(null);

      await expect(templateAttachmentService.getAttachmentById(attachmentId))
        .rejects.toThrow('Template attachment not found');
    });

    it('should handle database errors during retrieval', async () => {
      const attachmentId = 'attachment-789';
      mockTemplateAttachmentModel.findById.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAttachmentService.getAttachmentById(attachmentId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('deleteAttachment', () => {
    it('should delete attachment successfully', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-789';
      const mockAttachment = {
        id: attachmentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        uploadedBy: userId
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockFileStorageService.deleteFile.mockResolvedValue(undefined);
      mockTemplateAttachmentModel.delete.mockResolvedValue(undefined);

      await templateAttachmentService.deleteAttachment(attachmentId, userId);

      expect(mockTemplateAttachmentModel.findById).toHaveBeenCalledWith(attachmentId);
      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(mockAttachment.filePath);
      expect(mockTemplateAttachmentModel.delete).toHaveBeenCalledWith(attachmentId);
    });

    it('should handle attachment not found during deletion', async () => {
      const attachmentId = 'nonexistent-attachment';
      const userId = 'user-789';

      mockTemplateAttachmentModel.findById.mockResolvedValue(null);

      await expect(templateAttachmentService.deleteAttachment(attachmentId, userId))
        .rejects.toThrow('Template attachment not found');
    });

    it('should handle unauthorized deletion attempt', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-456'; // Different user
      const mockAttachment = {
        id: attachmentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        uploadedBy: 'user-789' // Original uploader
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);

      await expect(templateAttachmentService.deleteAttachment(attachmentId, userId))
        .rejects.toThrow('Unauthorized: You can only delete your own attachments');
    });

    it('should handle file deletion errors', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-789';
      const mockAttachment = {
        id: attachmentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        uploadedBy: userId
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockFileStorageService.deleteFile.mockRejectedValue(new Error('File not found'));

      await expect(templateAttachmentService.deleteAttachment(attachmentId, userId))
        .rejects.toThrow('File not found');
    });

    it('should handle database deletion errors', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-789';
      const mockAttachment = {
        id: attachmentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        uploadedBy: userId
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockFileStorageService.deleteFile.mockResolvedValue(undefined);
      mockTemplateAttachmentModel.delete.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAttachmentService.deleteAttachment(attachmentId, userId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('downloadAttachment', () => {
    it('should download attachment successfully', async () => {
      const attachmentId = 'attachment-789';
      const mockAttachment = {
        id: attachmentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      const mockFileBuffer = Buffer.from('completed feedback content');

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockFileStorageService.downloadFile.mockResolvedValue(mockFileBuffer);

      const result = await templateAttachmentService.downloadAttachment(attachmentId);

      expect(mockTemplateAttachmentModel.findById).toHaveBeenCalledWith(attachmentId);
      expect(mockFileStorageService.downloadFile).toHaveBeenCalledWith(mockAttachment.filePath);

      expect(result).toEqual({
        attachment: mockAttachment,
        fileBuffer: mockFileBuffer,
        fileName: mockAttachment.fileName,
        mimeType: mockAttachment.fileMimeType
      });
    });

    it('should handle attachment not found during download', async () => {
      const attachmentId = 'nonexistent-attachment';
      mockTemplateAttachmentModel.findById.mockResolvedValue(null);

      await expect(templateAttachmentService.downloadAttachment(attachmentId))
        .rejects.toThrow('Template attachment not found');
    });

    it('should handle file download errors', async () => {
      const attachmentId = 'attachment-789';
      const mockAttachment = {
        id: attachmentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockFileStorageService.downloadFile.mockRejectedValue(new Error('File not found'));

      await expect(templateAttachmentService.downloadAttachment(attachmentId))
        .rejects.toThrow('File not found');
    });
  });

  describe('validateAttachmentPermissions', () => {
    it('should validate permissions successfully for feedback participant', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-789';
      const userRole = 'employee';

      const mockAttachment = {
        id: attachmentId,
        feedbackResponseId: 'feedback-123',
        uploadedBy: 'user-456'
      };

      // Mock feedback response with user as participant
      const mockFeedbackResponse = {
        id: 'feedback-123',
        giverId: 'user-789',
        receiverId: 'user-456'
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);

      const result = await templateAttachmentService.validateAttachmentPermissions(
        attachmentId,
        userId,
        userRole,
        mockFeedbackResponse
      );

      expect(result).toBe(true);
    });

    it('should validate permissions for admin users', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'admin-user';
      const userRole = 'admin';

      const mockAttachment = {
        id: attachmentId,
        feedbackResponseId: 'feedback-123',
        uploadedBy: 'user-456'
      };

      const mockFeedbackResponse = {
        id: 'feedback-123',
        giverId: 'user-789',
        receiverId: 'user-456'
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);

      const result = await templateAttachmentService.validateAttachmentPermissions(
        attachmentId,
        userId,
        userRole,
        mockFeedbackResponse
      );

      expect(result).toBe(true);
    });

    it('should deny permissions for unauthorized users', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-999'; // Not involved in feedback
      const userRole = 'employee';

      const mockAttachment = {
        id: attachmentId,
        feedbackResponseId: 'feedback-123',
        uploadedBy: 'user-456'
      };

      const mockFeedbackResponse = {
        id: 'feedback-123',
        giverId: 'user-789',
        receiverId: 'user-456'
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);

      const result = await templateAttachmentService.validateAttachmentPermissions(
        attachmentId,
        userId,
        userRole,
        mockFeedbackResponse
      );

      expect(result).toBe(false);
    });

    it('should handle attachment not found during permission validation', async () => {
      const attachmentId = 'nonexistent-attachment';
      const userId = 'user-789';
      const userRole = 'employee';

      const mockFeedbackResponse = {
        id: 'feedback-123',
        giverId: 'user-789',
        receiverId: 'user-456'
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(null);

      await expect(templateAttachmentService.validateAttachmentPermissions(
        attachmentId,
        userId,
        userRole,
        mockFeedbackResponse
      )).rejects.toThrow('Template attachment not found');
    });
  });

  describe('scanAttachmentForVirus', () => {
    it('should scan attachment for virus successfully', async () => {
      const attachmentId = 'attachment-789';
      const mockAttachment = {
        id: attachmentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx'
      };

      const mockScanResult = { status: 'clean' };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockFileStorageService.downloadFile.mockResolvedValue(Buffer.from('file content'));
      mockVirusScanService.scanFile.mockResolvedValue(mockScanResult);
      mockTemplateAttachmentModel.updateVirusScanStatus.mockResolvedValue({
        id: attachmentId,
        virusScanStatus: 'clean',
        virusScanAt: '2024-01-15T12:05:00Z'
      });

      const result = await templateAttachmentService.scanAttachmentForVirus(attachmentId);

      expect(mockTemplateAttachmentModel.findById).toHaveBeenCalledWith(attachmentId);
      expect(mockFileStorageService.downloadFile).toHaveBeenCalledWith(mockAttachment.filePath);
      expect(mockVirusScanService.scanFile).toHaveBeenCalledWith(Buffer.from('file content'));
      expect(mockTemplateAttachmentModel.updateVirusScanStatus).toHaveBeenCalledWith(attachmentId, 'clean');

      expect(result).toEqual({
        id: attachmentId,
        virusScanStatus: 'clean',
        virusScanAt: '2024-01-15T12:05:00Z'
      });
    });

    it('should handle infected file detection', async () => {
      const attachmentId = 'attachment-789';
      const mockAttachment = {
        id: attachmentId,
        fileName: 'infected-file.docx',
        filePath: 'attachments/feedback-123/infected-file.docx'
      };

      const mockScanResult = { status: 'infected' };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockFileStorageService.downloadFile.mockResolvedValue(Buffer.from('infected content'));
      mockVirusScanService.scanFile.mockResolvedValue(mockScanResult);
      mockTemplateAttachmentModel.updateVirusScanStatus.mockResolvedValue({
        id: attachmentId,
        virusScanStatus: 'infected',
        virusScanAt: '2024-01-15T12:05:00Z'
      });

      const result = await templateAttachmentService.scanAttachmentForVirus(attachmentId);

      expect(mockTemplateAttachmentModel.updateVirusScanStatus).toHaveBeenCalledWith(attachmentId, 'infected');
      expect(result.virusScanStatus).toBe('infected');
    });

    it('should handle virus scan failures', async () => {
      const attachmentId = 'attachment-789';
      const mockAttachment = {
        id: attachmentId,
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx'
      };

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockFileStorageService.downloadFile.mockResolvedValue(Buffer.from('file content'));
      mockVirusScanService.scanFile.mockRejectedValue(new Error('Virus scan service unavailable'));

      await expect(templateAttachmentService.scanAttachmentForVirus(attachmentId))
        .rejects.toThrow('Virus scan service unavailable');
    });

    it('should handle attachment not found during virus scan', async () => {
      const attachmentId = 'nonexistent-attachment';
      mockTemplateAttachmentModel.findById.mockResolvedValue(null);

      await expect(templateAttachmentService.scanAttachmentForVirus(attachmentId))
        .rejects.toThrow('Template attachment not found');
    });
  });

  describe('getAttachmentStats', () => {
    it('should get attachment statistics successfully', async () => {
      const feedbackResponseId = 'feedback-123';
      const mockStats = {
        total_attachments: 3,
        total_size_bytes: 5120000,
        avg_size_bytes: 1706667,
        file_types: {
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 2,
          'application/pdf': 1
        },
        virus_scan_status: {
          'clean': 2,
          'pending': 1
        },
        oldest_attachment: '2024-01-15T12:00:00Z',
        newest_attachment: '2024-01-16T10:00:00Z'
      };

      mockTemplateAttachmentModel.getAttachmentStats.mockResolvedValue(mockStats);

      const result = await templateAttachmentService.getAttachmentStats(feedbackResponseId);

      expect(mockTemplateAttachmentModel.getAttachmentStats).toHaveBeenCalledWith(feedbackResponseId);
      expect(result).toEqual(mockStats);
    });

    it('should handle database errors during stats retrieval', async () => {
      const feedbackResponseId = 'feedback-123';
      mockTemplateAttachmentModel.getAttachmentStats.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAttachmentService.getAttachmentStats(feedbackResponseId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getAttachmentsByTemplate', () => {
    it('should get attachments by template document ID successfully', async () => {
      const templateDocumentId = 'template-456';
      const mockAttachments = [
        {
          id: 'attachment-1',
          feedbackResponseId: 'feedback-123',
          templateDocumentId,
          fileName: 'completed-feedback-1.docx',
          filePath: 'attachments/feedback-123/completed-feedback-1.docx',
          fileSize: 1536000,
          fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          uploadedBy: 'user-789',
          uploadedAt: '2024-01-15T12:00:00Z',
          virusScanStatus: 'clean',
          virusScanAt: '2024-01-15T12:05:00Z',
          createdAt: '2024-01-15T12:00:00Z'
        },
        {
          id: 'attachment-2',
          feedbackResponseId: 'feedback-456',
          templateDocumentId,
          fileName: 'completed-feedback-2.docx',
          filePath: 'attachments/feedback-456/completed-feedback-2.docx',
          fileSize: 2048000,
          fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          uploadedBy: 'user-456',
          uploadedAt: '2024-01-16T10:00:00Z',
          virusScanStatus: 'clean',
          virusScanAt: '2024-01-16T10:05:00Z',
          createdAt: '2024-01-16T10:00:00Z'
        }
      ];

      mockTemplateAttachmentModel.findByTemplateDocumentId.mockResolvedValue(mockAttachments);

      const result = await templateAttachmentService.getAttachmentsByTemplate(templateDocumentId);

      expect(mockTemplateAttachmentModel.findByTemplateDocumentId).toHaveBeenCalledWith(templateDocumentId);
      expect(result).toEqual(mockAttachments);
    });

    it('should return empty array when no attachments found for template', async () => {
      const templateDocumentId = 'template-456';
      mockTemplateAttachmentModel.findByTemplateDocumentId.mockResolvedValue([]);

      const result = await templateAttachmentService.getAttachmentsByTemplate(templateDocumentId);

      expect(result).toEqual([]);
    });

    it('should handle database errors during retrieval by template', async () => {
      const templateDocumentId = 'template-456';
      mockTemplateAttachmentModel.findByTemplateDocumentId.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAttachmentService.getAttachmentsByTemplate(templateDocumentId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getAttachmentsByUser', () => {
    it('should get attachments by user ID successfully', async () => {
      const uploadedBy = 'user-789';
      const mockAttachments = [
        {
          id: 'attachment-1',
          feedbackResponseId: 'feedback-123',
          templateDocumentId: 'template-456',
          fileName: 'completed-feedback-1.docx',
          filePath: 'attachments/feedback-123/completed-feedback-1.docx',
          fileSize: 1536000,
          fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          uploadedBy,
          uploadedAt: '2024-01-15T12:00:00Z',
          virusScanStatus: 'clean',
          virusScanAt: '2024-01-15T12:05:00Z',
          createdAt: '2024-01-15T12:00:00Z'
        },
        {
          id: 'attachment-2',
          feedbackResponseId: 'feedback-456',
          templateDocumentId: 'template-789',
          fileName: 'completed-feedback-2.pdf',
          filePath: 'attachments/feedback-456/completed-feedback-2.pdf',
          fileSize: 2048000,
          fileMimeType: 'application/pdf',
          uploadedBy,
          uploadedAt: '2024-01-16T10:00:00Z',
          virusScanStatus: 'clean',
          virusScanAt: '2024-01-16T10:05:00Z',
          createdAt: '2024-01-16T10:00:00Z'
        }
      ];

      mockTemplateAttachmentModel.findByUploadedBy.mockResolvedValue(mockAttachments);

      const result = await templateAttachmentService.getAttachmentsByUser(uploadedBy);

      expect(mockTemplateAttachmentModel.findByUploadedBy).toHaveBeenCalledWith(uploadedBy);
      expect(result).toEqual(mockAttachments);
    });

    it('should return empty array when no attachments found for user', async () => {
      const uploadedBy = 'user-789';
      mockTemplateAttachmentModel.findByUploadedBy.mockResolvedValue([]);

      const result = await templateAttachmentService.getAttachmentsByUser(uploadedBy);

      expect(result).toEqual([]);
    });

    it('should handle database errors during retrieval by user', async () => {
      const uploadedBy = 'user-789';
      mockTemplateAttachmentModel.findByUploadedBy.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAttachmentService.getAttachmentsByUser(uploadedBy))
        .rejects.toThrow('Database connection failed');
    });
  });
});
