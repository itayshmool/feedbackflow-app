// backend/src/modules/cycles/types/cycle.types.ts

export interface Cycle {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  status: CycleStatus;
  type: CycleType;
  templateId?: string;
  settings: CycleSettings;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CycleParticipant {
  id: string;
  cycleId: string;
  userId: string;
  role: ParticipantRole;
  assignedBy: string;
  assignedAt: Date;
  status: ParticipantStatus;
  metadata?: Record<string, any>;
}

export interface CycleTemplate {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  type: CycleType;
  settings: CycleSettings;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CycleSettings {
  allowSelfReview: boolean;
  allowPeerReview: boolean;
  allowManagerReview: boolean;
  allowUpwardReview: boolean;
  requireAcknowledgment: boolean;
  autoCloseAfterDays?: number;
  reminderSettings: ReminderSettings;
  feedbackSettings: FeedbackSettings;
}

export interface ReminderSettings {
  enabled: boolean;
  daysBeforeDeadline: number[];
  templateId?: string;
}

export interface FeedbackSettings {
  minRatingsRequired: number;
  maxRatingsAllowed: number;
  allowAnonymous: boolean;
  requireComments: boolean;
  categories: string[];
}

// Enums
export enum CycleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  IN_PROGRESS = 'in_progress',
  CLOSED = 'closed',
  ARCHIVED = 'archived'
}

export enum CycleType {
  ANNUAL = 'annual',
  QUARTERLY = 'quarterly',
  MONTHLY = 'monthly',
  PROJECT_BASED = 'project_based',
  CUSTOM = 'custom'
}

export enum ParticipantRole {
  EMPLOYEE = 'employee',
  MANAGER = 'manager',
  HR = 'hr',
  ADMIN = 'admin'
}

export enum ParticipantStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXCLUDED = 'excluded'
}

// Request/Response DTOs
export interface CreateCycleRequest {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: CycleType;
  templateId?: string;
  settings?: Partial<CycleSettings>;
  participants?: CreateParticipantRequest[];
}

export interface CreateParticipantRequest {
  userId: string;
  role: ParticipantRole;
  metadata?: Record<string, any>;
}

export interface UpdateCycleRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status?: CycleStatus;
  settings?: Partial<CycleSettings>;
}

export interface CycleListResponse {
  cycles: Cycle[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CycleFilters {
  organizationId?: string;
  status?: CycleStatus;
  type?: CycleType;
  createdBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CycleSummary {
  totalCycles: number;
  activeCycles: number;
  completedCycles: number;
  totalParticipants: number;
  completionRate: number;
}

// Database Models
export interface CycleModel {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  start_date: Date;
  end_date: Date;
  status: CycleStatus;
  type: CycleType;
  template_id?: string;
  settings: string; // JSON string
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CycleParticipantModel {
  id: string;
  cycle_id: string;
  user_id: string;
  role: ParticipantRole;
  assigned_by: string;
  assigned_at: Date;
  status: ParticipantStatus;
  metadata?: string; // JSON string
}

export interface CycleTemplateModel {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  type: CycleType;
  settings: string; // JSON string
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}
