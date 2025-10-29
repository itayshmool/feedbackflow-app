import request from 'supertest';
import express from 'express';
import { AdminUserController } from '../../../../src/modules/admin/controllers/admin-user.controller';
import { AdminUserService } from '../../../../src/modules/admin/services/admin-user.service';
import { User } from '../../../../src/modules/admin/types/user.types';

// Mock the service
jest.mock('../../../../src/modules/admin/services/admin-user.service');

const MockAdminUserService = AdminUserService as jest.MockedClass<typeof AdminUserService>;

describe('User Pagination Unit Tests', () => {
  let app: express.Application;
  let mockAdminUserService: jest.Mocked<AdminUserService>;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());

    // Mock the service
    mockAdminUserService = new MockAdminUserService() as jest.Mocked<AdminUserService>;
    
    // Create routes with mocked service
    const adminUserController = new AdminUserController();
    (adminUserController as any).adminUserService = mockAdminUserService;
    
    // Mock the routes directly
    app.get('/api/v1/admin/users', adminUserController.getUsers.bind(adminUserController));

    jest.clearAllMocks();
  });

  describe('GET /api/v1/admin/users - Pagination Tests', () => {
    it('should return different users for different pages', async () => {
      // Mock data for page 1 (offset 0)
      const page1Users: User[] = [
        { 
          id: 'user-1', 
          name: 'User One', 
          email: 'user1@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        },
        { 
          id: 'user-2', 
          name: 'User Two', 
          email: 'user2@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        },
        { 
          id: 'user-3', 
          name: 'User Three', 
          email: 'user3@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        }
      ];

      // Mock data for page 2 (offset 10)
      const page2Users: User[] = [
        { 
          id: 'user-11', 
          name: 'User Eleven', 
          email: 'user11@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        },
        { 
          id: 'user-12', 
          name: 'User Twelve', 
          email: 'user12@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        },
        { 
          id: 'user-13', 
          name: 'User Thirteen', 
          email: 'user13@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        }
      ];

      // Mock data for page 3 (offset 20)
      const page3Users: User[] = [
        { 
          id: 'user-21', 
          name: 'User Twenty One', 
          email: 'user21@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        },
        { 
          id: 'user-22', 
          name: 'User Twenty Two', 
          email: 'user22@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        },
        { 
          id: 'user-23', 
          name: 'User Twenty Three', 
          email: 'user23@example.com',
          isActive: true,
          emailVerified: true,
          createdAt: '2025-01-01T10:00:00Z',
          updatedAt: '2025-01-01T10:00:00Z'
        }
      ];

      const mockPagination = {
        total: 100,
        limit: 10,
        offset: 0,
        hasMore: true
      };

      // Test page 1
      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: page1Users,
        pagination: { ...mockPagination, offset: 0 }
      });

      const response1 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response1.body.data).toEqual(page1Users);
      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {},
        { limit: 10, offset: 0, sortBy: 'created_at', sortOrder: 'desc' }
      );

      // Test page 2
      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: page2Users,
        pagination: { ...mockPagination, offset: 10 }
      });

      const response2 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 2, limit: 10 })
        .expect(200);

      expect(response2.body.data).toEqual(page2Users);
      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {},
        { limit: 10, offset: 10, sortBy: 'created_at', sortOrder: 'desc' }
      );

      // Test page 3
      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: page3Users,
        pagination: { ...mockPagination, offset: 20 }
      });

      const response3 = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 3, limit: 10 })
        .expect(200);

      expect(response3.body.data).toEqual(page3Users);
      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {},
        { limit: 10, offset: 20, sortBy: 'created_at', sortOrder: 'desc' }
      );

      // Verify that getUsers was called 3 times with different offsets
      expect(mockAdminUserService.getUsers).toHaveBeenCalledTimes(3);
    });

    it('should calculate correct offset for different page sizes', async () => {
      const mockUsers: User[] = [{ 
        id: 'user-1', 
        name: 'User One', 
        email: 'user1@example.com',
        isActive: true,
        emailVerified: true,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      }];
      const mockPagination = { total: 100, limit: 5, offset: 0, hasMore: true };

      // Test with limit 5, page 3 (should be offset 10)
      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: mockUsers,
        pagination: { ...mockPagination, offset: 10 }
      });

      await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 3, limit: 5 })
        .expect(200);

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {},
        { limit: 5, offset: 10, sortBy: 'created_at', sortOrder: 'desc' }
      );

      // Test with limit 20, page 2 (should be offset 20)
      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: mockUsers,
        pagination: { ...mockPagination, offset: 20 }
      });

      await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 2, limit: 20 })
        .expect(200);

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {},
        { limit: 20, offset: 20, sortBy: 'created_at', sortOrder: 'desc' }
      );
    });

    it('should handle edge cases for pagination', async () => {
      const mockUsers: User[] = [{ 
        id: 'user-1', 
        name: 'User One', 
        email: 'user1@example.com',
        isActive: true,
        emailVerified: true,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      }];
      const mockPagination = { total: 100, limit: 10, offset: 0, hasMore: true };

      // Test page 0 (should default to page 1)
      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: mockUsers,
        pagination: { ...mockPagination, offset: 0 }
      });

      await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 0, limit: 10 })
        .expect(200);

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {},
        { limit: 10, offset: 0, sortBy: 'created_at', sortOrder: 'desc' }
      );

      // Test negative page (should default to page 1)
      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: mockUsers,
        pagination: { ...mockPagination, offset: 0 }
      });

      await request(app)
        .get('/api/v1/admin/users')
        .query({ page: -1, limit: 10 })
        .expect(200);

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {},
        { limit: 10, offset: 0, sortBy: 'created_at', sortOrder: 'desc' }
      );

      // Test very large page number
      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: [],
        pagination: { total: 100, limit: 10, offset: 990, hasMore: false }
      });

      await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 100, limit: 10 })
        .expect(200);

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        {},
        { limit: 10, offset: 990, sortBy: 'created_at', sortOrder: 'desc' }
      );
    });

    it('should maintain pagination state correctly', async () => {
      const mockUsers: User[] = [{ 
        id: 'user-1', 
        name: 'User One', 
        email: 'user1@example.com',
        isActive: true,
        emailVerified: true,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      }];
      
      // Test that pagination metadata is correctly returned
      const mockPagination = {
        total: 150,
        limit: 10,
        offset: 20,
        hasMore: true,
        totalPages: 15,
        currentPage: 3
      };

      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: mockUsers,
        pagination: mockPagination
      });

      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 3, limit: 10 })
        .expect(200);

      expect(response.body.pagination).toEqual(mockPagination);
      expect(response.body.pagination.offset).toBe(20);
      expect(response.body.pagination.currentPage).toBe(3);
    });

    it('should handle filters with pagination', async () => {
      const mockUsers: User[] = [{ 
        id: 'user-1', 
        name: 'User One', 
        email: 'user1@example.com',
        isActive: true,
        emailVerified: true,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      }];
      const mockPagination = { total: 50, limit: 10, offset: 10, hasMore: true };

      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: mockUsers,
        pagination: mockPagination
      });

      await request(app)
        .get('/api/v1/admin/users')
        .query({ 
          page: 2, 
          limit: 10, 
          search: 'test',
          organizationId: 'org-1',
          role: 'employee'
        })
        .expect(200);

      expect(mockAdminUserService.getUsers).toHaveBeenCalledWith(
        { 
          search: 'test',
          organizationId: 'org-1',
          role: 'employee'
        },
        { limit: 10, offset: 10, sortBy: 'created_at', sortOrder: 'desc' }
      );
    });

    it('should handle empty results correctly', async () => {
      const mockPagination = { total: 0, limit: 10, offset: 0, hasMore: false };

      mockAdminUserService.getUsers.mockResolvedValueOnce({
        data: [],
        pagination: mockPagination
      });

      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.pagination.total).toBe(0);
      expect(response.body.pagination.hasMore).toBe(false);
    });
  });
});
