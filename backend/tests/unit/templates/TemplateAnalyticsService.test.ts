import { TemplateAnalyticsService } from '../../../src/modules/templates/services/TemplateAnalyticsService.js';
import { TemplateDocumentModel } from '../../../src/modules/templates/models/TemplateDocument.model.js';
import { TemplateAttachmentModel } from '../../../src/modules/templates/models/TemplateAttachment.model.js';
import { query } from '../../../src/config/database.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/modules/templates/models/TemplateDocument.model.js');
jest.mock('../../../src/modules/templates/models/TemplateAttachment.model.js');
jest.mock('../../../src/config/database.js', () => ({
  query: jest.fn()
}));

describe('TemplateAnalyticsService', () => {
  let templateAnalyticsService: TemplateAnalyticsService;
  let mockTemplateDocumentModel: jest.Mocked<typeof TemplateDocumentModel>;
  let mockTemplateAttachmentModel: jest.Mocked<typeof TemplateAttachmentModel>;
  let mockQuery: jest.MockedFunction<typeof query>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTemplateDocumentModel = TemplateDocumentModel as jest.Mocked<typeof TemplateDocumentModel>;
    mockTemplateAttachmentModel = TemplateAttachmentModel as jest.Mocked<typeof TemplateAttachmentModel>;
    mockQuery = query as jest.MockedFunction<typeof query>;
    
    templateAnalyticsService = new TemplateAnalyticsService();
  });

  describe('trackDownload', () => {
    it('should track template download successfully', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const metadata = {
        timestamp: '2024-01-15T10:30:00Z',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1'
      };

      const mockResult = {
        rows: [{
          id: 'analytics-123',
          templateDocumentId: templateId,
          userId,
          action: 'download',
          metadata: JSON.stringify(metadata),
          createdAt: '2024-01-15T10:30:00Z'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await templateAnalyticsService.trackDownload(templateId, userId, metadata);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback_template_analytics'),
        [templateId, userId, 'download', JSON.stringify(metadata)]
      );
    });

    it('should track template download with minimal metadata', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';

      const mockResult = {
        rows: [{
          id: 'analytics-123',
          templateDocumentId: templateId,
          userId,
          action: 'download',
          metadata: '{}',
          createdAt: '2024-01-15T10:30:00Z'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await templateAnalyticsService.trackDownload(templateId, userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback_template_analytics'),
        [templateId, userId, 'download', '{}']
      );
    });

    it('should handle database errors during download tracking', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.trackDownload(templateId, userId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('trackAttachment', () => {
    it('should track template attachment successfully', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const feedbackId = 'feedback-123';
      const metadata = {
        timestamp: '2024-01-15T12:00:00Z',
        feedbackId,
        attachmentId: 'attachment-456',
        fileSize: 1536000
      };

      const mockResult = {
        rows: [{
          id: 'analytics-456',
          templateDocumentId: templateId,
          userId,
          action: 'attach',
          metadata: JSON.stringify(metadata),
          createdAt: '2024-01-15T12:00:00Z'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await templateAnalyticsService.trackAttachment(templateId, userId, feedbackId, metadata);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback_template_analytics'),
        [templateId, userId, 'attach', JSON.stringify(metadata)]
      );
    });

    it('should track template attachment with minimal metadata', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const feedbackId = 'feedback-123';

      const mockResult = {
        rows: [{
          id: 'analytics-456',
          templateDocumentId: templateId,
          userId,
          action: 'attach',
          metadata: JSON.stringify({ feedbackId }),
          createdAt: '2024-01-15T12:00:00Z'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await templateAnalyticsService.trackAttachment(templateId, userId, feedbackId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback_template_analytics'),
        [templateId, userId, 'attach', JSON.stringify({ feedbackId })]
      );
    });

    it('should handle database errors during attachment tracking', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const feedbackId = 'feedback-123';

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.trackAttachment(templateId, userId, feedbackId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('trackView', () => {
    it('should track template view successfully', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const metadata = {
        timestamp: '2024-01-15T10:30:00Z',
        viewDuration: 30000,
        source: 'template-list'
      };

      const mockResult = {
        rows: [{
          id: 'analytics-789',
          templateDocumentId: templateId,
          userId,
          action: 'view',
          metadata: JSON.stringify(metadata),
          createdAt: '2024-01-15T10:30:00Z'
        }]
      };

      mockQuery.mockResolvedValue(mockResult);

      await templateAnalyticsService.trackView(templateId, userId, metadata);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback_template_analytics'),
        [templateId, userId, 'view', JSON.stringify(metadata)]
      );
    });

    it('should handle database errors during view tracking', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.trackView(templateId, userId))
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
        total_views: 50,
        avg_downloads_per_user: 1.67,
        most_active_user: 'user-123',
        last_download: '2024-01-15T10:30:00Z',
        last_attachment: '2024-01-15T12:00:00Z',
        last_view: '2024-01-15T09:00:00Z',
        download_trend: 'increasing',
        attachment_rate: 0.32
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await templateAnalyticsService.getTemplateStats(templateId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [templateId]
      );

      expect(result).toEqual(mockStats);
    });

    it('should get template statistics with date range', async () => {
      const templateId = 'template-789';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const mockStats = {
        total_downloads: 15,
        unique_users: 10,
        total_attachments: 5,
        total_views: 30
      };

      mockQuery.mockResolvedValue({ rows: [mockStats] });

      const result = await templateAnalyticsService.getTemplateStats(templateId, startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE template_document_id = $1 AND created_at BETWEEN $2 AND $3'),
        [templateId, startDate, endDate]
      );

      expect(result).toEqual(mockStats);
    });

    it('should handle template not found during stats retrieval', async () => {
      const templateId = 'nonexistent-template';
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(templateAnalyticsService.getTemplateStats(templateId))
        .rejects.toThrow('Template document not found');
    });

    it('should handle database errors during stats retrieval', async () => {
      const templateId = 'template-789';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.getTemplateStats(templateId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getOrganizationAnalytics', () => {
    it('should get organization analytics successfully', async () => {
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

      mockQuery.mockResolvedValue({ rows: [mockAnalytics] });

      const result = await templateAnalyticsService.getOrganizationAnalytics(organizationId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId]
      );

      expect(result).toEqual(mockAnalytics);
    });

    it('should get organization analytics with date range', async () => {
      const organizationId = 'org-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const mockAnalytics = {
        total_templates: 5,
        active_templates: 4,
        total_downloads: 75,
        total_views: 150,
        total_attachments: 22
      };

      mockQuery.mockResolvedValue({ rows: [mockAnalytics] });

      const result = await templateAnalyticsService.getOrganizationAnalytics(organizationId, startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE organization_id = $1 AND created_at BETWEEN $2 AND $3'),
        [organizationId, startDate, endDate]
      );

      expect(result).toEqual(mockAnalytics);
    });

    it('should handle database errors during organization analytics retrieval', async () => {
      const organizationId = 'org-123';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.getOrganizationAnalytics(organizationId))
        .rejects.toThrow('Database connection failed');
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

      mockQuery.mockResolvedValue({ rows: mockDownloads });

      const result = await templateAnalyticsService.getDownloadHistory(templateId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [templateId]
      );

      expect(result).toEqual(mockDownloads);
    });

    it('should get download history with pagination', async () => {
      const templateId = 'template-789';
      const page = 2;
      const limit = 10;
      const mockDownloads = [
        {
          user_id: 'user-789',
          user_name: 'Bob Wilson',
          user_email: 'bob@example.com',
          downloaded_at: '2024-01-13T09:15:00Z',
          metadata: {
            timestamp: '2024-01-13T09:15:00Z'
          }
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockDownloads });

      const result = await templateAnalyticsService.getDownloadHistory(templateId, page, limit);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [templateId, limit, (page - 1) * limit]
      );

      expect(result).toEqual(mockDownloads);
    });

    it('should handle database errors during download history retrieval', async () => {
      const templateId = 'template-789';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.getDownloadHistory(templateId))
        .rejects.toThrow('Database connection failed');
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

      mockQuery.mockResolvedValue({ rows: [mockReport] });

      const result = await templateAnalyticsService.generateUsageReport(organizationId, startDate, endDate, format);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId, startDate, endDate]
      );

      expect(result).toEqual(mockReport);
    });

    it('should generate CSV format report', async () => {
      const organizationId = 'org-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const format = 'csv';

      const mockCsvData = 'Metric,Value\nTotal Templates,5\nActive Templates,4\nTotal Downloads,150\n';

      mockQuery.mockResolvedValue({ rows: [{ csv_data: mockCsvData }] });

      const result = await templateAnalyticsService.generateUsageReport(organizationId, startDate, endDate, format);

      expect(result).toEqual(mockCsvData);
    });

    it('should handle database errors during report generation', async () => {
      const organizationId = 'org-123';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const format = 'json';

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.generateUsageReport(organizationId, startDate, endDate, format))
        .rejects.toThrow('Database connection failed');
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

      mockQuery.mockResolvedValue({ rows: mockTrends });

      const result = await templateAnalyticsService.getTemplateTrends(templateId, period, limit);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [templateId, period, limit]
      );

      expect(result).toEqual(mockTrends);
    });

    it('should get template trends with weekly period', async () => {
      const templateId = 'template-789';
      const period = 'weekly';
      const limit = 12;

      const mockTrends = [
        {
          period: '2024-01-15T00:00:00Z',
          downloads: 15,
          views: 30,
          attachments: 5,
          unique_users: 8
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockTrends });

      const result = await templateAnalyticsService.getTemplateTrends(templateId, period, limit);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE template_document_id = $1'),
        [templateId, period, limit]
      );

      expect(result).toEqual(mockTrends);
    });

    it('should handle database errors during trends retrieval', async () => {
      const templateId = 'template-789';
      const period = 'daily';
      const limit = 30;

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.getTemplateTrends(templateId, period, limit))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getUserTemplateActivity', () => {
    it('should get user template activity successfully', async () => {
      const userId = 'user-456';
      const mockActivity = [
        {
          template_id: 'template-123',
          template_name: 'Peer Feedback Template',
          downloads: 5,
          views: 10,
          attachments: 2,
          last_activity: '2024-01-15T10:30:00Z'
        },
        {
          template_id: 'template-456',
          template_name: 'Manager Feedback Template',
          downloads: 3,
          views: 8,
          attachments: 1,
          last_activity: '2024-01-14T14:20:00Z'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockActivity });

      const result = await templateAnalyticsService.getUserTemplateActivity(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );

      expect(result).toEqual(mockActivity);
    });

    it('should get user template activity with date range', async () => {
      const userId = 'user-456';
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';
      const mockActivity = [
        {
          template_id: 'template-123',
          template_name: 'Peer Feedback Template',
          downloads: 3,
          views: 6,
          attachments: 1,
          last_activity: '2024-01-15T10:30:00Z'
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockActivity });

      const result = await templateAnalyticsService.getUserTemplateActivity(userId, startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND created_at BETWEEN $2 AND $3'),
        [userId, startDate, endDate]
      );

      expect(result).toEqual(mockActivity);
    });

    it('should handle database errors during user activity retrieval', async () => {
      const userId = 'user-456';
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.getUserTemplateActivity(userId))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('getTopTemplates', () => {
    it('should get top templates successfully', async () => {
      const organizationId = 'org-123';
      const limit = 10;
      const mockTopTemplates = [
        {
          template_id: 'template-123',
          template_name: 'Peer Feedback Template',
          download_count: 50,
          view_count: 100,
          attachment_count: 15,
          unique_users: 20,
          rating: 4.5
        },
        {
          template_id: 'template-456',
          template_name: 'Manager Feedback Template',
          download_count: 30,
          view_count: 60,
          attachment_count: 10,
          unique_users: 15,
          rating: 4.2
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockTopTemplates });

      const result = await templateAnalyticsService.getTopTemplates(organizationId, limit);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId, limit]
      );

      expect(result).toEqual(mockTopTemplates);
    });

    it('should get top templates by downloads', async () => {
      const organizationId = 'org-123';
      const limit = 5;
      const sortBy = 'downloads';

      const mockTopTemplates = [
        {
          template_id: 'template-123',
          template_name: 'Peer Feedback Template',
          download_count: 50
        }
      ];

      mockQuery.mockResolvedValue({ rows: mockTopTemplates });

      const result = await templateAnalyticsService.getTopTemplates(organizationId, limit, sortBy);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY download_count DESC'),
        [organizationId, limit]
      );

      expect(result).toEqual(mockTopTemplates);
    });

    it('should handle database errors during top templates retrieval', async () => {
      const organizationId = 'org-123';
      const limit = 10;

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      await expect(templateAnalyticsService.getTopTemplates(organizationId, limit))
        .rejects.toThrow('Database connection failed');
    });
  });
});
