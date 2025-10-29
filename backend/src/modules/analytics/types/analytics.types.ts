// backend/src/modules/analytics/types/analytics.types.ts

export interface AnalyticsMetric {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: MetricCategory;
  type: MetricType;
  value: number;
  unit?: string;
  metadata?: Record<string, any>;
  period: TimePeriod;
  periodStart: Date;
  periodEnd: Date;
  calculatedAt: Date;
}

export interface Dashboard {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  widgets: DashboardWidget[];
  layout: DashboardLayout;
  filters: DashboardFilters;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  dataSource: string;
  refreshInterval?: number; // in seconds
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gap: number;
}

export interface DashboardFilters {
  dateRange?: DateRange;
  departments?: string[];
  roles?: string[];
  cycleIds?: string[];
  userIds?: string[];
}

export interface Report {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  schedule?: ReportSchedule;
  filters: ReportFilters;
  metrics: string[];
  recipients: string[];
  isActive: boolean;
  lastGenerated?: Date;
  nextGeneration?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
  time: string; // HH:mm format
  timezone: string;
}

export interface ReportFilters {
  dateRange?: DateRange;
  departments?: string[];
  roles?: string[];
  cycleIds?: string[];
  userIds?: string[];
  includeInactive?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TimePeriod {
  type: PeriodType;
  start: Date;
  end: Date;
}

// Enums
export enum MetricCategory {
  CYCLE = 'cycle',
  FEEDBACK = 'feedback',
  NOTIFICATION = 'notification',
  USER = 'user',
  SYSTEM = 'system'
}

export enum MetricType {
  COUNT = 'count',
  PERCENTAGE = 'percentage',
  AVERAGE = 'average',
  SUM = 'sum',
  RATE = 'rate',
  TREND = 'trend'
}

export enum PeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom'
}

export enum WidgetType {
  METRIC_CARD = 'metric_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  TABLE = 'table',
  HEATMAP = 'heatmap',
  GAUGE = 'gauge',
  TREND = 'trend'
}

export enum WidgetSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  EXTRA_LARGE = 'extra_large'
}

export enum ReportType {
  CYCLE_SUMMARY = 'cycle_summary',
  FEEDBACK_ANALYSIS = 'feedback_analysis',
  USER_ENGAGEMENT = 'user_engagement',
  NOTIFICATION_EFFECTIVENESS = 'notification_effectiveness',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json'
}

export enum ScheduleFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  MANUAL = 'manual'
}

// Request/Response DTOs
export interface CreateDashboardRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  widgets?: CreateWidgetRequest[];
  layout?: Partial<DashboardLayout>;
  filters?: Partial<DashboardFilters>;
}

export interface CreateWidgetRequest {
  type: WidgetType;
  title: string;
  description?: string;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  dataSource: string;
  refreshInterval?: number;
}

export interface CreateReportRequest {
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  schedule?: ReportSchedule;
  filters?: Partial<ReportFilters>;
  metrics: string[];
  recipients: string[];
}

export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetConfig {
  [key: string]: any;
}

export interface AnalyticsFilters {
  organizationId?: string;
  category?: MetricCategory;
  type?: MetricType;
  periodType?: PeriodType;
  dateFrom?: string;
  dateTo?: string;
  departments?: string[];
  roles?: string[];
  cycleIds?: string[];
  userIds?: string[];
}

export interface MetricResponse {
  metrics: AnalyticsMetric[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DashboardResponse {
  dashboards: Dashboard[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReportResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Specific Analytics Data Types
export interface CycleAnalytics {
  totalCycles: number;
  activeCycles: number;
  completedCycles: number;
  averageCycleDuration: number;
  completionRate: number;
  participationRate: number;
  overdueCycles: number;
  cycleTrends: TrendData[];
  departmentBreakdown: DepartmentMetrics[];
}

export interface FeedbackAnalytics {
  totalFeedback: number;
  pendingFeedback: number;
  completedFeedback: number;
  averageResponseTime: number;
  acknowledgmentRate: number;
  qualityScore: number;
  feedbackTrends: TrendData[];
  categoryBreakdown: CategoryMetrics[];
  responseRateByRole: RoleMetrics[];
}

export interface NotificationAnalytics {
  totalNotifications: number;
  sentNotifications: number;
  deliveredNotifications: number;
  failedNotifications: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  channelBreakdown: ChannelMetrics[];
  typeBreakdown: TypeMetrics[];
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userEngagement: number;
  averageSessionDuration: number;
  featureAdoption: FeatureMetrics[];
  roleDistribution: RoleDistribution[];
  departmentDistribution: DepartmentDistribution[];
}

export interface TrendData {
  period: string;
  value: number;
  change?: number;
  changePercentage?: number;
}

export interface DepartmentMetrics {
  department: string;
  count: number;
  percentage: number;
  trend: number;
}

export interface CategoryMetrics {
  category: string;
  count: number;
  percentage: number;
  averageScore: number;
}

export interface RoleMetrics {
  role: string;
  count: number;
  percentage: number;
  averageResponseTime: number;
}

export interface ChannelMetrics {
  channel: string;
  count: number;
  percentage: number;
  successRate: number;
}

export interface TypeMetrics {
  type: string;
  count: number;
  percentage: number;
  engagementRate: number;
}

export interface FeatureMetrics {
  feature: string;
  users: number;
  percentage: number;
  trend: number;
}

export interface RoleDistribution {
  role: string;
  count: number;
  percentage: number;
}

export interface DepartmentDistribution {
  department: string;
  count: number;
  percentage: number;
}

// Database Models
export interface AnalyticsMetricModel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  category: MetricCategory;
  type: MetricType;
  value: number;
  unit?: string;
  metadata?: string; // JSON string
  period_type: PeriodType;
  period_start: Date;
  period_end: Date;
  calculated_at: Date;
}

export interface DashboardModel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  is_public: boolean;
  widgets: string; // JSON string
  layout: string; // JSON string
  filters: string; // JSON string
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ReportModel {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: ReportType;
  format: ReportFormat;
  schedule?: string; // JSON string
  filters: string; // JSON string
  metrics: string; // JSON string
  recipients: string; // JSON string
  is_active: boolean;
  last_generated?: Date;
  next_generation?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
