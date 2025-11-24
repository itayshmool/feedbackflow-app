import request from 'supertest';
import express from 'express';
import { AdminUserController } from '../../../src/modules/admin/controllers/admin-user.controller';
import { AdminUserService } from '../../../src/modules/admin/services/admin-user.service';
import { UserModel } from '../../../src/modules/admin/models/user.model';
import { RoleModel } from '../../../src/modules/admin/models/role.model';
import { createAdminUserRoutes } from '../../../src/modules/admin/routes/admin-user.routes';

// Mock the models and services
jest.mock('../../../src/modules/admin/models/user.model');
jest.mock('../../../src/modules/admin/models/role.model');
jest.mock('../../../src/modules/admin/services/admin-user.service');

const MockUserModel = UserModel as jest.MockedClass<typeof UserModel>;
const MockRoleModel = RoleModel as jest.MockedClass<typeof RoleModel>;
const MockAdminUserService = AdminUserService as jest.MockedClass<typeof AdminUserService>;

// Helper function to create mock user with proper UserRole structure
function createMockUser(overrides: any = {}) {
  return {
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
    roles: [
      {
        id: 'ur-1',
        userId: 'user-1',
        roleId: 'role-1',
        roleName: 'employee',
        grantedAt: '2025-01-01T09:00:00Z',
        isActive: true
      }
    ],
    ...overrides
  };
}

