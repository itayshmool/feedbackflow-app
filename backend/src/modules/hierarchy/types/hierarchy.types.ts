// backend/src/modules/hierarchy/types/hierarchy.types.ts

export interface OrganizationalHierarchy {
  id: string;
  organization_id: string;
  manager_id: string;
  employee_id: string;
  level: number;
  is_active: boolean;
  effective_date: Date;
  end_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface HierarchyNode {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  manager_id: string | null;
  manager_name?: string;
  title?: string;
  department?: string;
  level?: number;
  children?: HierarchyNode[];
}

export interface CreateHierarchyRequest {
  organizationId: string;
  employeeId: string;
  managerId: string;
  effectiveDate?: Date;
}

export interface UpdateHierarchyRequest {
  managerId?: string;
  effectiveDate?: Date;
  endDate?: Date;
  isActive?: boolean;
}

export interface BulkHierarchyRequest {
  organizationId: string;
  relationships: Array<{
    employeeId: string;
    managerId: string;
  }>;
}

export interface HierarchyStats {
  total_relationships: number;
  max_depth: number;
  average_span_of_control: number;
  orphaned_employees: number;
}

