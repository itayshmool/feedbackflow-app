import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { userService } from '@/services/user.service';
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
} from '@/types/user.types';

interface UserState {
  // Data
  users: User[];
  userStats: UserStats | null;
  roles: Role[];
  selectedUsers: string[];
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isImporting: boolean;
  isExporting: boolean;
  
  // Error states
  error: string | null;
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;
  importError: string | null;
  exportError: string | null;
  
  // Pagination
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  
  // Filters
  filters: UserFilters;
  
  // Actions
  fetchUsers: (filters?: UserFilters, options?: PaginationOptions) => Promise<void>;
  fetchUserById: (id: string) => Promise<User | null>;
  createUser: (userData: UserCreateData) => Promise<User | null>;
  updateUser: (id: string, userData: UserUpdateData) => Promise<User | null>;
  deleteUser: (id: string) => Promise<boolean>;
  fetchUserStats: () => Promise<void>;
  fetchRoles: () => Promise<void>;
  bulkUserOperation: (operation: BulkUserOperation) => Promise<{ success: number; errors: string[] }>;
  importUsers: (users: UserImportData[]) => Promise<UserImportResult | null>;
  exportUsers: (filters?: UserFilters) => Promise<Blob | null>;
  checkEmailAvailability: (email: string) => Promise<boolean>;
  resetUserPassword: (id: string) => Promise<boolean>;
  sendEmailVerification: (id: string) => Promise<boolean>;
  
  // Bulk Import/Export Results
  bulkImportResult: UserImportResult | null;
  bulkExportResult: any | null;
  bulkLoading: boolean;
  bulkError: string | null;
  
  // Bulk Operations Actions
  bulkImportUsers: (data: any) => Promise<UserImportResult>;
  bulkExportUsers: (data: any) => Promise<any>;
  downloadUserExport: (data: any, filename?: string) => Promise<void>;
  uploadUserImport: (file: File, options?: { dryRun?: boolean; skipValidation?: boolean }) => Promise<UserImportResult>;
  downloadUserTemplate: (type?: string) => Promise<void>;
  clearBulkResults: () => void;
  
  // UI Actions
  setSelectedUsers: (userIds: string[]) => void;
  toggleUserSelection: (userId: string) => void;
  clearSelectedUsers: () => void;
  setFilters: (filters: UserFilters) => void;
  clearFilters: () => void;
  setPagination: (pagination: Partial<UserState['pagination']>) => void;
  clearErrors: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      users: [],
      userStats: null,
      roles: [],
      selectedUsers: [],
      
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isImporting: false,
      isExporting: false,
      
      error: null,
      createError: null,
      updateError: null,
      deleteError: null,
      importError: null,
      exportError: null,
      
      // Bulk Operations State
      bulkImportResult: null,
      bulkExportResult: null,
      bulkLoading: false,
      bulkError: null,
      
      pagination: {
        total: 0,
        limit: 10,
        offset: 0,
        hasMore: false,
      },
      
      filters: {},
      
      // Actions
      fetchUsers: async (filters = {}, options = {}) => {
        set({ isLoading: true, error: null });
        try {
          const currentFilters = { ...get().filters, ...filters };
          const currentOptions = { ...options };
          
          const response = await userService.getUsers(currentFilters, currentOptions);
          
          if (response.success) {
            set({
              users: response.data || [],
              pagination: response.pagination || { total: 0, limit: 10, offset: 0, hasMore: false },
              filters: currentFilters,
              isLoading: false,
            });
          } else {
            set({ error: response.error || 'Failed to fetch users', isLoading: false });
          }
        } catch (error) {
          set({ 
            users: [], // Ensure users is always an array
            error: error instanceof Error ? error.message : 'Failed to fetch users',
            isLoading: false 
          });
        }
      },
      
      fetchUserById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await userService.getUserById(id);
          
