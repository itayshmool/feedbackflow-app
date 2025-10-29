// Organization-specific types for admin module
import { SubscriptionPlan } from './admin.types';

// Re-export SubscriptionPlan for easier imports
export { SubscriptionPlan };

// --- Enums ---
export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

export enum DepartmentType {
  EXECUTIVE = 'executive',
  OPERATIONS = 'operations',
  SALES = 'sales',
  MARKETING = 'marketing',
  ENGINEERING = 'engineering',
  HR = 'hr',
  FINANCE = 'finance',
  CUSTOM = 'custom',
}

export enum TeamType {
  CORE = 'core',
  PROJECT = 'project',
  CROSS_FUNCTIONAL = 'cross_functional',
  TEMPORARY = 'temporary',
  CUSTOM = 'custom',
}

// --- Core Interfaces ---

export interface Organization {
  id: string;
  name: string;
  slug: string; // e.g., feedbackflow-inc
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
  planStartDate: Date;
  planEndDate: Date;
  maxUsers: number;
  maxCycles: number;
  storageLimitGb: number;
  featureFlags: Record<string, boolean>;
  settings: OrganizationSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  currency: string;
  workingDays: number[]; // 0-6 (Sunday-Saturday)
  workingHours: {
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  feedbackSettings: {
    allowAnonymous: boolean;
    requireManagerApproval: boolean;
    autoCloseCycles: boolean;
    reminderFrequency: number; // days
  };
  notificationSettings: {
    emailNotifications: boolean;
    inAppNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
  };
  securitySettings: {
    requireMFA: boolean;
    sessionTimeout: number; // minutes
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
  };
}

export interface Department {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: DepartmentType;
  parentDepartmentId?: string; // For nested departments
  managerId?: string; // Department head
  budget?: number;
  isActive: boolean;
  settings: DepartmentSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentSettings {
  allowCrossDepartmentFeedback: boolean;
  requireManagerApproval: boolean;
  customFeedbackTemplates: string[];
  notificationPreferences: {
    email: boolean;
    inApp: boolean;
    sms: boolean;
  };
}

export interface Team {
  id: string;
  organizationId: string;
  departmentId?: string;
  name: string;
  description?: string;
  type: TeamType;
  teamLeadId?: string;
  isActive: boolean;
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamSettings {
  allowPeerFeedback: boolean;
  requireTeamLeadApproval: boolean;
  customWorkflows: string[];
  collaborationTools: string[];
}

export interface OrganizationChart {
  id: string;
  organizationId: string;
  version: number;
  structure: OrganizationChartNode;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationChartNode {
  id: string;
  type: 'organization' | 'department' | 'team' | 'user';
  name: string;
  title?: string;
  email?: string;
  avatar?: string;
  children: OrganizationChartNode[];
  metadata: {
    departmentId?: string;
    teamId?: string;
    userId?: string;
    role?: string;
    level?: number;
    isManager?: boolean;
  };
}

export interface ReportingRelationship {
  id: string;
  organizationId: string;
  managerId: string;
  employeeId: string;
  relationshipType: 'direct' | 'dotted_line' | 'matrix';
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// --- Database Model Interfaces ---

export interface OrganizationModel {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  contact_email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  website?: string;
  logo_url?: string;
  is_active: boolean;
  status: string;
  subscription_plan: string;
  plan_start_date: Date;
  plan_end_date: Date;
  max_users: number;
  max_cycles: number;
  storage_limit_gb: number;
  feature_flags: Record<string, boolean>;
  settings: OrganizationSettings;
  created_at: Date;
  updated_at: Date;
}

export interface DepartmentModel {
  id: string;
  department_id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: string;
  parent_department_id?: string;
  manager_id?: string;
  budget?: number;
  is_active: boolean;
  settings: DepartmentSettings;
  created_at: Date;
  updated_at: Date;
}

export interface TeamModel {
  id: string;
  team_id: string;
  organization_id: string;
  department_id?: string;
  name: string;
  description?: string;
  type: string;
  team_lead_id?: string;
  is_active: boolean;
  settings: TeamSettings;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationChartModel {
  id: string;
  chart_id: string;
  organization_id: string;
  version: number;
  structure: OrganizationChartNode;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ReportingRelationshipModel {
  id: string;
  relationship_id: string;
  organization_id: string;
  manager_id: string;
  employee_id: string;
  relationship_type: string;
  is_active: boolean;
  start_date: Date;
  end_date?: Date;
  created_at: Date;
  updated_at: Date;
}

// --- DTOs (Data Transfer Objects) ---

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

export interface BulkImportRequest {
  type: 'organizations' | 'departments' | 'teams' | 'users';
  data: any[];
  options: {
    updateExisting: boolean;
    skipValidation: boolean;
    dryRun: boolean;
  };
}

export interface BulkExportRequest {
  type: 'organizations' | 'departments' | 'teams' | 'users';
  format: 'csv' | 'excel' | 'json';
  filters?: {
    organizationId?: string;
    departmentId?: string;
    teamId?: string;
    isActive?: boolean;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
}

export interface OrganizationStats {
  totalOrganizations: number;
  activeOrganizations: number;
  inactiveOrganizations: number;
  newThisMonth: number;
  byPlan: Record<SubscriptionPlan, number>;
  averageUsersPerOrg: number;
  totalDepartments: number;
  totalTeams: number;
  totalUsers: number;
}

export interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  inactiveDepartments: number;
  byType: Record<DepartmentType, number>;
  averageTeamsPerDepartment: number;
  averageUsersPerDepartment: number;
}

export interface TeamStats {
  totalTeams: number;
  activeTeams: number;
  inactiveTeams: number;
  byType: Record<TeamType, number>;
  averageUsersPerTeam: number;
  crossFunctionalTeams: number;
}
