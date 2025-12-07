// backend/src/modules/admin/services/admin-user.service.ts

import { UserModel } from '../models/user.model.js';
import { RoleModel } from '../models/role.model.js';
import {
  User,
  UserRole,
  Role,
  CreateUserData,
  UpdateUserData,
  UserFilters,
  UserStats,
  BulkUserOperation,
  UserImportData,
  UserImportResult,
  PaginationOptions,
  GrantorContext
} from '../types/user.types.js';

export class AdminUserService {
  private userModel: UserModel;
  private roleModel: RoleModel;

  constructor() {
    this.userModel = new UserModel();
    this.roleModel = new RoleModel();
  }

  async getUsers(filters: UserFilters = {}, options: PaginationOptions = {}): Promise<{ data: User[]; pagination: any }> {
    return this.userModel.findWithRoles(filters, options);
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userModel.findByIdWithRoles(id);
  }

  async createUser(userData: CreateUserData, grantorContext?: GrantorContext): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findWhere({ email: userData.email });
    if (existingUser.data.length > 0) {
      throw new Error('User with this email already exists');
    }

    // PRIVILEGE ESCALATION CHECK: Validate admin org assignments
    if (userData.adminOrganizationIds && userData.adminOrganizationIds.length > 0 && grantorContext) {
      this.validatePrivilegeEscalation(userData.adminOrganizationIds, grantorContext);
    }

    // Create user
    const user = await this.userModel.create({
      email: userData.email,
      name: userData.name,
      avatarUrl: userData.avatarUrl,
      organizationId: userData.organizationId,
      department: userData.department,
      position: userData.position,
      isActive: true,
      emailVerified: false
    });

    // Get admin role ID for special handling
    const adminRole = await this.roleModel.findByName('admin');
    const adminRoleId = adminRole?.id;

    // Assign roles if provided
    if (userData.roles && userData.roles.length > 0) {
      for (const roleName of userData.roles) {
        // Skip admin role here if we're handling it via adminOrganizationIds
        if (roleName === 'admin' && userData.adminOrganizationIds !== undefined && adminRoleId) {
          continue;
        }
        
        const role = await this.roleModel.findByName(roleName);
        if (role) {
          await this.userModel.assignRole(user.id, role.id, userData.organizationId, grantorContext?.id);
        } else {
          console.warn(`Role '${roleName}' not found for user ${user.id}`);
        }
      }

      // Handle admin role with multi-org support
      if (userData.adminOrganizationIds !== undefined && adminRoleId) {
        const orgIds = userData.adminOrganizationIds;
        
        if (userData.roles.includes('admin')) {
          // Validate: admin role requires at least one organization
          if (orgIds.length === 0) {
            throw new Error('Admin role requires at least one organization');
          }
          
          // Sync admin role across specified organizations
          await this.userModel.syncAdminOrganizations(user.id, adminRoleId, orgIds, grantorContext?.id);
          console.log(`🔐 Multi-org admin created: userId=${user.id}, orgs=${orgIds.length}`);
        }
      }
    }

    // TODO: Send welcome email if requested
    if (userData.sendWelcomeEmail) {
      // Implement email sending logic here
      console.log(`Welcome email would be sent to ${user.email}`);
    }

