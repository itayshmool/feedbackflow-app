import request from 'supertest';
import app from '../../../src/app.js';

// Mock authentication middleware
jest.mock('../../../src/shared/middleware/auth.middleware.js', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = {
      email: 'admin@example.com',
      roles: ['admin'],
    };
    next();
  },
}));

// Mock database
jest.mock('../../../src/config/database.js', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

import { query } from '../../../src/config/database.js';

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Template API Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/templates', () => {
    it('should list templates', async () => {
      const mockUserResult = {
        rows: [{ id: 'user-123' }],
      };

      const mockOrgResult = {
        rows: [{ organization_id: 'org-123' }],
      };

      const mockTemplatesResult = {
        rows: [
          {
            id: 'template-1',
            organization_id: 'org-123',
            name: 'Test Template',
            description: 'A test template',
            template_type: 'peer',
            file_name: 'test.docx',
            file_path: '/uploads/test.docx',
            file_size: 1024,
            file_mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            file_format: '.docx',
            version: 1,
            download_count: 0,
            is_active: true,
            is_default: false,
            tags: '[]',
            permissions: '{"roles": ["admin", "manager", "employee"], "departments": [], "cycles": []}',
            availability_rules: '{"restrictToCycles": false, "restrictToDepartments": false, "restrictToRoles": false}',
            created_by: 'user-123',
            created_at: new Date(),
            updated_at: new Date(),
            archived_at: null,
          },
        ],
      };

      const mockCountResult = {
        rows: [{ total: '1' }],
      };

      mockQuery
        .mockResolvedValueOnce(mockUserResult)
        .mockResolvedValueOnce(mockOrgResult)
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockTemplatesResult);

      const response = await request(app)
        .get('/api/v1/templates')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.templates).toHaveLength(1);
      expect(response.body.data.templates[0].name).toBe('Test Template');
    });

    it('should handle user not found', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/v1/templates')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /api/v1/templates/:id', () => {
    it('should get template by ID', async () => {
      const templateId = 'template-123';

      const mockUserResult = {
        rows: [{ id: 'user-123' }],
      };

      const mockTemplateResult = {
        rows: [{
          id: templateId,
          organization_id: 'org-123',
          name: 'Test Template',
          description: 'A test template',
          template_type: 'peer',
          file_name: 'test.docx',
          file_path: '/uploads/test.docx',
          file_size: 1024,
          file_mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_format: '.docx',
          version: 1,
          download_count: 0,
          is_active: true,
          is_default: false,
          tags: '[]',
          permissions: '{"roles": ["admin", "manager", "employee"], "departments": [], "cycles": []}',
          availability_rules: '{"restrictToCycles": false, "restrictToDepartments": false, "restrictToRoles": false}',
          created_by: 'user-123',
          created_at: new Date(),
          updated_at: new Date(),
          archived_at: null,
        }],
      };

      mockQuery
        .mockResolvedValueOnce(mockUserResult)
        .mockResolvedValueOnce(mockTemplateResult);

      const response = await request(app)
        .get(`/api/v1/templates/${templateId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(templateId);
      expect(response.body.data.name).toBe('Test Template');
    });

    it('should return 404 if template not found', async () => {
      const templateId = 'non-existent';

      const mockUserResult = {
        rows: [{ id: 'user-123' }],
      };

      mockQuery
        .mockResolvedValueOnce(mockUserResult)
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get(`/api/v1/templates/${templateId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Template document not found');
    });
  });

  describe('GET /api/v1/templates/:id/download', () => {
    it('should download template file', async () => {
      const templateId = 'template-123';

      const mockUserResult = {
        rows: [{ id: 'user-123' }],
      };

      const mockTemplateResult = {
        rows: [{
          id: templateId,
          organization_id: 'org-123',
          name: 'Test Template',
          template_type: 'peer',
          file_name: 'test.docx',
          file_path: '/uploads/test.docx',
          file_size: 1024,
          file_mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          file_format: '.docx',
          version: 1,
          download_count: 0,
          is_active: true,
          is_default: false,
          tags: '[]',
          permissions: '{"roles": ["admin", "manager", "employee"], "departments": [], "cycles": []}',
          availability_rules: '{"restrictToCycles": false, "restrictToDepartments": false, "restrictToRoles": false}',
          created_by: 'user-123',
          created_at: new Date(),
          updated_at: new Date(),
          archived_at: null,
        }],
      };

      mockQuery
        .mockResolvedValueOnce(mockUserResult)
        .mockResolvedValueOnce(mockTemplateResult);

      // Mock file storage service
      jest.mock('../../../services/FileStorageService.js', () => ({
        fileStorageService: {
          downloadFile: jest.fn().mockResolvedValue(Buffer.from('test file content')),
        },
      }));

      const response = await request(app)
        .get(`/api/v1/templates/${templateId}/download`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });

  describe('GET /api/v1/templates/settings', () => {
    it('should get global settings', async () => {
      // Mock system settings
      const mockSettingsResult = {
        rows: [{
          settings: {
            maxFileSizeMB: 10,
            allowedFileFormats: ['.docx', '.pdf', '.doc'],
            virusScanningEnabled: true,
            storageProvider: 'local',
          },
        }],
      };

      mockQuery.mockResolvedValue(mockSettingsResult);

      const response = await request(app)
        .get('/api/v1/templates/settings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.maxFileSizeMB).toBe(10);
      expect(response.body.data.allowedFileFormats).toEqual(['.docx', '.pdf', '.doc']);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/templates')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid template ID format', async () => {
      const response = await request(app)
        .get('/api/v1/templates/invalid-id')
        .expect(200); // Should still process the request

      // The actual validation would happen in the service layer
    });
  });
});




