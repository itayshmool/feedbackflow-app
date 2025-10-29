import { UserModel } from '../../../../src/modules/admin/models/user.model';
import { query as dbQuery } from '../../../../src/config/real-database';
import { User, UserFilters, PaginationOptions } from '../../../../src/modules/admin/types/user.types';
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

describe('UserModel', () => {
  let userModel: UserModel;

  beforeEach(() => {
    userModel = new UserModel();
    jest.clearAllMocks();
  });

  describe('findWithRoles', () => {
    it('should return users with roles and pagination', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          avatar_url: null,
          is_active: true,
          email_verified: true,
          last_login_at: '2025-01-01T10:00:00Z',
          created_at: '2025-01-01T09:00:00Z',
          updated_at: '2025-01-01T09:00:00Z',
          organization_id: 'org-1',
          department: 'Engineering',
          position: 'Developer',
          roles: ['employee', 'manager']
        }
      ];

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '1' }], 1)) // Count query
        .mockResolvedValueOnce(createMockQueryResult(mockUsers, 1)); // Data query

      const result = await userModel.findWithRoles({}, { limit: 10, offset: 0 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].email).toBe('user1@example.com');
      expect(result.data[0].roles).toEqual(['employee', 'manager']);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
    });

    it('should apply search filters correctly', async () => {
      const filters: UserFilters = {
        search: 'john',
        isActive: true,
        emailVerified: true,
        organizationId: 'org-1',
        department: 'Engineering'
      };

      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '0' }], 1))
        .mockResolvedValueOnce(createMockQueryResult([], 0));

      await userModel.findWithRoles(filters, { limit: 10, offset: 0 });

      // Verify the count query includes search conditions
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('u.name ILIKE $1 OR u.email ILIKE $1'),
        expect.arrayContaining(['%john%'])
      );
    });

    it('should handle empty results', async () => {
      mockQuery
        .mockResolvedValueOnce(createMockQueryResult([{ count: '0' }], 1))
        .mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await userModel.findWithRoles({}, { limit: 10, offset: 0 });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('create', () => {
    it('should create a new user with proper field mapping', async () => {
      const userData: Partial<User> = {
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
        organizationId: 'org-1',
        department: 'Engineering',
        position: 'Developer',
        isActive: true,
        emailVerified: false
      };

      const mockCreatedUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        name: 'New User',
        avatar_url: 'https://example.com/avatar.jpg',
        organization_id: 'org-1',
        department: 'Engineering',
        position: 'Developer',
        is_active: true,
        email_verified: false,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockCreatedUser], 1));

      const result = await userModel.create(userData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users (email, name, avatar_url, organization_id, department, position, is_active, email_verified)'),
        expect.arrayContaining([
          'newuser@example.com',
          'New User',
          'https://example.com/avatar.jpg',
          'org-1',
          'Engineering',
          'Developer',
          true,
          false
        ])
      );

      expect(result).toEqual(mockCreatedUser);
    });

    it('should handle partial user data', async () => {
      const userData: Partial<User> = {
        email: 'minimal@example.com',
        name: 'Minimal User'
      };

      const mockCreatedUser = {
        id: 'user-456',
        email: 'minimal@example.com',
        name: 'Minimal User',
        avatar_url: null,
        organization_id: null,
        department: null,
        position: null,
        is_active: true,
        email_verified: false,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockCreatedUser], 1));

      const result = await userModel.create(userData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users (email, name)'),
        ['minimal@example.com', 'Minimal User']
      );

      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('update', () => {
    it('should update user with proper field mapping', async () => {
      const updateData: Partial<User> = {
        name: 'Updated Name',
        department: 'Updated Department',
        isActive: false
      };

      const mockUpdatedUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Updated Name',
        department: 'Updated Department',
        is_active: false,
        updated_at: '2025-01-01T11:00:00Z'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUpdatedUser], 1));

      const result = await userModel.update('user-123', updateData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET name = $2, department = $3, is_active = $4, updated_at = NOW() WHERE id = $1'),
        ['user-123', 'Updated Name', 'Updated Department', false]
      );

      expect(result).toEqual(mockUpdatedUser);
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await userModel.update('nonexistent-id', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      const result = await userModel.delete('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = $1',
        ['user-123']
      );

      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await userModel.delete('nonexistent-id');

      expect(result).toBe(false);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user', async () => {
      const mockUserRole = {
        id: 'role-assignment-1',
        user_id: 'user-123',
        role_id: 'role-456',
        organization_id: 'org-1',
        granted_by: 'admin-1',
        granted_at: '2025-01-01T10:00:00Z',
        expires_at: null,
        is_active: true
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockUserRole], 1));

      const result = await userModel.assignRole('user-123', 'role-456', 'org-1', 'admin-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_roles (user_id, role_id, organization_id, granted_by)'),
        ['user-123', 'role-456', 'org-1', 'admin-1']
      );

      expect(result).toEqual(mockUserRole);
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 1));

      const result = await userModel.removeRole('user-123', 'role-456', 'org-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_roles SET is_active = false'),
        ['user-123', 'role-456', 'org-1']
      );

      expect(result).toBe(true);
    });

    it('should return false when role not found', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await userModel.removeRole('user-123', 'role-456', 'org-1');

      expect(result).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles with organization names', async () => {
      const mockRoles = [
        {
          id: 'role-assignment-1',
          user_id: 'user-123',
          role_id: 'role-456',
          role_name: 'manager',
          organization_id: 'org-1',
          organization_name: 'Test Org',
          granted_by: 'admin-1',
          granted_at: '2025-01-01T10:00:00Z',
          expires_at: null,
          is_active: true
        }
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockRoles, 1));

      const result = await userModel.getUserRoles('user-123');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT ur.*, r.name as role_name, o.name as organization_name'),
        ['user-123']
      );

      expect(result).toEqual(mockRoles);
    });
  });

  describe('bulkUpdateUsers', () => {
    it('should update multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];
      const updates = { isActive: false };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 3));

      const result = await userModel.bulkUpdateUsers(userIds, updates);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET is_active = $2, updated_at = NOW() WHERE id = ANY($1)'),
        [userIds, false]
      );

      expect(result).toBe(3);
    });
  });

  describe('deleteUsers', () => {
    it('should delete multiple users', async () => {
      const userIds = ['user-1', 'user-2', 'user-3'];

      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 3));

      const result = await userModel.deleteUsers(userIds);

      expect(mockQuery).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ANY($1)',
        [userIds]
      );

      expect(result).toBe(3);
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        total_users: '100',
        active_users: '80',
        inactive_users: '20',
        verified_users: '75',
        unverified_users: '25',
        recent_signups: '10'
      };

      mockQuery.mockResolvedValueOnce(createMockQueryResult([mockStats], 1));

      const result = await userModel.getUserStats();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT COUNT(*) as total_users'),
        []
      );

      expect(result).toEqual({
        totalUsers: 100,
        activeUsers: 80,
        inactiveUsers: 20,
        verifiedUsers: 75,
        unverifiedUsers: 25,
        recentSignups: 10
      });
    });
  });

  describe('getUsersByRole', () => {
    it('should return users grouped by role', async () => {
      const mockRoleStats = [
        { name: 'employee', count: '70' },
        { name: 'manager', count: '20' },
        { name: 'admin', count: '10' }
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockRoleStats, 3));

      const result = await userModel.getUsersByRole();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT r.name, COUNT(ur.user_id) as count'),
        []
      );

      expect(result).toEqual({
        employee: 70,
        manager: 20,
        admin: 10
      });
    });
  });

  describe('getUsersByDepartment', () => {
    it('should return users grouped by department', async () => {
      const mockDeptStats = [
        { department: 'Engineering', count: '50' },
        { department: 'Marketing', count: '20' },
        { department: 'Sales', count: '15' }
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockDeptStats, 3));

      const result = await userModel.getUsersByDepartment();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT department, COUNT(*) as count'),
        []
      );

      expect(result).toEqual({
        Engineering: 50,
        Marketing: 20,
        Sales: 15
      });
    });
  });

  describe('getUsersByOrganization', () => {
    it('should return users grouped by organization', async () => {
      const mockOrgStats = [
        { name: 'Org A', count: '60' },
        { name: 'Org B', count: '40' }
      ];

      mockQuery.mockResolvedValueOnce(createMockQueryResult(mockOrgStats, 2));

      const result = await userModel.getUsersByOrganization();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT o.name, COUNT(DISTINCT u.id) as count'),
        []
      );

      expect(result).toEqual({
        'Org A': 60,
        'Org B': 40
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockQuery.mockRejectedValueOnce(dbError);

      await expect(userModel.create({ email: 'test@example.com', name: 'Test' }))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle null rowCount in delete operations', async () => {
      mockQuery.mockResolvedValueOnce(createMockQueryResult([], 0));

      const result = await userModel.delete('user-123');

      expect(result).toBe(false);
    });
  });
});
