// Frontend Feedback Types

// Enums
export enum ReviewType {
  SELF_ASSESSMENT = 'self_assessment',
  MANAGER_REVIEW = 'manager_review',
  PEER_REVIEW = 'peer_review',
  UPWARD_REVIEW = 'upward_review',
  THREE_SIXTY_REVIEW = '360_review',
  PROJECT_REVIEW = 'project_review'
}

export enum FeedbackStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  COMPLETED = 'completed',
  ACKNOWLEDGED = 'acknowledged',
  ARCHIVED = 'archived'
}

export enum GoalCategory {
  TECHNICAL_SKILLS = 'technical_skills',
  SOFT_SKILLS = 'soft_skills',
  LEADERSHIP = 'leadership',
  COMMUNICATION = 'communication',
  PERFORMANCE = 'performance',
  CAREER_DEVELOPMENT = 'career_development'
}

export enum GoalPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Core Interfaces
export interface Feedback {
  id: string;
  cycleId: string;
  fromUserId: string;
  fromUserEmail?: string;
  toUserId: string;
  toUserEmail?: string;
  reviewType: ReviewType;
  status: FeedbackStatus;
  content: FeedbackContent;
  ratings: Rating[];
  comments: Comment[];
  acknowledgment?: Acknowledgment;
  goals: Goal[];
  createdAt: string;
  updatedAt: string;
  // Populated fields
  fromUser?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  toUser?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  cycle?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  };
}

export interface FeedbackContent {
  id: string;
  feedbackId: string;
  overallComment: string;
  strengths: string[];
  areasForImprovement: string[];
  specificExamples: string[];
  recommendations: string[];
  confidential: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Rating {
  id: string;
  feedbackId: string;
  category: string;
  subcategory?: string;
  score: number;
  maxScore: number;
  weight: number;
  comment?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  feedbackId: string;
  userId: string;
  parentCommentId?: string;
  content: string;
  isPrivate: boolean;
  type?: 'general' | 'workflow';
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export interface Goal {
  id: string;
  feedbackId: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  targetDate: string;
  status: GoalStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Acknowledgment {
  id: string;
  feedbackId: string;
  userId: string;
  acknowledgedAt: string;
  response?: string;
  actionPlan?: ActionPlan;
}

export interface ActionPlan {
  id: string;
  acknowledgmentId: string;
  goals: ActionPlanGoal[];
  developmentAreas: string[];
  timeline: string;
  supportNeeded: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionPlanGoal {
  title: string;
  description: string;
  targetDate: string;
  milestones: string[];
}

// Request DTOs
export interface CreateFeedbackRequest {
  cycleId: string;
  toUserEmail: string;
  reviewType: ReviewType;
  content: {
    overallComment: string;
    strengths: string[];
    areasForImprovement: string[];
    specificExamples: string[];
    recommendations: string[];
    confidential?: boolean;
  };
  ratings: CreateRatingRequest[];
  goals?: CreateGoalRequest[];
}

export interface CreateRatingRequest {
  category: string;
  subcategory?: string;
  score: number;
  maxScore: number;
  weight?: number;
  comment?: string;
}

export interface CreateGoalRequest {
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  targetDate: string;
}

export interface UpdateFeedbackRequest {
  content?: Partial<{
    overallComment: string;
    strengths: string[];
    areasForImprovement: string[];
    specificExamples: string[];
    recommendations: string[];
    confidential: boolean;
  }>;
  ratings?: UpdateRatingRequest[];
  goals?: UpdateGoalRequest[];
  status?: FeedbackStatus;
  comments?: Comment[];
}

export interface UpdateRatingRequest {
  id?: string;
  category: string;
  subcategory?: string;
  score: number;
  maxScore: number;
  weight?: number;
  comment?: string;
}

export interface UpdateGoalRequest {
  id?: string;
  title: string;
  description: string;
  category: GoalCategory;
  priority: GoalPriority;
  targetDate: string;
  status?: GoalStatus;
  progress?: number;
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
  isPrivate?: boolean;
}

export interface AcknowledgeFeedbackRequest {
  response?: string;
  actionPlan?: {
    goals: ActionPlanGoal[];
    developmentAreas: string[];
    timeline: string;
    supportNeeded: string[];
  };
}

// Filter and Query Types
export interface FeedbackFilters {
  cycleId?: string;
  fromUserId?: string;
  toUserId?: string;
  toUserEmail?: string;
  reviewType?: ReviewType;
  status?: FeedbackStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Response Types
export interface FeedbackListResponse {
  data: Feedback[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FeedbackSummary {
  totalFeedback: number;
  feedbackByStatus: {
    status: FeedbackStatus;
    count: number;
  }[];
  feedbackByType: {
    type: ReviewType;
    count: number;
  }[];
  averageRatings: {
    category: string;
    averageScore: number;
    count: number;
  }[];
  recentFeedback: Feedback[];
}

export interface FeedbackStats {
  given: number;
  received: number;
  pending: number;
  drafts: number;
  averageRating: number;
  completionRate: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: string;
}

