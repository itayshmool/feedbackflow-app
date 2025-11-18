// backend/src/modules/feedback/routes/feedback.routes.ts

import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller.js';
import { CommentController } from '../controllers/comment.controller.js';
import { reviewController } from '../controllers/review.controller.js';
import { authMiddleware } from '../../auth/middleware/google-auth.middleware.js';
import { rbacMiddleware } from '../../auth/middleware/rbac.middleware.js';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware.js';
import { rateLimitMiddleware } from '../../../shared/middleware/rate-limit.middleware.js';
import { 
  createFeedbackValidator,
  updateFeedbackValidator,
  feedbackQueryValidator,
  commentValidator 
} from '../validators/feedback.validator.js';

export function createFeedbackRoutes(
  feedbackController: FeedbackController,
  commentController: CommentController
): Router {
  const router = Router();

  // Apply authentication middleware to all feedback routes
  router.use(authMiddleware);

  // Apply rate limiting
  router.use(rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each user to 100 requests per windowMs
    message: 'Too many requests from this user, please try again later'
  }));

  // ===================
  // FEEDBACK CRUD ROUTES
  // ===================

  /**
   * @route   POST /api/v1/feedback
   * @desc    Create new feedback
   * @access  Private (Employee, Manager, HR)
   */
  router.post(
    '/',
    validationMiddleware(createFeedbackValidator),
    rbacMiddleware(['employee', 'manager', 'hr']),
    feedbackController.createFeedback
  );

  /**
   * @route   GET /api/v1/feedback
   * @desc    Get feedback list with filters
   * @access  Private (Employee sees own, Manager sees team, HR sees all)
   */
  router.get(
    '/',
    validationMiddleware(feedbackQueryValidator),
    feedbackController.getFeedbackList
  );

  /**
   * @route   GET /api/v1/feedback/:id
   * @desc    Get specific feedback by ID
   * @access  Private (Author, Recipient, Manager, HR)
   */
  router.get(
    '/:id',
    feedbackController.getFeedback
  );

  /**
   * @route   PUT /api/v1/feedback/:id
   * @desc    Update feedback
   * @access  Private (Author only, before submission)
   */
  router.put(
    '/:id',
    validationMiddleware(updateFeedbackValidator),
    feedbackController.updateFeedback
  );

  /**
   * @route   POST /api/v1/feedback/:id/submit
   * @desc    Submit feedback (change status from draft to submitted)
   * @access  Private (Author only)
   */
  router.post(
    '/:id/submit',
    feedbackController.submitFeedback
  );

  /**
   * @route   DELETE /api/v1/feedback/:id
   * @desc    Delete feedback
   * @access  Private (Author only, before submission)
   */
  router.delete(
    '/:id',
    feedbackController.deleteFeedback
  );

  // ===================
  // FEEDBACK ANALYTICS
  // ===================

  /**
   * @route   GET /api/v1/feedback/summary/:userId?
   * @desc    Get feedback summary for user
   * @access  Private (Own summary, Manager for direct reports, HR for all)
   */
  router.get(
    '/summary/:userId?',
    feedbackController.getFeedbackSummary
  );

  /**
   * @route   GET /api/v1/feedback/stats
   * @desc    Get user feedback statistics (query param: userId)
   * @access  Private (Own stats, Manager for direct reports, HR for all)
   * @note    Must be before other /stats/* routes to match correctly
   */
  router.get(
    '/stats',
    feedbackController.getUserFeedbackStats
  );

  /**
   * @route   GET /api/v1/feedback/stats/user/:userId?
   * @desc    Get user feedback statistics (path param: userId) - DEPRECATED, use /stats?userId=
   * @access  Private (Own stats, Manager for direct reports, HR for all)
   */
  router.get(
    '/stats/user/:userId?',
    feedbackController.getUserFeedbackStats
  );

  // ===================
  // FEEDBACK STATUS
  // ===================

  /**
   * @route   GET /api/v1/feedback/drafts
   * @desc    Get user's draft feedback
   * @access  Private (Own drafts only)
   */
  router.get(
    '/drafts',
    feedbackController.getDraftFeedbacks
  );

  /**
   * @route   GET /api/v1/feedback/pending
   * @desc    Get pending feedback items for user
   * @access  Private (Own pending items only)
   */
  router.get(
    '/pending',
    feedbackController.getPendingFeedbacks
  );

  // ===================
  // FEEDBACK COMMENTS
  // ===================

  /**
   * @route   GET /api/v1/feedback/:feedbackId/comments
   * @desc    Get comments for feedback
   * @access  Private (Author, Recipient, Manager, HR)
   */
  router.get(
    '/:feedbackId/comments',
    commentController.getComments
  );

  /**
   * @route   POST /api/v1/feedback/:feedbackId/comments
   * @desc    Add comment to feedback
   * @access  Private (Author, Recipient, Manager, HR)
   */
  router.post(
    '/:feedbackId/comments',
    validationMiddleware(commentValidator),
    commentController.addComment
  );

  /**
   * @route   PUT /api/v1/feedback/:feedbackId/comments/:commentId
   * @desc    Update comment
   * @access  Private (Comment author only)
   */
  router.put(
    '/:feedbackId/comments/:commentId',
    validationMiddleware(commentValidator),
    commentController.updateComment
  );

  /**
   * @route   DELETE /api/v1/feedback/:feedbackId/comments/:commentId
   * @desc    Delete comment
   * @access  Private (Comment author, HR)
   */
  /**
   * @route   DELETE /api/v1/feedback/:feedbackId/comments/:commentId
   * @desc    Delete comment
   * @access  Private (Comment author, HR)
   */
  router.delete(
    '/:feedbackId/comments/:commentId',
    commentController.deleteComment
  );

  // ===================
  // FEEDBACK ACKNOWLEDGMENT
  // ===================

  /**
   * @route   POST /api/v1/feedback/:id/acknowledge
   * @desc    Acknowledge received feedback
   * @access  Private (Feedback recipient only)
   */
  router.post(
    '/:id/acknowledge',
    feedbackController.acknowledgeFeedback
  );

  /**
   * @route   GET /api/v1/feedback/:id/acknowledgment
   * @desc    Get acknowledgment details
   * @access  Private (Author, Recipient, Manager, HR)
   */
  router.get(
    '/:id/acknowledgment',
    feedbackController.getAcknowledgment
  );

  // ===================
  // BULK OPERATIONS
  // ===================

  /**
   * @route   POST /api/v1/feedback/bulk/submit
   * @desc    Submit multiple feedback items
   * @access  Private (Employee, Manager, HR)
   */
  router.post(
    '/bulk/submit',
    rbacMiddleware(['employee', 'manager', 'hr']),
    feedbackController.bulkSubmitFeedback
  );

  /**
   * @route   GET /api/v1/feedback/export
   * @desc    Export feedback data
   * @access  Private (HR, Manager for own team)
   */
  router.get(
    '/export',
    rbacMiddleware(['hr', 'manager']),
    feedbackController.exportFeedback
  );

  return router;
}

