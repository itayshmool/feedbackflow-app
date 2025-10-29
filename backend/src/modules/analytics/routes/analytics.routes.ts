// backend/src/modules/analytics/routes/analytics.routes.ts

import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware } from '../../auth/middleware/google-auth.middleware';
import { rbacMiddleware } from '../../auth/middleware/rbac.middleware';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware';
import { rateLimitMiddleware } from '../../../shared/middleware/rate-limit.middleware';
import { 
  body, 
  param, 
  query 
} from 'express-validator';

export function createAnalyticsRoutes(controller: AnalyticsController): Router {
  const router = Router();

  // Apply authentication middleware to all analytics routes
  router.use(authMiddleware);

  // Apply rate limiting
  router.use(rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each user to 150 requests per windowMs
    message: 'Too many analytics requests, please try again later'
  }));

  // ===================
  // ANALYTICS METRICS ROUTES
  // ===================

  /**
   * @route   POST /api/v1/analytics/metrics
   * @desc    Create analytics metric
   * @access  Private (HR, Admin)
   */
  router.post(
    '/metrics',
    validationMiddleware([
      body('name').isString().notEmpty(),
      body('category').isIn(['cycle', 'feedback', 'notification', 'user', 'system']),
      body('type').isIn(['count', 'percentage', 'average', 'sum', 'rate', 'trend']),
      body('value').isNumeric(),
      body('period.type').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
      body('period.start').isISO8601(),
      body('period.end').isISO8601()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.createMetric
  );

  /**
   * @route   GET /api/v1/analytics/metrics
   * @desc    Get analytics metrics with filters
   * @access  Private (All authenticated users)
   */
  router.get(
    '/metrics',
    validationMiddleware([
      query('category').optional().isIn(['cycle', 'feedback', 'notification', 'user', 'system']),
      query('type').optional().isIn(['count', 'percentage', 'average', 'sum', 'rate', 'trend']),
      query('periodType').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
      query('dateFrom').optional().isISO8601(),
      query('dateTo').optional().isISO8601(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getMetrics
  );

  /**
   * @route   GET /api/v1/analytics/metrics/:id
   * @desc    Get specific metric by ID
   * @access  Private (All authenticated users)
   */
  router.get(
    '/metrics/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getMetric
  );

  /**
   * @route   GET /api/v1/analytics/metrics/:metricName/trends
   * @desc    Get metric trends over time
   * @access  Private (All authenticated users)
   */
  router.get(
    '/metrics/:metricName/trends',
    validationMiddleware([
      param('metricName').isString().notEmpty(),
      query('periodType').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']),
      query('periods').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getMetricTrends
  );

  /**
   * @route   GET /api/v1/analytics/metrics/:metricName/comparison
   * @desc    Compare metric between two periods
   * @access  Private (All authenticated users)
   */
  router.get(
    '/metrics/:metricName/comparison',
    validationMiddleware([
      param('metricName').isString().notEmpty(),
      query('currentStart').isISO8601(),
      query('currentEnd').isISO8601(),
      query('previousStart').isISO8601(),
      query('previousEnd').isISO8601()
    ]),
    controller.getMetricComparison
  );

  /**
   * @route   DELETE /api/v1/analytics/metrics/:id
   * @desc    Delete analytics metric
   * @access  Private (HR, Admin)
   */
  router.delete(
    '/metrics/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.deleteMetric
  );

  /**
   * @route   POST /api/v1/analytics/metrics/calculate
   * @desc    Trigger metrics calculation
   * @access  Private (HR, Admin)
   */
  router.post(
    '/metrics/calculate',
    rbacMiddleware(['hr', 'admin']),
    controller.calculateMetrics
  );

  // ===================
  // SPECIFIC ANALYTICS ROUTES
  // ===================

  /**
   * @route   GET /api/v1/analytics/cycles
   * @desc    Get cycle analytics
   * @access  Private (All authenticated users)
   */
  router.get(
    '/cycles',
    validationMiddleware([
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601()
    ]),
    controller.getCycleAnalytics
  );

  /**
   * @route   GET /api/v1/analytics/feedback
   * @desc    Get feedback analytics
   * @access  Private (All authenticated users)
   */
  router.get(
    '/feedback',
    validationMiddleware([
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601()
    ]),
    controller.getFeedbackAnalytics
  );

  /**
   * @route   GET /api/v1/analytics/notifications
   * @desc    Get notification analytics
   * @access  Private (All authenticated users)
   */
  router.get(
    '/notifications',
    validationMiddleware([
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601()
    ]),
    controller.getNotificationAnalytics
  );

  /**
   * @route   GET /api/v1/analytics/users
   * @desc    Get user analytics
   * @access  Private (All authenticated users)
   */
  router.get(
    '/users',
    validationMiddleware([
      query('startDate').optional().isISO8601(),
      query('endDate').optional().isISO8601()
    ]),
    controller.getUserAnalytics
  );

  // ===================
  // DASHBOARD ROUTES
  // ===================

  /**
   * @route   POST /api/v1/analytics/dashboards
   * @desc    Create dashboard
   * @access  Private (All authenticated users)
   */
  router.post(
    '/dashboards',
    validationMiddleware([
      body('name').isString().notEmpty(),
      body('widgets').optional().isArray(),
      body('layout').optional().isObject(),
      body('filters').optional().isObject()
    ]),
    controller.createDashboard
  );

  /**
   * @route   GET /api/v1/analytics/dashboards
   * @desc    Get user dashboards
   * @access  Private (All authenticated users)
   */
  router.get(
    '/dashboards',
    validationMiddleware([
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getDashboards
  );

  /**
   * @route   GET /api/v1/analytics/dashboards/public
   * @desc    Get public dashboards
   * @access  Private (All authenticated users)
   */
  router.get(
    '/dashboards/public',
    controller.getPublicDashboards
  );

  /**
   * @route   GET /api/v1/analytics/dashboards/default
   * @desc    Get default dashboard
   * @access  Private (All authenticated users)
   */
  router.get(
    '/dashboards/default',
    controller.getDefaultDashboard
  );

  /**
   * @route   GET /api/v1/analytics/dashboards/:id
   * @desc    Get specific dashboard
   * @access  Private (All authenticated users)
   */
  router.get(
    '/dashboards/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getDashboard
  );

  /**
   * @route   PUT /api/v1/analytics/dashboards/:id
   * @desc    Update dashboard
   * @access  Private (All authenticated users)
   */
  router.put(
    '/dashboards/:id',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('name').optional().isString().notEmpty(),
      body('widgets').optional().isArray(),
      body('layout').optional().isObject(),
      body('filters').optional().isObject()
    ]),
    controller.updateDashboard
  );

  /**
   * @route   DELETE /api/v1/analytics/dashboards/:id
   * @desc    Delete dashboard
   * @access  Private (All authenticated users)
   */
  router.delete(
    '/dashboards/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.deleteDashboard
  );

  /**
   * @route   POST /api/v1/analytics/dashboards/:id/default
   * @desc    Set dashboard as default
   * @access  Private (HR, Admin)
   */
  router.post(
    '/dashboards/:id/default',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.setDefaultDashboard
  );

  /**
   * @route   POST /api/v1/analytics/dashboards/:id/duplicate
   * @desc    Duplicate dashboard
   * @access  Private (All authenticated users)
   */
  router.post(
    '/dashboards/:id/duplicate',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('name').isString().notEmpty()
    ]),
    controller.duplicateDashboard
  );

  // ===================
  // REPORT ROUTES
  // ===================

  /**
   * @route   POST /api/v1/analytics/reports
   * @desc    Create report
   * @access  Private (HR, Admin)
   */
  router.post(
    '/reports',
    validationMiddleware([
      body('name').isString().notEmpty(),
      body('type').isIn(['cycle_summary', 'feedback_analysis', 'user_engagement', 'notification_effectiveness', 'custom']),
      body('format').isIn(['pdf', 'excel', 'csv', 'json']),
      body('metrics').isArray().notEmpty(),
      body('recipients').isArray().notEmpty(),
      body('schedule').optional().isObject()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.createReport
  );

  /**
   * @route   GET /api/v1/analytics/reports
   * @desc    Get reports
   * @access  Private (All authenticated users)
   */
  router.get(
    '/reports',
    validationMiddleware([
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getReports
  );

  /**
   * @route   GET /api/v1/analytics/reports/type/:type
   * @desc    Get reports by type
   * @access  Private (All authenticated users)
   */
  router.get(
    '/reports/type/:type',
    validationMiddleware([
      param('type').isIn(['cycle_summary', 'feedback_analysis', 'user_engagement', 'notification_effectiveness', 'custom'])
    ]),
    controller.getReportsByType
  );

  /**
   * @route   GET /api/v1/analytics/reports/:id
   * @desc    Get specific report
   * @access  Private (All authenticated users)
   */
  router.get(
    '/reports/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getReport
  );

  /**
   * @route   PUT /api/v1/analytics/reports/:id
   * @desc    Update report
   * @access  Private (HR, Admin)
   */
  router.put(
    '/reports/:id',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('name').optional().isString().notEmpty(),
      body('type').optional().isIn(['cycle_summary', 'feedback_analysis', 'user_engagement', 'notification_effectiveness', 'custom']),
      body('format').optional().isIn(['pdf', 'excel', 'csv', 'json']),
      body('metrics').optional().isArray().notEmpty(),
      body('recipients').optional().isArray().notEmpty(),
      body('schedule').optional().isObject()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.updateReport
  );

  /**
   * @route   DELETE /api/v1/analytics/reports/:id
   * @desc    Delete report
   * @access  Private (HR, Admin)
   */
  router.delete(
    '/reports/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.deleteReport
  );

  /**
   * @route   POST /api/v1/analytics/reports/:id/activate
   * @desc    Activate report
   * @access  Private (HR, Admin)
   */
  router.post(
    '/reports/:id/activate',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.activateReport
  );

  /**
   * @route   POST /api/v1/analytics/reports/:id/deactivate
   * @desc    Deactivate report
   * @access  Private (HR, Admin)
   */
  router.post(
    '/reports/:id/deactivate',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.deactivateReport
  );

  /**
   * @route   POST /api/v1/analytics/reports/:id/generate
   * @desc    Generate report
   * @access  Private (All authenticated users)
   */
  router.post(
    '/reports/:id/generate',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.generateReport
  );

  return router;
}

// Route configuration
export const analyticsRoutesConfig = {
  // Rate limiting configuration
  rateLimits: {
    analytics: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 150, // requests per window
    }
  },

  // Permission matrix
  permissions: {
    'analytics:metrics:create': ['hr', 'admin'],
    'analytics:metrics:read': ['employee', 'manager', 'hr', 'admin'],
    'analytics:metrics:delete': ['hr', 'admin'],
    'analytics:metrics:calculate': ['hr', 'admin'],
    'analytics:dashboards:create': ['employee', 'manager', 'hr', 'admin'],
    'analytics:dashboards:read': ['employee', 'manager', 'hr', 'admin'],
    'analytics:dashboards:update': ['employee', 'manager', 'hr', 'admin'],
    'analytics:dashboards:delete': ['employee', 'manager', 'hr', 'admin'],
    'analytics:dashboards:default': ['hr', 'admin'],
    'analytics:reports:create': ['hr', 'admin'],
    'analytics:reports:read': ['employee', 'manager', 'hr', 'admin'],
    'analytics:reports:update': ['hr', 'admin'],
    'analytics:reports:delete': ['hr', 'admin'],
    'analytics:reports:generate': ['employee', 'manager', 'hr', 'admin']
  }
};
