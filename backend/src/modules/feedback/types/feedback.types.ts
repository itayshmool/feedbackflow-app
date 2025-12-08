// backend/src/modules/feedback/types/feedback.types.ts

export interface FeedbackBase {
    id: string;
    cycleId: string;
    fromUserId: string;
    toUserId: string;
    reviewType: ReviewType;
    status: FeedbackStatus;
    colorClassification?: FeedbackColorClassification; // Internal triage color (hidden from receiver)
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Feedback extends FeedbackBase {
    content: FeedbackContent;
    ratings: Rating[];
    comments: Comment[];
    acknowledgment?: Acknowledgment;
    goals: Goal[];
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
    createdAt: Date;
    updatedAt: Date;
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
    createdAt: Date;
  }
  
  export interface Comment {
    id: string;
    feedbackId: string;
    userId: string;
    parentCommentId?: string;
    content: string;
    isPrivate: boolean;
    createdAt: Date;
    updatedAt: Date;
    replies?: Comment[];
  }
  
  export interface Goal {
    id: string;
    feedbackId: string;
    title: string;
    description: string;
    category: GoalCategory;
    priority: GoalPriority;
    targetDate: Date;
    status: GoalStatus;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface Acknowledgment {
    id: string;
    feedbackId: string;
    userId: string;
    acknowledgedAt: Date;
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
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface ActionPlanGoal {
    title: string;
    description: string;
    targetDate: Date;
    milestones: string[];
  }
  
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

  // Color classification for internal feedback triage (visible only to giver and managers)
  export enum FeedbackColorClassification {
    GREEN = 'green',   // Exceeds expectations
    YELLOW = 'yellow', // Meets expectations
    RED = 'red'        // Needs improvement
  }
  
  // Request/Response DTOs
  export interface CreateFeedbackRequest {
    cycleId: string;
    toUserId: string;
    reviewType: ReviewType;
    colorClassification?: FeedbackColorClassification; // Internal triage color (hidden from receiver)
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
    colorClassification?: FeedbackColorClassification; // Internal triage color (hidden from receiver)
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
  
  export interface FeedbackListResponse {
    feedbacks: Feedback[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
  
  export interface FeedbackFilters {
    cycleId?: string;
    fromUserId?: string;
    toUserId?: string;
    reviewType?: ReviewType;
    status?: FeedbackStatus;
    dateFrom?: string;
    dateTo?: string;
  }
  
  export interface FeedbackSummary {
    totalFeedback: number;
    completedFeedback: number;
    pendingFeedback: number;
    averageRating: number;
    topStrengths: string[];
    topAreasForImprovement: string[];
    goalCompletionRate: number;
  }
  
  // Database Models
  export interface FeedbackModel {
    id: string;
    cycle_id: string;
    from_user_id: string;
    to_user_id: string;
    review_type: ReviewType;
    status: FeedbackStatus;
    color_classification?: string; // Internal triage color (green/yellow/red)
    created_at: Date;
    updated_at: Date;
  }
  
  export interface FeedbackContentModel {
    id: string;
    feedback_id: string;
    overall_comment: string;
    strengths: string;
    areas_for_improvement: string;
    specific_examples: string;
    recommendations: string;
    confidential: boolean;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface RatingModel {
    id: string;
    feedback_id: string;
    category: string;
    subcategory?: string;
    score: number;
    max_score: number;
    weight: number;
    comment?: string;
    created_at: Date;
  }
  
  export interface CommentModel {
    id: string;
    feedback_id: string;
    user_id: string;
    parent_comment_id?: string;
    content: string;
    is_private: boolean;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface GoalModel {
    id: string;
    feedback_id: string;
    title: string;
    description: string;
    category: GoalCategory;
    priority: GoalPriority;
    target_date: Date;
    status: GoalStatus;
    progress: number;
    created_at: Date;
    updated_at: Date;
  }
  
  export interface AcknowledgmentModel {
    id: string;
    feedback_id: string;
    user_id: string;
    acknowledged_at: Date;
    response?: string;
  }
  
  export interface ActionPlanModel {
    id: string;
    acknowledgment_id: string;
    goals: string; // JSON string
    development_areas: string; // JSON string
    timeline: string;
    support_needed: string; // JSON string
    created_at: Date;
    updated_at: Date;
  }