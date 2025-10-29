// backend/src/modules/admin/types/admin.types.ts

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  roles: UserRole[];
  organizationId: string;
  organizationName?: string;
  department?: string;
  position?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  metadata?: Record<string, any>;
}

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
  settings: OrganizationSettings;
  subscription: SubscriptionInfo;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  metadata?: Record<string, any>;
}

export interface OrganizationSettings {
  features: FeatureFlags;
  branding: BrandingSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  integrations: IntegrationSettings;
  limits: SystemLimits;
}

export interface FeatureFlags {
  cycles: boolean;
  feedback: boolean;
  analytics: boolean;
  integrations: boolean;
  customFields: boolean;
  advancedReporting: boolean;
  apiAccess: boolean;
  sso: boolean;
}

export interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  favicon?: string;
  customCss?: string;
  companyName: string;
  supportEmail: string;
  supportUrl?: string;
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  defaultChannels: NotificationChannel[];
  quietHours: QuietHours;
}

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number; // in minutes
  mfaRequired: boolean;
  ipWhitelist?: string[];
  allowedDomains?: string[];
  auditLogging: boolean;
}

export interface IntegrationSettings {
  webhooksEnabled: boolean;
  slackEnabled: boolean;
  ssoEnabled: boolean;
  apiAccessEnabled: boolean;
  customIntegrations: boolean;
}

export interface SystemLimits {
  maxUsers: number;
  maxCycles: number;
  maxFeedbackPerCycle: number;
  maxStorageGB: number;
  maxApiCallsPerMonth: number;
  retentionDays: number;
}

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
  billingEmail: string;
  features: string[];
  limits: SystemLimits;
}

export interface SystemSettings {
  id: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  systemVersion: string;
  lastBackup?: Date;
  backupFrequency: BackupFrequency;
  logLevel: LogLevel;
  monitoring: MonitoringSettings;
  performance: PerformanceSettings;
  security: GlobalSecuritySettings;
  updatedAt: Date;
  updatedBy: string;
}

export interface MonitoringSettings {
  enabled: boolean;
  metricsCollection: boolean;
  errorTracking: boolean;
  performanceMonitoring: boolean;
  alerting: boolean;
  retentionDays: number;
}

export interface PerformanceSettings {
  cacheEnabled: boolean;
  cacheTtl: number; // in seconds
  rateLimiting: boolean;
  compressionEnabled: boolean;
  cdnEnabled: boolean;
}

export interface GlobalSecuritySettings {
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  auditLogging: boolean;
  dataRetention: number; // in days
  complianceMode: ComplianceMode;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  organizationId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface SystemStats {
  users: UserStats;
  organizations: OrganizationStats;
  cycles: CycleStats;
  feedback: FeedbackStats;
  system: SystemHealthStats;
  performance: PerformanceStats;
}

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  byRole: Record<UserRole, number>;
  byOrganization: Array<{ organizationId: string; count: number }>;
}

export interface OrganizationStats {
  total: number;
  active: number;
  inactive: number;
  newThisMonth: number;
  byPlan: Record<SubscriptionPlan, number>;
  averageUsersPerOrg: number;
}

export interface CycleStats {
  total: number;
  active: number;
  completed: number;
  overdue: number;
  averageDuration: number;
  completionRate: number;
}

export interface FeedbackStats {
  total: number;
  pending: number;
  completed: number;
  averageResponseTime: number;
  acknowledgmentRate: number;
}

export interface SystemHealthStats {
  uptime: number; // in seconds
  memoryUsage: number; // percentage
  cpuUsage: number; // percentage
  diskUsage: number; // percentage
  databaseConnections: number;
  activeSessions: number;
}

export interface PerformanceStats {
  averageResponseTime: number; // in milliseconds
  requestsPerMinute: number;
  errorRate: number; // percentage
  cacheHitRate: number; // percentage
  databaseQueryTime: number; // in milliseconds
}

// Enums
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  HR = 'hr',
  MANAGER = 'manager',
  EMPLOYEE = 'employee'
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended'
}

