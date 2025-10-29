// frontend/src/types/hierarchy.types.ts

export interface OrganizationalHierarchy {
  id: string;
  organizationId: string;
  managerId: string;
  employeeId: string;
  level: number; // 0 = CEO, 1 = VP, 2 = Director, etc.
  isDirectReport: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Populated fields
  manager?: {
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
  };
}

export interface HierarchyNode {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  avatarUrl?: string;
  level: number;
  isManager: boolean;
  directReports: HierarchyNode[];
  managerId?: string;
  managerName?: string;
  employeeCount?: number;
}

export interface CreateHierarchyRequest {
  organizationId: string;
  managerId: string;
  employeeId: string;
  level: number;
  isDirectReport: boolean;
}

export interface UpdateHierarchyRequest {
  level?: number;
  isDirectReport?: boolean;
  isActive?: boolean;
}

export interface HierarchyResponse {
  success: boolean;
  data: OrganizationalHierarchy;
}

export interface HierarchyListResponse {
  success: boolean;
  data: {
    items: OrganizationalHierarchy[];
    total: number;
    page: number;
    limit: number;
  };
}

export interface HierarchyTreeResponse {
  success: boolean;
  data: HierarchyNode;
}

export interface DirectReportsResponse {
  success: boolean;
  data: {
    items: HierarchyNode[];
    total: number;
  };
}

export interface ManagerChainResponse {
  success: boolean;
  data: {
    chain: HierarchyNode[];
    levels: number;
  };
}

export interface HierarchyValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BulkHierarchyRequest {
  organizationId: string;
  hierarchies: {
    managerId: string;
    employeeId: string;
    level: number;
    isDirectReport: boolean;
  }[];
}

export interface BulkHierarchyResponse {
  success: boolean;
  data: {
    created: number;
    updated: number;
    errors: {
      managerId: string;
      employeeId: string;
      error: string;
    }[];
  };
}
