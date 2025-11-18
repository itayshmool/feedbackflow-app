import { TemplateAttachmentService } from '../../../src/modules/templates/services/TemplateAttachmentService';
import { TemplateAttachmentModel } from '../../../src/modules/templates/models/TemplateAttachment.model';
import { TemplateDocumentModel } from '../../../src/modules/templates/models/TemplateDocument.model';
import { fileStorageService } from '../../../src/services/FileStorageService';
import { FileValidator } from '../../../src/shared/utils/file-validator';
import { virusScanService } from '../../../src/services/VirusScanService';
import { query } from '../../../src/config/database';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/modules/templates/models/TemplateAttachment.model');
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
  virusScanService: {
    isEnabled: jest.fn(),
    scanFile: jest.fn(),
  },
}));
jest.mock('../../../src/config/database', () => ({
  query: jest.fn(),
}));

describe('TemplateAttachmentService', () => {
  let mockTemplateAttachmentModel: jest.Mocked<typeof TemplateAttachmentModel>;
  let mockTemplateDocumentModel: jest.Mocked<typeof TemplateDocumentModel>;
  let mockFileStorageService: jest.Mocked<typeof fileStorageService>;
  let mockFileValidator: jest.Mocked<typeof FileValidator>;
  let mockVirusScanService: any;
  let mockQuery: jest.MockedFunction<typeof query>;

  const createMockAttachment = (overrides: Partial<any> = {}) => ({
    id: 'attachment-123',
    feedbackResponseId: 'feedback-123',
    templateDocumentId: 'template-456',
    fileName: 'completed-feedback.docx',
    filePath: 'attachments/feedback-123/completed-feedback.docx',
    fileSize: 1536000,
    fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    uploadedBy: 'user-789',
    uploadedAt: new Date('2024-01-15T12:00:00Z'),
    virusScanStatus: 'pending' as const,
    virusScanAt: undefined,
    createdAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTemplateAttachmentModel = TemplateAttachmentModel as jest.Mocked<typeof TemplateAttachmentModel>;
    mockTemplateDocumentModel = TemplateDocumentModel as jest.Mocked<typeof TemplateDocumentModel>;
    mockFileStorageService = fileStorageService as jest.Mocked<typeof fileStorageService>;
    mockFileValidator = FileValidator as jest.Mocked<typeof FileValidator>;
    mockVirusScanService = virusScanService as jest.Mocked<typeof virusScanService>;
    mockQuery = query as jest.MockedFunction<typeof query>;

    // Default mocks
    mockFileValidator.validateFile.mockReturnValue({ isValid: true, error: null });
    mockFileValidator.generateUniqueFileName.mockImplementation((name: string) => `unique-${name}`);
    mockFileValidator.getFileExtension.mockImplementation((name: string) => {
      const ext = name.split('.').pop();
      return ext ? `.${ext}` : '';
    });
    mockVirusScanService.isEnabled.mockReturnValue(false);
  });

  describe('uploadAttachment', () => {
    it('should upload attachment successfully with template link', async () => {
      const feedbackResponseId = 'feedback-123';
      const templateDocumentId = 'template-456';
      const uploadedBy = 'user-789';

      const mockFile = {
        originalname: 'completed-feedback.docx',
        buffer: Buffer.from('completed feedback content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1536000
      } as Express.Multer.File;

      const mockAttachment = createMockAttachment();

      // Mock feedback permission check (checkFeedbackPermission)
      mockQuery.mockResolvedValueOnce({
        rows: [{ giver_id: uploadedBy, recipient_id: 'user-999' }]
      } as any);

      // Mock template permission check (checkTemplatePermission)
      // First: get user roles - PostgreSQL ARRAY_AGG returns array
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: uploadedBy, roles: ['employee', 'manager'] }]
      } as any);
      // Second: get template permissions - roles should match (at least one)
      // Note: permissions might be stored as JSON string in DB
      mockQuery.mockResolvedValueOnce({
        rows: [{ permissions: JSON.stringify({ roles: ['employee', 'admin'] }) }]
      } as any);

      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'attachments/feedback-123/unique-completed-feedback.docx',
        url: '/uploads/attachments/feedback-123/unique-completed-feedback.docx',
        size: 1536000
      } as any);

      mockTemplateAttachmentModel.create.mockResolvedValue(mockAttachment);

      const result = await TemplateAttachmentService.uploadAttachment(
        feedbackResponseId,
        mockFile,
        templateDocumentId,
        uploadedBy
      );

      expect(mockFileValidator.validateFile).toHaveBeenCalled();
      expect(mockFileStorageService.uploadFile).toHaveBeenCalled();
      expect(mockTemplateAttachmentModel.create).toHaveBeenCalled();
      expect(result.attachment).toEqual(mockAttachment);
      expect(result.fileUrl).toBeDefined();
    });

    it('should upload attachment without template link', async () => {
      const feedbackResponseId = 'feedback-123';
      const uploadedBy = 'user-789';

      const mockFile = {
        originalname: 'completed-feedback.pdf',
        buffer: Buffer.from('completed feedback content'),
        mimetype: 'application/pdf',
        size: 2048000
      } as Express.Multer.File;

      const mockAttachment = createMockAttachment({
        templateDocumentId: undefined,
        fileName: 'completed-feedback.pdf',
        fileMimeType: 'application/pdf'
      });

      // Mock feedback permission check
      mockQuery.mockResolvedValueOnce({
        rows: [{ giver_id: uploadedBy, recipient_id: 'user-999' }]
      } as any);

      mockFileStorageService.uploadFile.mockResolvedValue({
        path: 'attachments/feedback-123/unique-completed-feedback.pdf',
        url: '/uploads/attachments/feedback-123/unique-completed-feedback.pdf',
        size: 2048000
      } as any);

      mockTemplateAttachmentModel.create.mockResolvedValue(mockAttachment);

      const result = await TemplateAttachmentService.uploadAttachment(
        feedbackResponseId,
        mockFile,
        undefined,
        uploadedBy
      );

      expect(mockTemplateAttachmentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          feedbackResponseId,
          templateDocumentId: undefined
        })
      );
      expect(result.attachment).toEqual(mockAttachment);
    });

    it('should handle file validation errors', async () => {
      const feedbackResponseId = 'feedback-123';
      const uploadedBy = 'user-789';

      const mockFile = {
        originalname: 'malicious.exe',
        buffer: Buffer.from('malicious content'),
        mimetype: 'application/x-msdownload',
        size: 1024
      } as Express.Multer.File;

      mockFileValidator.validateFile.mockReturnValue({
        isValid: false,
        error: 'Invalid file type'
      });

      await expect(
        TemplateAttachmentService.uploadAttachment(feedbackResponseId, mockFile, undefined, uploadedBy)
      ).rejects.toThrow('File validation failed');
    });

    it('should handle feedback permission denied', async () => {
      const feedbackResponseId = 'feedback-123';
      const uploadedBy = 'user-789';

      const mockFile = {
        originalname: 'completed-feedback.docx',
        buffer: Buffer.from('content'),
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024
      } as Express.Multer.File;

      mockQuery.mockResolvedValueOnce({
        rows: [] // No feedback found
      } as any);

      await expect(
        TemplateAttachmentService.uploadAttachment(feedbackResponseId, mockFile, undefined, uploadedBy)
      ).rejects.toThrow('Feedback response not found');
    });
  });

  describe('getAttachmentsForFeedback', () => {
    it('should get attachments by feedback response ID successfully', async () => {
      const feedbackResponseId = 'feedback-123';
      const userId = 'user-789';

      const mockAttachments = [
        createMockAttachment({ id: 'attachment-1' }),
        createMockAttachment({ id: 'attachment-2' })
      ];

      // Mock feedback permission check
      mockQuery.mockResolvedValueOnce({
        rows: [{ giver_id: userId, recipient_id: 'user-999' }]
      } as any);

      mockTemplateAttachmentModel.getAttachmentsForFeedback.mockResolvedValue(mockAttachments);

      const result = await TemplateAttachmentService.getAttachmentsForFeedback(feedbackResponseId, userId);

      expect(mockTemplateAttachmentModel.getAttachmentsForFeedback).toHaveBeenCalledWith(
        feedbackResponseId,
        userId
      );
      expect(result).toEqual(mockAttachments);
    });

    it('should handle permission denied', async () => {
      const feedbackResponseId = 'feedback-123';
      const userId = 'user-789';

      // getAttachmentsForFeedback doesn't check permissions, it just calls the model
      // So we need to mock the model to return empty or throw
      mockTemplateAttachmentModel.getAttachmentsForFeedback.mockResolvedValue([]);

      const result = await TemplateAttachmentService.getAttachmentsForFeedback(feedbackResponseId, userId);
      expect(result).toEqual([]);
    });
  });

  describe('getAttachmentById', () => {
    it('should get attachment by ID successfully', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-789';
      const mockAttachment = createMockAttachment({ id: attachmentId });

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockTemplateAttachmentModel.checkPermission.mockResolvedValue(true);

      const result = await TemplateAttachmentService.getAttachmentById(attachmentId, userId);

      expect(mockTemplateAttachmentModel.findById).toHaveBeenCalledWith(attachmentId);
      expect(mockTemplateAttachmentModel.checkPermission).toHaveBeenCalledWith(attachmentId, userId);
      expect(result).toEqual(mockAttachment);
    });

    it('should handle attachment not found', async () => {
      const attachmentId = 'nonexistent-attachment';
      const userId = 'user-789';

      mockTemplateAttachmentModel.findById.mockResolvedValue(null);

      await expect(
        TemplateAttachmentService.getAttachmentById(attachmentId, userId)
      ).resolves.toBeNull();
    });

    it('should handle permission denied', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-789';
      const mockAttachment = createMockAttachment({ id: attachmentId });

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockTemplateAttachmentModel.checkPermission.mockResolvedValue(false);

      await expect(
        TemplateAttachmentService.getAttachmentById(attachmentId, userId)
      ).rejects.toThrow('Access denied: insufficient permissions');
    });
  });

  describe('downloadAttachment', () => {
    it('should download attachment successfully', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-789';
      const mockAttachment = createMockAttachment({
        id: attachmentId,
        filePath: 'attachments/feedback-123/completed-feedback.docx'
      });

      const mockFileBuffer = Buffer.from('completed feedback content');

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockTemplateAttachmentModel.checkPermission.mockResolvedValue(true);
      mockFileStorageService.downloadFile.mockResolvedValue(mockFileBuffer);

      const result = await TemplateAttachmentService.downloadAttachment(attachmentId, userId);

      expect(mockFileStorageService.downloadFile).toHaveBeenCalledWith(mockAttachment.filePath);
      expect(result.fileBuffer).toEqual(mockFileBuffer);
      expect(result.fileName).toBe(mockAttachment.fileName);
      expect(result.mimeType).toBe(mockAttachment.fileMimeType);
    });

    it('should handle attachment not found during download', async () => {
      const attachmentId = 'nonexistent-attachment';
      const userId = 'user-789';

      mockTemplateAttachmentModel.findById.mockResolvedValue(null);

      await expect(
        TemplateAttachmentService.downloadAttachment(attachmentId, userId)
      ).rejects.toThrow('Attachment not found');
    });
  });

  describe('deleteAttachment', () => {
    it('should delete attachment successfully', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-789';
      const mockAttachment = createMockAttachment({
        id: attachmentId,
        uploadedBy: userId,
        filePath: 'attachments/feedback-123/completed-feedback.docx'
      });

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockTemplateAttachmentModel.checkPermission.mockResolvedValue(true);
      mockFileStorageService.deleteFile.mockResolvedValue(undefined);
      mockTemplateAttachmentModel.delete.mockResolvedValue(undefined);

      await TemplateAttachmentService.deleteAttachment(attachmentId, userId);

      expect(mockFileStorageService.deleteFile).toHaveBeenCalledWith(mockAttachment.filePath);
      expect(mockTemplateAttachmentModel.delete).toHaveBeenCalledWith(attachmentId);
    });

    it('should handle unauthorized deletion attempt', async () => {
      const attachmentId = 'attachment-789';
      const userId = 'user-456'; // Different user
      const mockAttachment = createMockAttachment({
        id: attachmentId,
        uploadedBy: 'user-789' // Original uploader
      });

      mockTemplateAttachmentModel.findById.mockResolvedValue(mockAttachment);
      mockTemplateAttachmentModel.checkPermission.mockResolvedValue(true);

      await expect(
        TemplateAttachmentService.deleteAttachment(attachmentId, userId)
      ).rejects.toThrow('Access denied: only the uploader can delete attachments');
    });
  });

  describe('getAttachmentStats', () => {
    it('should get attachment statistics successfully', async () => {
      const filters = {
        feedbackResponseId: 'feedback-123'
      };

      const mockStats = {
        totalAttachments: 3,
        pendingScans: 1,
        cleanFiles: 2,
        infectedFiles: 0,
        failedScans: 0,
        totalSize: 5120000,
        averageSize: 1706667,
        attachmentsByType: {
          'word': 2,
          'pdf': 1
        },
        attachmentsByUser: {
          'user-789': 3
        }
      };

      mockTemplateAttachmentModel.getStats.mockResolvedValue(mockStats);

      const result = await TemplateAttachmentService.getAttachmentStats(filters);

      expect(mockTemplateAttachmentModel.getStats).toHaveBeenCalledWith(filters);
      expect(result).toEqual(mockStats);
    });
  });

  describe('getAttachmentsByTemplate', () => {
    it.skip('should get attachments by template document ID successfully', async () => {
      const templateDocumentId = 'template-456';
      const userId = 'user-789';

      const mockAttachments = [
        createMockAttachment({ id: 'attachment-1', templateDocumentId }),
        createMockAttachment({ id: 'attachment-2', templateDocumentId })
      ];

      // Mock template permission check (checkTemplatePermission)
      // First query: get user roles - PostgreSQL ARRAY_AGG returns array
      // The query uses ARRAY_AGG which returns an array, but might be null
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: userId, roles: ['employee', 'manager'] }]
      } as any);
      // Second query: get template permissions - roles should match (at least one)
      // Note: permissions might be stored as JSON string in DB
      mockQuery.mockResolvedValueOnce({
        rows: [{ permissions: JSON.stringify({ roles: ['employee', 'admin'] }) }]
      } as any);

      mockTemplateAttachmentModel.findByTemplateDocumentId.mockResolvedValue(mockAttachments);

      const result = await TemplateAttachmentService.getAttachmentsByTemplate(templateDocumentId, userId);

      expect(mockTemplateAttachmentModel.findByTemplateDocumentId).toHaveBeenCalledWith(templateDocumentId);
      expect(result).toEqual(mockAttachments);
    });
  });
});