export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  SMS = 'sms',
  PUSH = 'push'
}

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  CONFIGURE = 'configure',
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate'
}

export enum BackupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  MANUAL = 'manual'
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum ComplianceMode {
  NONE = 'none',
  GDPR = 'gdpr',
  HIPAA = 'hipaa',
  SOC2 = 'soc2',
  ISO27001 = 'iso27001'
}

// Request/Response DTOs
export interface CreateUserRequest {
  email: string;
  name: string;
  picture?: string;
  roles: UserRole[];
  organizationId: string;
  department?: string;
  position?: string;
  metadata?: Record<string, any>;
}

export interface UpdateUserRequest {
  name?: string;
  picture?: string;
  roles?: UserRole[];
  department?: string;
  position?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateOrganizationRequest {
  name: string;
  domain?: string;
  logo?: string;
  settings?: Partial<OrganizationSettings>;
  subscription?: Partial<SubscriptionInfo>;
  metadata?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  domain?: string;
  logo?: string;
  settings?: Partial<OrganizationSettings>;
  subscription?: Partial<SubscriptionInfo>;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateSystemSettingsRequest {
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  logLevel?: LogLevel;
  monitoring?: Partial<MonitoringSettings>;
  performance?: Partial<PerformanceSettings>;
  security?: Partial<GlobalSecuritySettings>;
}

export interface UserResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface OrganizationResponse {
  organizations: Organization[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Database Models
export interface AdminUserModel {
  id: string;
  email: string;
  name: string;
  picture?: string;
  roles: string; // JSON string
  organization_id: string;
  organization_name?: string;
  department?: string;
  position?: string;
  is_active: boolean;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  metadata?: string; // JSON string
}

export interface OrganizationModel {
  id: string;
  name: string;
  domain?: string;
  logo?: string;
  settings: string; // JSON string
  subscription: string; // JSON string
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  metadata?: string; // JSON string
}

export interface SystemSettingsModel {
  id: string;
  maintenance_mode: boolean;
  maintenance_message?: string;
  system_version: string;
  last_backup?: Date;
  backup_frequency: BackupFrequency;
  log_level: LogLevel;
  monitoring: string; // JSON string
  performance: string; // JSON string
  security: string; // JSON string
  updated_at: Date;
  updated_by: string;
}

export interface AuditLogModel {
  id: string;
  user_id: string;
  user_email: string;
  organization_id: string;
  action: AuditAction;
  resource: string;
  resource_id?: string;
  details: string; // JSON string
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  success: boolean;
  error_message?: string;
}

// Admin Dashboard Types
export interface AdminDashboard {
  stats: SystemStats;
  recentActivity: AuditLog[];
  systemHealth: SystemHealthStats;
  alerts: SystemAlert[];
  quickActions: QuickAction[];
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  metadata?: Record<string, any>;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
  requiresConfirmation: boolean;
  permissions: UserRole[];
}

export enum AlertType {
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  STORAGE = 'storage',
  USER = 'user',
  INTEGRATION = 'integration'
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Bulk Operations
export interface BulkUserOperation {
  operation: BulkOperation;
  userIds: string[];
  data?: Record<string, any>;
}

export interface BulkOrganizationOperation {
  operation: BulkOperation;
  organizationIds: string[];
  data?: Record<string, any>;
}

export enum BulkOperation {
  ACTIVATE = 'activate',
  DEACTIVATE = 'deactivate',
  DELETE = 'delete',
  UPDATE_ROLES = 'update_roles',
  EXPORT = 'export',
  RESET_PASSWORD = 'reset_password'
}

// Search and Filter Types
export interface UserFilters {
  organizationId?: string;
  roles?: UserRole[];
  isActive?: boolean;
  department?: string;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface OrganizationFilters {
  isActive?: boolean;
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  search?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  domain?: string;
}

export interface AuditLogFilters {
  userId?: string;
  organizationId?: string;
  action?: AuditAction;
  resource?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
}
