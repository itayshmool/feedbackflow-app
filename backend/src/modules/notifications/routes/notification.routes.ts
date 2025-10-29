// backend/src/modules/notifications/routes/notification.routes.ts

import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../../auth/middleware/google-auth.middleware';
import { rbacMiddleware } from '../../auth/middleware/rbac.middleware';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware';
import { rateLimitMiddleware } from '../../../shared/middleware/rate-limit.middleware';
import { 
  body, 
  param, 
  query 
} from 'express-validator';

export function createNotificationRoutes(controller: NotificationController): Router {
  const router = Router();

  // Apply authentication middleware to all notification routes
  router.use(authMiddleware);

  // Apply rate limiting
  router.use(rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each user to 200 requests per windowMs
    message: 'Too many notification requests, please try again later'
  }));

  // ===================
  // NOTIFICATION CRUD ROUTES
  // ===================

  /**
   * @route   POST /api/v1/notifications
   * @desc    Create new notification
   * @access  Private (HR, Admin)
   */
  router.post(
    '/',
    validationMiddleware([
      body('userId').isString().notEmpty(),
      body('type').isIn(['cycle_created', 'cycle_activated', 'cycle_reminder', 'cycle_deadline', 'feedback_requested', 'feedback_received', 'feedback_acknowledged', 'feedback_overdue', 'goal_created', 'goal_updated', 'system_alert', 'user_welcome']),
      body('channel').isIn(['email', 'in_app', 'sms', 'push']),
      body('title').isString().notEmpty(),
      body('content').isString().notEmpty(),
      body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
      body('scheduledFor').optional().isISO8601()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.createNotification
  );

  /**
   * @route   GET /api/v1/notifications
   * @desc    Get notification list with filters
   * @access  Private (All authenticated users)
   */
  router.get(
    '/',
    validationMiddleware([
      query('type').optional().isIn(['cycle_created', 'cycle_activated', 'cycle_reminder', 'cycle_deadline', 'feedback_requested', 'feedback_received', 'feedback_acknowledged', 'feedback_overdue', 'goal_created', 'goal_updated', 'system_alert', 'user_welcome']),
      query('channel').optional().isIn(['email', 'in_app', 'sms', 'push']),
      query('status').optional().isIn(['pending', 'scheduled', 'sent', 'delivered', 'failed', 'cancelled']),
      query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']),
      query('unreadOnly').optional().isBoolean(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getNotificationList
  );

  /**
   * @route   GET /api/v1/notifications/:id
   * @desc    Get specific notification by ID
   * @access  Private (All authenticated users)
   */
  router.get(
    '/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getNotification
  );

  /**
   * @route   PUT /api/v1/notifications/:id/read
   * @desc    Mark notification as read
   * @access  Private (All authenticated users)
   */
  router.put(
    '/:id/read',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.markAsRead
  );

  /**
   * @route   PUT /api/v1/notifications/read-all
   * @desc    Mark all notifications as read
   * @access  Private (All authenticated users)
   */
  router.put(
    '/read-all',
    controller.markAllAsRead
  );

  /**
   * @route   DELETE /api/v1/notifications/:id
   * @desc    Delete notification
   * @access  Private (All authenticated users)
   */
  router.delete(
    '/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.deleteNotification
  );

  // ===================
  // NOTIFICATION ANALYTICS
  // ===================

  /**
   * @route   GET /api/v1/notifications/stats
   * @desc    Get notification statistics
   * @access  Private (All authenticated users)
   */
  router.get(
    '/stats',
    controller.getNotificationStats
  );

  // ===================
  // TEMPLATE ROUTES
  // ===================

  /**
   * @route   POST /api/v1/notifications/templates
   * @desc    Create notification template
   * @access  Private (HR, Admin)
   */
  router.post(
    '/templates',
    validationMiddleware([
      body('name').isString().notEmpty(),
      body('type').isIn(['cycle_created', 'cycle_activated', 'cycle_reminder', 'cycle_deadline', 'feedback_requested', 'feedback_received', 'feedback_acknowledged', 'feedback_overdue', 'goal_created', 'goal_updated', 'system_alert', 'user_welcome']),
      body('channel').isIn(['email', 'in_app', 'sms', 'push']),
      body('title').isString().notEmpty(),
      body('content').isString().notEmpty(),
      body('variables').isArray()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.createTemplate
  );

  /**
   * @route   GET /api/v1/notifications/templates
   * @desc    Get notification templates
   * @access  Private (All authenticated users)
   */
  router.get(
    '/templates',
    validationMiddleware([
      query('type').optional().isIn(['cycle_created', 'cycle_activated', 'cycle_reminder', 'cycle_deadline', 'feedback_requested', 'feedback_received', 'feedback_acknowledged', 'feedback_overdue', 'goal_created', 'goal_updated', 'system_alert', 'user_welcome']),
      query('channel').optional().isIn(['email', 'in_app', 'sms', 'push'])
    ]),
    controller.getTemplates
  );

  /**
   * @route   GET /api/v1/notifications/templates/:id
   * @desc    Get specific template by ID
   * @access  Private (All authenticated users)
   */
  router.get(
    '/templates/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getTemplate
  );

  /**
   * @route   PUT /api/v1/notifications/templates/:id
   * @desc    Update notification template
   * @access  Private (HR, Admin)
   */
  router.put(
    '/templates/:id',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('name').optional().isString().notEmpty(),
      body('title').optional().isString().notEmpty(),
      body('content').optional().isString().notEmpty(),
      body('variables').optional().isArray()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.updateTemplate
  );

  /**
   * @route   DELETE /api/v1/notifications/templates/:id
   * @desc    Delete notification template
   * @access  Private (HR, Admin)
   */
  router.delete(
    '/templates/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.deleteTemplate
  );

  /**
   * @route   POST /api/v1/notifications/templates/:id/activate
   * @desc    Activate notification template
   * @access  Private (HR, Admin)
   */
  router.post(
    '/templates/:id/activate',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.activateTemplate
  );

  /**
   * @route   POST /api/v1/notifications/templates/:id/deactivate
   * @desc    Deactivate notification template
   * @access  Private (HR, Admin)
   */
  router.post(
    '/templates/:id/deactivate',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.deactivateTemplate
  );

  // ===================
  // PREFERENCE ROUTES
  // ===================

  /**
   * @route   GET /api/v1/notifications/preferences
   * @desc    Get user notification preferences
   * @access  Private (All authenticated users)
   */
  router.get(
    '/preferences',
    controller.getPreferences
  );

  /**
   * @route   PUT /api/v1/notifications/preferences
   * @desc    Update notification preference
   * @access  Private (All authenticated users)
   */
  router.put(
    '/preferences',
    validationMiddleware([
      body('type').isIn(['cycle_created', 'cycle_activated', 'cycle_reminder', 'cycle_deadline', 'feedback_requested', 'feedback_received', 'feedback_acknowledged', 'feedback_overdue', 'goal_created', 'goal_updated', 'system_alert', 'user_welcome']),
      body('channel').isIn(['email', 'in_app', 'sms', 'push']),
      body('enabled').isBoolean(),
      body('frequency').optional().isIn(['immediate', 'daily', 'weekly', 'never'])
    ]),
    controller.updatePreference
  );

  /**
   * @route   PUT /api/v1/notifications/preferences/bulk
   * @desc    Update multiple notification preferences
   * @access  Private (All authenticated users)
   */
  router.put(
    '/preferences/bulk',
    validationMiddleware([
      body('preferences').isArray(),
      body('preferences.*.type').isIn(['cycle_created', 'cycle_activated', 'cycle_reminder', 'cycle_deadline', 'feedback_requested', 'feedback_received', 'feedback_acknowledged', 'feedback_overdue', 'goal_created', 'goal_updated', 'system_alert', 'user_welcome']),
      body('preferences.*.channel').isIn(['email', 'in_app', 'sms', 'push']),
      body('preferences.*.enabled').isBoolean()
    ]),
    controller.updateBulkPreferences
  );

  /**
   * @route   GET /api/v1/notifications/settings
   * @desc    Get user notification settings summary
   * @access  Private (All authenticated users)
   */
  router.get(
    '/settings',
    controller.getSettings
  );

  /**
   * @route   DELETE /api/v1/notifications/preferences/:id
   * @desc    Delete notification preference
   * @access  Private (All authenticated users)
   */
  router.delete(
    '/preferences/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.deletePreference
  );

  return router;
}

// Route configuration
export const notificationRoutesConfig = {
  // Rate limiting configuration
  rateLimits: {
    notifications: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // requests per window
    }
  },

  // Permission matrix
  permissions: {
    'notifications:create': ['hr', 'admin'],
    'notifications:read': ['employee', 'manager', 'hr', 'admin'],
    'notifications:update': ['employee', 'manager', 'hr', 'admin'], // Users can update their own
    'notifications:delete': ['employee', 'manager', 'hr', 'admin'], // Users can delete their own
    'notifications:templates': ['hr', 'admin'],
    'notifications:preferences': ['employee', 'manager', 'hr', 'admin'],
    'notifications:stats': ['employee', 'manager', 'hr', 'admin']
  }
};
