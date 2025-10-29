// frontend/src/types/cycles.types.ts

export interface Cycle {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  type: CycleType;
  templateId?: string;
  settings: CycleSettings;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  participants?: number;
  completed?: number;
}

export interface CycleParticipant {
  id: string;
  cycleId: string;
  userId: string;
  role: ParticipantRole;
  assignedBy: string;
  assignedAt: string;
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
  createdAt: string;
  updatedAt: string;
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
  organizationId: string;
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

// Form data interfaces
export interface CycleFormData {
  name: string;
  description: string;
  organizationId: string;
  startDate: string;
  endDate: string;
  type: CycleType;
  templateId?: string;
  settings: {
    allowSelfReview: boolean;
    allowPeerReview: boolean;
    allowManagerReview: boolean;
    allowUpwardReview: boolean;
    requireAcknowledgment: boolean;
    autoCloseAfterDays?: number;
    reminderSettings: {
      enabled: boolean;
      daysBeforeDeadline: number[];
    };
    feedbackSettings: {
      minRatingsRequired: number;
      maxRatingsAllowed: number;
      allowAnonymous: boolean;
      requireComments: boolean;
      categories: string[];
    };
  };
}
