// User Management Types
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
  organizationId?: string;
  department?: string;
  position?: string;
  roles?: UserRole[]; // Array of user role objects
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

export interface UserFilters {
  search?: string;
  organizationId?: string;
  roleId?: string;
  role?: string;
  status?: string; // active, inactive, or empty for all
  department?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserCreateData {
  email: string;
  name: string;
  avatarUrl?: string;
  organizationId?: string;
  department?: string;
  position?: string;
  roles?: string[];
  adminOrganizationIds?: string[]; // Multi-org admin support
}

export interface UserUpdateData {
  email?: string;
  name?: string;
  avatarUrl?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  organizationId?: string;
  department?: string;
  position?: string;
  roles?: string[];
  adminOrganizationIds?: string[]; // Multi-org admin support
}

/**
 * Organization that can be assigned for admin role
 */
export interface AssignableOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface BulkUserOperation {
  operation: 'activate' | 'deactivate' | 'delete' | 'assign_role' | 'remove_role';
  userIds: string[];
  roleId?: string; // Required for assign_role/remove_role
  organizationId?: string; // Optional for assign_role/remove_role
}

export interface UserImportData {
  email: string;
  name: string;
  avatarUrl?: string;
  organizationId?: string;
  organizationName?: string; // Added for CSV import using organization name
  department?: string;
  position?: string;
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

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  recentSignups: number;
  usersByRole: Array<{
    roleName: string;
    count: number;
  }>;
  usersByDepartment: Array<{
    department: string;
    count: number;
  }>;
  usersByOrganization: Array<{
    organizationName: string;
    count: number;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: string;
}

export interface UserListResponse extends ApiResponse<PaginatedResponse<User>> {}
export interface UserResponse extends ApiResponse<User> {}
export interface UserStatsResponse extends ApiResponse<UserStats> {}
export interface RoleListResponse extends ApiResponse<Role[]> {}
export interface UserImportResponse extends ApiResponse<UserImportResult> {}