    return this.getUserById(user.id) as Promise<User>;
  }

  /**
   * Validates that the grantor has permission to assign admin access to the specified organizations.
   * Throws an error if privilege escalation is detected.
   */
  private validatePrivilegeEscalation(requestedOrgIds: string[], grantorContext: GrantorContext): void {
    // Super admin can assign any organization
    if (grantorContext.isSuperAdmin) {
      return;
    }

    // Check if all requested orgs are in the grantor's managed orgs
    const unauthorizedOrgs = requestedOrgIds.filter(
      orgId => !grantorContext.adminOrganizationIds.includes(orgId)
    );

    if (unauthorizedOrgs.length > 0) {
      console.warn(`🚫 Privilege escalation attempt: user tried to assign admin to orgs they don't manage: ${unauthorizedOrgs.join(', ')}`);
      throw new Error(`Privilege escalation denied: You cannot grant admin access to organizations you do not manage`);
    }
  }

  async updateUser(id: string, userData: UpdateUserData, grantorContext?: GrantorContext): Promise<User | null> {
    // Check if user exists
    const existingUser = await this.userModel.findById(id);
    if (!existingUser) {
      return null;
    }

    // Check if email is being changed and if it's already taken
    if (userData.email && userData.email !== existingUser.email) {
      const emailCheck = await this.userModel.findWhere({ email: userData.email });
      if (emailCheck.data.length > 0) {
        throw new Error('User with this email already exists');
      }
    }

    // PRIVILEGE ESCALATION CHECK: Validate admin org assignments
    if (userData.adminOrganizationIds && userData.adminOrganizationIds.length > 0 && grantorContext) {
      this.validatePrivilegeEscalation(userData.adminOrganizationIds, grantorContext);
    }

    // Update user
    const updateData: any = {};
    if (userData.email) updateData.email = userData.email;
    if (userData.name) updateData.name = userData.name;
    if (userData.avatarUrl !== undefined) updateData.avatarUrl = userData.avatarUrl;
    if (userData.isActive !== undefined) updateData.isActive = userData.isActive;
    if (userData.emailVerified !== undefined) updateData.emailVerified = userData.emailVerified;
    if (userData.organizationId !== undefined) updateData.organizationId = userData.organizationId;
    if (userData.department !== undefined) updateData.department = userData.department;
    if (userData.position !== undefined) updateData.position = userData.position;

    if (Object.keys(updateData).length > 0) {
      await this.userModel.update(id, updateData);
    }

    // Update roles if provided
    if (userData.roles !== undefined) {
      // Get admin role ID for special handling
      const adminRole = await this.roleModel.findByName('admin');
      const adminRoleId = adminRole?.id;

      // Remove all existing roles (except admin if we're syncing it separately)
      const existingRoles = await this.userModel.getUserRoles(id);
      for (const role of existingRoles) {
        // Type system expects camelCase, but DB returns snake_case - handle both
        const roleId = (role as any).role_id || role.roleId;
        const organizationId = (role as any).organization_id || role.organizationId;
        
        // Skip admin role removal if we're handling it via adminOrganizationIds
        if (roleId === adminRoleId && userData.adminOrganizationIds !== undefined) {
          continue;
        }
        
        await this.userModel.removeRole(id, roleId, organizationId);
      }

      // Assign new roles (except admin if we're handling it via adminOrganizationIds)
      for (const roleName of userData.roles) {
        // Skip admin role here if we're handling it via adminOrganizationIds
        if (roleName === 'admin' && userData.adminOrganizationIds !== undefined && adminRoleId) {
          continue;
        }
        
        const role = await this.roleModel.findByName(roleName);
        if (role) {
          await this.userModel.assignRole(id, role.id, userData.organizationId, grantorContext?.id);
        } else {
          console.warn(`Role '${roleName}' not found for user ${id}`);
        }
      }

      // Handle admin role with multi-org support
      if (userData.adminOrganizationIds !== undefined && adminRoleId) {
        const orgIds = userData.adminOrganizationIds;
        
        if (userData.roles.includes('admin')) {
          // Validate: admin role requires at least one organization
          if (orgIds.length === 0) {
            throw new Error('Admin role requires at least one organization');
          }
          
          // Sync admin role across specified organizations
          await this.userModel.syncAdminOrganizations(id, adminRoleId, orgIds, grantorContext?.id);
          console.log(`🔐 Multi-org admin sync: userId=${id}, orgs=${orgIds.length}`);
        } else {
          // Admin role is being removed - deactivate all admin org assignments
          await this.userModel.syncAdminOrganizations(id, adminRoleId, [], grantorContext?.id);
          console.log(`🔐 Admin role removed: userId=${id}`);
        }
      }
    }

    return this.getUserById(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.userModel.delete(id);
  }

  async getUserStats(): Promise<UserStats> {
    const [
      basicStats,
      usersByRole,
      usersByOrganization,
      usersByDepartment
    ] = await Promise.all([
      this.userModel.getUserStats(),
      this.userModel.getUsersByRole(),
      this.userModel.getUsersByOrganization(),
      this.userModel.getUsersByDepartment()
    ]);

    return {
      totalUsers: parseInt(basicStats.total_users),
      activeUsers: parseInt(basicStats.active_users),
      inactiveUsers: parseInt(basicStats.inactive_users),
      verifiedUsers: parseInt(basicStats.verified_users),
      unverifiedUsers: parseInt(basicStats.unverified_users),
      usersByRole,
      usersByOrganization,
      usersByDepartment,
      recentSignups: parseInt(basicStats.recent_signups),
      averageUsersPerOrganization: 0 // TODO: Calculate this
    };
  }

  async bulkUpdateUsers(operation: BulkUserOperation): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    try {
      switch (operation.operation) {
        case 'activate':
          success = await this.userModel.bulkUpdateUsers(operation.userIds, { isActive: true });
          break;
        
        case 'deactivate':
          success = await this.userModel.bulkUpdateUsers(operation.userIds, { isActive: false });
          break;
        
        case 'delete':
          success = await this.userModel.deleteUsers(operation.userIds);
          break;
        
        case 'assign_role':
          if (!operation.roleId) {
            throw new Error('Role ID is required for assign_role operation');
          }
          for (const userId of operation.userIds) {
            try {
              await this.userModel.assignRole(userId, operation.roleId, operation.organizationId);
              success++;
            } catch (error) {
              errors.push(`Failed to assign role to user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          break;
        
        case 'remove_role':
          if (!operation.roleId) {
            throw new Error('Role ID is required for remove_role operation');
          }
          for (const userId of operation.userIds) {
            try {
              await this.userModel.removeRole(userId, operation.roleId, operation.organizationId);
              success++;
            } catch (error) {
              errors.push(`Failed to remove role from user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          break;
        
        default:
          throw new Error(`Unsupported bulk operation: ${operation.operation}`);
      }
    } catch (error) {
      errors.push(`Bulk operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { success, errors };
  }

  async importUsers(users: UserImportData[]): Promise<UserImportResult> {
    const result: UserImportResult = {
      success: [],
      errors: [],
      totalProcessed: users.length,
      totalSuccess: 0,
      totalErrors: 0
    };

    for (const userData of users) {
      try {
        let organizationId = userData.organizationId;
        
        // If organizationName and organizationSlug are provided, use both for unique lookup
        if (userData.organizationName && userData.organizationSlug && !organizationId) {
          const organization = await this.userModel.findOrganizationByNameAndSlug(
            userData.organizationName,
            userData.organizationSlug
          );
          if (!organization) {
            throw new Error(`Organization "${userData.organizationName}" with slug "${userData.organizationSlug}" not found`);
          }
          organizationId = organization.id;
        }
        // Fallback: If only organizationName is provided (backward compatibility)
        else if (userData.organizationName && !organizationId) {
          const organization = await this.userModel.findOrganizationByName(userData.organizationName);
          if (!organization) {
            throw new Error(`Organization "${userData.organizationName}" not found`);
          }
          organizationId = organization.id;
        }

        const user = await this.createUser({
          email: userData.email,
          name: userData.name,
          department: userData.department,
          position: userData.position,
          organizationId: organizationId,
          roles: userData.roles,
          sendWelcomeEmail: false
        });
        
        result.success.push(userData);
        result.totalSuccess++;
      } catch (error) {
        result.errors.push({
          data: userData,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.totalErrors++;
      }
    }

    return result;
  }

  async exportUsers(filters: UserFilters = {}): Promise<User[]> {
    const result = await this.userModel.findWithRoles(filters, { limit: 10000, offset: 0 });
    return result.data;
  }

  // Role management methods
  async getRoles(): Promise<Role[]> {
    const [systemRoles, customRoles] = await Promise.all([
      this.roleModel.findSystemRoles(),
      this.roleModel.findCustomRoles()
    ]);
    
    return [...systemRoles, ...customRoles];
  }

  async getRoleById(id: string): Promise<Role | null> {
    return this.roleModel.findById(id);
  }

  async createRole(name: string, description: string, permissions: string[]): Promise<Role> {
    return this.roleModel.createRole(name, description, permissions);
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role | null> {
    return this.roleModel.updateRole(id, updates);
  }

  async deleteRole(id: string): Promise<boolean> {
    return this.roleModel.deleteRole(id);
  }

  async getUserRoles(userId: string): Promise<UserRole[]> {
    return this.userModel.getUserRoles(userId);
  }

  async assignUserRole(userId: string, roleId: string, organizationId?: string, grantedBy?: string): Promise<UserRole> {
    return this.userModel.assignRole(userId, roleId, organizationId, grantedBy);
  }

  async removeUserRole(userId: string, roleId: string, organizationId?: string): Promise<boolean> {
    return this.userModel.removeRole(userId, roleId, organizationId);
  }
}