import { AdminUserService } from '../../../../src/modules/admin/services/admin-user.service';
import { UserModel } from '../../../../src/modules/admin/models/user.model';
import { RoleModel } from '../../../../src/modules/admin/models/role.model';
import { User, UserFilters, PaginationOptions, BulkUserOperation, UserImportData } from '../../../../src/modules/admin/types/user.types';

// Mock the models
jest.mock('../../../../src/modules/admin/models/user.model');
jest.mock('../../../../src/modules/admin/models/role.model');

const MockUserModel = UserModel as jest.MockedClass<typeof UserModel>;
const MockRoleModel = RoleModel as jest.MockedClass<typeof RoleModel>;

describe('AdminUserService', () => {
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

  describe('getUsers', () => {
    it('should return users with pagination', async () => {
      const mockUsers: User[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          avatarUrl: 'https://example.com/avatar1.jpg',
          isActive: true,
          emailVerified: true,
          lastLoginAt: '2025-01-01T10:00:00Z',
          createdAt: '2025-01-01T09:00:00Z',
          updatedAt: '2025-01-01T09:00:00Z',
          organizationId: 'org-1',
          department: 'Engineering',
          position: 'Developer',
          roles: ['employee']
        }
      ];

      const mockPagination = {
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false
      };

      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: mockUsers,
        pagination: mockPagination
      });

      const filters: UserFilters = { isActive: true };
      const options: PaginationOptions = { limit: 10, offset: 0 };

      const result = await adminUserService.getUsers(filters, options);

      expect(mockUserModel.findWithRoles).toHaveBeenCalledWith(filters, options);
      expect(result.data).toEqual(mockUsers);
      expect(result.pagination).toEqual(mockPagination);
    });

    it('should handle empty results', async () => {
      mockUserModel.findWithRoles.mockResolvedValueOnce({
        data: [],
        pagination: { total: 0, limit: 10, offset: 0, hasMore: false }
      });

      const result = await adminUserService.getUsers({}, {});

      expect(result.data).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: 'user-1',
        email: 'user1@example.com',
        name: 'User One',
        avatarUrl: 'https://example.com/avatar1.jpg',
        isActive: true,
        emailVerified: true,
        lastLoginAt: '2025-01-01T10:00:00Z',
        createdAt: '2025-01-01T09:00:00Z',
        updatedAt: '2025-01-01T09:00:00Z',
        organizationId: 'org-1',
        department: 'Engineering',
        position: 'Developer',
        roles: ['employee']
      };

      mockUserModel.findById.mockResolvedValueOnce(mockUser);

      const result = await adminUserService.getUserById('user-1');

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockUserModel.findById.mockResolvedValueOnce(null);

      const result = await adminUserService.getUserById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
        organizationId: 'org-1',
        department: 'Engineering',
        position: 'Developer',
        isActive: true,
        emailVerified: false
      };

      const mockCreatedUser: User = {
        id: 'user-123',
        ...userData,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        roles: []
      };

      mockUserModel.create.mockResolvedValueOnce(mockCreatedUser);

      const result = await adminUserService.createUser(userData);

      expect(mockUserModel.create).toHaveBeenCalledWith(userData);
      expect(result).toEqual(mockCreatedUser);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'User Without Email'
      };

      await expect(adminUserService.createUser(invalidData))
        .rejects.toThrow('Email is required');
    });

    it('should validate email format', async () => {
      const invalidData = {
        email: 'invalid-email',
        name: 'Test User'
      };

      await expect(adminUserService.createUser(invalidData))
        .rejects.toThrow('Invalid email format');
    });

    it('should handle database errors', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User'
      };

      mockUserModel.create.mockRejectedValueOnce(new Error('Database error'));

      await expect(adminUserService.createUser(userData))
        .rejects.toThrow('Database error');
    });
  });

  describe('updateUser', () => {
    it('should update user with valid data', async () => {
      const updateData = {
        name: 'Updated Name',
        department: 'Updated Department',
        isActive: false
      };

      const mockUpdatedUser: User = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Updated Name',
        avatarUrl: 'https://example.com/avatar.jpg',
        isActive: false,
        emailVerified: true,
        lastLoginAt: '2025-01-01T10:00:00Z',
        createdAt: '2025-01-01T09:00:00Z',
        updatedAt: '2025-01-01T11:00:00Z',
        organizationId: 'org-1',
        department: 'Updated Department',
        position: 'Developer',
        roles: ['employee']
      };

      mockUserModel.update.mockResolvedValueOnce(mockUpdatedUser);

      const result = await adminUserService.updateUser('user-123', updateData);

      expect(mockUserModel.update).toHaveBeenCalledWith('user-123', updateData);
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should return null when user not found', async () => {
      mockUserModel.update.mockResolvedValueOnce(null);

      const result = await adminUserService.updateUser('nonexistent-id', { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should validate email format if provided', async () => {
      const invalidData = {
        email: 'invalid-email'
      };

      await expect(adminUserService.updateUser('user-123', invalidData))
        .rejects.toThrow('Invalid email format');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockUserModel.delete.mockResolvedValueOnce(true);

      const result = await adminUserService.deleteUser('user-123');

      expect(mockUserModel.delete).toHaveBeenCalledWith('user-123');
      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      mockUserModel.delete.mockResolvedValueOnce(false);

      const result = await adminUserService.deleteUser('nonexistent-id');

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

      mockUserModel.assignRole.mockResolvedValueOnce(mockUserRole);

      const result = await adminUserService.assignRole('user-123', 'role-456', 'org-1', 'admin-1');

      expect(mockUserModel.assignRole).toHaveBeenCalledWith('user-123', 'role-456', 'org-1', 'admin-1');
      expect(result).toEqual(mockUserRole);
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      mockUserModel.removeRole.mockResolvedValueOnce(true);

      const result = await adminUserService.removeRole('user-123', 'role-456', 'org-1');

      expect(mockUserModel.removeRole).toHaveBeenCalledWith('user-123', 'role-456', 'org-1');
      expect(result).toBe(true);
    });

    it('should return false when role not found', async () => {
      mockUserModel.removeRole.mockResolvedValueOnce(false);

      const result = await adminUserService.removeRole('user-123', 'role-456', 'org-1');

      expect(result).toBe(false);
    });
  });

  describe('getUserRoles', () => {
    it('should return user roles', async () => {
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

      mockUserModel.getUserRoles.mockResolvedValueOnce(mockRoles);

      const result = await adminUserService.getUserRoles('user-123');

      expect(mockUserModel.getUserRoles).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockRoles);
    });
  });

  describe('bulkUserOperation', () => {
    it('should activate multiple users', async () => {
      const operation: BulkUserOperation = {
        operation: 'activate',
        userIds: ['user-1', 'user-2', 'user-3']
      };

      mockUserModel.bulkUpdateUsers.mockResolvedValueOnce(3);

      const result = await adminUserService.bulkUserOperation(operation);

      expect(mockUserModel.bulkUpdateUsers).toHaveBeenCalledWith(['user-1', 'user-2', 'user-3'], { isActive: true });
      expect(result).toEqual({
        success: true,
        affectedCount: 3,
        message: 'Successfully activated 3 users'
      });
    });

    it('should deactivate multiple users', async () => {
      const operation: BulkUserOperation = {
        operation: 'deactivate',
        userIds: ['user-1', 'user-2']
      };

      mockUserModel.bulkUpdateUsers.mockResolvedValueOnce(2);

      const result = await adminUserService.bulkUserOperation(operation);

      expect(mockUserModel.bulkUpdateUsers).toHaveBeenCalledWith(['user-1', 'user-2'], { isActive: false });
      expect(result).toEqual({
        success: true,
        affectedCount: 2,
        message: 'Successfully deactivated 2 users'
      });
    });

    it('should delete multiple users', async () => {
      const operation: BulkUserOperation = {
        operation: 'delete',
        userIds: ['user-1', 'user-2']
      };

      mockUserModel.deleteUsers.mockResolvedValueOnce(2);

      const result = await adminUserService.bulkUserOperation(operation);

      expect(mockUserModel.deleteUsers).toHaveBeenCalledWith(['user-1', 'user-2']);
      expect(result).toEqual({
        success: true,
        affectedCount: 2,
        message: 'Successfully deleted 2 users'
      });
    });

    it('should assign role to multiple users', async () => {
      const operation: BulkUserOperation = {
        operation: 'assign_role',
        userIds: ['user-1', 'user-2'],
        roleId: 'role-456'
      };

      // Mock individual role assignments
      mockUserModel.assignRole
        .mockResolvedValueOnce({ id: 'assignment-1', user_id: 'user-1', role_id: 'role-456' })
        .mockResolvedValueOnce({ id: 'assignment-2', user_id: 'user-2', role_id: 'role-456' });

      const result = await adminUserService.bulkUserOperation(operation);

      expect(mockUserModel.assignRole).toHaveBeenCalledTimes(2);
      expect(mockUserModel.assignRole).toHaveBeenCalledWith('user-1', 'role-456', undefined, undefined);
      expect(mockUserModel.assignRole).toHaveBeenCalledWith('user-2', 'role-456', undefined, undefined);
      expect(result).toEqual({
        success: true,
        affectedCount: 2,
        message: 'Successfully assigned role to 2 users'
      });
    });

    it('should remove role from multiple users', async () => {
      const operation: BulkUserOperation = {
        operation: 'remove_role',
        userIds: ['user-1', 'user-2'],
        roleId: 'role-456'
      };

      // Mock individual role removals
      mockUserModel.removeRole
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const result = await adminUserService.bulkUserOperation(operation);

      expect(mockUserModel.removeRole).toHaveBeenCalledTimes(2);
      expect(mockUserModel.removeRole).toHaveBeenCalledWith('user-1', 'role-456', undefined);
      expect(mockUserModel.removeRole).toHaveBeenCalledWith('user-2', 'role-456', undefined);
      expect(result).toEqual({
        success: true,
        affectedCount: 2,
        message: 'Successfully removed role from 2 users'
      });
    });

    it('should handle partial failures in role operations', async () => {
      const operation: BulkUserOperation = {
        operation: 'assign_role',
        userIds: ['user-1', 'user-2'],
        roleId: 'role-456'
      };

      // Mock one success and one failure
      mockUserModel.assignRole
        .mockResolvedValueOnce({ id: 'assignment-1', user_id: 'user-1', role_id: 'role-456' })
        .mockRejectedValueOnce(new Error('Role assignment failed'));

      const result = await adminUserService.bulkUserOperation(operation);

      expect(result).toEqual({
        success: false,
        affectedCount: 1,
        message: 'Partially completed: 1 out of 2 users processed successfully'
      });
    });

    it('should validate required roleId for role operations', async () => {
      const operation: BulkUserOperation = {
        operation: 'assign_role',
        userIds: ['user-1', 'user-2']
        // Missing roleId
      };

      await expect(adminUserService.bulkUserOperation(operation))
        .rejects.toThrow('Role ID is required for role assignment/removal operations');
    });
  });

  describe('importUsers', () => {
    it('should import users successfully', async () => {
      const importData: UserImportData[] = [
        {
          email: 'user1@example.com',
          name: 'User One',
          organizationId: 'org-1',
          department: 'Engineering',
          position: 'Developer',
          roles: ['employee']
        },
        {
          email: 'user2@example.com',
          name: 'User Two',
          organizationId: 'org-1',
          department: 'Marketing',
          position: 'Manager',
          roles: ['manager']
        }
      ];

      const mockCreatedUsers = [
        { id: 'user-1', email: 'user1@example.com', name: 'User One' },
        { id: 'user-2', email: 'user2@example.com', name: 'User Two' }
      ];

      mockUserModel.create
        .mockResolvedValueOnce(mockCreatedUsers[0])
        .mockResolvedValueOnce(mockCreatedUsers[1]);

      const result = await adminUserService.importUsers(importData);

      expect(result.totalProcessed).toBe(2);
      expect(result.totalSuccess).toBe(2);
      expect(result.totalErrors).toBe(0);
      expect(result.success).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle import errors gracefully', async () => {
      const importData: UserImportData[] = [
        {
          email: 'valid@example.com',
          name: 'Valid User'
        },
        {
          email: 'invalid-email',
          name: 'Invalid User'
        }
      ];

      const mockCreatedUser = { id: 'user-1', email: 'valid@example.com', name: 'Valid User' };

      mockUserModel.create
        .mockResolvedValueOnce(mockCreatedUser)
        .mockRejectedValueOnce(new Error('Invalid email format'));

      const result = await adminUserService.importUsers(importData);

      expect(result.totalProcessed).toBe(2);
      expect(result.totalSuccess).toBe(1);
      expect(result.totalErrors).toBe(1);
      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Invalid email format');
    });

    it('should validate required fields during import', async () => {
      const importData: UserImportData[] = [
        {
          name: 'User Without Email'
        }
      ];

      const result = await adminUserService.importUsers(importData);

      expect(result.totalProcessed).toBe(1);
      expect(result.totalSuccess).toBe(0);
      expect(result.totalErrors).toBe(1);
      expect(result.errors[0].error).toContain('Email is required');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 80,
        inactiveUsers: 20,
        verifiedUsers: 75,
        unverifiedUsers: 25,
        recentSignups: 10
      };

      mockUserModel.getUserStats.mockResolvedValueOnce(mockStats);

      const result = await adminUserService.getUserStats();

      expect(mockUserModel.getUserStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getUsersByRole', () => {
    it('should return users grouped by role', async () => {
      const mockRoleStats = {
        employee: 70,
        manager: 20,
        admin: 10
      };

      mockUserModel.getUsersByRole.mockResolvedValueOnce(mockRoleStats);

      const result = await adminUserService.getUsersByRole();

      expect(mockUserModel.getUsersByRole).toHaveBeenCalled();
      expect(result).toEqual(mockRoleStats);
    });
  });

  describe('getUsersByDepartment', () => {
    it('should return users grouped by department', async () => {
      const mockDeptStats = {
        Engineering: 50,
        Marketing: 20,
        Sales: 15
      };

      mockUserModel.getUsersByDepartment.mockResolvedValueOnce(mockDeptStats);

      const result = await adminUserService.getUsersByDepartment();

      expect(mockUserModel.getUsersByDepartment).toHaveBeenCalled();
      expect(result).toEqual(mockDeptStats);
    });
  });

  describe('getUsersByOrganization', () => {
    it('should return users grouped by organization', async () => {
      const mockOrgStats = {
        'Org A': 60,
        'Org B': 40
      };

      mockUserModel.getUsersByOrganization.mockResolvedValueOnce(mockOrgStats);

      const result = await adminUserService.getUsersByOrganization();

      expect(mockUserModel.getUsersByOrganization).toHaveBeenCalled();
      expect(result).toEqual(mockOrgStats);
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles', async () => {
      const mockRoles = [
        {
          id: 'role-1',
          name: 'admin',
          description: 'System administrator',
          permissions: ['user:read', 'user:write'],
          isSystemRole: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        }
      ];

      mockRoleModel.findAllRoles.mockResolvedValueOnce(mockRoles);

      const result = await adminUserService.getAllRoles();

      expect(mockRoleModel.findAllRoles).toHaveBeenCalled();
      expect(result).toEqual(mockRoles);
    });
  });

  describe('getSystemRoles', () => {
    it('should return system roles', async () => {
      const mockSystemRoles = [
        {
          id: 'role-1',
          name: 'admin',
          description: 'System administrator',
          permissions: ['user:read', 'user:write'],
          isSystemRole: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        }
      ];

      mockRoleModel.findSystemRoles.mockResolvedValueOnce(mockSystemRoles);

      const result = await adminUserService.getSystemRoles();

      expect(mockRoleModel.findSystemRoles).toHaveBeenCalled();
      expect(result).toEqual(mockSystemRoles);
    });
  });

  describe('createRole', () => {
    it('should create a new role', async () => {
      const roleData = {
        name: 'custom-role',
        description: 'Custom role description',
        permissions: ['feedback:read', 'feedback:write']
      };

      const mockCreatedRole = {
        id: 'role-123',
        ...roleData,
        isSystemRole: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      };

      mockRoleModel.createRole.mockResolvedValueOnce(mockCreatedRole);

      const result = await adminUserService.createRole(roleData);

      expect(mockRoleModel.createRole).toHaveBeenCalledWith(
        'custom-role',
        'Custom role description',
        ['feedback:read', 'feedback:write']
      );
      expect(result).toEqual(mockCreatedRole);
    });

    it('should validate required role name', async () => {
      const roleData = {
        description: 'Role without name'
      };

      await expect(adminUserService.createRole(roleData))
        .rejects.toThrow('Role name is required');
    });
  });

  describe('updateRole', () => {
    it('should update role', async () => {
      const updateData = {
        name: 'updated-role',
        description: 'Updated description',
        permissions: ['feedback:read', 'feedback:write', 'user:read']
      };

      const mockUpdatedRole = {
        id: 'role-123',
        ...updateData,
        isSystemRole: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T11:00:00Z'
      };

      mockRoleModel.updateRole.mockResolvedValueOnce(mockUpdatedRole);

      const result = await adminUserService.updateRole('role-123', updateData);

      expect(mockRoleModel.updateRole).toHaveBeenCalledWith('role-123', updateData);
      expect(result).toEqual(mockUpdatedRole);
    });

    it('should return null when role not found', async () => {
      mockRoleModel.updateRole.mockResolvedValueOnce(null);

      const result = await adminUserService.updateRole('nonexistent-id', { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      mockRoleModel.deleteRole.mockResolvedValueOnce(true);

      const result = await adminUserService.deleteRole('role-123');

      expect(mockRoleModel.deleteRole).toHaveBeenCalledWith('role-123');
      expect(result).toBe(true);
    });

    it('should return false when role not found', async () => {
      mockRoleModel.deleteRole.mockResolvedValueOnce(false);

      const result = await adminUserService.deleteRole('nonexistent-id');

      expect(result).toBe(false);
    });

    it('should handle role in use error', async () => {
      mockRoleModel.deleteRole.mockRejectedValueOnce(new Error('Cannot delete role that is currently assigned to users'));

      await expect(adminUserService.deleteRole('role-123'))
        .rejects.toThrow('Cannot delete role that is currently assigned to users');
    });
  });
});