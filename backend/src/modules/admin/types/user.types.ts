// backend/src/modules/admin/types/user.types.ts

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  roles?: UserRole[];
  organizationId?: string;
  organizationName?: string;
  department?: string;
  position?: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  organizationId?: string;
  organizationName?: string;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserData {
  email: string;
  name: string;
  avatarUrl?: string;
  organizationId?: string;
  department?: string;
  position?: string;
  roles?: string[]; // Role names
  adminOrganizationIds?: string[]; // Organization IDs for admin role (multi-org admin support)
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  avatarUrl?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  organizationId?: string;
  department?: string;
  position?: string;
  roles?: string[]; // Role names
  adminOrganizationIds?: string[]; // Organization IDs for admin role (multi-org admin support)
}

export interface UserFilters {
  search?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  organizationId?: string;
  roleId?: string;
  department?: string;
  position?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  usersByRole: Record<string, number>;
  usersByOrganization: Record<string, number>;
  usersByDepartment: Record<string, number>;
  recentSignups: number; // Last 30 days
  averageUsersPerOrganization: number;
}

export interface BulkUserOperation {
  operation: 'activate' | 'deactivate' | 'delete' | 'assign_role' | 'remove_role' | 'export';
  userIds: string[];
  roleId?: string; // For role operations
  organizationId?: string; // For role operations
}

export interface UserImportData {
  email: string;
  name: string;
  department?: string;
  position?: string;
  organizationId?: string;
  organizationName?: string; // Added for CSV import using organization name
  organizationSlug?: string; // Added for CSV import to uniquely identify organization
  roles?: string[];
}

export interface UserImportResult {
  success: UserImportData[];
  errors: Array<{
    data: UserImportData;
    error: string;
  }>;
  totalProcessed: number;
  totalSuccess: number;
  totalErrors: number;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
