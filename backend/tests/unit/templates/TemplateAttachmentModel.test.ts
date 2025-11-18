import { TemplateAttachmentModel } from '../../../src/modules/templates/models/TemplateAttachment.model.js';
import { query } from '../../../src/config/database.js';
import { jest } from '@jest/globals';

// Mock database query function
jest.mock('../../../src/config/database.js', () => ({
  query: jest.fn()
}));

describe('TemplateAttachmentModel', () => {
  let mockQuery: jest.MockedFunction<typeof query>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = query as jest.MockedFunction<typeof query>;
  });

  describe('create', () => {
    it('should create a new template attachment successfully', async () => {
      const attachmentData = {
        feedbackResponseId: 'feedback-123',
        templateDocumentId: 'template-456',
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        fileSize: 1536000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedBy: 'user-789',
        virusScanStatus: 'pending'
      };

      const mockResult = {
        rows: [{
          id: 'attachment-789',
          ...attachmentData,
          uploadedAt: '2024-01-15T12:00:00Z',
          virusScanAt: null,
          createdAt: '2024-01-15T12:00:00Z'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.create(attachmentData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback_template_attachments'),
        expect.arrayContaining([
          attachmentData.feedbackResponseId,
          attachmentData.templateDocumentId,
          attachmentData.fileName,
          attachmentData.filePath,
          attachmentData.fileSize,
          attachmentData.fileMimeType,
          attachmentData.uploadedBy,
          attachmentData.virusScanStatus
        ])
      );

      expect(result).toEqual({
        id: 'attachment-789',
        ...attachmentData,
        uploadedAt: '2024-01-15T12:00:00Z',
        virusScanAt: null,
        createdAt: '2024-01-15T12:00:00Z'
      });
    });

    it('should handle database errors during creation', async () => {
      const attachmentData = {
        feedbackResponseId: 'feedback-123',
        templateDocumentId: 'template-456',
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        fileSize: 1536000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedBy: 'user-789',
        virusScanStatus: 'pending'
      };

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.create(attachmentData))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle constraint violations', async () => {
      const attachmentData = {
        feedbackResponseId: 'feedback-123',
        templateDocumentId: 'template-456',
        fileName: 'completed-feedback.docx',
        filePath: 'attachments/feedback-123/completed-feedback.docx',
        fileSize: 1536000,
        fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        uploadedBy: 'user-789',
        virusScanStatus: 'pending'
      };

      mockQuery.mockRejectedValue(new Error('foreign key constraint fails'));

      await expect(TemplateAttachmentModel.create(attachmentData))
        .rejects.toThrow('foreign key constraint fails');
    });
  });

  describe('findByFeedbackResponseId', () => {
    it('should find attachments by feedback response ID successfully', async () => {
      const feedbackResponseId = 'feedback-123';
      const mockResult = {
        rows: [
          {
            id: 'attachment-1',
            feedbackResponseId: feedbackResponseId,
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
            feedbackResponseId: feedbackResponseId,
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
        ]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findByFeedbackResponseId(feedbackResponseId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM feedback_template_attachments WHERE feedback_response_id = $1'),
        [feedbackResponseId]
      );

      expect(result).toEqual(mockResult.rows);
    });

    it('should return empty array when no attachments found', async () => {
      const feedbackResponseId = 'feedback-123';
      const mockResult = { rows: [] };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findByFeedbackResponseId(feedbackResponseId);

      expect(result).toEqual([]);
    });

    it('should handle database errors during findByFeedbackResponseId', async () => {
      const feedbackResponseId = 'feedback-123';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.findByFeedbackResponseId(feedbackResponseId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find attachment by ID successfully', async () => {
      const attachmentId = 'attachment-789';
      const mockResult = {
        rows: [{
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
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findById(attachmentId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM feedback_template_attachments WHERE id = $1'),
        [attachmentId]
      );

      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null when attachment not found', async () => {
      const attachmentId = 'nonexistent-attachment';
      const mockResult = { rows: [] };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findById(attachmentId);

      expect(result).toBeNull();
    });

    it('should handle database errors during findById', async () => {
      const attachmentId = 'attachment-789';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.findById(attachmentId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('delete', () => {
    it('should delete attachment successfully', async () => {
      const attachmentId = 'attachment-789';
      const mockResult = { rowCount: 1 };

      mockQuery.mockResolvedValue(mockResult);

      await TemplateAttachmentModel.delete(attachmentId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM feedback_template_attachments WHERE id = $1'),
        [attachmentId]
      );
    });

    it('should handle attachment not found during deletion', async () => {
      const attachmentId = 'nonexistent-attachment';
      const mockResult = { rowCount: 0 };

      mockQuery.mockResolvedValue(mockResult);

      await expect(TemplateAttachmentModel.delete(attachmentId))
        .rejects.toThrow('Template attachment not found');
    });

    it('should handle database errors during deletion', async () => {
      const attachmentId = 'attachment-789';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.delete(attachmentId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('updateVirusScanStatus', () => {
    it('should update virus scan status successfully', async () => {
      const attachmentId = 'attachment-789';
      const virusScanStatus = 'clean';
      const mockResult = {
        rows: [{
          id: attachmentId,
          virusScanStatus: virusScanStatus,
          virusScanAt: '2024-01-15T12:05:00Z'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.updateVirusScanStatus(attachmentId, virusScanStatus);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE feedback_template_attachments SET virus_scan_status = $1, virus_scan_at = NOW()'),
        [virusScanStatus, attachmentId]
      );

      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should handle attachment not found during status update', async () => {
      const attachmentId = 'nonexistent-attachment';
      const virusScanStatus = 'clean';
      const mockResult = { rows: [] };

      mockQuery.mockResolvedValue(mockResult);

      await expect(TemplateAttachmentModel.updateVirusScanStatus(attachmentId, virusScanStatus))
        .rejects.toThrow('Template attachment not found');
    });

    it('should handle database errors during status update', async () => {
      const attachmentId = 'attachment-789';
      const virusScanStatus = 'clean';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.updateVirusScanStatus(attachmentId, virusScanStatus))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('findByTemplateDocumentId', () => {
    it('should find attachments by template document ID successfully', async () => {
      const templateDocumentId = 'template-456';
      const mockResult = {
        rows: [
          {
            id: 'attachment-1',
            feedbackResponseId: 'feedback-123',
            templateDocumentId: templateDocumentId,
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
            templateDocumentId: templateDocumentId,
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
        ]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findByTemplateDocumentId(templateDocumentId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM feedback_template_attachments WHERE template_document_id = $1'),
        [templateDocumentId]
      );

      expect(result).toEqual(mockResult.rows);
    });

    it('should return empty array when no attachments found for template', async () => {
      const templateDocumentId = 'template-456';
      const mockResult = { rows: [] };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findByTemplateDocumentId(templateDocumentId);

      expect(result).toEqual([]);
    });

    it('should handle database errors during findByTemplateDocumentId', async () => {
      const templateDocumentId = 'template-456';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.findByTemplateDocumentId(templateDocumentId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('findByUploadedBy', () => {
    it('should find attachments by uploaded by user successfully', async () => {
      const uploadedBy = 'user-789';
      const mockResult = {
        rows: [
          {
            id: 'attachment-1',
            feedbackResponseId: 'feedback-123',
            templateDocumentId: 'template-456',
            fileName: 'completed-feedback-1.docx',
            filePath: 'attachments/feedback-123/completed-feedback-1.docx',
            fileSize: 1536000,
            fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            uploadedBy: uploadedBy,
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
            uploadedBy: uploadedBy,
            uploadedAt: '2024-01-16T10:00:00Z',
            virusScanStatus: 'clean',
            virusScanAt: '2024-01-16T10:05:00Z',
            createdAt: '2024-01-16T10:00:00Z'
          }
        ]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findByUploadedBy(uploadedBy);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM feedback_template_attachments WHERE uploaded_by = $1'),
        [uploadedBy]
      );

      expect(result).toEqual(mockResult.rows);
    });

    it('should return empty array when no attachments found for user', async () => {
      const uploadedBy = 'user-789';
      const mockResult = { rows: [] };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findByUploadedBy(uploadedBy);

      expect(result).toEqual([]);
    });

    it('should handle database errors during findByUploadedBy', async () => {
      const uploadedBy = 'user-789';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.findByUploadedBy(uploadedBy))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('countAttachments', () => {
    it('should count attachments successfully', async () => {
      const feedbackResponseId = 'feedback-123';
      const mockResult = {
        rows: [{ count: '3' }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.countAttachments(feedbackResponseId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) FROM feedback_template_attachments WHERE feedback_response_id = $1'),
        [feedbackResponseId]
      );

      expect(result).toBe(3);
    });

    it('should handle database errors during countAttachments', async () => {
      const feedbackResponseId = 'feedback-123';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.countAttachments(feedbackResponseId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('findByVirusScanStatus', () => {
    it('should find attachments by virus scan status successfully', async () => {
      const virusScanStatus = 'pending';
      const mockResult = {
        rows: [
          {
            id: 'attachment-1',
            feedbackResponseId: 'feedback-123',
            templateDocumentId: 'template-456',
            fileName: 'completed-feedback-1.docx',
            filePath: 'attachments/feedback-123/completed-feedback-1.docx',
            fileSize: 1536000,
            fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            uploadedBy: 'user-789',
            uploadedAt: '2024-01-15T12:00:00Z',
            virusScanStatus: virusScanStatus,
            virusScanAt: null,
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
            uploadedBy: 'user-456',
            uploadedAt: '2024-01-16T10:00:00Z',
            virusScanStatus: virusScanStatus,
            virusScanAt: null,
            createdAt: '2024-01-16T10:00:00Z'
          }
        ]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findByVirusScanStatus(virusScanStatus);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM feedback_template_attachments WHERE virus_scan_status = $1'),
        [virusScanStatus]
      );

      expect(result).toEqual(mockResult.rows);
    });

    it('should return empty array when no attachments found with status', async () => {
      const virusScanStatus = 'infected';
      const mockResult = { rows: [] };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.findByVirusScanStatus(virusScanStatus);

      expect(result).toEqual([]);
    });

    it('should handle database errors during findByVirusScanStatus', async () => {
      const virusScanStatus = 'pending';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.findByVirusScanStatus(virusScanStatus))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getAttachmentStats', () => {
    it('should get attachment statistics successfully', async () => {
      const feedbackResponseId = 'feedback-123';
      const mockResult = {
        rows: [{
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
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateAttachmentModel.getAttachmentStats(feedbackResponseId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [feedbackResponseId]
      );

      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should handle database errors during getAttachmentStats', async () => {
      const feedbackResponseId = 'feedback-123';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(TemplateAttachmentModel.getAttachmentStats(feedbackResponseId))
        .rejects.toThrow('Database connection failed');
    });
  });
});