          if (response.success) {
            set({ isLoading: false });
            return response.data;
          } else {
            set({ error: response.error || 'Failed to fetch user', isLoading: false });
            return null;
          }
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch user',
            isLoading: false 
          });
          return null;
        }
      },
      
      createUser: async (userData: UserCreateData) => {
        set({ isCreating: true, createError: null });
        try {
          const response = await userService.createUser(userData);
          
          if (response.success) {
            const currentUsers = get().users;
            set({ 
              users: Array.isArray(currentUsers) ? [response.data, ...currentUsers] : [response.data],
              isCreating: false 
            });
            return response.data;
          } else {
            set({ createError: response.error || 'Failed to create user', isCreating: false });
            return null;
          }
        } catch (error) {
          set({ 
            createError: error instanceof Error ? error.message : 'Failed to create user',
            isCreating: false 
          });
          return null;
        }
      },
      
      updateUser: async (id: string, userData: UserUpdateData) => {
        set({ isUpdating: true, updateError: null });
        try {
          const response = await userService.updateUser(id, userData);
          
          if (response.success) {
            set({
              users: get().users.map(user => 
                user.id === id ? response.data : user
              ),
              isUpdating: false
            });
            return response.data;
          } else {
            set({ updateError: response.error || 'Failed to update user', isUpdating: false });
            return null;
          }
        } catch (error) {
          set({ 
            updateError: error instanceof Error ? error.message : 'Failed to update user',
            isUpdating: false 
          });
          return null;
        }
      },
      
      deleteUser: async (id: string) => {
        set({ isDeleting: true, deleteError: null });
        try {
          const response = await userService.deleteUser(id);
          
          if (response.success) {
            set({
              users: get().users.filter(user => user.id !== id),
              selectedUsers: get().selectedUsers.filter(userId => userId !== id),
              isDeleting: false
            });
            return true;
          } else {
            set({ deleteError: 'Failed to delete user', isDeleting: false });
            return false;
          }
        } catch (error) {
          set({ 
            deleteError: error instanceof Error ? error.message : 'Failed to delete user',
            isDeleting: false 
          });
          return false;
        }
      },
      
      fetchUserStats: async () => {
        try {
          const response = await userService.getUserStats();
          
          if (response.success) {
            set({ userStats: response.data });
          }
        } catch (error) {
          console.error('Failed to fetch user stats:', error);
        }
      },
      
      fetchRoles: async () => {
        try {
          const response = await userService.getRoles();
          
          if (response.success) {
            set({ roles: response.data });
          }
        } catch (error) {
          console.error('Failed to fetch roles:', error);
        }
      },
      
      bulkUserOperation: async (operation: BulkUserOperation) => {
        set({ isLoading: true, error: null });
        try {
          const result = await userService.bulkUserOperation(operation);
          
          // Refresh users list after bulk operation
          await get().fetchUsers();
          
          set({ isLoading: false });
          return result;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Bulk operation failed',
            isLoading: false 
          });
          return { success: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
        }
      },
      
      importUsers: async (users: UserImportData[]) => {
        set({ isImporting: true, importError: null });
        try {
          const response = await userService.importUsers(users);
          
          if (response.success) {
            // Refresh users list after import
            await get().fetchUsers();
            
            set({ isImporting: false });
            return response.data;
          } else {
            set({ importError: response.error || 'Failed to import users', isImporting: false });
            return null;
          }
        } catch (error) {
          set({ 
            importError: error instanceof Error ? error.message : 'Failed to import users',
            isImporting: false 
          });
          return null;
        }
      },
      
      exportUsers: async (filters = {}) => {
        set({ isExporting: true, exportError: null });
        try {
          const currentFilters = { ...get().filters, ...filters };
          const blob = await userService.exportUsers(currentFilters);
          
          set({ isExporting: false });
          return blob;
        } catch (error) {
          set({ 
            exportError: error instanceof Error ? error.message : 'Failed to export users',
            isExporting: false 
          });
          return null;
        }
      },
      
      checkEmailAvailability: async (email: string) => {
        try {
          const response = await userService.checkEmailAvailability(email);
          return response.available;
        } catch (error) {
          console.error('Failed to check email availability:', error);
          return false;
        }
      },
      
      resetUserPassword: async (id: string) => {
        try {
          const response = await userService.resetUserPassword(id);
          return response.success;
        } catch (error) {
          console.error('Failed to reset user password:', error);
          return false;
        }
      },
      
      sendEmailVerification: async (id: string) => {
        try {
          const response = await userService.sendEmailVerification(id);
          return response.success;
        } catch (error) {
          console.error('Failed to send email verification:', error);
          return false;
        }
      },
      
      // Bulk Operations Actions
      bulkImportUsers: async (data) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          const result = await userService.bulkImportUsers(data);
          set({
            bulkImportResult: result,
            bulkLoading: false,
          });
          return result;
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to import users',
            bulkLoading: false,
          });
          throw error;
        }
      },

      bulkExportUsers: async (data) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          const result = await userService.bulkExportUsers(data);
          set({
            bulkExportResult: result,
            bulkLoading: false,
          });
          return result;
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to export users',
            bulkLoading: false,
          });
          throw error;
        }
      },

      downloadUserExport: async (data, filename) => {
        try {
          await userService.downloadUserExport(data, filename);
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to download export',
          });
          throw error;
        }
      },

      uploadUserImport: async (file, options) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          const result = await userService.uploadUserImport(file, options);
          set({
            bulkImportResult: result,
            bulkLoading: false,
          });
          return result;
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to upload import',
            bulkLoading: false,
          });
          throw error;
        }
      },

      downloadUserTemplate: async (type) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          await userService.downloadUserTemplate(type);
          set({ bulkLoading: false });
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to download template',
            bulkLoading: false,
          });
          throw error;
        }
      },

      clearBulkResults: () => {
        set({
          bulkImportResult: null,
          bulkExportResult: null,
        });
      },
      
      // UI Actions
      setSelectedUsers: (userIds: string[]) => {
        set({ selectedUsers: userIds });
      },
      
      toggleUserSelection: (userId: string) => {
        const { selectedUsers } = get();
        const newSelection = selectedUsers.includes(userId)
          ? selectedUsers.filter(id => id !== userId)
          : [...selectedUsers, userId];
        set({ selectedUsers: newSelection });
      },
      
      clearSelectedUsers: () => {
        set({ selectedUsers: [] });
      },
      
      setFilters: (filters: UserFilters) => {
        // Ensure only serializable data is stored
        const serializableFilters = {
          search: filters.search,
          organizationId: filters.organizationId,
          roleId: filters.roleId,
          department: filters.department,
          isActive: filters.isActive,
          emailVerified: filters.emailVerified,
          lastLoginAfter: filters.lastLoginAfter,
          lastLoginBefore: filters.lastLoginBefore,
          createdAfter: filters.createdAfter,
          createdBefore: filters.createdBefore,
        };
        set({ filters: serializableFilters });
      },
      
      clearFilters: () => {
        set({ filters: {} });
      },
      
      setPagination: (pagination: Partial<UserState['pagination']>) => {
        set({ pagination: { ...get().pagination, ...pagination } });
      },
      
      clearErrors: () => {
        set({
          error: null,
          createError: null,
          updateError: null,
          deleteError: null,
          importError: null,
          exportError: null,
        });
      },
    }),
    {
      name: 'user-store',
      partialize: (state) => ({
        filters: {
          search: typeof state.filters.search === 'string' ? state.filters.search : undefined,
          organizationId: typeof state.filters.organizationId === 'string' ? state.filters.organizationId : undefined,
          roleId: typeof state.filters.roleId === 'string' ? state.filters.roleId : undefined,
          department: typeof state.filters.department === 'string' ? state.filters.department : undefined,
          isActive: typeof state.filters.isActive === 'boolean' ? state.filters.isActive : undefined,
          emailVerified: typeof state.filters.emailVerified === 'boolean' ? state.filters.emailVerified : undefined,
          lastLoginAfter: typeof state.filters.lastLoginAfter === 'string' ? state.filters.lastLoginAfter : undefined,
          lastLoginBefore: typeof state.filters.lastLoginBefore === 'string' ? state.filters.lastLoginBefore : undefined,
          createdAfter: typeof state.filters.createdAfter === 'string' ? state.filters.createdAfter : undefined,
          createdBefore: typeof state.filters.createdBefore === 'string' ? state.filters.createdBefore : undefined,
        },
        pagination: state.pagination,
      }),
    }
  )
);

