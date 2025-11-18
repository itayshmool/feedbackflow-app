// frontend/src/services/hierarchy.service.ts

import { api } from '../lib/api';
import {
  OrganizationalHierarchy,
  HierarchyNode,
  CreateHierarchyRequest,
  UpdateHierarchyRequest,
  HierarchyResponse,
  HierarchyListResponse,
  HierarchyTreeResponse,
  DirectReportsResponse,
  ManagerChainResponse,
  BulkHierarchyRequest,
  BulkHierarchyResponse,
} from '../types/hierarchy.types';

const BASE_URL = '/hierarchy';

// Get organizational hierarchy tree
export const getHierarchyTree = async (organizationId: string): Promise<HierarchyNode> => {
  const response = await api.get<HierarchyTreeResponse>(`${BASE_URL}/tree/${organizationId}`);
  return response.data.data;
};

// Get direct reports for a manager
export const getDirectReports = async (managerId: string): Promise<HierarchyNode[]> => {
  const response = await api.get<DirectReportsResponse>(`${BASE_URL}/direct-reports/${managerId}`);
  return response.data.data.items;
};

// Get manager chain for an employee
export const getManagerChain = async (employeeId: string): Promise<HierarchyNode[]> => {
  const response = await api.get<ManagerChainResponse>(`${BASE_URL}/manager-chain/${employeeId}`);
  return response.data.data.chain;
};


// Create hierarchy relationship
export const createHierarchy = async (data: CreateHierarchyRequest): Promise<OrganizationalHierarchy> => {
  const response = await api.post<HierarchyResponse>(BASE_URL, data);
  return response.data.data;
};

// Update hierarchy relationship
export const updateHierarchy = async (
  id: string,
  data: UpdateHierarchyRequest
): Promise<OrganizationalHierarchy> => {
  const response = await api.put<HierarchyResponse>(`${BASE_URL}/${id}`, data);
  return response.data.data;
};

// Delete hierarchy relationship
export const deleteHierarchy = async (id: string): Promise<void> => {
  await api.delete(`${BASE_URL}/${id}`);
};

// Bulk create/update hierarchy relationships
export const bulkUpdateHierarchy = async (data: BulkHierarchyRequest): Promise<BulkHierarchyResponse['data']> => {
  const response = await api.post<BulkHierarchyResponse>(`${BASE_URL}/bulk`, data);
  return response.data.data;
};

// Validate hierarchy structure
export const validateHierarchy = async (organizationId: string): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}> => {
  const response = await api.get<{
    success: boolean;
    data: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
    };
  }>(`${BASE_URL}/validate/${organizationId}`);
  return response.data.data;
};

// Get hierarchy statistics
export const getHierarchyStats = async (organizationId: string): Promise<{
  totalEmployees: number;
  totalManagers: number;
  averageSpanOfControl: number;
  maxDepth: number;
  orphanedEmployees: number;
}> => {
  const response = await api.get<{
    success: boolean;
    data: {
      totalEmployees: number;
      totalManagers: number;
      averageSpanOfControl: number;
      maxDepth: number;
      orphanedEmployees: number;
    };
  }>(`${BASE_URL}/stats/${organizationId}`);
  return response.data.data;
};

// Search employees for hierarchy assignment
export const searchEmployeesForHierarchy = async (
  organizationId: string,
  query: string,
  excludeIds: string[] = []
): Promise<HierarchyNode[]> => {
  const response = await api.get<{
    success: boolean;
    data: HierarchyNode[];
  }>(`${BASE_URL}/search-employees?organizationId=${organizationId}&q=${encodeURIComponent(query)}&exclude=${excludeIds.join(',')}`);
  return response.data.data;
};

// Search managers (only users with manager role)
export const searchManagersForHierarchy = async (
  organizationId: string,
  query: string,
  excludeIds: string[] = []
): Promise<HierarchyNode[]> => {
  const params = new URLSearchParams({
    organizationId,
    q: query,
    role: 'manager',
    exclude: excludeIds.join(','),
  });
  const response = await api.get<{
    success: boolean;
    data: HierarchyNode[];
  }>(`${BASE_URL}/search-employees?${params.toString()}`);
  return response.data.data;
};

// Download CSV template for hierarchy import
export const downloadHierarchyTemplate = async (): Promise<Blob> => {
  const response = await api.get(`${BASE_URL}/template`, { responseType: 'blob' });
  return response.data as Blob;
};

// Import hierarchy via CSV (send raw CSV text)
export const importHierarchyCsv = async (csvText: string): Promise<{
  created: number;
  updated: number;
  errors: string[];
}> => {
  const response = await api.post<{ success: boolean; data: { created: number; updated: number; errors: string[] } }>(
    `${BASE_URL}/bulk/csv`,
    csvText,
    { headers: { 'Content-Type': 'text/csv' } }
  );
  return response.data.data;
};
