import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { organizationService } from '../services/organization.service';
import {
  Organization,
  Department,
  Team,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  CreateTeamRequest,
  UpdateTeamRequest,
  OrganizationFilters,
  DepartmentFilters,
  TeamFilters,
  OrganizationStats,
  DepartmentStats,
  TeamStats,
  BulkImportRequest,
  BulkImportResult,
  BulkExportRequest,
  BulkExportResult,
  OrganizationChart,
  PaginatedResponse
} from '../types/organization.types';

interface OrganizationState {
  // Organizations
  organizations: Organization[];
  currentOrganization: Organization | null;
  organizationStats: OrganizationStats | null;
  organizationsLoading: boolean;
  organizationsError: string | null;

  // Departments
  departments: Department[];
  currentDepartment: Department | null;
  departmentStats: DepartmentStats | null;
  departmentsLoading: boolean;
  departmentsError: string | null;

  // Teams
  teams: Team[];
  currentTeam: Team | null;
  teamStats: TeamStats | null;
  teamsLoading: boolean;
  teamsError: string | null;

  // Organization Chart
  organizationChart: OrganizationChart | null;
  chartLoading: boolean;
  chartError: string | null;

  // Bulk Operations
  bulkImportResult: BulkImportResult | null;
  bulkExportResult: BulkExportResult | null;
  bulkLoading: boolean;
  bulkError: string | null;

  // Pagination
  organizationsPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;

  departmentsPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;

  teamsPagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;

  // Actions
  // Organization Actions
  fetchOrganizations: (filters?: OrganizationFilters) => Promise<void>;
  fetchOrganizationById: (id: string) => Promise<void>;
  createOrganization: (data: CreateOrganizationRequest) => Promise<Organization>;
  updateOrganization: (id: string, data: UpdateOrganizationRequest) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<void>;
  searchOrganizations: (query: string, filters?: OrganizationFilters) => Promise<Organization[]>;
  fetchOrganizationStats: () => Promise<void>;
  checkSlugAvailability: (slug: string, excludeId?: string) => Promise<boolean>;

  // Department Actions
  fetchDepartments: (organizationId: string, filters?: DepartmentFilters) => Promise<void>;
  fetchDepartmentById: (organizationId: string, departmentId: string) => Promise<void>;
  createDepartment: (organizationId: string, data: CreateDepartmentRequest) => Promise<Department>;
  updateDepartment: (organizationId: string, departmentId: string, data: UpdateDepartmentRequest) => Promise<Department>;
  deleteDepartment: (organizationId: string, departmentId: string) => Promise<void>;
  fetchDepartmentStats: (organizationId: string) => Promise<void>;

  // Team Actions
  fetchTeams: (organizationId: string, filters?: TeamFilters) => Promise<void>;
  fetchTeamById: (organizationId: string, teamId: string) => Promise<void>;
  createTeam: (organizationId: string, data: CreateTeamRequest) => Promise<Team>;
  updateTeam: (organizationId: string, teamId: string, data: UpdateTeamRequest) => Promise<Team>;
  deleteTeam: (organizationId: string, teamId: string) => Promise<void>;
  fetchTeamStats: (organizationId: string) => Promise<void>;

  // Organization Chart Actions
  generateOrganizationChart: (organizationId: string) => Promise<void>;

  // Bulk Operations Actions
  bulkImport: (data: BulkImportRequest) => Promise<BulkImportResult>;
  bulkExport: (data: BulkExportRequest) => Promise<BulkExportResult>;
  downloadExport: (data: BulkExportRequest, filename?: string) => Promise<void>;
  uploadImport: (file: File, options?: { dryRun?: boolean; skipValidation?: boolean }) => Promise<BulkImportResult>;
  downloadTemplate: (type?: string) => Promise<void>;

