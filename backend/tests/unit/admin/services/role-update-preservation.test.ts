/**
 * Test suite for role update preservation bug fix
 * 
 * Bug: When updating a user to add a new role (e.g., admin), existing roles (e.g., manager)
 * were losing their organization_id because the update logic used userData.organizationId
 * for all role reassignments instead of preserving the original organization_id per role.
 */

import { AdminUserService } from '../../../../src/modules/admin/services/admin-user.service';
import { UserModel } from '../../../../src/modules/admin/models/user.model';
import { RoleModel } from '../../../../src/modules/admin/models/role.model';

// Mock the models
jest.mock('../../../../src/modules/admin/models/user.model');
jest.mock('../../../../src/modules/admin/models/role.model');

const MockUserModel = UserModel as jest.MockedClass<typeof UserModel>;
const MockRoleModel = RoleModel as jest.MockedClass<typeof RoleModel>;

describe('Role Update Preservation - Bug Fix', () => {
  let adminUserService: AdminUserService;
  let mockUserModel: jest.Mocked<UserModel>;
  let mockRoleModel: jest.Mocked<RoleModel>;

  // Test data
  const userId = 'user-123';
  const orgA = 'org-A';
  const orgB = 'org-B';
  const managerRoleId = 'role-manager-id';
  const adminRoleId = 'role-admin-id';
  const employeeRoleId = 'role-employee-id';

  beforeEach(() => {
    mockUserModel = new MockUserModel() as jest.Mocked<UserModel>;
    mockRoleModel = new MockRoleModel() as jest.Mocked<RoleModel>;
    
    adminUserService = new AdminUserService();
    (adminUserService as any).userModel = mockUserModel;
    (adminUserService as any).roleModel = mockRoleModel;
    
    jest.clearAllMocks();
  });

  describe('updateUser with roles - organization preservation', () => {
    /**
     * Scenario: User has manager role with org-A, add admin role
     * Expected: Manager role should retain org-A, not be reassigned with different org
     */
    it('should preserve original organization_id when adding a new role to existing roles', async () => {
      // Setup: User exists with manager role assigned to org-A
      const existingUser = {
        id: userId,
        email: 'manager@example.com',
        name: 'Manager User',
        isActive: true,
        emailVerified: true,
        organizationId: orgA,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      // Existing roles: manager with org-A (DB returns snake_case, cast to any for mock)
      const existingRoles = [
        {
          id: 'user-role-1',
          user_id: userId,
          role_id: managerRoleId,
          role_name: 'manager',
          organization_id: orgA,
          organization_name: 'Organization A',
          granted_at: '2025-01-01T00:00:00Z',
          is_active: true,
        },
      ] as any;

      // Mock responses
      mockUserModel.findById.mockResolvedValue(existingUser);
      mockUserModel.findWhere.mockResolvedValue({ data: [], pagination: {} });
      mockUserModel.getUserRoles.mockResolvedValue(existingRoles);
      mockUserModel.update.mockResolvedValue(existingUser);
      mockUserModel.removeRole.mockResolvedValue(true);
      mockUserModel.assignRole.mockResolvedValue({} as any);
      mockUserModel.findByIdWithRoles.mockResolvedValue({
        ...existingUser,
        roles: [
          { roleId: managerRoleId, roleName: 'manager', organizationId: orgA },
          { roleId: adminRoleId, roleName: 'admin', organizationId: orgB },
        ],
      } as any);
      mockUserModel.syncAdminOrganizations.mockResolvedValue({ added: 1, removed: 0 });

      // Mock role lookups
      mockRoleModel.findByName.mockImplementation(async (name: string) => {
        if (name === 'admin') return { id: adminRoleId, name: 'admin' } as any;
        if (name === 'manager') return { id: managerRoleId, name: 'manager' } as any;
        return null;
      });

      // Action: Update user - add admin role while keeping manager
      const updateData = {
        roles: ['manager', 'admin'], // Both roles should be present
        adminOrganizationIds: [orgB], // Admin role for org-B
      };

      await adminUserService.updateUser(userId, updateData);

      // Assertions:
      
      // 1. Manager role should be removed with its ORIGINAL org (org-A)
      expect(mockUserModel.removeRole).toHaveBeenCalledWith(
        userId,
        managerRoleId,
        orgA // Original organization should be used for removal
      );

      // 2. Manager role should be RE-ASSIGNED with its ORIGINAL org (org-A), NOT undefined or different org
      // This is the key assertion that verifies the bug fix
      expect(mockUserModel.assignRole).toHaveBeenCalledWith(
        userId,
        managerRoleId,
        orgA, // CRITICAL: Should preserve original org-A, not use undefined
        undefined // grantorContext?.id
      );

      // 3. Admin role is handled separately via syncAdminOrganizations
      expect(mockUserModel.syncAdminOrganizations).toHaveBeenCalledWith(
        userId,
        adminRoleId,
        [orgB],
        undefined
      );
    });

    /**
     * Scenario: User has multiple non-admin roles with different orgs
     * Expected: Each role should preserve its original organization_id
     */
    it('should preserve organization_id for each role independently', async () => {
      // User has employee role with org-A and manager role with org-B
      const existingRoles = [
        {
          id: 'user-role-1',
          user_id: userId,
          role_id: employeeRoleId,
          role_name: 'employee',
          organization_id: orgA,
          is_active: true,
        },
        {
          id: 'user-role-2',
          user_id: userId,
          role_id: managerRoleId,
          role_name: 'manager',
          organization_id: orgB,
          is_active: true,
        },
      ] as any;

      const existingUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        isActive: true,
        emailVerified: true,
        organizationId: orgA, // User's primary org is A, but manager role is for B
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      mockUserModel.findById.mockResolvedValue(existingUser);
      mockUserModel.findWhere.mockResolvedValue({ data: [], pagination: {} });
      mockUserModel.getUserRoles.mockResolvedValue(existingRoles);
      mockUserModel.update.mockResolvedValue(existingUser);
      mockUserModel.removeRole.mockResolvedValue(true);
      mockUserModel.assignRole.mockResolvedValue({} as any);
      mockUserModel.findByIdWithRoles.mockResolvedValue(existingUser);

      mockRoleModel.findByName.mockImplementation(async (name: string) => {
        if (name === 'employee') return { id: employeeRoleId, name: 'employee' } as any;
        if (name === 'manager') return { id: managerRoleId, name: 'manager' } as any;
        return null;
      });

      // Update: keep both roles
      const updateData = {
        roles: ['employee', 'manager'],
        organizationId: orgA, // Form sends user's org as A
      };

      await adminUserService.updateUser(userId, updateData);

      // Each role should be reassigned with its ORIGINAL organization
      expect(mockUserModel.assignRole).toHaveBeenCalledWith(
        userId,
        employeeRoleId,
        orgA, // Employee was with org-A
        undefined
      );

      expect(mockUserModel.assignRole).toHaveBeenCalledWith(
        userId,
        managerRoleId,
        orgB, // Manager was with org-B, should NOT become org-A
        undefined
      );
    });

    /**
     * Scenario: Add a NEW role that didn't exist before
     * Expected: New role should use userData.organizationId (user's current org)
     */
    it('should use userData.organizationId for newly added roles', async () => {
      // User only has employee role
      const existingRoles = [
        {
          id: 'user-role-1',
          user_id: userId,
          role_id: employeeRoleId,
          role_name: 'employee',
          organization_id: orgA,
          is_active: true,
        },
      ] as any;

      const existingUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        isActive: true,
        emailVerified: true,
        organizationId: orgA,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      mockUserModel.findById.mockResolvedValue(existingUser);
      mockUserModel.findWhere.mockResolvedValue({ data: [], pagination: {} });
      mockUserModel.getUserRoles.mockResolvedValue(existingRoles);
      mockUserModel.update.mockResolvedValue(existingUser);
      mockUserModel.removeRole.mockResolvedValue(true);
      mockUserModel.assignRole.mockResolvedValue({} as any);
      mockUserModel.findByIdWithRoles.mockResolvedValue(existingUser);

      mockRoleModel.findByName.mockImplementation(async (name: string) => {
        if (name === 'employee') return { id: employeeRoleId, name: 'employee' } as any;
        if (name === 'manager') return { id: managerRoleId, name: 'manager' } as any;
        return null;
      });

      // Update: add manager role (NEW)
      const updateData = {
        roles: ['employee', 'manager'], // Adding manager
        organizationId: orgA,
      };

      await adminUserService.updateUser(userId, updateData);

      // Employee role should preserve org-A
      expect(mockUserModel.assignRole).toHaveBeenCalledWith(
        userId,
        employeeRoleId,
        orgA,
        undefined
      );

      // NEW manager role should use userData.organizationId (org-A)
      expect(mockUserModel.assignRole).toHaveBeenCalledWith(
        userId,
        managerRoleId,
        orgA, // No original org, so use userData.organizationId
        undefined
      );
    });

    /**
     * Scenario: Update when userData.organizationId is undefined
     * Expected: Existing roles should STILL preserve their original organization_id
     */
    it('should preserve original org even when userData.organizationId is undefined', async () => {
      const existingRoles = [
        {
          id: 'user-role-1',
          user_id: userId,
          role_id: managerRoleId,
          role_name: 'manager',
          organization_id: orgA, // Has org-A
          is_active: true,
        },
      ] as any;

      const existingUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        isActive: true,
        emailVerified: true,
        organizationId: orgA,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      mockUserModel.findById.mockResolvedValue(existingUser);
      mockUserModel.findWhere.mockResolvedValue({ data: [], pagination: {} });
      mockUserModel.getUserRoles.mockResolvedValue(existingRoles);
      mockUserModel.update.mockResolvedValue(existingUser);
      mockUserModel.removeRole.mockResolvedValue(true);
      mockUserModel.assignRole.mockResolvedValue({} as any);
      mockUserModel.findByIdWithRoles.mockResolvedValue(existingUser);

      mockRoleModel.findByName.mockImplementation(async (name: string) => {
        if (name === 'manager') return { id: managerRoleId, name: 'manager' } as any;
        return null;
      });

      // Update with organizationId = undefined (e.g., form field was cleared)
      const updateData = {
        roles: ['manager'],
        organizationId: undefined, // This is the problematic case!
      };

      await adminUserService.updateUser(userId, updateData);

      // Manager role should STILL be assigned with org-A (preserved), NOT undefined
      expect(mockUserModel.assignRole).toHaveBeenCalledWith(
        userId,
        managerRoleId,
        orgA, // Should preserve original org-A, NOT become undefined
        undefined
      );
    });

    /**
     * Scenario: Role had NULL organization_id originally
     * Expected: Should preserve NULL (not override with user's org)
     */
    it('should preserve NULL organization_id for roles that had no org', async () => {
      const existingRoles = [
        {
          id: 'user-role-1',
          user_id: userId,
          role_id: employeeRoleId,
          role_name: 'employee',
          organization_id: null, // No org (global role)
          is_active: true,
        },
      ] as any;

      const existingUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Test User',
        isActive: true,
        emailVerified: true,
        organizationId: orgA, // User has org-A
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      mockUserModel.findById.mockResolvedValue(existingUser);
      mockUserModel.findWhere.mockResolvedValue({ data: [], pagination: {} });
      mockUserModel.getUserRoles.mockResolvedValue(existingRoles);
      mockUserModel.update.mockResolvedValue(existingUser);
      mockUserModel.removeRole.mockResolvedValue(true);
      mockUserModel.assignRole.mockResolvedValue({} as any);
      mockUserModel.findByIdWithRoles.mockResolvedValue(existingUser);

      mockRoleModel.findByName.mockImplementation(async (name: string) => {
        if (name === 'employee') return { id: employeeRoleId, name: 'employee' } as any;
        return null;
      });

      const updateData = {
        roles: ['employee'],
        organizationId: orgA,
      };

      await adminUserService.updateUser(userId, updateData);

      // Employee role should preserve NULL org (as undefined), NOT become org-A
      // Note: null and undefined both become NULL in PostgreSQL
      expect(mockUserModel.assignRole).toHaveBeenCalledWith(
        userId,
        employeeRoleId,
        undefined, // Should preserve NULL (passed as undefined due to function signature)
        undefined
      );
    });
  });
});

