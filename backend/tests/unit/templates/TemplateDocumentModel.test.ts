import { TemplateDocumentModel } from '../../../src/modules/templates/models/TemplateDocument.model';
import { jest } from '@jest/globals';

// Mock database query function
jest.mock('../../../src/config/real-database', () => ({
  query: jest.fn()
}));

import { query } from '../../../src/config/real-database';
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('TemplateDocumentModel', () => {
  const mockTemplateData = {
    organization_id: 'org-123',
    name: 'Test Template',
    description: 'Test Description',
    template_type: 'peer' as const,
    file_name: 'test.docx',
    file_path: '/uploads/test.docx',
    file_size: 1024,
    file_mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_format: '.docx' as const,
    version: 1,
    download_count: 0,
    is_active: true,
    is_default: false,
    tags: [],
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
    created_by: 'user-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new template document', async () => {
      const mockResult = {
        rows: [{ id: 'template-123', ...mockTemplateData }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };
      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateDocumentModel.create(mockTemplateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO feedback_template_documents'),
        expect.arrayContaining([
          mockTemplateData.organization_id,
          mockTemplateData.name,
          mockTemplateData.description,
          mockTemplateData.template_type,
          mockTemplateData.file_name,
          mockTemplateData.file_path,
          mockTemplateData.file_size,
          mockTemplateData.file_mime_type,
          mockTemplateData.file_format,
          mockTemplateData.created_by
        ])
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('findById', () => {
    it('should find template by ID', async () => {
      const mockResult = {
        rows: [{ id: 'template-123', ...mockTemplateData }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: []
      };
      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateDocumentModel.findById('template-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM feedback_template_documents'),
        ['template-123']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null if template not found', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [], 
        rowCount: 0, 
        command: 'SELECT', 
        oid: 0, 
        fields: [] 
      });

      const result = await TemplateDocumentModel.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should find all templates with filters', async () => {
      const mockResult = {
        rows: [
          { id: 'template-1', ...mockTemplateData },
          { id: 'template-2', ...mockTemplateData }
        ],
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: []
      };
      mockQuery.mockResolvedValue(mockResult);

      const filters = {
        organizationId: 'org-123',
        templateType: 'peer',
        isActive: true
      };

      const result = await TemplateDocumentModel.findAll(filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM feedback_template_documents'),
        expect.arrayContaining(['org-123', 'peer', true])
      );
      expect(result).toEqual(mockResult.rows);
    });
  });

  describe('update', () => {
    it('should update template document', async () => {
      const updateData = {
        name: 'Updated Template',
        description: 'Updated Description'
      };
      const mockResult = {
        rows: [{ id: 'template-123', ...mockTemplateData, ...updateData }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: []
      };
      mockQuery.mockResolvedValue(mockResult);

      const result = await TemplateDocumentModel.update('template-123', updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE feedback_template_documents'),
        expect.arrayContaining(['Updated Template', 'Updated Description', 'template-123'])
      );
      expect(result).toEqual(mockResult.rows[0]);
    });
  });

  describe('delete', () => {
    it('should delete template document', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [], 
        rowCount: 1, 
        command: 'DELETE', 
        oid: 0, 
        fields: [] 
      });

      const result = await TemplateDocumentModel.delete('template-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM feedback_template_documents'),
        ['template-123']
      );
      expect(result).toBe(true);
    });

    it('should return false if template not found', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [], 
        rowCount: 0, 
        command: 'DELETE', 
        oid: 0, 
        fields: [] 
      });

      const result = await TemplateDocumentModel.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('incrementDownloadCount', () => {
    it('should increment download count', async () => {
      mockQuery.mockResolvedValue({ 
        rows: [], 
        rowCount: 1, 
        command: 'DELETE', 
        oid: 0, 
        fields: [] 
      });

      const result = await TemplateDocumentModel.incrementDownloadCount('template-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE feedback_template_documents SET download_count'),
        ['template-123']
      );
      expect(result).toBe(true);
    });
  });
});