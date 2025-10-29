// Organization Types for Frontend
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  contactEmail: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  logoUrl?: string;
  isActive: boolean;
  status: OrganizationStatus;
  subscriptionPlan: SubscriptionPlan;
  planStartDate?: Date;
  planEndDate?: Date;
  maxUsers: number;
  maxCycles: number;
  storageLimitGb: number;
  featureFlags: Record<string, boolean>;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  type: DepartmentType;
  organizationId: string;
  parentDepartmentId?: string;
  managerId?: string;
  budget?: number;
  isActive: boolean;
  settings: DepartmentSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  type: TeamType;
  organizationId: string;
  departmentId?: string;
  teamLeadId?: string;
  isActive: boolean;
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}

// Enums
export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum DepartmentType {
  ENGINEERING = 'engineering',
  MARKETING = 'marketing',
  SALES = 'sales',
  HR = 'hr',
  FINANCE = 'finance',
  OPERATIONS = 'operations',
  CUSTOMER_SUCCESS = 'customer_success',
  PRODUCT = 'product',
  DESIGN = 'design',
  OTHER = 'other'
}

export enum TeamType {
  CORE = 'core',
  SUPPORT = 'support',
  PROJECT = 'project',
  CROSS_FUNCTIONAL = 'cross_functional',
  TEMPORARY = 'temporary'
}

// Settings Interfaces
export interface OrganizationSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
  workingDays: number[];
  workingHours: {
    start: string;
    end: string;
  };
  feedbackSettings: {
    allowAnonymous: boolean;
    requireManagerApproval: boolean;
    autoReminders: boolean;
    reminderFrequency: number;
  };
  notificationPreferences: {
    email: boolean;
    inApp: boolean;
    slack: boolean;
  };
  integrationSettings: {
    slackWebhook?: string;
    googleWorkspace?: boolean;
    microsoft365?: boolean;
  };
}

export interface DepartmentSettings {
  allowCrossDepartmentFeedback: boolean;
  requireManagerApproval: boolean;
  feedbackFrequency: number;
  notificationPreferences: {
    email: boolean;
    inApp: boolean;
  };
}

export interface TeamSettings {
  allowPeerFeedback: boolean;
  requireTeamLeadApproval: boolean;
  customWorkflows: string[];
  collaborationTools: string[];
}

// DTOs for API Requests
export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  contactEmail: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  logoUrl?: string;
  subscriptionPlan: SubscriptionPlan;
  maxUsers: number;
  maxCycles: number;
  storageLimitGb: number;
  featureFlags?: Record<string, boolean>;
  settings?: Partial<OrganizationSettings>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  description?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  logoUrl?: string;
  isActive?: boolean;
  status?: OrganizationStatus;
  subscriptionPlan?: SubscriptionPlan;
  maxUsers?: number;
  maxCycles?: number;
  storageLimitGb?: number;
  featureFlags?: Record<string, boolean>;
  settings?: Partial<OrganizationSettings>;
}

export interface CreateDepartmentRequest {
  name: string;
  description?: string;
  type: DepartmentType;
  parentDepartmentId?: string;
  managerId?: string;
  managerEmail?: string;
  budget?: number;
  settings?: Partial<DepartmentSettings>;
}

export interface UpdateDepartmentRequest {
  name?: string;
  description?: string;
  type?: DepartmentType;
  parentDepartmentId?: string;
  managerId?: string;
  budget?: number;
  isActive?: boolean;
  settings?: Partial<DepartmentSettings>;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  type: TeamType;
  departmentId?: string;
  teamLeadId?: string;
  teamLeadEmail?: string;
  settings?: Partial<TeamSettings>;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  type?: TeamType;
  departmentId?: string;
  teamLeadId?: string;
  isActive?: boolean;
  settings?: Partial<TeamSettings>;
}

// Filter and Search Interfaces
export interface OrganizationFilters {
  status?: OrganizationStatus;
  subscriptionPlan?: SubscriptionPlan;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DepartmentFilters {
  type?: DepartmentType;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TeamFilters {
  type?: TeamType;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Statistics Interfaces
export interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  byPlan: Record<SubscriptionPlan, number>;
  averageUsersPerOrganization: number;
  totalDepartments: number;
  totalTeams: number;
  totalUsers: number;
}

export interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  byType: Record<DepartmentType, number>;
  averageTeamsPerDepartment: number;
  averageUsersPerDepartment: number;
}

export interface TeamStats {
  totalTeams: number;
  activeTeams: number;
  byType: Record<TeamType, number>;
  averageUsersPerTeam: number;
}

// Bulk Operations
export interface BulkImportRequest {
  type: 'organizations' | 'departments' | 'teams';
  data: any[];
  options: {
    dryRun?: boolean;
    skipValidation?: boolean;
    updateExisting?: boolean;
  };
}

export interface BulkImportResult {
  success: boolean;
  message: string;
  results: {
    total: number;
    successful: number;
    failed: number;
    errors: Array<{
      row: number;
      error: string;
    }>;
  };
}

export interface BulkExportRequest {
  type: 'organizations' | 'departments' | 'teams';
  format: 'json' | 'csv';
  filters?: Record<string, any>;
}

export interface BulkExportResult {
  success: boolean;
  message: string;
  data: any[];
  format: string;
}

// Organization Chart
export interface OrganizationChart {
  id: string;
  organizationId: string;
  version: number;
  isActive: boolean;
  structure: OrganizationChartNode;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationChartNode {
  id: string;
  name: string;
  type: 'organization' | 'department' | 'team';
  level: number;
  children?: OrganizationChartNode[];
  metadata?: {
    managerId?: string;
    teamLeadId?: string;
    memberCount?: number;
    isActive?: boolean;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
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

// Form Types
export interface OrganizationFormData extends Omit<CreateOrganizationRequest, 'settings'> {
  settings: OrganizationSettings;
}

export interface DepartmentFormData extends Omit<CreateDepartmentRequest, 'settings'> {
  settings: DepartmentSettings;
}

export interface TeamFormData extends Omit<CreateTeamRequest, 'settings'> {
  settings: TeamSettings;
}

// Validation Schemas (for use with react-hook-form and zod)
export interface OrganizationValidationSchema {
  name: string;
  slug: string;
  contactEmail: string;
  subscriptionPlan: SubscriptionPlan;
  maxUsers: number;
  maxCycles: number;
  storageLimitGb: number;
}

export interface DepartmentValidationSchema {
  name: string;
  type: DepartmentType;
}

export interface TeamValidationSchema {
  name: string;
  type: TeamType;
}
