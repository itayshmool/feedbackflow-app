import { TemplateAnalyticsService } from '../../../src/modules/templates/services/TemplateAnalyticsService.js';
import { query } from '../../../src/config/database.js';
import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../../../src/config/database.js', () => ({
  query: jest.fn()
}));

describe('TemplateAnalyticsService', () => {
  let mockQuery: jest.MockedFunction<typeof query>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = query as jest.MockedFunction<typeof query>;
  });

  describe('trackAction', () => {
    it('should track template action successfully', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const action = 'download' as const;
      const metadata = { timestamp: new Date().toISOString() };

      mockQuery.mockResolvedValue({ rows: [] });

      await TemplateAnalyticsService.trackAction(templateId, userId, action, metadata);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback_template_analytics'),
        [templateId, userId, action, JSON.stringify(metadata)]
      );
    });

    it('should handle database errors gracefully', async () => {
      const templateId = 'template-789';
      const userId = 'user-456';
      const action = 'download' as const;

      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      // Should not throw, just log error
      await expect(
        TemplateAnalyticsService.trackAction(templateId, userId, action)
      ).resolves.not.toThrow();
    });
  });

  describe('getTemplateAnalytics', () => {
    it('should get template analytics successfully', async () => {
      const templateId = 'template-789';
      
      // Mock template name query
      mockQuery.mockResolvedValueOnce({
        rows: [{ name: 'Test Template' }]
      });

      // Mock analytics query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_actions: '25',
          total_downloads: '15',
          total_views: '8',
          total_attachments: '2',
          unique_users: '10'
        }]
      });

      // Mock active users query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          user_id: 'user-123',
          user_name: 'John Doe',
          download_count: '5',
          attachment_count: '1'
        }]
      });

      // Mock template type query
      mockQuery.mockResolvedValueOnce({
        rows: [{ template_type: 'peer' }]
      });

      // Mock department query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock role query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock time series query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await TemplateAnalyticsService.getTemplateAnalytics(templateId);

      expect(result.templateId).toBe(templateId);
      expect(result.totalDownloads).toBe(15);
      expect(result.totalAttachments).toBe(2);
    });

    it('should handle template not found', async () => {
      const templateId = 'nonexistent-template';
      
      mockQuery.mockResolvedValueOnce({
        rows: [] // Template not found
      });

      await expect(
        TemplateAnalyticsService.getTemplateAnalytics(templateId)
      ).rejects.toThrow('Template not found');
    });
  });

  describe('getOrganizationAnalytics', () => {
    it('should get organization analytics successfully', async () => {
      const organizationId = 'org-123';

      // Mock organization stats query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_templates: '5',
          active_templates: '4',
          total_downloads: '150',
          total_views: '300',
          total_attachments: '45',
          unique_users: '25'
        }]
      });

      // Mock popular templates query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock template type query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock file format query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock department query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock role query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock time series query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await TemplateAnalyticsService.getOrganizationAnalytics(organizationId);

      expect(result.totalTemplates).toBe(5);
      expect(result.activeTemplates).toBe(4);
      expect(result.totalDownloads).toBe(150);
    });
  });

  describe('getTemplateTrends', () => {
    it('should get template trends successfully', async () => {
      const templateId = 'template-789';
      const period = 'daily' as const;
      const limit = 30;

      mockQuery.mockResolvedValue({
        rows: [
          {
            period: new Date('2024-01-15'),
            downloads: '5',
            views: '10',
            attachments: '2',
            unique_users: '3'
          }
        ]
      });

      const result = await TemplateAnalyticsService.getTemplateTrends(templateId, period, limit);

      expect(result).toHaveLength(1);
      expect(result[0].downloads).toBe(5);
      expect(result[0].views).toBe(10);
    });
  });

  describe('getUserAnalytics', () => {
    it('should get user analytics successfully', async () => {
      const userId = 'user-456';

      // Mock user stats query
      mockQuery.mockResolvedValueOnce({
        rows: [{
          total_downloads: '10',
          total_views: '20',
          total_attachments: '5'
        }]
      });

      // Mock favorite templates query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock template type query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock file format query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      // Mock time series query
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await TemplateAnalyticsService.getUserAnalytics(userId);

      expect(result.userId).toBe(userId);
      expect(result.totalDownloads).toBe(10);
      expect(result.totalAttachments).toBe(5);
    });
  });

  describe('getDownloadHistory', () => {
    it('should get download history successfully', async () => {
      const templateId = 'template-789';
      const page = 1;
      const limit = 20;

      // Mock count query
      mockQuery.mockResolvedValueOnce({
        rows: [{ total: '50' }]
      });

      // Mock downloads query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            user_id: 'user-123',
            user_name: 'John Doe',
            user_email: 'john@example.com',
            downloaded_at: new Date('2024-01-15T10:30:00Z'),
            metadata: JSON.stringify({ timestamp: '2024-01-15T10:30:00Z' })
          }
        ]
      });

      const result = await TemplateAnalyticsService.getDownloadHistory(templateId, page, limit);

      expect(result.downloads).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(result.page).toBe(page);
      expect(result.limit).toBe(limit);
    });
  });

  describe('generateUsageReport', () => {
    it('should generate JSON usage report successfully', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const format = 'json' as const;

      // This will call getOrganizationAnalytics internally
      // Mock all the queries it needs
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total_templates: '5', active_templates: '4', total_downloads: '150', total_views: '300', total_attachments: '45', unique_users: '25' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await TemplateAnalyticsService.generateUsageReport(
        organizationId,
        startDate,
        endDate,
        format
      );

      expect(result).toBeDefined();
      expect(result.totalTemplates).toBe(5);
    });

    it('should generate CSV usage report successfully', async () => {
      const organizationId = 'org-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const format = 'csv' as const;

      // Mock all queries for getOrganizationAnalytics
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total_templates: '5', active_templates: '4', total_downloads: '150', total_views: '300', total_attachments: '45', unique_users: '25' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await TemplateAnalyticsService.generateUsageReport(
        organizationId,
        startDate,
        endDate,
        format
      );

      expect(typeof result).toBe('string');
      expect(result).toContain('Total Templates');
      expect(result).toContain('5');
    });
  });
});
