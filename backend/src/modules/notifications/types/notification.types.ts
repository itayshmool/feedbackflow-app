// backend/src/modules/notifications/types/notification.types.ts

export interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  content: string;
  data?: Record<string, any>;
  status: NotificationStatus;
  priority: NotificationPriority;
  scheduledFor?: Date;
  sentAt?: Date;
  readAt?: Date;
  templateId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title: string;
  content: string;
  variables: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  organizationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  frequency?: NotificationFrequency;
  quietHours?: QuietHours;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
  days: string[]; // ['monday', 'tuesday', ...]
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    frequency: NotificationFrequency;
    quietHours?: QuietHours;
  };
  inApp: {
    enabled: boolean;
    showBanner: boolean;
    showBadge: boolean;
  };
  sms: {
    enabled: boolean;
    frequency: NotificationFrequency;
    quietHours?: QuietHours;
  };
}

// Enums
export enum NotificationType {
  CYCLE_CREATED = 'cycle_created',
  CYCLE_ACTIVATED = 'cycle_activated',
  CYCLE_REMINDER = 'cycle_reminder',
  CYCLE_DEADLINE = 'cycle_deadline',
  FEEDBACK_REQUESTED = 'feedback_requested',
  FEEDBACK_RECEIVED = 'feedback_received',
  FEEDBACK_ACKNOWLEDGED = 'feedback_acknowledged',
  FEEDBACK_OVERDUE = 'feedback_overdue',
  GOAL_CREATED = 'goal_created',
  GOAL_UPDATED = 'goal_updated',
  SYSTEM_ALERT = 'system_alert',
  USER_WELCOME = 'user_welcome'
}

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  SMS = 'sms',
  PUSH = 'push'
}

export enum NotificationStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never'
}

// Request/Response DTOs
export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  content: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
  scheduledFor?: string;
  templateId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title: string;
  content: string;
  variables: string[];
  isDefault?: boolean;
}

export interface UpdatePreferenceRequest {
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  frequency?: NotificationFrequency;
  quietHours?: QuietHours;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  unreadCount: number;
}

export interface NotificationFilters {
  userId?: string;
  organizationId?: string;
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  dateFrom?: string;
  dateTo?: string;
  unreadOnly?: boolean;
}

export interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  sentToday: number;
  failedToday: number;
  byType: Record<NotificationType, number>;
  byChannel: Record<NotificationChannel, number>;
}

// Database Models
export interface NotificationModel {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  content: string;
  data?: string; // JSON string
  status: NotificationStatus;
  priority: NotificationPriority;
  scheduled_for?: Date;
  sent_at?: Date;
  read_at?: Date;
  template_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationTemplateModel {
  id: string;
  name: string;
  description?: string;
  organization_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title: string;
  content: string;
  variables: string; // JSON string
  is_active: boolean;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface NotificationPreferenceModel {
  id: string;
  user_id: string;
  organization_id: string;
  type: NotificationType;
  channel: NotificationChannel;
  enabled: boolean;
  frequency?: NotificationFrequency;
  quiet_hours?: string; // JSON string
  created_at: Date;
  updated_at: Date;
}
