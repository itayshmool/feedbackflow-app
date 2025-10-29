// backend/src/modules/integrations/routes/integrations.routes.ts

import { Router } from 'express';
import { IntegrationsController } from '../controllers/integrations.controller';
import { authMiddleware } from '../../auth/middleware/google-auth.middleware';
import { rbacMiddleware } from '../../auth/middleware/rbac.middleware';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware';
import { rateLimitMiddleware } from '../../../shared/middleware/rate-limit.middleware';
import { 
  body, 
  param, 
  query 
} from 'express-validator';

export function createIntegrationsRoutes(controller: IntegrationsController): Router {
  const router = Router();

  // Apply authentication middleware to all integration routes (except Slack webhooks)
  router.use((req, res, next) => {
    // Skip auth for Slack webhook endpoints
    if (req.path.startsWith('/slack/')) {
      return next();
    }
    return authMiddleware(req, res, next);
  });

  // Apply rate limiting
  router.use(rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each user to 200 requests per windowMs
    message: 'Too many integration requests, please try again later'
  }));

  // ===================
  // WEBHOOK ROUTES
  // ===================

  /**
   * @route   POST /api/v1/integrations/webhooks
   * @desc    Create webhook
   * @access  Private (HR, Admin)
   */
  router.post(
    '/webhooks',
    validationMiddleware([
      body('name').isString().notEmpty(),
      body('url').isURL(),
      body('events').isArray().notEmpty(),
      body('events.*').isString().notEmpty(),
      body('secret').optional().isString(),
      body('headers').optional().isObject(),
      body('retryPolicy').optional().isObject()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.createWebhook
  );

  /**
   * @route   GET /api/v1/integrations/webhooks
   * @desc    Get webhooks
   * @access  Private (All authenticated users)
   */
  router.get(
    '/webhooks',
    validationMiddleware([
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getWebhooks
  );

  /**
   * @route   GET /api/v1/integrations/webhooks/:id
   * @desc    Get specific webhook
   * @access  Private (All authenticated users)
   */
  router.get(
    '/webhooks/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getWebhook
  );

  /**
   * @route   PUT /api/v1/integrations/webhooks/:id
   * @desc    Update webhook
   * @access  Private (HR, Admin)
   */
  router.put(
    '/webhooks/:id',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('name').optional().isString().notEmpty(),
      body('url').optional().isURL(),
      body('events').optional().isArray().notEmpty(),
      body('events.*').optional().isString().notEmpty(),
      body('isActive').optional().isBoolean(),
      body('secret').optional().isString(),
      body('headers').optional().isObject(),
      body('retryPolicy').optional().isObject()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.updateWebhook
  );

  /**
   * @route   DELETE /api/v1/integrations/webhooks/:id
   * @desc    Delete webhook
   * @access  Private (HR, Admin)
   */
  router.delete(
    '/webhooks/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.deleteWebhook
  );

  /**
   * @route   POST /api/v1/integrations/webhooks/:id/test
   * @desc    Test webhook
   * @access  Private (HR, Admin)
   */
  router.post(
    '/webhooks/:id/test',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('event').isString().notEmpty(),
      body('payload').optional().isObject()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.testWebhook
  );

  /**
   * @route   GET /api/v1/integrations/webhooks/:id/deliveries
   * @desc    Get webhook deliveries
   * @access  Private (All authenticated users)
   */
  router.get(
    '/webhooks/:id/deliveries',
    validationMiddleware([
      param('id').isString().notEmpty(),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getWebhookDeliveries
  );

  // ===================
  // SLACK INTEGRATION ROUTES
  // ===================

  /**
   * @route   POST /api/v1/integrations/slack
   * @desc    Create Slack integration
   * @access  Private (HR, Admin)
   */
  router.post(
    '/slack',
    validationMiddleware([
      body('name').isString().notEmpty(),
      body('botToken').isString().notEmpty(),
      body('signingSecret').isString().notEmpty(),
      body('teamId').isString().notEmpty(),
      body('teamName').isString().notEmpty(),
      body('appToken').optional().isString(),
      body('channelId').optional().isString(),
      body('channelName').optional().isString(),
      body('features').optional().isArray(),
      body('settings').optional().isObject()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.createSlackIntegration
  );

  /**
   * @route   GET /api/v1/integrations/slack
   * @desc    Get Slack integrations
   * @access  Private (All authenticated users)
   */
  router.get(
    '/slack',
    validationMiddleware([
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getSlackIntegrations
  );

  /**
   * @route   GET /api/v1/integrations/slack/:id
   * @desc    Get specific Slack integration
   * @access  Private (All authenticated users)
   */
  router.get(
    '/slack/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getSlackIntegration
  );

  /**
   * @route   PUT /api/v1/integrations/slack/:id
   * @desc    Update Slack integration
   * @access  Private (HR, Admin)
   */
  router.put(
    '/slack/:id',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('name').optional().isString().notEmpty(),
      body('channelId').optional().isString(),
      body('channelName').optional().isString(),
      body('features').optional().isArray(),
      body('settings').optional().isObject(),
      body('isActive').optional().isBoolean()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.updateSlackIntegration
  );

  /**
   * @route   DELETE /api/v1/integrations/slack/:id
   * @desc    Delete Slack integration
   * @access  Private (HR, Admin)
   */
  router.delete(
    '/slack/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.deleteSlackIntegration
  );

  /**
   * @route   POST /api/v1/integrations/slack/:id/message
   * @desc    Send Slack message
   * @access  Private (HR, Admin)
   */
  router.post(
    '/slack/:id/message',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('message').isObject(),
      body('message.channel').isString().notEmpty(),
      body('message.text').optional().isString(),
      body('message.blocks').optional().isArray()
    ]),
    rbacMiddleware(['hr', 'admin']),
    controller.sendSlackMessage
  );

  // ===================
  // SLACK WEBHOOK ROUTES (No authentication required)
  // ===================

  /**
   * @route   POST /api/v1/integrations/slack/command
   * @desc    Handle Slack slash commands
   * @access  Public (Slack webhook)
   */
  router.post(
    '/slack/command',
    validationMiddleware([
      body('token').isString().notEmpty(),
      body('team_id').isString().notEmpty(),
      body('channel_id').isString().notEmpty(),
      body('user_id').isString().notEmpty(),
      body('command').isString().notEmpty(),
      body('text').isString(),
      body('response_url').isURL()
    ]),
    controller.handleSlackCommand
  );

  /**
   * @route   POST /api/v1/integrations/slack/interaction
   * @desc    Handle Slack interactions (button clicks, form submissions)
   * @access  Public (Slack webhook)
   */
  router.post(
    '/slack/interaction',
    validationMiddleware([
      body('payload').isString().notEmpty()
    ]),
    controller.handleSlackInteraction
  );

  // ===================
  // INTEGRATION STATS
  // ===================

  /**
   * @route   GET /api/v1/integrations/stats
   * @desc    Get integration statistics
   * @access  Private (All authenticated users)
   */
  router.get(
    '/stats',
    controller.getIntegrationStats
  );

  return router;
}

// Route configuration
export const integrationsRoutesConfig = {
  // Rate limiting configuration
  rateLimits: {
    integrations: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // requests per window
    },
    slackWebhooks: {
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 100, // requests per window
    }
  },

  // Permission matrix
  permissions: {
    'integrations:webhooks:create': ['hr', 'admin'],
    'integrations:webhooks:read': ['employee', 'manager', 'hr', 'admin'],
    'integrations:webhooks:update': ['hr', 'admin'],
    'integrations:webhooks:delete': ['hr', 'admin'],
    'integrations:webhooks:test': ['hr', 'admin'],
    'integrations:slack:create': ['hr', 'admin'],
    'integrations:slack:read': ['employee', 'manager', 'hr', 'admin'],
    'integrations:slack:update': ['hr', 'admin'],
    'integrations:slack:delete': ['hr', 'admin'],
    'integrations:slack:message': ['hr', 'admin'],
    'integrations:stats:read': ['employee', 'manager', 'hr', 'admin']
  },

  // Webhook event types
  webhookEvents: [
    'cycle:created',
    'cycle:activated',
    'cycle:updated',
    'cycle:closed',
    'feedback:created',
    'feedback:submitted',
    'feedback:acknowledged',
    'notification:sent',
    'user:created',
    'user:updated'
  ],

  // Slack features
  slackFeatures: [
    'notifications',
    'commands',
    'feedback_forms',
    'status_updates',
    'analytics'
  ]
};