// backend/src/modules/feedback/routes/review.routes.ts

export function createReviewRoutes(): Router {
  const router = Router();

  // Apply authentication middleware
  router.use(authMiddleware);

  // Apply rate limiting
  router.use(rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit for review operations
    message: 'Too many review requests, please try again later'
  }));

  // ===================
  // REVIEW WORKFLOWS
  // ===================

  /**
   * @route   GET /api/v1/reviews/assigned
   * @desc    Get reviews assigned to current user
   * @access  Private (All authenticated users)
   */
  router.get(
    '/assigned',
    reviewController.getAssignedReviews
  );

  /**
   * @route   GET /api/v1/reviews/given
   * @desc    Get reviews given by current user
   * @access  Private (All authenticated users)
   */
  router.get(
    '/given',
    reviewController.getGivenReviews
  );

  /**
   * @route   GET /api/v1/reviews/received
   * @desc    Get reviews received by current user
   * @access  Private (All authenticated users)
   */
  router.get(
    '/received',
    reviewController.getReceivedReviews
  );

  /**
   * @route   POST /api/v1/reviews/:feedbackId/complete
   * @desc    Mark review as complete
   * @access  Private (Review assignee only)
   */
  router.post(
    '/:feedbackId/complete',
    reviewController.completeReview
  );

  /**
   * @route   GET /api/v1/reviews/dashboard
   * @desc    Get review dashboard data for current user
   * @access  Private (All authenticated users)
   */
  router.get(
    '/dashboard',
    reviewController.getReviewDashboard
  );

  // ===================
  // REVIEW TEMPLATES
  // ===================

  /**
   * @route   GET /api/v1/reviews/templates
   * @desc    Get available review templates
   * @access  Private (All authenticated users)
   */
  router.get(
    '/templates',
    reviewController.getReviewTemplates
  );

  /**
   * @route   GET /api/v1/reviews/templates/:reviewType
   * @desc    Get template for specific review type
   * @access  Private (All authenticated users)
   */
  router.get(
    '/templates/:reviewType',
    reviewController.getReviewTemplate
  );

  return router;
}

// Main route aggregator
export function createFeedbackModuleRoutes(
  feedbackController: FeedbackController,
  commentController: CommentController
): Router {
  const router = Router();

  // Mount feedback routes
  router.use('/feedback', createFeedbackRoutes(feedbackController, commentController));
  
  // Mount review routes
  router.use('/reviews', createReviewRoutes());

  return router;
}

// Route configuration with middleware
export const feedbackRoutesConfig = {
  // Rate limiting configuration
  rateLimits: {
    feedback: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
    },
    reviews: {
      windowMs: 15 * 60 * 1000,
      max: 50,
    },
    comments: {
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 30,
    }
  },

  // Permission matrix
  permissions: {
    'feedback:create': ['employee', 'manager', 'hr'],
    'feedback:read': ['employee', 'manager', 'hr'], // with data filtering
    'feedback:update': ['employee', 'manager', 'hr'], // own feedback only
    'feedback:delete': ['employee', 'manager', 'hr'], // own feedback only
    'feedback:submit': ['employee', 'manager', 'hr'],
    'feedback:acknowledge': ['employee', 'manager', 'hr'], // recipient only
    'feedback:export': ['hr', 'manager'], // with scope limitations
    'feedback:bulk': ['hr'],
    'comments:create': ['employee', 'manager', 'hr'],
    'comments:read': ['employee', 'manager', 'hr'],
    'comments:update': ['employee', 'manager', 'hr'], // own comments
    'comments:delete': ['hr'], // and own comments
    'reviews:read': ['employee', 'manager', 'hr'],
    'reviews:complete': ['employee', 'manager', 'hr'],
    'templates:read': ['employee', 'manager', 'hr']
  },

  // Validation schemas per endpoint
  validators: {
    'POST /feedback': createFeedbackValidator,
    'PUT /feedback/:id': updateFeedbackValidator,
    'GET /feedback': feedbackQueryValidator,
    'POST /feedback/:id/comments': commentValidator,
    'PUT /feedback/:id/comments/:commentId': commentValidator
  }
};