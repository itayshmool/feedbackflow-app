import { api } from '@/lib/api';
import {
  User,
  UserCreateData,
  UserUpdateData,
  UserFilters,
  PaginationOptions,
  UserStats,
  Role,
  BulkUserOperation,
  UserImportData,
  UserImportResult,
  UserListResponse,
  UserResponse,
  UserStatsResponse,
  RoleListResponse,
  UserImportResponse,
} from '@/types/user.types';

export class UserService {
  // Get users with filters and pagination
  async getUsers(
    filters: UserFilters = {},
    options: PaginationOptions = {}
  ): Promise<UserListResponse> {
    const params = new URLSearchParams();

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    // Add pagination options - convert offset to page
    const { limit, offset, sortBy, sortOrder } = options;
    
    if (limit !== undefined) {
      params.append('limit', limit.toString());
    }
    
    if (offset !== undefined && limit !== undefined) {
      // Convert offset to page number (page is 1-based)
      const page = Math.floor(offset / limit) + 1;
      params.append('page', page.toString());
    }
    
    if (sortBy) {
      params.append('sortBy', sortBy);
    }
    
    if (sortOrder) {
      params.append('sortOrder', sortOrder);
    }
    
    // Add cache-busting parameter to prevent 304 responses
    params.append('_t', Date.now().toString());
    
    const response = await api.get(`/admin/users?${params.toString()}`);
    return response.data;
  }

  // Get user by ID
  async getUserById(id: string): Promise<UserResponse> {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  }

  // Create new user
  async createUser(userData: UserCreateData): Promise<UserResponse> {
    const response = await api.post('/admin/users', userData);
    return response.data;
  }

  // Update user
  async updateUser(id: string, userData: UserUpdateData): Promise<UserResponse> {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  }

  // Delete user
  async deleteUser(id: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  }

  // Get user statistics
  async getUserStats(): Promise<UserStatsResponse> {
    const response = await api.get(`/admin/users/stats?_t=${Date.now()}`);
    return response.data;
  }

  // Get all roles
  async getRoles(): Promise<RoleListResponse> {
    const response = await api.get('/admin/roles');
    return response.data;
  }

  // Get system roles
  async getSystemRoles(): Promise<RoleListResponse> {
    const response = await api.get('/admin/roles/system');
    return response.data;
  }

  // Create new role
  async createRole(name: string, description?: string, permissions: string[] = []): Promise<{ success: boolean; data: Role }> {
    const response = await api.post('/admin/roles', {
      name,
      description,
      permissions,
    });
    return response.data;
  }

  // Update role
  async updateRole(id: string, updates: Partial<Role>): Promise<{ success: boolean; data: Role }> {
    const response = await api.put(`/admin/roles/${id}`, updates);
    return response.data;
  }

  // Delete role
  async deleteRole(id: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/admin/roles/${id}`);
    return response.data;
  }

  // Bulk user operations
  async bulkUserOperation(operation: BulkUserOperation): Promise<{ success: number; errors: string[] }> {
    const response = await api.post('/admin/users/bulk', operation);
    return response.data;
  }

  // Import users
  async importUsers(users: UserImportData[]): Promise<UserImportResponse> {
    const response = await api.post('/admin/users/import', { users });
    return response.data;
  }

  // Export users
  async exportUsers(filters: UserFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    
    const response = await api.get(`/admin/users/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Check email availability
  async checkEmailAvailability(email: string): Promise<{ available: boolean }> {
    const response = await api.get(`/admin/users/check-email?email=${encodeURIComponent(email)}`);
    return response.data;
  }

  // Reset user password
  async resetUserPassword(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/admin/users/${id}/reset-password`);
    return response.data;
  }

  // Send email verification
  async sendEmailVerification(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/admin/users/${id}/send-verification`);
    return response.data;
  }

  // Bulk Operations
  async bulkImportUsers(data: any): Promise<UserImportResult> {
    const response = await api.post('/admin/bulk/import/users', data);
    return response.data;
  }

  async bulkExportUsers(data: any): Promise<any> {
    const response = await api.post('/admin/bulk/export/users', data);
    return response.data;
  }

  async downloadUserExport(data: any, filename?: string): Promise<void> {
    const response = await api.post('/admin/bulk/export/users', data, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async uploadUserImport(file: File, options?: { dryRun?: boolean; skipValidation?: boolean }): Promise<UserImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'users');
    if (options?.dryRun !== undefined) {
      formData.append('dryRun', String(options.dryRun));
    }
    if (options?.skipValidation !== undefined) {
      formData.append('skipValidation', String(options.skipValidation));
    }
    
    const response = await api.post('/admin/bulk/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async downloadUserTemplate(type: string = 'users'): Promise<void> {
    const response = await api.get(`/admin/bulk/template/${type}`, {
      responseType: 'blob',
    });
    
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'users-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const userService = new UserService();

