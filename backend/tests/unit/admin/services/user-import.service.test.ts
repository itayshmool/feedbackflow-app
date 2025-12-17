/**
 * TDD Tests for User Import - Descriptive Error Messages
 * 
 * These tests verify that when user import fails, the error messages
 * are clear and actionable, helping admins quickly identify and fix issues.
 */

import { AdminUserService } from '../../../../src/modules/admin/services/admin-user.service';
import { UserModel } from '../../../../src/modules/admin/models/user.model';
import { RoleModel } from '../../../../src/modules/admin/models/role.model';
import { UserImportData, User } from '../../../../src/modules/admin/types/user.types';

// Mock the models
jest.mock('../../../../src/modules/admin/models/user.model');
jest.mock('../../../../src/modules/admin/models/role.model');

const MockUserModel = UserModel as jest.MockedClass<typeof UserModel>;
const MockRoleModel = RoleModel as jest.MockedClass<typeof RoleModel>;

describe('User Import - Descriptive Error Messages', () => {
  let adminUserService: AdminUserService;
  let mockUserModel: jest.Mocked<UserModel>;
  let mockRoleModel: jest.Mocked<RoleModel>;

  // Helper to create a valid mock user
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    isActive: true,
    emailVerified: false,
    createdAt: '2025-01-01T10:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z',
    roles: [],
    ...overrides
  });

  beforeEach(() => {
    mockUserModel = new MockUserModel() as jest.Mocked<UserModel>;
    mockRoleModel = new MockRoleModel() as jest.Mocked<RoleModel>;
    
    adminUserService = new AdminUserService();
    (adminUserService as any).userModel = mockUserModel;
    (adminUserService as any).roleModel = mockRoleModel;
    
    // Default: no existing users
    mockUserModel.findWhere.mockResolvedValue({ data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } });
    
    jest.clearAllMocks();
  });

  describe('Organization Not Found Errors', () => {
    it('should return descriptive error when organization name+slug combo not found', async () => {
      const importData: UserImportData[] = [
        {
          email: 'user@example.com',
          name: 'Test User',
          organizationName: 'wix.com',  // Wrong - should be 'wix'
          organizationSlug: 'security',
          department: 'Engineering'
        }
      ];

      // Mock: organization lookup returns null (not found)
      mockUserModel.findOrganizationByNameAndSlug.mockResolvedValueOnce(null);

      const result = await adminUserService.importUsers(importData);

      expect(result.totalProcessed).toBe(1);
      expect(result.totalSuccess).toBe(0);
      expect(result.totalErrors).toBe(1);
      
      // Error should include both org name AND slug for easy debugging
      const errorMessage = result.errors[0].error;
      expect(errorMessage).toContain('wix.com');
      expect(errorMessage).toContain('security');
      expect(errorMessage.toLowerCase()).toContain('not found');
    });

    it('should return descriptive error when only organization name not found', async () => {
      const importData: UserImportData[] = [
        {
          email: 'user@example.com',
          name: 'Test User',
          organizationName: 'nonexistent-org',
          department: 'Engineering'
        }
      ];

      // Mock: organization lookup returns null (not found)
      mockUserModel.findOrganizationByName.mockResolvedValueOnce(null);

      const result = await adminUserService.importUsers(importData);

      expect(result.totalProcessed).toBe(1);
      expect(result.totalSuccess).toBe(0);
      expect(result.totalErrors).toBe(1);
      
      // Error should clearly state which org was not found
      const errorMessage = result.errors[0].error;
      expect(errorMessage).toContain('nonexistent-org');
      expect(errorMessage.toLowerCase()).toContain('not found');
    });

    it('should include user email in error data for easy identification', async () => {
      const importData: UserImportData[] = [
        {
          email: 'john.doe@wix.com',
          name: 'John Doe',
          organizationName: 'wrong-org',
          organizationSlug: 'security'
        }
      ];

      mockUserModel.findOrganizationByNameAndSlug.mockResolvedValueOnce(null);

      const result = await adminUserService.importUsers(importData);

      expect(result.totalErrors).toBe(1);
      // The error data should include the user's email so admin knows which row failed
      expect(result.errors[0].data.email).toBe('john.doe@wix.com');
      expect(result.errors[0].error).toContain('wrong-org');
    });
  });

  describe('Error Continuation and Summary', () => {
    it('should continue processing remaining users after one fails', async () => {
      const importData: UserImportData[] = [
        {
          email: 'user1@example.com',
          name: 'User One',
          organizationName: 'wrong-org',
          organizationSlug: 'security'
        },
        {
          email: 'user2@example.com',
          name: 'User Two',
          organizationId: 'valid-org-id'  // This one has direct org ID
        }
      ];

      const mockUser = createMockUser({ 
        id: 'user-2', 
        email: 'user2@example.com', 
        name: 'User Two' 
      });

      // First user: org not found
      mockUserModel.findOrganizationByNameAndSlug.mockResolvedValueOnce(null);
      // Second user: succeeds (no existing user check, then create)
      mockUserModel.findWhere.mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } });
      mockUserModel.create.mockResolvedValueOnce(mockUser);

      const result = await adminUserService.importUsers(importData);

      expect(result.totalProcessed).toBe(2);
      expect(result.totalSuccess).toBe(1);
      expect(result.totalErrors).toBe(1);
      expect(result.errors[0].data.email).toBe('user1@example.com');
      expect(result.success[0].email).toBe('user2@example.com');
    });

    it('should report correct totals when multiple users fail', async () => {
      const importData: UserImportData[] = [
        {
          email: 'user1@example.com',
          name: 'User One',
          organizationName: 'wrong-org-1',
          organizationSlug: 'slug1'
        },
        {
          email: 'user2@example.com',
          name: 'User Two',
          organizationName: 'wrong-org-2',
          organizationSlug: 'slug2'
        },
        {
          email: 'user3@example.com',
          name: 'User Three',
          organizationName: 'wrong-org-3',
          organizationSlug: 'slug3'
        }
      ];

      // All three fail
      mockUserModel.findOrganizationByNameAndSlug.mockResolvedValue(null);

      const result = await adminUserService.importUsers(importData);

      expect(result.totalProcessed).toBe(3);
      expect(result.totalSuccess).toBe(0);
      expect(result.totalErrors).toBe(3);
      
      // Each error should reference its specific organization
      expect(result.errors[0].error).toContain('wrong-org-1');
      expect(result.errors[1].error).toContain('wrong-org-2');
      expect(result.errors[2].error).toContain('wrong-org-3');
    });
  });

  describe('Successful Import', () => {
    it('should import users successfully when organization exists', async () => {
      const importData: UserImportData[] = [
        {
          email: 'user@example.com',
          name: 'Test User',
          organizationName: 'wix',
          organizationSlug: 'security',
          department: 'Engineering'
        }
      ];

      const mockOrg = { id: 'org-123', name: 'wix', slug: 'security' };
      const mockUser = createMockUser({ 
        email: 'user@example.com', 
        name: 'Test User',
        department: 'Engineering'
      });

      mockUserModel.findOrganizationByNameAndSlug.mockResolvedValueOnce(mockOrg);
      mockUserModel.findWhere.mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } });
      mockUserModel.create.mockResolvedValueOnce(mockUser);

      const result = await adminUserService.importUsers(importData);

      expect(result.totalProcessed).toBe(1);
      expect(result.totalSuccess).toBe(1);
      expect(result.totalErrors).toBe(0);
      expect(result.success[0].email).toBe('user@example.com');
    });

    it('should use organizationId directly when provided', async () => {
      const importData: UserImportData[] = [
        {
          email: 'user@example.com',
          name: 'Test User',
          organizationId: 'direct-org-id',
          department: 'Engineering'
        }
      ];

      const mockUser = createMockUser({ 
        email: 'user@example.com',
        organizationId: 'direct-org-id'
      });

      mockUserModel.findWhere.mockResolvedValueOnce({ data: [], pagination: { total: 0, limit: 10, offset: 0, hasMore: false } });
      mockUserModel.create.mockResolvedValueOnce(mockUser);

      const result = await adminUserService.importUsers(importData);

      expect(result.totalSuccess).toBe(1);
      // Should not call organization lookup when ID is provided directly
      expect(mockUserModel.findOrganizationByNameAndSlug).not.toHaveBeenCalled();
      expect(mockUserModel.findOrganizationByName).not.toHaveBeenCalled();
    });
  });
});

