import { RoleModel } from '../../../../src/modules/admin/models/role.model';
import { query as dbQuery } from '../../../../src/config/real-database';
import { Role } from '../../../../src/modules/admin/types/user.types';
import { QueryResult } from 'pg';

// Mock the database module
jest.mock('../../../../src/config/real-database', () => ({
  query: jest.fn(),
}));

const mockQuery = dbQuery as jest.MockedFunction<typeof dbQuery>;

// Helper function to create mock QueryResult
const createMockQueryResult = (rows: any[], rowCount: number): QueryResult<any> => ({
  rows,
  rowCount,
  command: 'SELECT',
  oid: 0,
  fields: []
});

describe('RoleModel', () => {
  let roleModel: RoleModel;

  beforeEach(() => {
    roleModel = new RoleModel();
    jest.clearAllMocks();
  });

  describe('findSystemRoles', () => {
    it('should return system roles ordered by name', async () => {
      const mockSystemRoles = [
        {
          id: 'role-1',
          name: 'admin',
          description: 'System administrator',
          permissions: '["user:read", "user:write", "organization:read", "organization:write"]',
          is_system_role: true,
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:00:00Z'
        },
        {
          id: 'role-2',
          name: 'employee',
          description: 'Regular employee',
          permissions: '["feedback:read", "feedback:write"]',
          is_system_role: true,
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:00:00Z'
        }
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockSystemRoles, 2));

      const result = await roleModel.findSystemRoles();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM roles WHERE is_system_role = true ORDER BY name'),
        []
      );

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('admin');
      expect(result[0].permissions).toEqual(['user:read', 'user:write', 'organization:read', 'organization:write']);
      expect(result[0].isSystemRole).toBe(true);
    });

    it('should return empty array when no system roles exist', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await roleModel.findSystemRoles();

      expect(result).toHaveLength(0);
    });
  });

  describe('findCustomRoles', () => {
    it('should return custom roles ordered by name', async () => {
      const mockRoles = [
        {
          id: 'role-2',
          name: 'custom-role',
          description: 'Custom role',
          permissions: '["feedback:read"]',
          is_system_role: false,
          created_at: '2025-01-01T10:00:00Z',
          updated_at: '2025-01-01T10:00:00Z'
        }
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockRoles, 1));

      const result = await roleModel.findCustomRoles();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM roles WHERE is_system_role = false ORDER BY name'),
        []
      );

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('custom-role');
    });
  });

  describe('findByName', () => {
    it('should return role when found by name', async () => {
      const mockRole = {
        id: 'role-1',
        name: 'admin',
        description: 'System administrator',
        permissions: '["user:read", "user:write"]',
        is_system_role: true,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockRole], 1));

      const result = await roleModel.findByName('admin');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM roles WHERE name = $1',
        ['admin']
      );

      expect(result).not.toBeNull();
      expect(result!.name).toBe('admin');
      expect(result!.isSystemRole).toBe(true);
    });

    it('should return null when role not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await roleModel.findByName('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createRole', () => {
    it('should create a new custom role', async () => {
      const mockCreatedRole = {
        id: 'role-123',
        name: 'custom-role',
        description: 'Custom role description',
        permissions: '["feedback:read", "feedback:write"]',
        is_system_role: false,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockCreatedRole], 1));

      const result = await roleModel.createRole(
        'custom-role',
        'Custom role description',
        ['feedback:read', 'feedback:write']
      );

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles (name, description, permissions, is_system_role)'),
        ['custom-role', 'Custom role description', '["feedback:read","feedback:write"]', false]
      );

      expect(result.name).toBe('custom-role');
      expect(result.description).toBe('Custom role description');
      expect(result.permissions).toEqual(['feedback:read', 'feedback:write']);
      expect(result.isSystemRole).toBe(false);
    });

    it('should create role with minimal data', async () => {
      const mockCreatedRole = {
        id: 'role-456',
        name: 'minimal-role',
        description: null,
        permissions: '[]',
        is_system_role: false,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockCreatedRole], 1));

      const result = await roleModel.createRole('minimal-role', '', []);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO roles (name, description, permissions, is_system_role)'),
        ['minimal-role', '', '[]', false]
      );

      expect(result.name).toBe('minimal-role');
      expect(result.description).toBeNull();
      expect(result.permissions).toEqual([]);
    });
  });

  describe('updateRole', () => {
    it('should update role with provided fields', async () => {
      const updates: Partial<Role> = {
        name: 'updated-role',
        description: 'Updated description',
        permissions: ['feedback:read', 'feedback:write', 'user:read']
      };

      const mockUpdatedRole = {
        id: 'role-123',
        name: 'updated-role',
        description: 'Updated description',
        permissions: '["feedback:read","feedback:write","user:read"]',
        is_system_role: false,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T11:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUpdatedRole], 1));

      const result = await roleModel.updateRole('role-123', updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE roles SET name = $2, description = $3, permissions = $4, updated_at = NOW() WHERE id = $1'),
        ['role-123', 'updated-role', 'Updated description', '["feedback:read","feedback:write","user:read"]']
      );

      expect(result).not.toBeNull();
      expect(result!.name).toBe('updated-role');
      expect(result!.description).toBe('Updated description');
      expect(result!.permissions).toEqual(['feedback:read', 'feedback:write', 'user:read']);
    });

    it('should return null when role not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await roleModel.updateRole('nonexistent-id', { name: 'updated' });

      expect(result).toBeNull();
    });

    it('should handle empty updates by calling findById', async () => {
      const mockRole = {
        id: 'role-123',
        name: 'existing-role',
        description: 'Existing description',
        permissions: '["feedback:read"]',
        is_system_role: false,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockRole], 1));

      const result = await roleModel.updateRole('role-123', {});

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM roles WHERE id = $1',
        ['role-123']
      );

      expect(result).not.toBeNull();
      expect(result!.name).toBe('existing-role');
    });
  });

  describe('deleteRole', () => {
    it('should delete custom role when not in use', async () => {
      // Mock usage check - no users assigned
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '0' }], 1)) // Usage check
        .mockResolvedValueOnce(createMockQueryResult([], 1)); // Delete query

      const result = await roleModel.deleteRole('role-123');

      expect(mockQuery).toHaveBeenNthCalledWith(1,
        expect.stringContaining('SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1 AND is_active = true'),
        ['role-123']
      );

      expect(mockQuery).toHaveBeenNthCalledWith(2,
        'DELETE FROM roles WHERE id = $1 AND is_system_role = false',
        ['role-123']
      );

      expect(result).toBe(true);
    });

    it('should throw error when trying to delete role in use', async () => {
      // Mock usage check - role is assigned to users
      mockQuery.mockResolvedValueOnce(createMockQueryResult([{ count: '5' }], 1));

      await expect(roleModel.deleteRole('role-123'))
        .rejects.toThrow('Cannot delete role that is currently assigned to users');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1 AND is_active = true'),
        ['role-123']
      );
    });

    it('should return false when role not found', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '0' }], 1)) // Usage check
        .mockResolvedValueOnce(createMockQueryResult([], 0)); // Delete query

      const result = await roleModel.deleteRole('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('updateRolePermissions', () => {
    it('should update role permissions for custom role', async () => {
      const newPermissions = ['feedback:read', 'feedback:write', 'user:read'];

      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      const result = await roleModel.updateRolePermissions('role-123', newPermissions);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE roles SET permissions = $2, updated_at = NOW() WHERE id = $1 AND is_system_role = false'),
        ['role-123', '["feedback:read","feedback:write","user:read"]']
      );

      expect(result).toBe(true);
    });

    it('should return false when role not found or is system role', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await roleModel.updateRolePermissions('role-123', ['feedback:read']);

      expect(result).toBe(false);
    });
  });

  describe('findById', () => {
    it('should return role when found by id', async () => {
      const mockRole = {
        id: 'role-123',
        name: 'admin',
        description: 'System administrator',
        permissions: '["user:read", "user:write"]',
        is_system_role: true,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockRole], 1));

      const result = await roleModel.findById('role-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM roles WHERE id = $1',
        ['role-123']
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe('role-123');
      expect(result!.name).toBe('admin');
      expect(result!.isSystemRole).toBe(true);
    });

    it('should return null when role not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await roleModel.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('transformRole', () => {
    it('should transform database row to Role interface correctly', async () => {
      const mockDbRow = {
        id: 'role-123',
        name: 'test-role',
        description: 'Test role description',
        permissions: '["feedback:read", "feedback:write"]',
        is_system_role: false,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockDbRow], 1));

      const result = await roleModel.findById('role-123');

      expect(result).toEqual({
        id: 'role-123',
        name: 'test-role',
        description: 'Test role description',
        permissions: ['feedback:read', 'feedback:write'],
        isSystemRole: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      });
    });

    it('should handle null permissions', async () => {
      const mockDbRow = {
        id: 'role-123',
        name: 'test-role',
        description: 'Test role description',
        permissions: null,
        is_system_role: false,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockDbRow], 1));

      const result = await roleModel.findById('role-123');

      expect(result!.permissions).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(roleModel.createRole('test-role', 'description', []))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle null rowCount in delete operations', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '0' }], 1)) // Usage check
        .mockResolvedValueOnce(createMockQueryResult([], 0)); // Delete query

      const result = await roleModel.deleteRole('role-123');

      expect(result).toBe(false);
    });
  });
});
