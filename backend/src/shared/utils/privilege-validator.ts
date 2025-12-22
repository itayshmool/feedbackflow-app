/**
 * Centralized privilege validation to prevent privilege escalation
 * 
 * SECURITY RULE: Users cannot assign roles equal to or higher than their own privilege level.
 * 
 * Role Hierarchy (lowest to highest):
 * employee < manager < admin < super_admin
 */

export interface GrantorContext {
  id: string;
  isSuperAdmin: boolean;
  adminOrganizationIds: string[];
  roles: string[];
}

export enum RoleLevel {
  EMPLOYEE = 1,
  MANAGER = 2,
  ADMIN = 3,
  SUPER_ADMIN = 4
}

const ROLE_HIERARCHY: Record<string, RoleLevel> = {
  'employee': RoleLevel.EMPLOYEE,
  'manager': RoleLevel.MANAGER,
  'admin': RoleLevel.ADMIN,
  'super_admin': RoleLevel.SUPER_ADMIN,
};

/**
 * Gets the highest role level for a user
 */
function getHighestRoleLevel(roles: string[]): RoleLevel {
  if (!roles || roles.length === 0) {
    return RoleLevel.EMPLOYEE;
  }
  return Math.max(...roles.map(role => ROLE_HIERARCHY[role] || RoleLevel.EMPLOYEE));
}

/**
 * Validates that the grantor can assign the requested roles
 * Throws an error if privilege escalation is detected
 */
export function validateRoleAssignment(
  requestedRoles: string[],
  grantorContext: GrantorContext
): void {
  if (!grantorContext) {
    throw new Error('SECURITY: Grantor context is required for role assignment operations');
  }

  // Get grantor's highest privilege level
  const grantorLevel = getHighestRoleLevel(grantorContext.roles);
  
  // Check each requested role
  for (const requestedRole of requestedRoles) {
    const requestedLevel = ROLE_HIERARCHY[requestedRole];
    
    if (!requestedLevel) {
      // Unknown role - let it pass (might be custom role)
      continue;
    }
    
    // CRITICAL: Cannot assign roles equal to or higher than your own level
    if (requestedLevel >= grantorLevel) {
      throw new Error(
        `Privilege escalation denied: You cannot assign the '${requestedRole}' role. ` +
        `Your highest role: ${RoleLevel[grantorLevel]} (level ${grantorLevel}), ` +
        `Requested role: ${RoleLevel[requestedLevel]} (level ${requestedLevel})`
      );
    }
  }
}

/**
 * Validates admin organization assignments (for admin role specifically)
 * Throws an error if trying to assign admin to orgs not managed by grantor
 */
export function validateAdminOrganizations(
  requestedOrgIds: string[],
  grantorContext: GrantorContext
): void {
  if (!grantorContext) {
    throw new Error('SECURITY: Grantor context is required for admin organization assignments');
  }

  // Super admin can assign any organization
  if (grantorContext.isSuperAdmin) {
    return;
  }

  // Check if all requested orgs are in the grantor's managed orgs
  const unauthorizedOrgs = requestedOrgIds.filter(
    orgId => !grantorContext.adminOrganizationIds.includes(orgId)
  );

  if (unauthorizedOrgs.length > 0) {
    throw new Error(
      `Privilege escalation denied: You can only grant admin access to organizations you manage. ` +
      `Unauthorized organization IDs: ${unauthorizedOrgs.join(', ')}`
    );
  }
}

/**
 * Validates that admin role has at least one organization
 */
export function validateAdminRoleRequirements(
  roles: string[],
  organizationIds: string[] | undefined
): void {
  if (roles.includes('admin')) {
    if (!organizationIds || organizationIds.length === 0) {
      throw new Error('Admin role requires at least one organization assignment');
    }
  }
}

