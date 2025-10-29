import request from 'supertest';
import { app } from '../../../src/app.js';
import { query } from '../../../src/config/database.js';
import { jest } from '@jest/globals';

// Mock database query function
jest.mock('../../../src/config/database.js', () => ({
  query: jest.fn()
}));

describe('Template Integration Tests', () => {
  let mockQuery: jest.MockedFunction<typeof query>;
  let authToken: string;
  let adminToken: string;
  let organizationId: string;
  let userId: string;
  let adminUserId: string;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = query as jest.MockedFunction<typeof query>;
    
    // Mock authentication tokens
    authToken = 'mock-user-token';
    adminToken = 'mock-admin-token';
    organizationId = 'org-123';
    userId = 'user-456';
    adminUserId = 'admin-789';
  });

  describe('Template Document Management Workflow', () => {
    it('should complete full template lifecycle: create → list → get → update → download → delete', async () => {
      // 1. Create template
      const createTemplateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('template content'), 'template.docx')
        .field('name', 'Peer Feedback Template')
        .field('description', 'Standard peer feedback template')
        .field('templateType', 'peer')
        .field('tags', JSON.stringify(['standard', 'peer']))
        .field('isDefault', 'false');

      expect(createTemplateResponse.status).toBe(201);
      expect(createTemplateResponse.body.success).toBe(true);
      expect(createTemplateResponse.body.data.template).toMatchObject({
        name: 'Peer Feedback Template',
        description: 'Standard peer feedback template',
        templateType: 'peer',
        isDefault: false
      });

      const templateId = createTemplateResponse.body.data.template.id;

      // 2. List templates
      const listTemplatesResponse = await request(app)
        .get('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          templateType: 'peer',
          isActive: 'true',
          page: '1',
          limit: '10'
        });

      expect(listTemplatesResponse.status).toBe(200);
      expect(listTemplatesResponse.body.success).toBe(true);
      expect(listTemplatesResponse.body.data.templates).toHaveLength(1);
      expect(listTemplatesResponse.body.data.templates[0].id).toBe(templateId);

      // 3. Get template by ID
      const getTemplateResponse = await request(app)
        .get(`/api/v1/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getTemplateResponse.status).toBe(200);
      expect(getTemplateResponse.body.success).toBe(true);
      expect(getTemplateResponse.body.data.id).toBe(templateId);
      expect(getTemplateResponse.body.data.name).toBe('Peer Feedback Template');

      // 4. Update template
      const updateData = {
        name: 'Updated Peer Feedback Template',
        description: 'Updated description',
        isActive: true
      };

      const updateTemplateResponse = await request(app)
        .put(`/api/v1/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(updateTemplateResponse.status).toBe(200);
      expect(updateTemplateResponse.body.success).toBe(true);
      expect(updateTemplateResponse.body.data.name).toBe(updateData.name);
      expect(updateTemplateResponse.body.data.description).toBe(updateData.description);

      // 5. Download template
      const downloadTemplateResponse = await request(app)
        .get(`/api/v1/templates/${templateId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(downloadTemplateResponse.status).toBe(200);
      expect(downloadTemplateResponse.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(downloadTemplateResponse.headers['content-disposition']).toContain('attachment');

      // 6. Delete template
      const deleteTemplateResponse = await request(app)
        .delete(`/api/v1/templates/${templateId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteTemplateResponse.status).toBe(200);
      expect(deleteTemplateResponse.body.success).toBe(true);
      expect(deleteTemplateResponse.body.message).toBe('Template document deleted successfully');
    });

    it('should handle template duplication workflow', async () => {
      // Create original template
      const createTemplateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('template content'), 'template.docx')
        .field('name', 'Original Template')
        .field('templateType', 'peer');

      expect(createTemplateResponse.status).toBe(201);
      const originalTemplateId = createTemplateResponse.body.data.template.id;

      // Duplicate template
      const duplicateTemplateResponse = await request(app)
        .post(`/api/v1/templates/${originalTemplateId}/duplicate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newName: 'Copy of Original Template'
        });

      expect(duplicateTemplateResponse.status).toBe(201);
      expect(duplicateTemplateResponse.body.success).toBe(true);
      expect(duplicateTemplateResponse.body.data.duplicatedTemplate.name).toBe('Copy of Original Template');
      expect(duplicateTemplateResponse.body.data.duplicatedTemplate.id).not.toBe(originalTemplateId);

      const duplicatedTemplateId = duplicateTemplateResponse.body.data.duplicatedTemplate.id;

      // Verify duplicated template exists
      const getDuplicatedTemplateResponse = await request(app)
        .get(`/api/v1/templates/${duplicatedTemplateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getDuplicatedTemplateResponse.status).toBe(200);
      expect(getDuplicatedTemplateResponse.body.data.name).toBe('Copy of Original Template');
    });

    it('should handle template file replacement workflow', async () => {
      // Create template
      const createTemplateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('original content'), 'template.docx')
        .field('name', 'Template for Replacement')
        .field('templateType', 'peer');

      expect(createTemplateResponse.status).toBe(201);
      const templateId = createTemplateResponse.body.data.template.id;

      // Replace template file
      const replaceFileResponse = await request(app)
        .put(`/api/v1/templates/${templateId}/file`)
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('new content'), 'new-template.docx');

      expect(replaceFileResponse.status).toBe(200);
      expect(replaceFileResponse.body.success).toBe(true);
      expect(replaceFileResponse.body.data.fileName).toBe('new-template.docx');
      expect(replaceFileResponse.body.data.version).toBe(2);

      // Verify file replacement
      const getTemplateResponse = await request(app)
        .get(`/api/v1/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getTemplateResponse.status).toBe(200);
      expect(getTemplateResponse.body.data.fileName).toBe('new-template.docx');
      expect(getTemplateResponse.body.data.version).toBe(2);
    });
  });

  describe('Template Attachment Workflow', () => {
    let templateId: string;
    let feedbackResponseId: string;

    beforeEach(async () => {
      // Create template for attachment tests
      const createTemplateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('template content'), 'template.docx')
        .field('name', 'Attachment Test Template')
        .field('templateType', 'peer');

      templateId = createTemplateResponse.body.data.template.id;
      feedbackResponseId = 'feedback-123';
    });

    it('should complete attachment lifecycle: upload → list → get → download → delete', async () => {
      // 1. Upload attachment
      const uploadAttachmentResponse = await request(app)
        .post(`/api/v1/feedback/${feedbackResponseId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('completed feedback content'), 'completed-feedback.docx')
        .field('templateDocumentId', templateId)
        .field('description', 'Completed peer feedback');

      expect(uploadAttachmentResponse.status).toBe(201);
      expect(uploadAttachmentResponse.body.success).toBe(true);
      expect(uploadAttachmentResponse.body.data.attachment).toMatchObject({
        feedbackResponseId,
        templateDocumentId: templateId,
        fileName: 'completed-feedback.docx',
        virusScanStatus: 'pending'
      });

      const attachmentId = uploadAttachmentResponse.body.data.attachment.id;

      // 2. List attachments
      const listAttachmentsResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackResponseId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(listAttachmentsResponse.status).toBe(200);
      expect(listAttachmentsResponse.body.success).toBe(true);
      expect(listAttachmentsResponse.body.data).toHaveLength(1);
      expect(listAttachmentsResponse.body.data[0].id).toBe(attachmentId);

      // 3. Get attachment by ID
      const getAttachmentResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackResponseId}/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getAttachmentResponse.status).toBe(200);
      expect(getAttachmentResponse.body.success).toBe(true);
      expect(getAttachmentResponse.body.data.id).toBe(attachmentId);
      expect(getAttachmentResponse.body.data.fileName).toBe('completed-feedback.docx');

      // 4. Download attachment
      const downloadAttachmentResponse = await request(app)
        .get(`/api/v1/feedback/${feedbackResponseId}/attachments/${attachmentId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(downloadAttachmentResponse.status).toBe(200);
      expect(downloadAttachmentResponse.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(downloadAttachmentResponse.headers['content-disposition']).toContain('attachment');

      // 5. Delete attachment
      const deleteAttachmentResponse = await request(app)
        .delete(`/api/v1/feedback/${feedbackResponseId}/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteAttachmentResponse.status).toBe(200);
      expect(deleteAttachmentResponse.body.success).toBe(true);
      expect(deleteAttachmentResponse.body.message).toBe('Attachment deleted successfully');
    });

    it('should handle attachment without template link', async () => {
      const uploadAttachmentResponse = await request(app)
        .post(`/api/v1/feedback/${feedbackResponseId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('standalone feedback content'), 'standalone-feedback.pdf')
        .field('description', 'Standalone feedback without template');

      expect(uploadAttachmentResponse.status).toBe(201);
      expect(uploadAttachmentResponse.body.success).toBe(true);
      expect(uploadAttachmentResponse.body.data.attachment.templateDocumentId).toBeNull();
      expect(uploadAttachmentResponse.body.data.attachment.fileName).toBe('standalone-feedback.pdf');
    });

    it('should handle virus scanning workflow', async () => {
      // Upload attachment
      const uploadAttachmentResponse = await request(app)
        .post(`/api/v1/feedback/${feedbackResponseId}/attachments`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('clean content'), 'clean-feedback.docx')
        .field('templateDocumentId', templateId);

      const attachmentId = uploadAttachmentResponse.body.data.attachment.id;

      // Scan for virus
      const scanResponse = await request(app)
        .post(`/api/v1/feedback/${feedbackResponseId}/attachments/${attachmentId}/scan`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(scanResponse.status).toBe(200);
      expect(scanResponse.body.success).toBe(true);
      expect(scanResponse.body.data.virusScanStatus).toBe('clean');
    });
  });

  describe('Template Analytics Workflow', () => {
    let templateId: string;

    beforeEach(async () => {
      // Create template for analytics tests
      const createTemplateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('analytics test template'), 'analytics-template.docx')
        .field('name', 'Analytics Test Template')
        .field('templateType', 'peer');

      templateId = createTemplateResponse.body.data.template.id;
    });

    it('should track template usage analytics', async () => {
      // Download template (should track analytics)
      const downloadResponse = await request(app)
        .get(`/api/v1/templates/${templateId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(downloadResponse.status).toBe(200);

      // Upload attachment (should track analytics)
      const uploadAttachmentResponse = await request(app)
        .post('/api/v1/feedback/feedback-123/attachments')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('completed feedback'), 'completed.docx')
        .field('templateDocumentId', templateId);

      expect(uploadAttachmentResponse.status).toBe(201);

      // Get template analytics
      const analyticsResponse = await request(app)
        .get(`/api/v1/templates/${templateId}/analytics`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(analyticsResponse.status).toBe(200);
      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data).toMatchObject({
        total_downloads: expect.any(Number),
        unique_users: expect.any(Number),
        total_attachments: expect.any(Number)
      });
    });

    it('should get organization-wide analytics', async () => {
      const overallAnalyticsResponse = await request(app)
        .get('/api/v1/templates/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect(overallAnalyticsResponse.status).toBe(200);
      expect(overallAnalyticsResponse.body.success).toBe(true);
      expect(overallAnalyticsResponse.body.data).toMatchObject({
        total_templates: expect.any(Number),
        active_templates: expect.any(Number),
        total_downloads: expect.any(Number),
        total_views: expect.any(Number),
        total_attachments: expect.any(Number),
        unique_users: expect.any(Number)
      });
    });

    it('should get download history', async () => {
      // Download template first
      await request(app)
        .get(`/api/v1/templates/${templateId}/download`)
        .set('Authorization', `Bearer ${authToken}`);

      // Get download history
      const downloadHistoryResponse = await request(app)
        .get(`/api/v1/templates/${templateId}/downloads`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: '1', limit: '10' });

      expect(downloadHistoryResponse.status).toBe(200);
      expect(downloadHistoryResponse.body.success).toBe(true);
      expect(downloadHistoryResponse.body.data.downloads).toHaveLength(1);
      expect(downloadHistoryResponse.body.data.downloads[0]).toMatchObject({
        user_id: expect.any(String),
        downloaded_at: expect.any(String)
      });
    });

    it('should generate usage reports', async () => {
      const reportResponse = await request(app)
        .get('/api/v1/templates/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          format: 'json'
        });

      expect(reportResponse.status).toBe(200);
      expect(reportResponse.body.success).toBe(true);
      expect(reportResponse.body.data).toMatchObject({
        organization_id: expect.any(String),
        report_period: {
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        },
        summary: expect.any(Object)
      });
    });

    it('should get template trends', async () => {
      const trendsResponse = await request(app)
        .get(`/api/v1/templates/${templateId}/trends`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          period: 'daily',
          limit: '30'
        });

      expect(trendsResponse.status).toBe(200);
      expect(trendsResponse.body.success).toBe(true);
      expect(trendsResponse.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Template Settings Workflow', () => {
    it('should manage global settings', async () => {
      // Get global settings
      const getSettingsResponse = await request(app)
        .get('/api/v1/templates/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getSettingsResponse.status).toBe(200);
      expect(getSettingsResponse.body.success).toBe(true);
      expect(getSettingsResponse.body.data).toMatchObject({
        maxFileSizeMB: expect.any(Number),
        allowedFileFormats: expect.any(Array),
        virusScanningEnabled: expect.any(Boolean),
        storageProvider: expect.any(String)
      });

      // Update global settings
      const updateData = {
        maxFileSizeMB: 15,
        virusScanningEnabled: false,
        maxTemplatesPerOrganization: 150
      };

      const updateSettingsResponse = await request(app)
        .put('/api/v1/templates/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(updateSettingsResponse.status).toBe(200);
      expect(updateSettingsResponse.body.success).toBe(true);
      expect(updateSettingsResponse.body.data).toMatchObject(updateData);

      // Reset settings
      const resetSettingsResponse = await request(app)
        .post('/api/v1/templates/settings/reset')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resetSettingsResponse.status).toBe(200);
      expect(resetSettingsResponse.body.success).toBe(true);
    });

    it('should manage organization settings', async () => {
      const organizationId = 'org-123';

      // Get organization settings
      const getOrgSettingsResponse = await request(app)
        .get(`/api/v1/templates/settings/organization/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getOrgSettingsResponse.status).toBe(200);
      expect(getOrgSettingsResponse.body.success).toBe(true);

      // Update organization settings
      const updateData = {
        maxFileSizeMB: 20,
        virusScanningEnabled: true,
        maxTemplatesPerOrganization: 200
      };

      const updateOrgSettingsResponse = await request(app)
        .put(`/api/v1/templates/settings/organization/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(updateOrgSettingsResponse.status).toBe(200);
      expect(updateOrgSettingsResponse.body.success).toBe(true);
      expect(updateOrgSettingsResponse.body.data).toMatchObject(updateData);
    });

    it('should check upload permissions', async () => {
      const userId = 'user-456';
      const userRole = 'admin';
      const organizationId = 'org-123';

      const permissionsResponse = await request(app)
        .get(`/api/v1/templates/settings/permissions/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ userRole, organizationId });

      expect(permissionsResponse.status).toBe(200);
      expect(permissionsResponse.body.success).toBe(true);
      expect(permissionsResponse.body.data).toMatchObject({
        canUpload: expect.any(Boolean)
      });
    });

    it('should get settings summary', async () => {
      const organizationId = 'org-123';

      const summaryResponse = await request(app)
        .get(`/api/v1/templates/settings/summary/${organizationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(summaryResponse.status).toBe(200);
      expect(summaryResponse.body.success).toBe(true);
      expect(summaryResponse.body.data).toMatchObject({
        globalSettings: expect.any(Object),
        organizationSettings: expect.any(Object),
        effectiveSettings: expect.any(Object)
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle file upload errors', async () => {
      const uploadResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('name', 'Test Template')
        .field('templateType', 'peer');
        // No file attached

      expect(uploadResponse.status).toBe(400);
      expect(uploadResponse.body.success).toBe(false);
      expect(uploadResponse.body.error).toBe('No file uploaded');
    });

    it('should handle invalid file types', async () => {
      const uploadResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('executable content'), 'malware.exe')
        .field('name', 'Test Template')
        .field('templateType', 'peer');

      expect(uploadResponse.status).toBe(400);
      expect(uploadResponse.body.success).toBe(false);
      expect(uploadResponse.body.error).toContain('Invalid file type');
    });

    it('should handle file size limits', async () => {
      const largeFile = Buffer.alloc(50 * 1024 * 1024); // 50MB file

      const uploadResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', largeFile, 'large-template.docx')
        .field('name', 'Large Template')
        .field('templateType', 'peer');

      expect(uploadResponse.status).toBe(413);
      expect(uploadResponse.body.success).toBe(false);
      expect(uploadResponse.body.error).toContain('File size exceeds limit');
    });

    it('should handle unauthorized access', async () => {
      const unauthorizedResponse = await request(app)
        .get('/api/v1/templates')
        .set('Authorization', 'Bearer invalid-token');

      expect(unauthorizedResponse.status).toBe(401);
      expect(unauthorizedResponse.body.success).toBe(false);
    });

    it('should handle insufficient permissions', async () => {
      const forbiddenResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${authToken}`) // Non-admin user
        .attach('file', Buffer.from('template content'), 'template.docx')
        .field('name', 'Test Template')
        .field('templateType', 'peer');

      expect(forbiddenResponse.status).toBe(403);
      expect(forbiddenResponse.body.success).toBe(false);
    });

    it('should handle resource not found', async () => {
      const notFoundResponse = await request(app)
        .get('/api/v1/templates/nonexistent-template')
        .set('Authorization', `Bearer ${authToken}`);

      expect(notFoundResponse.status).toBe(404);
      expect(notFoundResponse.body.success).toBe(false);
    });

    it('should handle rate limiting', async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array(15).fill(null).map(() =>
        request(app)
          .post('/api/v1/templates')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('file', Buffer.from('template content'), 'template.docx')
          .field('name', 'Rate Limit Test')
          .field('templateType', 'peer')
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponse = responses.find(r => r.status === 429);

      expect(rateLimitedResponse).toBeDefined();
      expect(rateLimitedResponse?.body.success).toBe(false);
      expect(rateLimitedResponse?.body.error).toContain('Too many requests');
    });
  });

  describe('Permission and Access Control', () => {
    it('should enforce organization-scoped access', async () => {
      // Create template in org-123
      const createTemplateResponse = await request(app)
        .post('/api/v1/templates')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', Buffer.from('template content'), 'template.docx')
        .field('name', 'Org Template')
        .field('templateType', 'peer');

      const templateId = createTemplateResponse.body.data.template.id;

      // Try to access with user from different organization
      const crossOrgResponse = await request(app)
        .get(`/api/v1/templates/${templateId}`)
        .set('Authorization', 'Bearer cross-org-token');

      expect(crossOrgResponse.status).toBe(403);
      expect(crossOrgResponse.body.success).toBe(false);
    });

    it('should enforce role-based permissions', async () => {
      // Non-admin user tries to delete template
      const deleteResponse = await request(app)
        .delete('/api/v1/templates/some-template-id')
        .set('Authorization', `Bearer ${authToken}`); // Non-admin user

      expect(deleteResponse.status).toBe(403);
      expect(deleteResponse.body.success).toBe(false);
    });

    it('should allow users to delete their own attachments', async () => {
      // Upload attachment as user
      const uploadResponse = await request(app)
        .post('/api/v1/feedback/feedback-123/attachments')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('user content'), 'user-file.docx');

      const attachmentId = uploadResponse.body.data.attachment.id;

      // Delete own attachment
      const deleteResponse = await request(app)
        .delete(`/api/v1/feedback/feedback-123/attachments/${attachmentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });

    it('should prevent users from deleting others\' attachments', async () => {
      // Upload attachment as user
      const uploadResponse = await request(app)
        .post('/api/v1/feedback/feedback-123/attachments')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', Buffer.from('user content'), 'user-file.docx');

      const attachmentId = uploadResponse.body.data.attachment.id;

      // Try to delete as different user
      const deleteResponse = await request(app)
        .delete(`/api/v1/feedback/feedback-123/attachments/${attachmentId}`)
        .set('Authorization', 'Bearer other-user-token');

      expect(deleteResponse.status).toBe(403);
      expect(deleteResponse.body.success).toBe(false);
    });
  });
});
