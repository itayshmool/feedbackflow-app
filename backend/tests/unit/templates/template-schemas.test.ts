import { 
  createTemplateDocumentSchema,
  updateTemplateDocumentSchema,
  templateFiltersSchema,
  templatePermissionsSchema,
  createAttachmentSchema
} from '../../../src/modules/templates/validation/template.schemas';
import { z } from 'zod';

describe('Template Validation Schemas', () => {
  describe('createTemplateDocumentSchema', () => {
    it('should validate valid template document creation data', () => {
      const validData = {
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
        isDefault: false
      };

      const result = createTemplateDocumentSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate minimal template document creation data', () => {
      const minimalData = {
        name: 'Template Name',
        templateType: 'peer'
      };

      const result = createTemplateDocumentSchema.safeParse(minimalData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Template Name');
        expect(result.data.templateType).toBe('peer');
        expect(result.data.isDefault).toBeUndefined(); // Optional field
      }
    });

    it('should reject invalid template type', () => {
      const invalidData = {
        organizationId: 'org-123',
        name: 'Template Name',
        templateType: 'invalid-type',
        createdBy: 'user-456'
      };

      const result = createTemplateDocumentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['templateType']);
        expect(result.error.issues[0].message).toContain('Invalid enum value');
      }
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        name: 'Template Name'
        // Missing templateType
      };

      const result = createTemplateDocumentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        const paths = result.error.issues.map(issue => issue.path[0]);
        expect(paths).toContain('templateType');
      }
    });

    it('should reject invalid template type', () => {
      const invalidData = {
        name: 'Template Name',
        templateType: 'invalid-type'
      };

      const result = createTemplateDocumentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['templateType']);
        expect(result.error.issues[0].message).toContain('Invalid enum value');
      }
    });

    it('should reject invalid tags format', () => {
      const invalidData = {
        organizationId: 'org-123',
        name: 'Template Name',
        templateType: 'peer',
        createdBy: 'user-456',
        tags: 'not-an-array'
      };

      const result = createTemplateDocumentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['tags']);
        expect(result.error.issues[0].message).toContain('Expected array');
      }
    });

    it('should reject invalid permissions structure', () => {
      const invalidData = {
        organizationId: 'org-123',
        name: 'Template Name',
        templateType: 'peer',
        createdBy: 'user-456',
        permissions: {
          roles: 'not-an-array',
          departments: [],
          cycles: []
        }
      };

      const result = createTemplateDocumentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['permissions', 'roles']);
        expect(result.error.issues[0].message).toContain('Expected array');
      }
    });
  });

  describe('updateTemplateDocumentSchema', () => {
    it('should validate valid template document update data', () => {
      const validData = {
        name: 'Updated Template Name',
        description: 'Updated description',
        templateType: 'manager',
        tags: ['updated', 'manager'],
        isActive: false
      };

      const result = updateTemplateDocumentSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate partial update data', () => {
      const partialData = {
        name: 'New Template Name'
      };

      const result = updateTemplateDocumentSchema.safeParse(partialData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(partialData);
      }
    });

    it('should reject invalid template type in update', () => {
      const invalidData = {
        templateType: 'invalid-type'
      };

      const result = updateTemplateDocumentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['templateType']);
        expect(result.error.issues[0].message).toContain('Invalid enum value');
      }
    });

    it('should allow empty update data', () => {
      const emptyData = {};

      const result = updateTemplateDocumentSchema.safeParse(emptyData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(emptyData);
      }
    });

    it('should reject invalid boolean values', () => {
      const invalidData = {
        isActive: 'not-a-boolean',
        isDefault: 123
      };

      const result = updateTemplateDocumentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map(issue => issue.path[0]);
        expect(paths).toContain('isActive');
        expect(paths).toContain('isDefault');
      }
    });
  });

  describe('templateFiltersSchema', () => {
    it('should validate valid template filters', () => {
      const validFilters = {
        templateType: 'peer',
        isActive: true,
        isDefault: false,
        fileFormat: '.docx',
        tags: ['standard'],
        search: 'feedback',
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      };

      const result = templateFiltersSchema.safeParse(validFilters);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validFilters);
      }
    });

    it('should validate minimal filters', () => {
      const minimalFilters = {};

      const result = templateFiltersSchema.safeParse(minimalFilters);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });

    it('should reject invalid template type filter', () => {
      const invalidFilters = {
        templateType: 'invalid-type'
      };

      const result = templateFiltersSchema.safeParse(invalidFilters);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['templateType']);
        expect(result.error.issues[0].message).toContain('Invalid enum value');
      }
    });

    it('should reject invalid file format filter', () => {
      const invalidFilters = {
        fileFormat: '.exe'
      };

      const result = templateFiltersSchema.safeParse(invalidFilters);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['fileFormat']);
        expect(result.error.issues[0].message).toContain('Invalid enum value');
      }
    });

    it('should reject invalid pagination parameters', () => {
      const invalidFilters = {
        page: 0,
        limit: -1
      };

      const result = templateFiltersSchema.safeParse(invalidFilters);

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map(issue => issue.path[0]);
        expect(paths).toContain('page');
        expect(paths).toContain('limit');
      }
    });

    it('should reject invalid sort parameters', () => {
      const invalidFilters = {
        sortBy: 'invalid-field',
        sortOrder: 'invalid-order'
      };

      const result = templateFiltersSchema.safeParse(invalidFilters);

      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map(issue => issue.path[0]);
        expect(paths).toContain('sortBy');
        expect(paths).toContain('sortOrder');
      }
    });

    it('should reject invalid search string', () => {
      const invalidFilters = {
        search: 123
      };

      const result = templateFiltersSchema.safeParse(invalidFilters);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['search']);
        expect(result.error.issues[0].message).toContain('Expected string');
      }
    });
  });

  describe('templatePermissionsSchema', () => {
    it('should validate valid template permissions', () => {
      const validPermissions = {
        roles: ['admin', 'manager', 'employee'],
        departments: ['engineering', 'marketing'],
        cycles: ['cycle-123', 'cycle-456']
      };

      const result = templatePermissionsSchema.safeParse(validPermissions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPermissions);
      }
    });

    it('should validate minimal permissions', () => {
      const minimalPermissions = {
        roles: ['admin']
      };

      const result = templatePermissionsSchema.safeParse(minimalPermissions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalPermissions);
      }
    });

    it('should allow any role values', () => {
      const validPermissions = {
        roles: ['admin', 'custom-role', 'any-string']
      };

      const result = templatePermissionsSchema.safeParse(validPermissions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPermissions);
      }
    });

    it('should reject empty roles array', () => {
      const invalidPermissions = {
        roles: []
      };

      const result = templatePermissionsSchema.safeParse(invalidPermissions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['roles']);
        expect(result.error.issues[0].message).toContain('Array must contain at least 1 element');
      }
    });

    it('should reject non-array roles', () => {
      const invalidPermissions = {
        roles: 'admin'
      };

      const result = templatePermissionsSchema.safeParse(invalidPermissions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['roles']);
        expect(result.error.issues[0].message).toContain('Expected array');
      }
    });

    it('should allow any department values', () => {
      const validPermissions = {
        roles: ['admin'],
        departments: ['any-string', 'custom-department']
      };

      const result = templatePermissionsSchema.safeParse(validPermissions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPermissions);
      }
    });

    it('should allow any cycle values', () => {
      const validPermissions = {
        roles: ['admin'],
        cycles: ['any-string', 'custom-cycle']
      };

      const result = templatePermissionsSchema.safeParse(validPermissions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validPermissions);
      }
    });
  });

  describe('createAttachmentSchema', () => {
    it('should validate valid attachment upload data', () => {
      const validData = {
        templateDocumentId: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Completed peer feedback'
      };

      const result = createAttachmentSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should validate minimal attachment upload data', () => {
      const minimalData = {};

      const result = createAttachmentSchema.safeParse(minimalData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalData);
      }
    });

    it('should reject invalid template document ID', () => {
      const invalidData = {
        templateDocumentId: 'invalid-uuid'
      };

      const result = createAttachmentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['templateDocumentId']);
        expect(result.error.issues[0].message).toContain('Invalid uuid');
      }
    });

    it('should reject invalid description type', () => {
      const invalidData = {
        description: 123 // Should be string
      };

      const result = createAttachmentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['description']);
        expect(result.error.issues[0].message).toContain('Expected string');
      }
    });

    it('should reject description that is too long', () => {
      const invalidData = {
        description: 'a'.repeat(501) // Exceeds 500 character limit
      };

      const result = createAttachmentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['description']);
        expect(result.error.issues[0].message).toContain('String must contain at most 500 character(s)');
      }
    });
  });

  describe('Schema Integration Tests', () => {
    it('should work together for complete template workflow', () => {
      // Create template
      const createData = {
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
        isDefault: false
      };

      const createResult = createTemplateDocumentSchema.safeParse(createData);
      expect(createResult.success).toBe(true);

      // Update template
      const updateData = {
        name: 'Updated Peer Feedback Template',
        description: 'Updated description',
        isActive: true
      };

      const updateResult = updateTemplateDocumentSchema.safeParse(updateData);
      expect(updateResult.success).toBe(true);

      // Filter templates
      const filterData = {
        templateType: 'peer',
        isActive: true,
        search: 'peer',
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc'
      };

      const filterResult = templateFiltersSchema.safeParse(filterData);
      expect(filterResult.success).toBe(true);

      // Upload attachment
      const attachmentData = {
        templateDocumentId: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Completed peer feedback'
      };

      const attachmentResult = createAttachmentSchema.safeParse(attachmentData);
      expect(attachmentResult.success).toBe(true);
    });

    it('should handle edge cases consistently', () => {
      // Empty strings
      const emptyStringData = {
        organizationId: 'org-123',
        name: '',
        templateType: 'peer',
        createdBy: 'user-456'
      };

      const emptyStringResult = createTemplateDocumentSchema.safeParse(emptyStringData);
      expect(emptyStringResult.success).toBe(false);

      // Null values
      const nullData = {
        organizationId: 'org-123',
        name: 'Template Name',
        templateType: 'peer',
        createdBy: 'user-456',
        description: null
      };

      const nullResult = createTemplateDocumentSchema.safeParse(nullData);
      expect(nullResult.success).toBe(false);

      // Undefined values
      const undefinedData = {
        organizationId: 'org-123',
        name: 'Template Name',
        templateType: 'peer',
        createdBy: 'user-456',
        description: undefined
      };

      const undefinedResult = createTemplateDocumentSchema.safeParse(undefinedData);
      expect(undefinedResult.success).toBe(true); // undefined should be allowed for optional fields
    });
  });
});
