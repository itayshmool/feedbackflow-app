// frontend/src/types/notification.types.ts

export enum NotificationType {
  FEEDBACK_RECEIVED = 'feedback_received',
  FEEDBACK_REMINDER = 'feedback_reminder',
  FEEDBACK_SUBMITTED = 'feedback_submitted',
  FEEDBACK_ACKNOWLEDGED = 'feedback_acknowledged',
  CYCLE_STARTED = 'cycle_started',
  CYCLE_ENDING = 'cycle_ending',
  CYCLE_COMPLETED = 'cycle_completed',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  USER_INVITED = 'user_invited',
  USER_JOINED = 'user_joined',
  GOAL_ASSIGNED = 'goal_assigned',
  GOAL_COMPLETED = 'goal_completed',
  REVIEW_REQUESTED = 'review_requested',
  REVIEW_COMPLETED = 'review_completed'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Notification {
  id: string;
  userId: string;
  userEmail: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, any>;
  isRead: boolean;
  priority: NotificationPriority;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface NotificationFilters {
  isRead?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  limit?: number;
  offset?: number;
}

export interface CreateNotificationRequest {
  userId?: string;
  userEmail?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority?: NotificationPriority;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification;
}

export interface NotificationListResponse {
  success: boolean;
  data: Notification[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface NotificationStatsResponse {
  success: boolean;
  data: NotificationStats;
}
