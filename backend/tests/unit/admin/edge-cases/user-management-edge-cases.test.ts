import { AdminUserService } from '../../../../src/modules/admin/services/admin-user.service';
import { UserModel } from '../../../../src/modules/admin/models/user.model';
import { RoleModel } from '../../../../src/modules/admin/models/role.model';
import { User, UserFilters, PaginationOptions, BulkUserOperation, UserImportData } from '../../../../src/modules/admin/types/user.types';

// Mock the models
jest.mock('../../../../src/modules/admin/models/user.model');
jest.mock('../../../../src/modules/admin/models/role.model');

const MockUserModel = UserModel as jest.MockedClass<typeof UserModel>;
const MockRoleModel = RoleModel as jest.MockedClass<typeof RoleModel>;

describe('User Management Edge Cases and Error Handling', () => {
  let adminUserService: AdminUserService;
  let mockUserModel: jest.Mocked<UserModel>;
  let mockRoleModel: jest.Mocked<RoleModel>;

  beforeEach(() => {
    mockUserModel = new MockUserModel() as jest.Mocked<UserModel>;
    mockRoleModel = new MockRoleModel() as jest.Mocked<RoleModel>;
    
    adminUserService = new AdminUserService();
    (adminUserService as any).userModel = mockUserModel;
    (adminUserService as any).roleModel = mockRoleModel;
    
    jest.clearAllMocks();
  });

  describe('Edge Cases - User Creation', () => {
    it('should handle user creation with minimal required fields', async () => {
      const minimalUserData = {
        email: 'minimal@example.com',
        name: 'Minimal User'
      };

      const mockCreatedUser: User = {
        id: 'user-123',
        ...minimalUserData,
        avatarUrl: undefined,
        isActive: true,
        emailVerified: false,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        organizationId: undefined,
        department: undefined,
        position: undefined,
        roles: []
      };

      mockUserModel.create.mockResolvedValueOnce(mockCreatedUser);

      const result = await adminUserService.createUser(minimalUserData);

      expect(result).toEqual(mockCreatedUser);
      expect(mockUserModel.create).toHaveBeenCalledWith(minimalUserData);
    });

    it('should handle user creation with maximum field length', async () => {
      const longString = 'a'.repeat(255);
      const userData = {
        email: 'longemail@example.com',
        name: longString,
        avatarUrl: `https://example.com/${longString}.jpg`,
        organizationId: 'org-1',
        department: longString,
        position: longString
      };

      const mockCreatedUser: User = {
        id: 'user-123',
        ...userData,
        isActive: true,
        emailVerified: false,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        roles: []
      };

      mockUserModel.create.mockResolvedValueOnce(mockCreatedUser);

      const result = await adminUserService.createUser(userData);

      expect(result).toEqual(mockCreatedUser);
    });

    it('should handle special characters in user data', async () => {
      const userData = {
        email: 'user+tag@example.com',
        name: 'User with Special Characters: @#$%^&*()',
        avatarUrl: 'https://example.com/avatar with spaces.jpg',
        department: 'Engineering & Development',
        position: 'Senior Developer (Full-Stack)'
      };

      const mockCreatedUser: User = {
        id: 'user-123',
        ...userData,
        isActive: true,
        emailVerified: false,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        organizationId: undefined,
        roles: []
      };

      mockUserModel.create.mockResolvedValueOnce(mockCreatedUser);

      const result = await adminUserService.createUser(userData);

      expect(result).toEqual(mockCreatedUser);
    });

    it('should handle unicode characters in user data', async () => {
      const userData = {
        email: '用户@example.com',
        name: '用户姓名',
        department: '工程部',
        position: '高级开发工程师'
      };

      const mockCreatedUser: User = {
        id: 'user-123',
        ...userData,
        avatarUrl: undefined,
        isActive: true,
        emailVerified: false,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        organizationId: undefined,
        roles: []
      };

      mockUserModel.create.mockResolvedValueOnce(mockCreatedUser);

      const result = await adminUserService.createUser(userData);

      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('Edge Cases - Email Validation', () => {
    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user123@example-domain.co.uk',
        'user@subdomain.example.com',
        'user@example.museum',
        'user@example.info'
      ];

      for (const email of validEmails) {
        const userData = { email, name: 'Test User' };
        const mockCreatedUser: User = {
          id: 'user-123',
          ...userData,
          avatarUrl: undefined,
          isActive: true,
          emailVerified: false,
          lastLoginAt: undefined,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
          organizationId: undefined,
          department: undefined,
          position: undefined,
          roles: []
        };

        mockUserModel.create.mockResolvedValueOnce(mockCreatedUser);

        const result = await adminUserService.createUser(userData);
        expect(result.email).toBe(email);
      }
    });

    it('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..name@example.com',
        'user@example..com',
        'user@example.com.',
        'user name@example.com',
        'user@example com'
      ];

      for (const email of invalidEmails) {
        const userData = { email, name: 'Test User' };
        
        await expect(adminUserService.createUser(userData))
          .rejects.toThrow('Invalid email format');
      }
    });
  });

  describe('Edge Cases - Pagination', () => {
    it('should handle large page numbers', async () => {
      const filters: UserFilters = {};
      const options: PaginationOptions = {
        limit: 10,
        offset: 1000000, // Very large offset
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: [],
        pagination: {
          total: 0,
          limit: 10,
          offset: 1000000,
          hasMore: false
        }
      });

      const result = await adminUserService.getUsers(filters, options);

      expect(result.pagination.offset).toBe(1000000);
      expect(result.data).toHaveLength(0);
    });

    it('should handle zero limit', async () => {
      const filters: UserFilters = {};
      const options: PaginationOptions = {
        limit: 0,
        offset: 0
      };

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: [],
        pagination: {
          total: 0,
          limit: 0,
          offset: 0,
          hasMore: false
        }
      });

      const result = await adminUserService.getUsers(filters, options);

      expect(result.pagination.limit).toBe(0);
    });

    it('should handle negative pagination values', async () => {
      const filters: UserFilters = {};
      const options: PaginationOptions = {
        limit: -10,
        offset: -5
      };

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: [],
        pagination: {
          total: 0,
          limit: -10,
          offset: -5,
          hasMore: false
        }
      });

      const result = await adminUserService.getUsers(filters, options);

      expect(result.pagination.limit).toBe(-10);
      expect(result.pagination.offset).toBe(-5);
    });
  });

  describe('Edge Cases - Search Filters', () => {
    it('should handle empty search string', async () => {
      const filters: UserFilters = { search: '' };
      const options: PaginationOptions = { limit: 10, offset: 0 };

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
      });

      const result = await adminUserService.getUsers(filters, options);

      expect(mockUserModel.findWithRoles).toHaveBeenCalledWith(filters, options);
      expect(result.data).toHaveLength(0);
    });

    it('should handle search with special characters', async () => {
      const filters: UserFilters = { search: 'user@#$%^&*()' };
      const options: PaginationOptions = { limit: 10, offset: 0 };

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
      });

      const result = await adminUserService.getUsers(filters, options);

      expect(mockUserModel.findWithRoles).toHaveBeenCalledWith(filters, options);
    });

    it('should handle search with SQL injection attempts', async () => {
      const filters: UserFilters = { search: "'; DROP TABLE users; --" };
      const options: PaginationOptions = { limit: 10, offset: 0 };

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
      });

      const result = await adminUserService.getUsers(filters, options);

      expect(mockUserModel.findWithRoles).toHaveBeenCalledWith(filters, options);
    });

    it('should handle very long search strings', async () => {
      const longSearch = 'a'.repeat(1000);
      const filters: UserFilters = { search: longSearch };
      const options: PaginationOptions = { limit: 10, offset: 0 };

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
      });

      const result = await adminUserService.getUsers(filters, options);

      expect(mockUserModel.findWithRoles).toHaveBeenCalledWith(filters, options);
    });
  });

  describe('Edge Cases - Bulk Operations', () => {
    it('should handle empty user ID arrays', async () => {
      const operation: BulkUserOperation = {
        operation: 'activate',
        userIds: []
      };

      const result = await adminUserService.bulkUpdateUsers(operation);

      expect(result).toEqual({
        success: true,
        affectedCount: 0,
        message: 'Successfully activated 0 users'
      });
    });

    it('should handle very large user ID arrays', async () => {
      const userIds = Array.from({ length: 10000 }, (_, i) => `user-${i}`);
      const operation: BulkUserOperation = {
        operation: 'activate',
        userIds
      };

      mockUserModel.bulkUpdateUsers.mockResolvedValueOnce(10000);

      const result = await adminUserService.bulkUpdateUsers(operation);

      expect(result.success).toBe(10000);
      expect(mockUserModel.bulkUpdateUsers).toHaveBeenCalledWith(userIds, { isActive: true });
    });

    it('should handle duplicate user IDs in bulk operations', async () => {
      const operation: BulkUserOperation = {
        operation: 'activate',
        userIds: ['user-1', 'user-2', 'user-1', 'user-3', 'user-2']
      };

      mockUserModel.bulkUpdateUsers.mockResolvedValueOnce(3);

      const result = await adminUserService.bulkUpdateUsers(operation);

      expect(result.success).toBe(3);
      expect(mockUserModel.bulkUpdateUsers).toHaveBeenCalledWith(
        ['user-1', 'user-2', 'user-1', 'user-3', 'user-2'],
        { isActive: true }
      );
    });

    it('should handle partial failures in bulk role assignments', async () => {
      const operation: BulkUserOperation = {
        operation: 'assign_role',
        userIds: ['user-1', 'user-2', 'user-3'],
        roleId: 'role-456'
      };

      // Mock one success, one failure, one success
      mockUserModel.assignRole
        .mockResolvedValueOnce({ id: 'assignment-1', userId: 'user-1', roleId: 'role-456', roleName: 'admin', grantedAt: '2025-01-01', isActive: true })
        .mockRejectedValueOnce(new Error('User not found'))
        .mockResolvedValueOnce({ id: 'assignment-3', userId: 'user-3', roleId: 'role-456', roleName: 'admin', grantedAt: '2025-01-01', isActive: true });

      const result = await adminUserService.bulkUpdateUsers(operation);

      expect(result).toEqual({
        success: false,
        affectedCount: 2,
        message: 'Partially completed: 2 out of 3 users processed successfully'
      });
    });
  });

  describe('Edge Cases - User Import', () => {
    it('should handle empty import data', async () => {
      const result = await adminUserService.importUsers([]);

      expect(result).toEqual({
        success: [],
        errors: [],
        totalProcessed: 0,
        totalSuccess: 0,
        totalErrors: 0
      });
    });

    it('should handle very large import datasets', async () => {
      const largeImportData: UserImportData[] = Array.from({ length: 1000 }, (_, i) => ({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        organizationId: 'org-1',
        department: 'Engineering',
        position: 'Developer',
        roles: ['employee']
      }));

      // Mock successful creation for all users
      largeImportData.forEach((_, i) => {
        mockUserModel.create.mockResolvedValueOnce({
          id: `user-${i}`,
          email: `user${i}@example.com`,
          name: `User ${i}`,
          avatarUrl: undefined,
          isActive: true,
          emailVerified: false,
          lastLoginAt: undefined,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
          organizationId: 'org-1',
          department: 'Engineering',
          position: 'Developer'
        });
      });

      const result = await adminUserService.importUsers(largeImportData);

      expect(result.totalProcessed).toBe(1000);
      expect(result.totalSuccess).toBe(1000);
      expect(result.totalErrors).toBe(0);
    });

    it('should handle mixed valid and invalid import data', async () => {
      const mixedImportData: UserImportData[] = [
        { email: 'valid1@example.com', name: 'Valid User 1' },
        { email: 'invalid-email', name: 'Invalid User' },
        { email: 'missing@example.com', name: 'User Without Email' },
        { email: 'valid2@example.com', name: 'Valid User 2' }
      ];

      // Mock successful creation for valid users
      mockUserModel.create
        .mockResolvedValueOnce({
          id: 'user-1',
          email: 'valid1@example.com',
          name: 'Valid User 1',
          avatarUrl: undefined,
          isActive: true,
          emailVerified: false,
          lastLoginAt: undefined,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
          organizationId: undefined,
          department: undefined,
          position: undefined,
          roles: []
        })
        .mockResolvedValueOnce({
          id: 'user-2',
          email: 'valid2@example.com',
          name: 'Valid User 2',
          avatarUrl: undefined,
          isActive: true,
          emailVerified: false,
          lastLoginAt: undefined,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z',
          organizationId: undefined,
          department: undefined,
          position: undefined,
          roles: []
        });

      const result = await adminUserService.importUsers(mixedImportData);

      expect(result.totalProcessed).toBe(4);
      expect(result.totalSuccess).toBe(2);
      expect(result.totalErrors).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toContain('Invalid email format');
      expect(result.errors[1].error).toContain('Email is required');
    });
  });

  describe('Edge Cases - Role Management', () => {
    it('should handle role creation with empty permissions', async () => {
      const roleData = {
        name: 'empty-permissions-role',
        description: 'Role with no permissions',
        permissions: []
      };

      const mockCreatedRole = {
        id: 'role-123',
        ...roleData,
        isSystemRole: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      };

      mockRoleModel.createRole.mockResolvedValueOnce(mockCreatedRole);

      const result = await adminUserService.createRole(roleData.name, roleData.description, roleData.permissions);

      expect(result.permissions).toEqual([]);
    });

    it('should handle role creation with very long permission names', async () => {
      const longPermission = 'a'.repeat(1000);
      const roleData = {
        name: 'long-permissions-role',
        description: 'Role with very long permission names',
        permissions: [longPermission]
      };

      const mockCreatedRole = {
        id: 'role-123',
        ...roleData,
        isSystemRole: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      };

      mockRoleModel.createRole.mockResolvedValueOnce(mockCreatedRole);

      const result = await adminUserService.createRole(roleData.name, roleData.description, roleData.permissions);

      expect(result.permissions).toEqual([longPermission]);
    });

    it('should handle role deletion when role is heavily used', async () => {
      mockRoleModel.deleteRole.mockRejectedValueOnce(
        new Error('Cannot delete role that is currently assigned to users')
      );

      await expect(adminUserService.deleteRole('role-123'))
        .rejects.toThrow('Cannot delete role that is currently assigned to users');
    });
  });

  describe('Edge Cases - Database Errors', () => {
    it('should handle database connection errors', async () => {
      const dbError = new Error('Connection terminated unexpectedly');
      mockUserModel.create.mockRejectedValueOnce(dbError);

      await expect(adminUserService.createUser({
        email: 'test@example.com',
        name: 'Test User'
      })).rejects.toThrow('Connection terminated unexpectedly');
    });

    it('should handle database timeout errors', async () => {
      const timeoutError = new Error('Query timeout');
      mockUserModel.findWithRoles.mockRejectedValueOnce(timeoutError);

      await expect(adminUserService.getUsers({}, {}))
        .rejects.toThrow('Query timeout');
    });

    it('should handle database constraint violations', async () => {
      const constraintError = new Error('duplicate key value violates unique constraint "users_email_key"');
      mockUserModel.create.mockRejectedValueOnce(constraintError);

      await expect(adminUserService.createUser({
        email: 'duplicate@example.com',
        name: 'Duplicate User'
      })).rejects.toThrow('duplicate key value violates unique constraint "users_email_key"');
    });

    it('should handle database deadlock errors', async () => {
      const deadlockError = new Error('deadlock detected');
      mockUserModel.update.mockRejectedValueOnce(deadlockError);

      await expect(adminUserService.updateUser('user-123', { name: 'Updated' }))
        .rejects.toThrow('deadlock detected');
    });
  });

  describe('Edge Cases - Memory and Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const largeUserArray = Array.from({ length: 10000 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        avatarUrl: undefined,
        isActive: true,
        emailVerified: true,
        lastLoginAt: '2025-01-01T10:00:00Z',
        createdAt: '2025-01-01T09:00:00Z',
        updatedAt: '2025-01-01T09:00:00Z',
        organizationId: 'org-1',
        department: 'Engineering',
        position: 'Developer'
      }));

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: largeUserArray,
        pagination: {
          total: 10000,
          limit: 10000,
          offset: 0,
          hasMore: false
        }
      });

      const result = await adminUserService.getUsers({}, { limit: 10000, offset: 0 });

      expect(result.data).toHaveLength(10000);
      expect(result.pagination.total).toBe(10000);
    });

    it('should handle concurrent operations', async () => {
      const userData = {
        email: 'concurrent@example.com',
        name: 'Concurrent User'
      };

      const mockCreatedUser: User = {
        id: 'user-123',
        ...userData,
        avatarUrl: undefined,
        isActive: true,
        emailVerified: false,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        organizationId: undefined,
        department: undefined,
        position: undefined,
        roles: []
      };

      mockUserModel.create.mockResolvedValue(mockCreatedUser);

      // Simulate concurrent user creation
      const promises = Array.from({ length: 10 }, () => 
        adminUserService.createUser(userData)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.email).toBe('concurrent@example.com');
      });
    });
  });

  describe('Edge Cases - Data Integrity', () => {
    it('should handle null and undefined values gracefully', async () => {
      const userData = {
        email: 'nulltest@example.com',
        name: 'Null Test User',
        avatarUrl: undefined,
        organizationId: undefined,
        department: undefined,
        position: undefined
      };

      const mockCreatedUser: User = {
        id: 'user-123',
        email: 'nulltest@example.com',
        name: 'Null Test User',
        avatarUrl: undefined,
        isActive: true,
        emailVerified: false,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        organizationId: undefined,
        department: undefined,
        position: undefined,
        roles: []
      };

      mockUserModel.create.mockResolvedValueOnce(mockCreatedUser);

      const result = await adminUserService.createUser(userData);

      expect(result.avatarUrl).toBeUndefined();
      expect(result.organizationId).toBeUndefined();
      expect(result.department).toBeUndefined();
      expect(result.position).toBeUndefined();
    });

    it('should handle malformed JSON in settings', async () => {
      const userData = {
        email: 'jsontest@example.com',
        name: 'JSON Test User'
      };

      const mockCreatedUser: User = {
        id: 'user-123',
        ...userData,
        avatarUrl: undefined,
        isActive: true,
        emailVerified: false,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        organizationId: undefined,
        department: undefined,
        position: undefined,
        roles: []
      };

      mockUserModel.create.mockResolvedValueOnce(mockCreatedUser);

      const result = await adminUserService.createUser(userData);

      expect(result).toEqual(mockCreatedUser);
    });
  });
});

