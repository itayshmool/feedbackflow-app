import { api } from '../lib/api';
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
  ApiResponse,
  PaginatedResponse
} from '../types/organization.types';

class OrganizationService {
  private baseUrl = '/admin';

  // Organization Management
  async createOrganization(data: CreateOrganizationRequest): Promise<Organization> {
    const response = await api.post<ApiResponse<Organization>>(
      `${this.baseUrl}/organizations`,
      data
    );
    return response.data.data;
  }

  async getOrganizations(filters?: OrganizationFilters): Promise<PaginatedResponse<Organization>> {
    const response = await api.get<PaginatedResponse<Organization>>(
      `${this.baseUrl}/organizations`,
      { params: filters }
    );
    return response.data;
  }

  async getOrganizationById(id: string): Promise<Organization> {
    const response = await api.get<ApiResponse<Organization>>(
      `${this.baseUrl}/organizations/${id}`
    );
    return response.data.data;
  }

  async updateOrganization(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
    const response = await api.put<ApiResponse<Organization>>(
      `${this.baseUrl}/organizations/${id}`,
      data
    );
    return response.data.data;
  }

  async deleteOrganization(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/organizations/${id}`);
  }

  async searchOrganizations(query: string, filters?: OrganizationFilters): Promise<Organization[]> {
    const response = await api.get<ApiResponse<Organization[]>>(
      `${this.baseUrl}/organizations/search`,
      { params: { q: query, ...filters } }
    );
    return response.data.data;
  }

  async getOrganizationStats(): Promise<OrganizationStats> {
    const response = await api.get<{ success: boolean; data: any }>(
      `${this.baseUrl}/organizations/stats`
    );
    
    // Transform snake_case API response to camelCase frontend format
    const apiData = response.data.data;
    return {
      totalOrganizations: apiData.total_organizations || 0,
      activeOrganizations: apiData.active_organizations || 0,
      byPlan: apiData.by_plan || {},
      averageUsersPerOrganization: apiData.average_users_per_organization || 0,
      totalDepartments: apiData.total_departments || 0,
      totalTeams: apiData.total_teams || 0,
      totalUsers: apiData.total_users || 0,
    };
  }

  async checkSlugAvailability(slug: string, excludeId?: string): Promise<boolean> {
    const response = await api.get<ApiResponse<{ available: boolean }>>(
      `${this.baseUrl}/organizations/check-slug`,
      { params: { slug, excludeId } }
    );
    return response.data.data.available;
  }

  // Department Management
  async createDepartment(organizationId: string, data: CreateDepartmentRequest): Promise<Department> {
    const response = await api.post<{ success: boolean; data: Department; message: string }>(
      `${this.baseUrl}/organizations/${organizationId}/departments`,
      data
    );
    return response.data.data;
  }

  async getDepartments(organizationId: string, filters?: DepartmentFilters): Promise<PaginatedResponse<Department>> {
    const response = await api.get<ApiResponse<Department[]>>(
      `${this.baseUrl}/organizations/${organizationId}/departments`,
      { params: filters }
    );
    // API returns { success: true, data: Department[] }, convert to PaginatedResponse
    return {
      data: response.data.data || [],
      pagination: {
        total: response.data.data?.length || 0,
        limit: 100,
        offset: 0,
        hasMore: false
      }
    };
  }

  async getDepartmentById(organizationId: string, departmentId: string): Promise<Department> {
    const response = await api.get<ApiResponse<Department>>(
      `${this.baseUrl}/organizations/${organizationId}/departments/${departmentId}`
    );
    return response.data.data;
  }

  async updateDepartment(
    organizationId: string,
    departmentId: string,
    data: UpdateDepartmentRequest
  ): Promise<Department> {
    const response = await api.put<ApiResponse<Department>>(
      `${this.baseUrl}/organizations/${organizationId}/departments/${departmentId}`,
      data
    );
    return response.data.data;
  }

  async deleteDepartment(organizationId: string, departmentId: string): Promise<void> {
    await api.delete(
      `${this.baseUrl}/organizations/${organizationId}/departments/${departmentId}`
    );
  }

  async getDepartmentStats(organizationId: string): Promise<DepartmentStats> {
    const response = await api.get<ApiResponse<DepartmentStats>>(
      `${this.baseUrl}/organizations/${organizationId}/departments/stats`
    );
    return response.data.data;
  }

  // Team Management
  async createTeam(organizationId: string, data: CreateTeamRequest): Promise<Team> {
    const response = await api.post<{ success: boolean; data: Team; message: string }>(
      `${this.baseUrl}/organizations/${organizationId}/teams`,
      data
    );
    return response.data.data;
  }

  async getTeams(organizationId: string, filters?: TeamFilters): Promise<PaginatedResponse<Team>> {
    const response = await api.get<ApiResponse<Team[]>>(
      `${this.baseUrl}/organizations/${organizationId}/teams`,
      { params: filters }
    );
    // API returns { success: true, data: Team[] }, convert to PaginatedResponse
    return {
      data: response.data.data || [],
      pagination: {
        total: response.data.data?.length || 0,
        limit: 100,
        offset: 0,
        hasMore: false
      }
    };
  }

  async getTeamById(organizationId: string, teamId: string): Promise<Team> {
    const response = await api.get<ApiResponse<Team>>(
      `${this.baseUrl}/organizations/${organizationId}/teams/${teamId}`
    );
    return response.data.data;
  }

  async updateTeam(
    organizationId: string,
    teamId: string,
    data: UpdateTeamRequest
  ): Promise<Team> {
    const response = await api.put<ApiResponse<Team>>(
      `${this.baseUrl}/organizations/${organizationId}/teams/${teamId}`,
      data
    );
    return response.data.data;
  }

  async deleteTeam(organizationId: string, teamId: string): Promise<void> {
    await api.delete(
      `${this.baseUrl}/organizations/${organizationId}/teams/${teamId}`
    );
  }

  async getTeamStats(organizationId: string): Promise<TeamStats> {
    const response = await api.get<ApiResponse<TeamStats>>(
      `${this.baseUrl}/organizations/${organizationId}/teams/stats`
    );
    return response.data.data;
  }

  // Bulk Operations
  async bulkImport(data: BulkImportRequest): Promise<BulkImportResult> {
    const response = await api.post<ApiResponse<BulkImportResult>>(
      `${this.baseUrl}/bulk/import`,
      data
    );
    return response.data.data;
  }

  async bulkExport(data: BulkExportRequest): Promise<BulkExportResult> {
    const response = await api.post<ApiResponse<BulkExportResult>>(
      `${this.baseUrl}/bulk/export`,
      data
    );
    return response.data.data;
  }

  // Organization Chart
  async generateOrganizationChart(organizationId: string): Promise<OrganizationChart> {
    const response = await api.get<ApiResponse<OrganizationChart>>(
      `${this.baseUrl}/organizations/${organizationId}/chart`
    );
    return response.data.data;
  }

  // Utility Methods
  async downloadExport(data: BulkExportRequest, filename?: string): Promise<void> {
    const response = await api.post(
      `${this.baseUrl}/bulk/export`,
      data,
      { responseType: 'blob' }
    );
    
    const contentType = data.format === 'csv' ? 'text/csv' : 'application/json';
    const blob = new Blob([response.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `organization-export-${new Date().toISOString().split('T')[0]}.${data.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async uploadImport(file: File, options?: { dryRun?: boolean; skipValidation?: boolean }): Promise<BulkImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.dryRun !== undefined) {
      formData.append('dryRun', String(options.dryRun));
    }
    if (options?.skipValidation !== undefined) {
      formData.append('skipValidation', String(options.skipValidation));
    }
    
    const response = await api.post<ApiResponse<BulkImportResult>>(
      `${this.baseUrl}/bulk/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  }

  async downloadTemplate(type: string = 'organizations'): Promise<void> {
    const response = await api.get(
      `${this.baseUrl}/bulk/template`,
      { 
        params: { type },
        responseType: 'blob'
      }
    );
    
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-import-template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const organizationService = new OrganizationService();
export default organizationService;
