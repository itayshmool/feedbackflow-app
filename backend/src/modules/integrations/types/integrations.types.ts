// backend/src/modules/integrations/types/integrations.types.ts

export interface Webhook {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy: RetryPolicy;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  lastSuccessfulDelivery?: Date;
  lastFailedDelivery?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WebhookEvent {
  event: string;
  enabled: boolean;
  filters?: WebhookEventFilter[];
}

export interface WebhookEventFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number; // in milliseconds
  maxDelay: number; // in milliseconds
  backoffMultiplier: number;
  retryableStatusCodes: number[];
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: any;
  status: DeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: Date;
  lastAttemptAt?: Date;
  lastAttemptStatus?: number;
  lastAttemptResponse?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface SlackIntegration {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  botToken: string;
  appToken?: string;
  signingSecret: string;
  teamId: string;
  teamName: string;
  channelId?: string;
  channelName?: string;
  isActive: boolean;
  features: SlackFeature[];
  settings: SlackSettings;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SlackFeature {
  feature: SlackFeatureType;
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface SlackSettings {
  notifications: {
    cycleCreated: boolean;
    cycleActivated: boolean;
    feedbackSubmitted: boolean;
    feedbackAcknowledged: boolean;
  };
  commands: {
    feedback: boolean;
    status: boolean;
    help: boolean;
  };
  channels: {
    defaultChannel?: string;
    allowMultipleChannels: boolean;
  };
  privacy: {
    showUserNames: boolean;
    showFeedbackContent: boolean;
  };
}

export interface SlackMessage {
  channel: string;
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  thread_ts?: string;
  reply_broadcast?: boolean;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: SlackElement[];
  fields?: SlackField[];
}

export interface SlackElement {
  type: string;
  text: string;
  style?: string;
  url?: string;
  action_id?: string;
}

export interface SlackField {
  type: string;
  text: string;
}

export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: SlackField[];
  actions?: SlackAction[];
}

export interface SlackAction {
  type: string;
  text: string;
  url?: string;
  action_id?: string;
  value?: string;
}

// Enums
export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IN = 'in',
  NOT_IN = 'not_in'
}

export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled'
}

export enum SlackFeatureType {
  NOTIFICATIONS = 'notifications',
  COMMANDS = 'commands',
  FEEDBACK_FORMS = 'feedback_forms',
  STATUS_UPDATES = 'status_updates',
  ANALYTICS = 'analytics'
}

export enum WebhookEventType {
  CYCLE_CREATED = 'cycle:created',
  CYCLE_ACTIVATED = 'cycle:activated',
  CYCLE_UPDATED = 'cycle:updated',
  CYCLE_CLOSED = 'cycle:closed',
  FEEDBACK_CREATED = 'feedback:created',
  FEEDBACK_SUBMITTED = 'feedback:submitted',
  FEEDBACK_ACKNOWLEDGED = 'feedback:acknowledged',
  NOTIFICATION_SENT = 'notification:sent',
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated'
}

// Request/Response DTOs
export interface CreateWebhookRequest {
  name: string;
  description?: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: Partial<RetryPolicy>;
}

export interface CreateSlackIntegrationRequest {
  name: string;
  description?: string;
  botToken: string;
  appToken?: string;
  signingSecret: string;
  teamId: string;
  teamName: string;
  channelId?: string;
  channelName?: string;
  features?: SlackFeature[];
  settings?: Partial<SlackSettings>;
}

export interface UpdateWebhookRequest {
  name?: string;
  description?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: Partial<RetryPolicy>;
}

export interface UpdateSlackIntegrationRequest {
  name?: string;
  description?: string;
  channelId?: string;
  channelName?: string;
  features?: SlackFeature[];
  settings?: Partial<SlackSettings>;
  isActive?: boolean;
}

export interface WebhookTestRequest {
  webhookId: string;
  event: string;
  payload?: any;
}

export interface SlackCommandRequest {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id: string;
}

export interface SlackInteractionRequest {
  payload: string; // JSON string
}

export interface WebhookResponse {
  webhooks: Webhook[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SlackIntegrationResponse {
  integrations: SlackIntegration[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface WebhookDeliveryResponse {
  deliveries: WebhookDelivery[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Database Models
export interface WebhookModel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  url: string;
  events: string; // JSON string
  is_active: boolean;
  secret?: string;
  headers?: string; // JSON string
  retry_policy: string; // JSON string
  delivery_attempts: number;
  last_delivery_attempt?: Date;
  last_successful_delivery?: Date;
  last_failed_delivery?: Date;
  failure_reason?: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface WebhookDeliveryModel {
  id: string;
  webhook_id: string;
  event: string;
  payload: string; // JSON string
  status: DeliveryStatus;
  attempts: number;
  max_attempts: number;
  next_retry_at?: Date;
  last_attempt_at?: Date;
  last_attempt_status?: number;
  last_attempt_response?: string;
  created_at: Date;
  completed_at?: Date;
}

export interface SlackIntegrationModel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  bot_token: string;
  app_token?: string;
  signing_secret: string;
  team_id: string;
  team_name: string;
  channel_id?: string;
  channel_name?: string;
  is_active: boolean;
  features: string; // JSON string
  settings: string; // JSON string
  last_sync_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

// Webhook Payload Types
export interface WebhookPayload {
  id: string;
  event: string;
  timestamp: string;
  organizationId: string;
  data: any;
  metadata?: {
    source: string;
    version: string;
    correlationId?: string;
  };
}

// Slack-specific types
export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  email?: string;
  image_24?: string;
  image_32?: string;
  image_48?: string;
  image_72?: string;
  image_192?: string;
  image_512?: string;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
  is_member: boolean;
  num_members?: number;
}

export interface SlackTeam {
  id: string;
  name: string;
  domain: string;
  icon?: {
    image_34?: string;
    image_44?: string;
    image_68?: string;
    image_88?: string;
    image_102?: string;
    image_132?: string;
  };
}

// Integration Statistics
export interface IntegrationStats {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  totalSlackIntegrations: number;
  activeSlackIntegrations: number;
  last24HoursDeliveries: number;
  averageDeliveryTime: number;
}
