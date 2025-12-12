// backend/src/modules/feedback/services/feedback.service.ts
/**
 * @deprecated NOT USED IN PRODUCTION
 * 
 * This service uses stub models (FeedbackModelClass, etc.) that return
 * empty/null values. Production feedback functionality is implemented
 * directly in real-database-server.ts with actual SQL queries.
 * 
 * Only kept for legacy test compatibility.
 */

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { 
  Feedback,
  FeedbackModel,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  FeedbackFilters,
  FeedbackListResponse,
  FeedbackSummary,
  FeedbackStatus,
  ReviewType
} from '../types/feedback.types.js';
import { FeedbackModelClass } from '../models/feedback.model.js';
import { FeedbackContentModelClass } from '../models/feedback-content.model.js';
import { RatingService } from './rating.service.js';
import { GoalService } from './goal.service.js';
import { CommentService } from './comment.service.js';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors.js';
import { Logger } from '../../../shared/utils/logger.js';

export class FeedbackService {
  private feedbackModel: FeedbackModelClass;
  private contentModel: FeedbackContentModelClass;
  private ratingService: RatingService;
  private goalService: GoalService;
  private commentService: CommentService;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.feedbackModel = new FeedbackModelClass(db);
    this.contentModel = new FeedbackContentModelClass(db);
    this.ratingService = new RatingService(db);
    this.goalService = new GoalService(db);
    this.commentService = new CommentService(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createFeedback(
    fromUserId: string,
    request: CreateFeedbackRequest
  ): Promise<Feedback> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate cycle exists and user has permission
      await this.validateCyclePermission(request.cycleId, fromUserId, request.toUserId, client);
      
      // Create feedback record
      const feedbackData: Omit<FeedbackModel, 'id' | 'created_at' | 'updated_at'> = {
        cycle_id: request.cycleId,
        from_user_id: fromUserId,
        to_user_id: request.toUserId,
        review_type: request.reviewType,
        status: FeedbackStatus.DRAFT
      };
      
      const feedback = await this.feedbackModel.create(feedbackData, client);
      
      // Create feedback content
      const contentData = {
        feedback_id: feedback.id,
        overall_comment: request.content.overallComment,
        strengths: JSON.stringify(request.content.strengths || []),
        areas_for_improvement: JSON.stringify(request.content.areasForImprovement || []),
        specific_examples: JSON.stringify(request.content.specificExamples || []),
        recommendations: JSON.stringify(request.content.recommendations || []),
        confidential: request.content.confidential || false
      };
      
      const content = await this.contentModel.create(contentData, client);
      
      // Create ratings if provided
      const ratings = [];
      if (request.ratings && request.ratings.length > 0) {
        for (const ratingReq of request.ratings) {
          const rating = await this.ratingService.create(feedback.id, ratingReq, client);
          ratings.push(rating);
        }
      }
      
      // Create goals if provided
      const goals = [];
      if (request.goals && request.goals.length > 0) {
        for (const goalReq of request.goals) {
          const goal = await this.goalService.create(feedback.id, goalReq, client);
          goals.push(goal);
        }
      }
      
      await client.query('COMMIT');
      
      const completeFeedback = await this.getFeedbackById(feedback.id);
      
      // Emit feedback created event
      this.eventEmitter.emit('feedback:created', {
        feedback: completeFeedback,
        fromUserId,
        toUserId: request.toUserId,
        cycleId: request.cycleId
      });
      
      this.logger.info('Feedback created', { 
        feedbackId: feedback.id, 
        fromUserId, 
        toUserId: request.toUserId 
      });
      
      return completeFeedback;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating feedback', { error, fromUserId, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async getFeedbackById(id: string, requestingUserId?: string): Promise<Feedback> {
    const feedback = await this.feedbackModel.findById(id);
    
    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }
    
    // Check if user has permission to view this feedback
    if (requestingUserId && !this.hasViewPermission(feedback, requestingUserId)) {
      throw new ForbiddenError('Insufficient permission to view this feedback');
    }
    
