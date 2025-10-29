// frontend/src/stores/hierarchyStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as hierarchyService from '../services/hierarchy.service';
import { OrganizationalHierarchy, HierarchyNode } from '../types/hierarchy.types';

interface HierarchyState {
  // State
  hierarchyTree: HierarchyNode | null;
  directReports: HierarchyNode[];
  managerChain: HierarchyNode[];
  searchResults: HierarchyNode[];
  managerSearchResults: HierarchyNode[];
  employeeSearchResults: HierarchyNode[];
  stats: {
    totalEmployees: number;
    totalManagers: number;
    averageSpanOfControl: number;
    maxDepth: number;
    orphanedEmployees: number;
  } | null;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  isSearching: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  fetchHierarchyTree: (organizationId: string) => Promise<void>;
  fetchDirectReports: (managerId: string) => Promise<void>;
  fetchManagerChain: (employeeId: string) => Promise<void>;
  fetchHierarchyStats: (organizationId: string) => Promise<void>;
  searchEmployees: (organizationId: string, query: string, excludeIds?: string[]) => Promise<void>;
  searchManagers: (organizationId: string, query: string, excludeIds?: string[]) => Promise<void>;
  
  // CRUD operations
  createHierarchy: (data: any) => Promise<boolean>;
  updateHierarchy: (id: string, data: any) => Promise<boolean>;
  deleteHierarchy: (id: string) => Promise<boolean>;
  bulkUpdateHierarchy: (data: any) => Promise<boolean>;
  
  // Utility actions
  clearError: () => void;
  clearSearchResults: () => void;
  clearHierarchyData: () => void;
}

export const useHierarchyStore = create<HierarchyState>()(
  persist(
    (set, get) => ({
      // Initial state
      hierarchyTree: null,
      directReports: [],
      managerChain: [],
      searchResults: [],
      managerSearchResults: [],
      employeeSearchResults: [],
      stats: null,
      isLoading: false,
      isUpdating: false,
      isSearching: false,
      error: null,

      // Fetch hierarchy tree
      fetchHierarchyTree: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const tree = await hierarchyService.getHierarchyTree(organizationId);
          set({ hierarchyTree: tree, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch hierarchy tree', 
            isLoading: false 
          });
        }
      },

      // Fetch direct reports
      fetchDirectReports: async (managerId: string) => {
        set({ isLoading: true, error: null });
        try {
          const reports = await hierarchyService.getDirectReports(managerId);
          set({ directReports: reports, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch direct reports', 
            isLoading: false 
          });
        }
      },

      // Fetch manager chain
      fetchManagerChain: async (employeeId: string) => {
        set({ isLoading: true, error: null });
        try {
          const chain = await hierarchyService.getManagerChain(employeeId);
          set({ managerChain: chain, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch manager chain', 
            isLoading: false 
          });
        }
      },


      // Fetch hierarchy stats
      fetchHierarchyStats: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const stats = await hierarchyService.getHierarchyStats(organizationId);
          set({ stats, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to fetch hierarchy stats', 
            isLoading: false 
          });
        }
      },

      // Search employees
      searchEmployees: async (organizationId: string, query: string, excludeIds: string[] = []) => {
        set({ isSearching: true, error: null });
        try {
          const results = await hierarchyService.searchEmployeesForHierarchy(organizationId, query, excludeIds);
          set({ employeeSearchResults: results, isSearching: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to search employees', 
            isSearching: false 
          });
        }
      },

      // Search managers (only manager role)
      searchManagers: async (organizationId: string, query: string, excludeIds: string[] = []) => {
        set({ isSearching: true, error: null });
        try {
          const results = await hierarchyService.searchManagersForHierarchy(organizationId, query, excludeIds);
          set({ managerSearchResults: results, isSearching: false });
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to search managers', 
            isSearching: false 
          });
        }
      },

      // Create hierarchy
      createHierarchy: async (data: any) => {
        set({ isUpdating: true, error: null });
        try {
          await hierarchyService.createHierarchy(data);
          set({ isUpdating: false });
          return true;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to create hierarchy', 
            isUpdating: false 
          });
          return false;
        }
      },

      // Update hierarchy
      updateHierarchy: async (id: string, data: any) => {
        set({ isUpdating: true, error: null });
        try {
          await hierarchyService.updateHierarchy(id, data);
          set({ isUpdating: false });
          return true;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to update hierarchy', 
            isUpdating: false 
          });
          return false;
        }
      },

      // Delete hierarchy
      deleteHierarchy: async (id: string) => {
        set({ isUpdating: true, error: null });
        try {
          await hierarchyService.deleteHierarchy(id);
          set({ isUpdating: false });
          return true;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to delete hierarchy', 
            isUpdating: false 
          });
          return false;
        }
      },

      // Bulk update hierarchy
      bulkUpdateHierarchy: async (data: any) => {
        set({ isUpdating: true, error: null });
        try {
          await hierarchyService.bulkUpdateHierarchy(data);
          set({ isUpdating: false });
          return true;
        } catch (error: any) {
          set({ 
            error: error.message || 'Failed to bulk update hierarchy', 
            isUpdating: false 
          });
          return false;
        }
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Clear search results
      clearSearchResults: () => set({ 
        searchResults: [],
        managerSearchResults: [],
        employeeSearchResults: []
      }),

      // Clear hierarchy data
      clearHierarchyData: () => set({
        hierarchyTree: null,
        directReports: [],
        managerChain: [],
        hierarchyList: [],
        searchResults: [],
        managerSearchResults: [],
        employeeSearchResults: [],
        stats: null,
      }),
    }),
    {
      name: 'hierarchy-storage',
      partialize: (state) => ({ 
        hierarchyTree: state.hierarchyTree,
        directReports: state.directReports,
        managerChain: state.managerChain,
      }),
    }
  )
);
