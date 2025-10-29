import { Request, Response } from 'express';
import { AdminUserController } from '../../../../src/modules/admin/controllers/admin-user.controller';
import { AdminUserService } from '../../../../src/modules/admin/services/admin-user.service';
import { User, UserFilters, PaginationOptions, BulkUserOperation, UserImportData } from '../../../../src/modules/admin/types/user.types';

// Mock the service
jest.mock('../../../../src/modules/admin/services/admin-user.service');

const MockAdminUserService = AdminUserService as jest.MockedClass<typeof AdminUserService>;

describe('AdminUserController', () => {
  let adminUserController: AdminUserController;
  let mockAdminUserService: jest.Mocked<AdminUserService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockAdminUserService = new MockAdminUserService() as jest.Mocked<AdminUserService>;
    adminUserController = new AdminUserController();
    (adminUserController as any).adminUserService = mockAdminUserService;

    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

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

      mockRequest.query = {
        page: '1',
        limit: '10',
        search: 'user',
        isActive: 'true'
      };

      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: mockUsers,
        pagination: mockPagination
      });

      await adminUserController.getUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {
          search: 'user',
          isActive: true
        },
        {
          limit: 10,
          offset: 0,
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
        pagination: mockPagination
      });
    });

    it('should handle service errors', async () => {
      mockRequest.query = { page: '1', limit: '10' };
      mockAdminUserService.getUsers.mockRejectedValueOnce(new Error('Database error'));

      await adminUserController.getUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle invalid query parameters', async () => {
      mockRequest.query = {
        page: 'invalid',
        limit: 'invalid',
        isActive: 'invalid'
      };

      await adminUserController.getUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {
          isActive: undefined
        },
        {
          limit: 10,
          offset: 0,
          sortBy: 'created_at',
          sortOrder: 'desc'
        }
      );
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

      mockRequest.params = { id: 'user-1' };
      mockAdminUserService.getUserById.mockResolvedValueOnce(mockUser);

      await adminUserController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getUserById).toHaveBeenCalledWith('user-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUser
      });
    });

    it('should return 404 when user not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockAdminUserService.getUserById.mockResolvedValueOnce(null);

      await adminUserController.getUserById(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
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

      mockRequest.body = userData;
      mockAdminUserService.createUser.mockResolvedValueOnce(mockCreatedUser);

      await adminUserController.createUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.createUser).toHaveBeenCalledWith(userData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedUser
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        name: 'User Without Email'
      };

      mockRequest.body = invalidData;
      mockAdminUserService.createUser.mockRejectedValueOnce(new Error('Email is required'));

      await adminUserController.createUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockRequest.params = { id: 'user-123' };
      mockRequest.body = updateData;
      mockAdminUserService.updateUser.mockResolvedValueOnce(mockUpdatedUser);

      await adminUserController.updateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.updateUser).toHaveBeenCalledWith('user-123', updateData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedUser
      });
    });

    it('should return 404 when user not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = { name: 'Updated' };
      mockAdminUserService.updateUser.mockResolvedValueOnce(null);

      await adminUserController.updateUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockRequest.params = { id: 'user-123' };
      mockAdminUserService.deleteUser.mockResolvedValueOnce(true);

      await adminUserController.deleteUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.deleteUser).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should return 404 when user not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockAdminUserService.deleteUser.mockResolvedValueOnce(false);

      await adminUserController.deleteUser(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
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

      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {
        roleId: 'role-456',
        organizationId: 'org-1',
        grantedBy: 'admin-1'
      };

      mockAdminUserService.assignRole.mockResolvedValueOnce(mockUserRole);

      await adminUserController.assignRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.assignRole).toHaveBeenCalledWith('user-123', 'role-456', 'org-1', 'admin-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUserRole
      });
    });

    it('should handle missing roleId', async () => {
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {};

      await adminUserController.assignRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Role ID is required'
      });
    });
  });

  describe('removeRole', () => {
    it('should remove role from user', async () => {
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {
        roleId: 'role-456',
        organizationId: 'org-1'
      };

      mockAdminUserService.removeRole.mockResolvedValueOnce(true);

      await adminUserController.removeRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.removeRole).toHaveBeenCalledWith('user-123', 'role-456', 'org-1');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role removed successfully'
      });
    });

    it('should return 404 when role not found', async () => {
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {
        roleId: 'role-456',
        organizationId: 'org-1'
      };

      mockAdminUserService.removeRole.mockResolvedValueOnce(false);

      await adminUserController.removeRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Role assignment not found'
      });
    });

    it('should handle missing roleId', async () => {
      mockRequest.params = { id: 'user-123' };
      mockRequest.body = {};

      await adminUserController.removeRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Role ID is required'
      });
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

      mockRequest.params = { id: 'user-123' };
      mockAdminUserService.getUserRoles.mockResolvedValueOnce(mockRoles);

      await adminUserController.getUserRoles(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getUserRoles).toHaveBeenCalledWith('user-123');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles
      });
    });
  });

  describe('bulkUserOperation', () => {
    it('should perform bulk activate operation', async () => {
      const operation: BulkUserOperation = {
        operation: 'activate',
        userIds: ['user-1', 'user-2', 'user-3']
      };

      mockRequest.body = operation;
      mockAdminUserService.bulkUserOperation.mockResolvedValueOnce({
        success: true,
        affectedCount: 3,
        message: 'Successfully activated 3 users'
      });

      await adminUserController.bulkUserOperation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.bulkUserOperation).toHaveBeenCalledWith(operation);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          success: true,
          affectedCount: 3,
          message: 'Successfully activated 3 users'
        }
      });
    });

    it('should handle bulk operation errors', async () => {
      const operation: BulkUserOperation = {
        operation: 'activate',
        userIds: ['user-1', 'user-2']
      };

      mockRequest.body = operation;
      mockAdminUserService.bulkUserOperation.mockRejectedValueOnce(new Error('Bulk operation failed'));

      await adminUserController.bulkUserOperation(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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
        }
      ];

      const mockImportResult = {
        success: importData,
        errors: [],
        totalProcessed: 1,
        totalSuccess: 1,
        totalErrors: 0
      };

      mockRequest.body = { users: importData };
      mockAdminUserService.importUsers.mockResolvedValueOnce(mockImportResult);

      await adminUserController.importUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.importUsers).toHaveBeenCalledWith(importData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockImportResult
      });
    });

    it('should handle import errors', async () => {
      const importData: UserImportData[] = [
        {
          email: 'invalid-email',
          name: 'Invalid User'
        }
      ];

      mockRequest.body = { users: importData };
      mockAdminUserService.importUsers.mockRejectedValueOnce(new Error('Import failed'));

      await adminUserController.importUsers(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockAdminUserService.getUserStats.mockResolvedValueOnce(mockStats);

      await adminUserController.getUserStats(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getUserStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });
  });

  describe('getUsersByRole', () => {
    it('should return users grouped by role', async () => {
      const mockRoleStats = {
        employee: 70,
        manager: 20,
        admin: 10
      };

      mockAdminUserService.getUsersByRole.mockResolvedValueOnce(mockRoleStats);

      await adminUserController.getUsersByRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getUsersByRole).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoleStats
      });
    });
  });

  describe('getUsersByDepartment', () => {
    it('should return users grouped by department', async () => {
      const mockDeptStats = {
        Engineering: 50,
        Marketing: 20,
        Sales: 15
      };

      mockAdminUserService.getUsersByDepartment.mockResolvedValueOnce(mockDeptStats);

      await adminUserController.getUsersByDepartment(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getUsersByDepartment).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockDeptStats
      });
    });
  });

  describe('getUsersByOrganization', () => {
    it('should return users grouped by organization', async () => {
      const mockOrgStats = {
        'Org A': 60,
        'Org B': 40
      };

      mockAdminUserService.getUsersByOrganization.mockResolvedValueOnce(mockOrgStats);

      await adminUserController.getUsersByOrganization(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getUsersByOrganization).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrgStats
      });
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

      mockAdminUserService.getAllRoles.mockResolvedValueOnce(mockRoles);

      await adminUserController.getAllRoles(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getAllRoles).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockRoles
      });
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

      mockAdminUserService.getSystemRoles.mockResolvedValueOnce(mockSystemRoles);

      await adminUserController.getSystemRoles(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.getSystemRoles).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockSystemRoles
      });
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

      mockRequest.body = roleData;
      mockAdminUserService.createRole.mockResolvedValueOnce(mockCreatedRole);

      await adminUserController.createRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.createRole).toHaveBeenCalledWith(roleData);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockCreatedRole
      });
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        description: 'Role without name'
      };

      mockRequest.body = invalidData;
      mockAdminUserService.createRole.mockRejectedValueOnce(new Error('Role name is required'));

      await adminUserController.createRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
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

      mockRequest.params = { id: 'role-123' };
      mockRequest.body = updateData;
      mockAdminUserService.updateRole.mockResolvedValueOnce(mockUpdatedRole);

      await adminUserController.updateRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.updateRole).toHaveBeenCalledWith('role-123', updateData);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedRole
      });
    });

    it('should return 404 when role not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockRequest.body = { name: 'Updated' };
      mockAdminUserService.updateRole.mockResolvedValueOnce(null);

      await adminUserController.updateRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Role not found'
      });
    });
  });

  describe('deleteRole', () => {
    it('should delete role successfully', async () => {
      mockRequest.params = { id: 'role-123' };
      mockAdminUserService.deleteRole.mockResolvedValueOnce(true);

      await adminUserController.deleteRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockAdminUserService.deleteRole).toHaveBeenCalledWith('role-123');
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it('should return 404 when role not found', async () => {
      mockRequest.params = { id: 'nonexistent-id' };
      mockAdminUserService.deleteRole.mockResolvedValueOnce(false);

      await adminUserController.deleteRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'Role not found'
      });
    });

    it('should handle role in use error', async () => {
      mockRequest.params = { id: 'role-123' };
      mockAdminUserService.deleteRole.mockRejectedValueOnce(new Error('Cannot delete role that is currently assigned to users'));

      await adminUserController.deleteRole(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});

