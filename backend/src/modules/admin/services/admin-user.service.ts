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
  PaginationOptions
} from '../types/user.types.js';
import { 
  validateRoleAssignment, 
  validateAdminOrganizations,
  validateAdminRoleRequirements,
  GrantorContext
} from '../../../shared/utils/privilege-validator.js';

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
      throw new Error('You can only grant admin access for organizations you manage');
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

      // Get existing roles and build a map of role names to their organization IDs
      // This preserves the original organization scope for each role
      const existingRoles = await this.userModel.getUserRoles(id);
      const existingRoleOrgMap = new Map<string, string | null>();
      
      for (const role of existingRoles) {
        // Type system expects camelCase, but DB returns snake_case - handle both
        const roleName = (role as any).role_name || role.roleName;
        const organizationId = (role as any).organization_id ?? role.organizationId ?? null;
        
        // For non-admin roles, preserve the organization ID
        // (admin role is handled separately via adminOrganizationIds)
        if (roleName !== 'admin' && !existingRoleOrgMap.has(roleName)) {
          existingRoleOrgMap.set(roleName, organizationId);
        }
      }

      // Remove all existing roles (except admin if we're syncing it separately)
      for (const role of existingRoles) {
        // Type system expects camelCase, but DB returns snake_case - handle both
        const roleId = (role as any).role_id || role.roleId;
        const organizationId = (role as any).organization_id ?? role.organizationId ?? null;
        
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
          // Use the original organization ID if this role existed before,
          // otherwise use the user's current organization from the update request
          const orgIdForRole = existingRoleOrgMap.has(roleName) 
            ? existingRoleOrgMap.get(roleName) 
            : userData.organizationId;
          
          // Convert null to undefined for the function signature (both become NULL in DB)
          await this.userModel.assignRole(id, role.id, orgIdForRole ?? undefined, grantorContext?.id);
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

  async bulkUpdateUsers(
    operation: BulkUserOperation,
    grantorContext: GrantorContext
  ): Promise<{ success: number; errors: string[] }> {
    // SECURITY: Grantor context is REQUIRED for role operations
    if (!grantorContext && operation.operation === 'assign_role') {
      throw new Error('SECURITY: Grantor context is required for role assignment operations');
    }

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
            throw new Error('Please select a role to assign');
          }
          
          // ✅ SECURITY FIX: Get the role name and validate privilege escalation
          const roleToAssign = await this.roleModel.findById(operation.roleId);
          if (!roleToAssign) {
            throw new Error('Role not found');
          }
          
          // ✅ Validate role assignment
          validateRoleAssignment([roleToAssign.name], grantorContext);
          
          // If assigning admin role, validate organization access
          if (roleToAssign.name === 'admin' && operation.organizationId) {
            validateAdminOrganizations([operation.organizationId], grantorContext);
          }
          
          for (const userId of operation.userIds) {
            try {
              await this.userModel.assignRole(
                userId, 
                operation.roleId, 
                operation.organizationId,
                grantorContext.id
              );
              success++;
            } catch (error) {
              errors.push(`Failed to assign role to user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          break;
        
        case 'remove_role':
          // Role removal doesn't need privilege validation
          if (!operation.roleId) {
            throw new Error('Please select a role to remove');
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

  async importUsers(users: UserImportData[], grantorContext: GrantorContext): Promise<UserImportResult> {
    // SECURITY: Grantor context is REQUIRED
    if (!grantorContext) {
      throw new Error('SECURITY: Grantor context is required for user import operations');
    }

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

        // ✅ SECURITY FIX: Pre-validate roles before creating user
        if (userData.roles && userData.roles.length > 0) {
          validateRoleAssignment(userData.roles, grantorContext);
        }

        // ✅ Pass grantorContext to createUser
        const user = await this.createUser({
          email: userData.email,
          name: userData.name,
          department: userData.department,
          position: userData.position,
          organizationId: organizationId,
          roles: userData.roles,
          sendWelcomeEmail: false
        }, grantorContext);
        
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

  async assignUserRole(
    userId: string, 
    roleId: string, 
    organizationId?: string, 
    grantorContext?: GrantorContext
  ): Promise<UserRole> {
    // ✅ SECURITY: Grantor context is REQUIRED
    if (!grantorContext) {
      throw new Error('SECURITY: Grantor context is required for role assignment operations');
    }

    // Get the role being assigned
    const role = await this.roleModel.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // ✅ CRITICAL FIX: Validate privilege escalation
    validateRoleAssignment([role.name], grantorContext);

    // If assigning admin role, validate organization access
    if (role.name === 'admin' && organizationId) {
      validateAdminOrganizations([organizationId], grantorContext);
    }

    return this.userModel.assignRole(userId, roleId, organizationId, grantorContext.id);
  }

  async removeUserRole(userId: string, roleId: string, organizationId?: string): Promise<boolean> {
    return this.userModel.removeRole(userId, roleId, organizationId);
  }
}