    return this.buildCompleteFeedback(feedback);
  }

  async getFeedbackList(
    filters: FeedbackFilters,
    requestingUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<FeedbackListResponse> {
    // Apply user-specific filters based on permissions
    const userFilters = await this.applyUserFilters(filters, requestingUserId);
    
    const { feedbacks, total } = await this.feedbackModel.findWithFilters(userFilters, page, limit);
    
    const completeFeedbacks = await Promise.all(
      feedbacks.map((feedback: FeedbackModel) => this.buildCompleteFeedback(feedback))
    );
    
    return {
      feedbacks: completeFeedbacks,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  async updateFeedback(
    id: string,
    updates: UpdateFeedbackRequest,
    requestingUserId: string
  ): Promise<Feedback> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const existingFeedback = await this.feedbackModel.findById(id, client);
      if (!existingFeedback) {
        throw new NotFoundError('Feedback not found');
      }
      
      // Check if user has permission to update
      if (existingFeedback.from_user_id !== requestingUserId) {
        throw new ForbiddenError('Only feedback author can update feedback');
      }
      
      // Check if feedback can be updated (not completed/acknowledged)
      if (existingFeedback.status === FeedbackStatus.COMPLETED || 
          existingFeedback.status === FeedbackStatus.ACKNOWLEDGED) {
        throw new ValidationError('Cannot update completed or acknowledged feedback');
      }
      
      // Update feedback status if provided
      if (updates.status) {
        await this.feedbackModel.update(id, { status: updates.status }, client);
      }
      
      // Update content if provided
      if (updates.content) {
        const contentUpdates: any = {};
        
        if (updates.content.overallComment !== undefined) {
          contentUpdates.overall_comment = updates.content.overallComment;
        }
        if (updates.content.strengths !== undefined) {
          contentUpdates.strengths = JSON.stringify(updates.content.strengths);
        }
        if (updates.content.areasForImprovement !== undefined) {
          contentUpdates.areas_for_improvement = JSON.stringify(updates.content.areasForImprovement);
        }
        if (updates.content.specificExamples !== undefined) {
          contentUpdates.specific_examples = JSON.stringify(updates.content.specificExamples);
        }
        if (updates.content.recommendations !== undefined) {
          contentUpdates.recommendations = JSON.stringify(updates.content.recommendations);
        }
        if (updates.content.confidential !== undefined) {
          contentUpdates.confidential = updates.content.confidential;
        }
        
        await this.contentModel.update(id, contentUpdates, client);
      }
      
      // Update ratings if provided
      if (updates.ratings) {
        await this.ratingService.updateForFeedback(id, updates.ratings, client);
      }
      
      // Update goals if provided
      if (updates.goals) {
        await this.goalService.updateForFeedback(id, updates.goals, client);
      }
      
      await client.query('COMMIT');
      
      const updatedFeedback = await this.getFeedbackById(id);
      
      // Emit feedback updated event
      this.eventEmitter.emit('feedback:updated', {
        feedback: updatedFeedback,
        updatedBy: requestingUserId,
        changes: updates
      });
      
      this.logger.info('Feedback updated', { 
        feedbackId: id, 
        updatedBy: requestingUserId 
      });
      
      return updatedFeedback;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating feedback', { error, feedbackId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async submitFeedback(id: string, requestingUserId: string): Promise<Feedback> {
    const feedback = await this.feedbackModel.findById(id);
    
    if (!feedback) {
      throw new NotFoundError('Feedback not found');
    }
    
    if (feedback.from_user_id !== requestingUserId) {
      throw new ForbiddenError('Only feedback author can submit feedback');
    }
    
    if (feedback.status !== FeedbackStatus.DRAFT) {
      throw new ValidationError('Only draft feedback can be submitted');
    }
    
    // Validate feedback completeness
    await this.validateFeedbackCompleteness(id);
    
    const updatedFeedback = await this.feedbackModel.update(id, {
      status: FeedbackStatus.SUBMITTED
    });
    
    if (!updatedFeedback) {
      throw new Error('Failed to update feedback status');
    }
    
    const completeFeedback = await this.getFeedbackById(id);
    
    // Emit feedback submitted event
    this.eventEmitter.emit('feedback:submitted', {
      feedback: completeFeedback,
      submittedBy: requestingUserId
    });
    
    this.logger.info('Feedback submitted', { 
      feedbackId: id, 
      submittedBy: requestingUserId 
    });
    
    return completeFeedback;
  }

  async deleteFeedback(id: string, requestingUserId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const feedback = await this.feedbackModel.findById(id, client);
      if (!feedback) {
        throw new NotFoundError('Feedback not found');
      }
      
      // Check permissions
      if (feedback.from_user_id !== requestingUserId) {
        throw new ForbiddenError('Only feedback author can delete feedback');
      }
      
      // Check if feedback can be deleted
      if (feedback.status === FeedbackStatus.COMPLETED || 
          feedback.status === FeedbackStatus.ACKNOWLEDGED) {
        throw new ValidationError('Cannot delete completed or acknowledged feedback');
      }
      
      // Delete related data (cascade should handle this, but being explicit)
      await this.commentService.deleteByFeedbackId(id, client);
      await this.goalService.deleteByFeedbackId(id, client);
      await this.ratingService.deleteByFeedbackId(id, client);
      await this.contentModel.delete(id, client);
      
      // Delete feedback
      const deleted = await this.feedbackModel.delete(id, client);
      
      if (!deleted) {
        throw new Error('Failed to delete feedback');
      }
      
      await client.query('COMMIT');
      
      // Emit feedback deleted event
      this.eventEmitter.emit('feedback:deleted', {
        feedbackId: id,
        deletedBy: requestingUserId,
        feedback
      });
      
      this.logger.info('Feedback deleted', { 
        feedbackId: id, 
        deletedBy: requestingUserId 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting feedback', { error, feedbackId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async getFeedbackSummary(userId: string, cycleId?: string): Promise<FeedbackSummary> {
    // Get basic stats
    const stats = cycleId 
      ? await this.feedbackModel.getStatsByCycle(cycleId)
      : await this.feedbackModel.getStatsByUser(userId);
    
    // Get aggregated feedback data
    const filters: FeedbackFilters = cycleId 
      ? { cycleId, status: FeedbackStatus.COMPLETED }
      : { toUserId: userId, status: FeedbackStatus.COMPLETED };
    
    const { feedbacks } = await this.feedbackModel.findWithFilters(filters, 1, 100);
    
    // Calculate aggregated insights
    const allRatings = [];
    const allStrengths = [];
    const allAreasForImprovement = [];
    const allGoals = [];
    
    for (const feedback of feedbacks) {
      const completeFeedback = await this.buildCompleteFeedback(feedback);
      allRatings.push(...completeFeedback.ratings);
      allStrengths.push(...completeFeedback.content.strengths);
      allAreasForImprovement.push(...completeFeedback.content.areasForImprovement);
      allGoals.push(...completeFeedback.goals);
    }
    
    // Calculate average rating
    const averageRating = allRatings.length > 0 
      ? allRatings.reduce((sum, rating) => sum + (rating.score / rating.maxScore * 100), 0) / allRatings.length
      : 0;
    
    // Get top strengths and areas for improvement
    const strengthCounts = this.countOccurrences(allStrengths);
    const improvementCounts = this.countOccurrences(allAreasForImprovement);
    
    const topStrengths = Object.entries(strengthCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([strength]) => strength);
    
    const topAreasForImprovement = Object.entries(improvementCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([area]) => area);
    
    // Calculate goal completion rate
    const completedGoals = allGoals.filter(goal => goal.status === 'completed').length;
    const goalCompletionRate = allGoals.length > 0 ? (completedGoals / allGoals.length) * 100 : 0;
    
    return {
      totalFeedback: stats.totalFeedback || stats.totalReceived || 0,
      completedFeedback: stats.completedFeedback || 0,
      pendingFeedback: stats.pendingFeedback || stats.pendingToComplete || 0,
      averageRating: Math.round(averageRating * 100) / 100,
      topStrengths,
      topAreasForImprovement,
      goalCompletionRate: Math.round(goalCompletionRate * 100) / 100
    };
  }

  // Private helper methods

  private async buildCompleteFeedback(feedback: FeedbackModel): Promise<Feedback> {
    const [content, ratings, comments, goals, acknowledgment] = await Promise.all([
      this.contentModel.findByFeedbackId(feedback.id),
      this.ratingService.findByFeedbackId(feedback.id),
      this.commentService.findByFeedbackId(feedback.id),
      this.goalService.findByFeedbackId(feedback.id),
      // TODO: Add acknowledgment service call when implemented
      Promise.resolve(undefined)
    ]);
    
    if (!content) {
      throw new Error(`Feedback content not found for feedback ${feedback.id}`);
    }
    
    return {
      id: feedback.id,
      cycleId: feedback.cycle_id,
      fromUserId: feedback.from_user_id,
      toUserId: feedback.to_user_id,
      reviewType: feedback.review_type,
      status: feedback.status,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
      content: {
        id: content.id,
        feedbackId: content.feedback_id,
        overallComment: content.overall_comment,
        strengths: JSON.parse(content.strengths || '[]'),
        areasForImprovement: JSON.parse(content.areas_for_improvement || '[]'),
        specificExamples: JSON.parse(content.specific_examples || '[]'),
        recommendations: JSON.parse(content.recommendations || '[]'),
        confidential: content.confidential,
        createdAt: content.created_at,
        updatedAt: content.updated_at
      },
      ratings: (ratings || []).map(rating => ({
        id: rating.id,
        feedbackId: rating.feedback_id,
        category: rating.category,
        subcategory: rating.subcategory,
        score: rating.score,
        maxScore: rating.max_score,
        weight: rating.weight,
        comment: rating.comment,
        createdAt: rating.created_at
      })),
      comments: (comments || []).map(comment => ({
        id: comment.id,
        feedbackId: comment.feedback_id,
        userId: comment.user_id,
        parentCommentId: comment.parent_comment_id,
        content: comment.content,
        isPrivate: comment.is_private,
        createdAt: comment.created_at,
        updatedAt: comment.updated_at
      })),
      goals: (goals || []).map(goal => ({
        id: goal.id,
        feedbackId: goal.feedback_id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        targetDate: goal.target_date,
        status: goal.status,
        progress: goal.progress,
        createdAt: goal.created_at,
        updatedAt: goal.updated_at
      })),
      acknowledgment
    };
  }

  private hasViewPermission(feedback: FeedbackModel, userId: string): boolean {
    // Users can view feedback they gave or received
    return feedback.from_user_id === userId || feedback.to_user_id === userId;
    // TODO: Add manager/HR permissions when user hierarchy is implemented
  }

  private async applyUserFilters(
    filters: FeedbackFilters, 
    requestingUserId: string
  ): Promise<FeedbackFilters> {
    // For now, users can only see feedback they're involved in
    // TODO: Expand based on user role and permissions
    
    const userFilters = { ...filters };
    
    if (!filters.fromUserId && !filters.toUserId) {
      // If no specific user filters, show feedback where user is involved
      // This will require a more complex query - for now, prioritize received feedback
      userFilters.toUserId = requestingUserId;
    }
    
    return userFilters;
  }

  private async validateCyclePermission(
    cycleId: string, 
    fromUserId: string, 
    toUserId: string, 
    client: PoolClient
  ): Promise<void> {
    if (!cycleId || !fromUserId || !toUserId) {
      throw new ValidationError('Invalid cycle or user parameters');
    }
    
    if (fromUserId === toUserId) {
      throw new ValidationError('Users cannot give feedback to themselves');
    }
    
    // TODO: Integrate with CycleValidationService
    // For now, we'll do basic validation
    // In a real implementation, this would call:
    // await this.cycleValidationService.validateFeedbackPermission(cycleId, fromUserId, toUserId, reviewType)
  }

  private async validateFeedbackCompleteness(feedbackId: string): Promise<void> {
    const content = await this.contentModel.findByFeedbackId(feedbackId);
    
    if (!content) {
      throw new ValidationError('Feedback content is required');
    }
    
    if (!content.overall_comment || content.overall_comment.trim().length === 0) {
      throw new ValidationError('Overall comment is required');
    }
    
    // TODO: Add more validation rules based on feedback type and cycle requirements
  }

  private countOccurrences(items: string[]): Record<string, number> {
    return items.reduce((acc, item) => {
      const trimmed = item.trim().toLowerCase();
      if (trimmed.length > 0) {
        acc[trimmed] = (acc[trimmed] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
  }
}