  // Utility Actions
  clearError: () => void;
  clearBulkResults: () => void;
  reset: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  devtools(
    (set, get) => ({
      // Initial State
      organizations: [],
      currentOrganization: null,
      organizationStats: null,
      organizationsLoading: false,
      organizationsError: null,

      departments: [],
      currentDepartment: null,
      departmentStats: null,
      departmentsLoading: false,
      departmentsError: null,

      teams: [],
      currentTeam: null,
      teamStats: null,
      teamsLoading: false,
      teamsError: null,

      organizationChart: null,
      chartLoading: false,
      chartError: null,

      bulkImportResult: null,
      bulkExportResult: null,
      bulkLoading: false,
      bulkError: null,

      organizationsPagination: null,
      departmentsPagination: null,
      teamsPagination: null,

      // Organization Actions
      fetchOrganizations: async (filters) => {
        set({ organizationsLoading: true, organizationsError: null });
        try {
          const response = await organizationService.getOrganizations(filters);
          set({
            organizations: response.data || [],
            organizationsPagination: response.pagination,
            organizationsLoading: false,
          });
        } catch (error) {
          set({
            organizations: [], // Ensure organizations is always an array
            organizationsError: error instanceof Error ? error.message : 'Failed to fetch organizations',
            organizationsLoading: false,
          });
        }
      },

      fetchOrganizationById: async (id) => {
        set({ organizationsLoading: true, organizationsError: null });
        try {
          const organization = await organizationService.getOrganizationById(id);
          set({
            currentOrganization: organization,
            organizationsLoading: false,
          });
        } catch (error) {
          set({
            organizationsError: error instanceof Error ? error.message : 'Failed to fetch organization',
            organizationsLoading: false,
          });
        }
      },

      createOrganization: async (data) => {
        set({ organizationsLoading: true, organizationsError: null });
        try {
          const organization = await organizationService.createOrganization(data);
          set((state) => ({
            organizations: [organization, ...state.organizations],
            currentOrganization: organization,
            organizationsLoading: false,
          }));
          return organization;
        } catch (error) {
          set({
            organizationsError: error instanceof Error ? error.message : 'Failed to create organization',
            organizationsLoading: false,
          });
          throw error;
        }
      },

      updateOrganization: async (id, data) => {
        set({ organizationsLoading: true, organizationsError: null });
        try {
          const organization = await organizationService.updateOrganization(id, data);
          set((state) => ({
            organizations: state.organizations.map((org) =>
              org.id === id ? organization : org
            ),
            currentOrganization: state.currentOrganization?.id === id ? organization : state.currentOrganization,
            organizationsLoading: false,
          }));
          return organization;
        } catch (error) {
          set({
            organizationsError: error instanceof Error ? error.message : 'Failed to update organization',
            organizationsLoading: false,
          });
          throw error;
        }
      },

      deleteOrganization: async (id) => {
        set({ organizationsLoading: true, organizationsError: null });
        try {
          await organizationService.deleteOrganization(id);
          set((state) => ({
            organizations: state.organizations.filter((org) => org.id !== id),
            currentOrganization: state.currentOrganization?.id === id ? null : state.currentOrganization,
            organizationsLoading: false,
          }));
        } catch (error) {
          set({
            organizationsError: error instanceof Error ? error.message : 'Failed to delete organization',
            organizationsLoading: false,
          });
          throw error;
        }
      },

      searchOrganizations: async (query, filters) => {
        set({ organizationsLoading: true, organizationsError: null });
        try {
          const organizations = await organizationService.searchOrganizations(query, filters);
          set({ organizationsLoading: false });
          return organizations;
        } catch (error) {
          set({
            organizationsError: error instanceof Error ? error.message : 'Failed to search organizations',
            organizationsLoading: false,
          });
          throw error;
        }
      },

      fetchOrganizationStats: async () => {
        set({ organizationsLoading: true, organizationsError: null });
        try {
          const stats = await organizationService.getOrganizationStats();
          set({
            organizationStats: stats,
            organizationsLoading: false,
          });
        } catch (error) {
          set({
            organizationStats: null,
            organizationsError: error instanceof Error ? error.message : 'Failed to fetch organization stats',
            organizationsLoading: false,
          });
        }
      },

      checkSlugAvailability: async (slug, excludeId) => {
        try {
          return await organizationService.checkSlugAvailability(slug, excludeId);
        } catch (error) {
          set({
            organizationsError: error instanceof Error ? error.message : 'Failed to check slug availability',
          });
          throw error;
        }
      },

      // Department Actions
      fetchDepartments: async (organizationId, filters) => {
        set({ departmentsLoading: true, departmentsError: null });
        try {
          const response = await organizationService.getDepartments(organizationId, filters);
          set({
            departments: response.data || [],
            departmentsPagination: response.pagination,
            departmentsLoading: false,
          });
        } catch (error) {
          set({
            departments: [], // Ensure departments is always an array
            departmentsError: error instanceof Error ? error.message : 'Failed to fetch departments',
            departmentsLoading: false,
          });
        }
      },

      fetchDepartmentById: async (organizationId, departmentId) => {
        set({ departmentsLoading: true, departmentsError: null });
        try {
          const department = await organizationService.getDepartmentById(organizationId, departmentId);
          set({
            currentDepartment: department,
            departmentsLoading: false,
          });
        } catch (error) {
          set({
            departmentsError: error instanceof Error ? error.message : 'Failed to fetch department',
            departmentsLoading: false,
          });
        }
      },

      createDepartment: async (organizationId, data) => {
        set({ departmentsLoading: true, departmentsError: null });
        try {
          const department = await organizationService.createDepartment(organizationId, data);
          set((state) => ({
            departments: [department, ...(Array.isArray(state.departments) ? state.departments : [])],
            currentDepartment: department,
            departmentsLoading: false,
          }));
          return department;
        } catch (error) {
          set({
            departmentsError: error instanceof Error ? error.message : 'Failed to create department',
            departmentsLoading: false,
          });
          throw error;
        }
      },

      updateDepartment: async (organizationId, departmentId, data) => {
        set({ departmentsLoading: true, departmentsError: null });
        try {
          const department = await organizationService.updateDepartment(organizationId, departmentId, data);
          set((state) => ({
            departments: state.departments.map((dept) =>
              dept.id === departmentId ? department : dept
            ),
            currentDepartment: state.currentDepartment?.id === departmentId ? department : state.currentDepartment,
            departmentsLoading: false,
          }));
          return department;
        } catch (error) {
          set({
            departmentsError: error instanceof Error ? error.message : 'Failed to update department',
            departmentsLoading: false,
          });
          throw error;
        }
      },

      deleteDepartment: async (organizationId, departmentId) => {
        set({ departmentsLoading: true, departmentsError: null });
        try {
          await organizationService.deleteDepartment(organizationId, departmentId);
          set((state) => ({
            departments: state.departments.filter((dept) => dept.id !== departmentId),
            currentDepartment: state.currentDepartment?.id === departmentId ? null : state.currentDepartment,
            departmentsLoading: false,
          }));
        } catch (error) {
          set({
            departmentsError: error instanceof Error ? error.message : 'Failed to delete department',
            departmentsLoading: false,
          });
          throw error;
        }
      },

      fetchDepartmentStats: async (organizationId) => {
        set({ departmentsLoading: true, departmentsError: null });
        try {
          const stats = await organizationService.getDepartmentStats(organizationId);
          set({
            departmentStats: stats,
            departmentsLoading: false,
          });
        } catch (error) {
          set({
            departmentsError: error instanceof Error ? error.message : 'Failed to fetch department stats',
            departmentsLoading: false,
          });
        }
      },

      // Team Actions
      fetchTeams: async (organizationId, filters) => {
        set({ teamsLoading: true, teamsError: null });
        try {
          const response = await organizationService.getTeams(organizationId, filters);
          set({
            teams: response.data || [],
            teamsPagination: response.pagination,
            teamsLoading: false,
          });
        } catch (error) {
          set({
            teams: [], // Ensure teams is always an array
            teamsError: error instanceof Error ? error.message : 'Failed to fetch teams',
            teamsLoading: false,
          });
        }
      },

      fetchTeamById: async (organizationId, teamId) => {
        set({ teamsLoading: true, teamsError: null });
        try {
          const team = await organizationService.getTeamById(organizationId, teamId);
          set({
            currentTeam: team,
            teamsLoading: false,
          });
        } catch (error) {
          set({
            teamsError: error instanceof Error ? error.message : 'Failed to fetch team',
            teamsLoading: false,
          });
        }
      },

      createTeam: async (organizationId, data) => {
        set({ teamsLoading: true, teamsError: null });
        try {
          const team = await organizationService.createTeam(organizationId, data);
          set((state) => ({
            teams: [team, ...(Array.isArray(state.teams) ? state.teams : [])],
            currentTeam: team,
            teamsLoading: false,
          }));
          return team;
        } catch (error) {
          set({
            teamsError: error instanceof Error ? error.message : 'Failed to create team',
            teamsLoading: false,
          });
          throw error;
        }
      },

      updateTeam: async (organizationId, teamId, data) => {
        set({ teamsLoading: true, teamsError: null });
        try {
          const team = await organizationService.updateTeam(organizationId, teamId, data);
          set((state) => ({
            teams: state.teams.map((t) =>
              t.id === teamId ? team : t
            ),
            currentTeam: state.currentTeam?.id === teamId ? team : state.currentTeam,
            teamsLoading: false,
          }));
          return team;
        } catch (error) {
          set({
            teamsError: error instanceof Error ? error.message : 'Failed to update team',
            teamsLoading: false,
          });
          throw error;
        }
      },

      deleteTeam: async (organizationId, teamId) => {
        set({ teamsLoading: true, teamsError: null });
        try {
          await organizationService.deleteTeam(organizationId, teamId);
          set((state) => ({
            teams: state.teams.filter((t) => t.id !== teamId),
            currentTeam: state.currentTeam?.id === teamId ? null : state.currentTeam,
            teamsLoading: false,
          }));
        } catch (error) {
          set({
            teamsError: error instanceof Error ? error.message : 'Failed to delete team',
            teamsLoading: false,
          });
          throw error;
        }
      },

      fetchTeamStats: async (organizationId) => {
        set({ teamsLoading: true, teamsError: null });
        try {
          const stats = await organizationService.getTeamStats(organizationId);
          set({
            teamStats: stats,
            teamsLoading: false,
          });
        } catch (error) {
          set({
            teamsError: error instanceof Error ? error.message : 'Failed to fetch team stats',
            teamsLoading: false,
          });
        }
      },

      // Organization Chart Actions
      generateOrganizationChart: async (organizationId) => {
        set({ chartLoading: true, chartError: null });
        try {
          const chart = await organizationService.generateOrganizationChart(organizationId);
          set({
            organizationChart: chart,
            chartLoading: false,
          });
        } catch (error) {
          set({
            chartError: error instanceof Error ? error.message : 'Failed to generate organization chart',
            chartLoading: false,
          });
        }
      },

      // Bulk Operations Actions
      bulkImport: async (data) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          const result = await organizationService.bulkImport(data);
          set({
            bulkImportResult: result,
            bulkLoading: false,
          });
          return result;
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to perform bulk import',
            bulkLoading: false,
          });
          throw error;
        }
      },

      bulkExport: async (data) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          const result = await organizationService.bulkExport(data);
          set({
            bulkExportResult: result,
            bulkLoading: false,
          });
          return result;
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to perform bulk export',
            bulkLoading: false,
          });
          throw error;
        }
      },

      downloadExport: async (data, filename) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          await organizationService.downloadExport(data, filename);
          set({ bulkLoading: false });
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to download export',
            bulkLoading: false,
          });
          throw error;
        }
      },

      uploadImport: async (file, options) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          const result = await organizationService.uploadImport(file, options);
          set({
            bulkImportResult: result,
            bulkLoading: false,
          });
          return result;
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to upload import file',
            bulkLoading: false,
          });
          throw error;
        }
      },

      downloadTemplate: async (type) => {
        set({ bulkLoading: true, bulkError: null });
        try {
          await organizationService.downloadTemplate(type);
          set({ bulkLoading: false });
        } catch (error) {
          set({
            bulkError: error instanceof Error ? error.message : 'Failed to download template',
            bulkLoading: false,
          });
          throw error;
        }
      },

      // Utility Actions
      clearError: () => {
        set({
          organizationsError: null,
          departmentsError: null,
          teamsError: null,
          chartError: null,
          bulkError: null,
        });
      },

      clearBulkResults: () => {
        set({
          bulkImportResult: null,
          bulkExportResult: null,
        });
      },

      reset: () => {
        set({
          organizations: [],
          currentOrganization: null,
          organizationStats: null,
          organizationsLoading: false,
          organizationsError: null,

          departments: [],
          currentDepartment: null,
          departmentStats: null,
          departmentsLoading: false,
          departmentsError: null,

          teams: [],
          currentTeam: null,
          teamStats: null,
          teamsLoading: false,
          teamsError: null,

          organizationChart: null,
          chartLoading: false,
          chartError: null,

          bulkImportResult: null,
          bulkExportResult: null,
          bulkLoading: false,
          bulkError: null,

          organizationsPagination: null,
          departmentsPagination: null,
          teamsPagination: null,
        });
      },
    }),
    {
      name: 'organization-store',
    }
  )
);