describe('User Management Integration Tests', () => {
  let app: express.Application;
  let mockAdminUserService: jest.Mocked<AdminUserService>;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock the service
    mockAdminUserService = new MockAdminUserService() as jest.Mocked<AdminUserService>;
    
    // Add missing method mocks
    mockAdminUserService.assignUserRole = jest.fn();
    mockAdminUserService.removeUserRole = jest.fn();
    mockAdminUserService.bulkUpdateUsers = jest.fn();
    
    // Create routes with mocked service
    const adminUserController = new AdminUserController();
    (adminUserController as any).userService = mockAdminUserService;
    
    const routes = createAdminUserRoutes(adminUserController);
    app.use('/api/v1/admin', routes);

    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/users', () => {
    it('should return users with pagination', async () => {
      const mockUsers = [createMockUser()];

      const mockPagination = {
        total: 1,
        limit: 10,
        offset: 0,
        hasMore: false
      };

      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: mockUsers,
        pagination: mockPagination
      });

      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 1, limit: 10, search: 'user' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUsers,
        pagination: mockPagination
      });

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        { search: 'user' },
        { limit: 10, offset: 0, sortBy: 'created_at', sortOrder: 'desc' }
      );
    });

    it('should handle service errors', async () => {
      mockAdminUserService.getUsers.mockRejectedValueOnce(new Error('Database error'));

      await request(app)
        .get('/api/v1/admin/users')
        .expect(500);
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();

      mockAdminUserService.getUserById.mockResolvedValueOnce(mockUser);

      const response = await request(app)
        .get('/api/v1/admin/users/user-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUser
      });
    });

    it('should return 404 when user not found', async () => {
      mockAdminUserService.getUserById.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/v1/admin/users/nonexistent-id')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('POST /api/v1/admin/users', () => {
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

      const mockCreatedUser = {
        id: 'user-123',
        ...userData,
        lastLoginAt: undefined,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
        roles: []
      };

      mockAdminUserService.createUser.mockResolvedValueOnce(mockCreatedUser);

      const response = await request(app)
        .post('/api/v1/admin/users')
        .send(userData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCreatedUser
      });

      expect(mockAdminUserService.createUser).toHaveBeenCalledWith(userData);
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        name: 'User Without Email'
      };

      mockAdminUserService.createUser.mockRejectedValueOnce(new Error('Email is required'));

      await request(app)
        .post('/api/v1/admin/users')
        .send(invalidData)
        .expect(500);
    });
  });

  describe('PUT /api/v1/admin/users/:id', () => {
    it('should update user with valid data', async () => {
      const updateData = {
        name: 'Updated Name',
        department: 'Updated Department',
        isActive: false
      };

      const mockUpdatedUser = createMockUser({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Updated Name',
        isActive: false,
        updatedAt: '2025-01-01T11:00:00Z',
        department: 'Updated Department'
      });

      mockAdminUserService.updateUser.mockResolvedValueOnce(mockUpdatedUser);

      const response = await request(app)
        .put('/api/v1/admin/users/user-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedUser
      });

      expect(mockAdminUserService.updateUser).toHaveBeenCalledWith('user-123', updateData);
    });

    it('should return 404 when user not found', async () => {
      mockAdminUserService.updateUser.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/v1/admin/users/nonexistent-id')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('DELETE /api/v1/admin/users/:id', () => {
    it('should delete user successfully', async () => {
      mockAdminUserService.deleteUser.mockResolvedValueOnce(true);

      await request(app)
        .delete('/api/v1/admin/users/user-123')
        .expect(204);

      expect(mockAdminUserService.deleteUser).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 when user not found', async () => {
      mockAdminUserService.deleteUser.mockResolvedValueOnce(false);

      const response = await request(app)
        .delete('/api/v1/admin/users/nonexistent-id')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('POST /api/v1/admin/users/:id/roles', () => {
    it('should assign role to user', async () => {
      const mockUserRole = {
        id: 'role-assignment-1',
        userId: 'user-123',
        roleId: 'role-456',
        roleName: 'manager',
        organizationId: 'org-1',
        grantedBy: 'admin-1',
        grantedAt: '2025-01-01T10:00:00Z',
        isActive: true
      };

      mockAdminUserService.assignUserRole.mockResolvedValueOnce(mockUserRole);

      const response = await request(app)
        .post('/api/v1/admin/users/user-123/roles')
        .send({
          roleId: 'role-456',
          organizationId: 'org-1',
          grantedBy: 'admin-1'
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUserRole
      });

      expect(mockAdminUserService.assignUserRole).toHaveBeenCalledWith('user-123', 'role-456', 'org-1', 'admin-1');
    });

    it('should return 400 when roleId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/admin/users/user-123/roles')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Role ID is required'
      });
    });
  });

  describe('DELETE /api/v1/admin/users/:id/roles', () => {
    it('should remove role from user', async () => {
      mockAdminUserService.removeUserRole.mockResolvedValueOnce(true);

      const response = await request(app)
        .delete('/api/v1/admin/users/user-123/roles/role-456')
        .query({ organizationId: 'org-1' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Role removed successfully'
      });

      expect(mockAdminUserService.removeUserRole).toHaveBeenCalledWith('user-123', 'role-456', 'org-1');
    });

    it('should return 404 when role not found', async () => {
      mockAdminUserService.removeUserRole.mockResolvedValueOnce(false);

      const response = await request(app)
        .delete('/api/v1/admin/users/user-123/roles/role-456')
        .query({ organizationId: 'org-1' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Role assignment not found'
      });
    });
  });

  describe('GET /api/v1/admin/users/:id/roles', () => {
    it('should return user roles', async () => {
      const mockRoles = [
        {
          id: 'role-assignment-1',
          userId: 'user-123',
          roleId: 'role-456',
          roleName: 'manager',
          organizationId: 'org-1',
          organizationName: 'Test Org',
          grantedBy: 'admin-1',
          grantedAt: '2025-01-01T10:00:00Z',
          isActive: true
        }
      ];

      mockAdminUserService.getUserRoles.mockResolvedValueOnce(mockRoles);

      const response = await request(app)
        .get('/api/v1/admin/users/user-123/roles')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockRoles
      });

      expect(mockAdminUserService.getUserRoles).toHaveBeenCalledWith('user-123');
    });
  });

  describe('POST /api/v1/admin/users/bulk', () => {
    it('should perform bulk activate operation', async () => {
      const operation = {
        operation: 'activate',
        userIds: ['user-1', 'user-2', 'user-3']
      };

      mockAdminUserService.bulkUpdateUsers.mockResolvedValueOnce({
        success: 3,
        errors: [],
      });

      const response = await request(app)
        .post('/api/v1/admin/users/bulk')
        .send(operation)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          success: true,
          affectedCount: 3,
          message: 'Successfully activated 3 users'
        }
      });

      expect(mockAdminUserService.bulkUpdateUsers).toHaveBeenCalledWith(operation);
    });

    it('should handle bulk operation errors', async () => {
      const operation = {
        operation: 'activate',
        userIds: ['user-1', 'user-2']
      };

      mockAdminUserService.bulkUpdateUsers.mockRejectedValueOnce(new Error('Bulk operation failed'));

      await request(app)
        .post('/api/v1/admin/users/bulk')
        .send(operation)
        .expect(500);
    });
  });

  describe('POST /api/v1/admin/users/import', () => {
    it('should import users successfully', async () => {
      const importData = [
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

      mockAdminUserService.importUsers.mockResolvedValueOnce(mockImportResult);

      const response = await request(app)
        .post('/api/v1/admin/users/import')
        .send({ users: importData })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockImportResult
      });

      expect(mockAdminUserService.importUsers).toHaveBeenCalledWith(importData);
    });

    it('should handle import errors', async () => {
      const importData = [
        {
          email: 'invalid-email',
          name: 'Invalid User'
        }
      ];

      mockAdminUserService.importUsers.mockRejectedValueOnce(new Error('Import failed'));

      await request(app)
        .post('/api/v1/admin/users/import')
        .send({ users: importData })
        .expect(500);
    });
  });

  describe('GET /api/v1/admin/users/stats', () => {
    it('should return user statistics', async () => {
      const mockStats = {
        totalUsers: 100,
        activeUsers: 80,
        inactiveUsers: 20,
        verifiedUsers: 75,
        unverifiedUsers: 25,
        recentSignups: 10,
        usersByRole: { admin: 5, employee: 95 },
        usersByOrganization: { 'org-1': 50, 'org-2': 50 },
        usersByDepartment: { Engineering: 40, Sales: 30, Marketing: 30 },
        averageUsersPerOrganization: 50
      };

      mockAdminUserService.getUserStats.mockResolvedValueOnce(mockStats);

      const response = await request(app)
        .get('/api/v1/admin/users/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStats
      });

      expect(mockAdminUserService.getUserStats).toHaveBeenCalled();
    });
  });

  describe.skip('GET /api/v1/admin/users/stats/roles', () => {
    it('should return users grouped by role', async () => {
      const mockRoleStats = {
        employee: 70,
        manager: 20,
        admin: 10
      };

      // @ts-expect-error - Wrong return type for getUserRoles, should be UserRole[]
      mockAdminUserService.getUserRoles.mockResolvedValueOnce(mockRoleStats);

      const response = await request(app)
        .get('/api/v1/admin/users/stats/roles')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockRoleStats
      });

      expect(mockAdminUserService.getUserRoles).toHaveBeenCalled();
    });
  });

  describe.skip('GET /api/v1/admin/users/stats/departments', () => {
    it('should return users grouped by department', async () => {
      const mockDeptStats = {
        Engineering: 50,
        Marketing: 20,
        Sales: 15
      };

      // @ts-expect-error - Method not implemented yet
      mockAdminUserService.getUsersByDepartment.mockResolvedValueOnce(mockDeptStats);

      const response = await request(app)
        .get('/api/v1/admin/users/stats/departments')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockDeptStats
      });

      // @ts-expect-error - Method not implemented yet
      expect(mockAdminUserService.getUsersByDepartment).toHaveBeenCalled();
    });
  });

  describe.skip('GET /api/v1/admin/users/stats/organizations', () => {
    it('should return users grouped by organization', async () => {
      const mockOrgStats = {
        'Org A': 60,
        'Org B': 40
      };

      // @ts-expect-error - Method not implemented yet
      mockAdminUserService.getUsersByOrganization.mockResolvedValueOnce(mockOrgStats);

      const response = await request(app)
        .get('/api/v1/admin/users/stats/organizations')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockOrgStats
      });

      // @ts-expect-error - Method not implemented yet
      expect(mockAdminUserService.getUsersByOrganization).toHaveBeenCalled();
    });
  });

  describe.skip('GET /api/v1/admin/roles', () => {
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

      mockAdminUserService.getRoles.mockResolvedValueOnce(mockRoles);

      const response = await request(app)
        .get('/api/v1/admin/roles')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockRoles
      });

      expect(mockAdminUserService.getRoles).toHaveBeenCalled();
    });
  });

  describe.skip('GET /api/v1/admin/roles/system', () => {
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

      // @ts-expect-error - Method not implemented yet
      mockAdminUserService.getSystemRoles.mockResolvedValueOnce(mockSystemRoles);

      const response = await request(app)
        .get('/api/v1/admin/roles/system')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockSystemRoles
      });

      // @ts-expect-error - Method not implemented yet
      expect(mockAdminUserService.getSystemRoles).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/admin/roles', () => {
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

      mockAdminUserService.createRole.mockResolvedValueOnce(mockCreatedRole);

      const response = await request(app)
        .post('/api/v1/admin/roles')
        .send(roleData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCreatedRole
      });

      expect(mockAdminUserService.createRole).toHaveBeenCalledWith(roleData);
    });

    it('should handle validation errors', async () => {
      const invalidData = {
        description: 'Role without name'
      };

      mockAdminUserService.createRole.mockRejectedValueOnce(new Error('Role name is required'));

      await request(app)
        .post('/api/v1/admin/roles')
        .send(invalidData)
        .expect(500);
    });
  });

  describe('PUT /api/v1/admin/roles/:id', () => {
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

      mockAdminUserService.updateRole.mockResolvedValueOnce(mockUpdatedRole);

      const response = await request(app)
        .put('/api/v1/admin/roles/role-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedRole
      });

      expect(mockAdminUserService.updateRole).toHaveBeenCalledWith('role-123', updateData);
    });

    it('should return 404 when role not found', async () => {
      mockAdminUserService.updateRole.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/v1/admin/roles/nonexistent-id')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Role not found'
      });
    });
  });

  describe('DELETE /api/v1/admin/roles/:id', () => {
    it('should delete role successfully', async () => {
      mockAdminUserService.deleteRole.mockResolvedValueOnce(true);

      await request(app)
        .delete('/api/v1/admin/roles/role-123')
        .expect(204);

      expect(mockAdminUserService.deleteRole).toHaveBeenCalledWith('role-123');
    });

    it('should return 404 when role not found', async () => {
      mockAdminUserService.deleteRole.mockResolvedValueOnce(false);

      const response = await request(app)
        .delete('/api/v1/admin/roles/nonexistent-id')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Role not found'
      });
    });

    it('should handle role in use error', async () => {
      mockAdminUserService.deleteRole.mockRejectedValueOnce(new Error('Cannot delete role that is currently assigned to users'));

      await request(app)
        .delete('/api/v1/admin/roles/role-123')
        .expect(500);
    });
  });
});

