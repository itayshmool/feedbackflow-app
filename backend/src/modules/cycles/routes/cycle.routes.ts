// backend/src/modules/cycles/routes/cycle.routes.ts

import { Router } from 'express';
import { CycleController } from '../controllers/cycle.controller';
import { authMiddleware } from '../../auth/middleware/google-auth.middleware';
import { rbacMiddleware } from '../../auth/middleware/rbac.middleware';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware';
import { rateLimitMiddleware } from '../../../shared/middleware/rate-limit.middleware';
import { 
  body, 
  param, 
  query 
} from 'express-validator';

export function createCycleRoutes(controller: CycleController): Router {
  const router = Router();

  // Apply authentication middleware to all cycle routes
  router.use(authMiddleware);

  // Apply rate limiting
  router.use(rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each user to 100 requests per windowMs
    message: 'Too many cycle requests, please try again later'
  }));

  // ===================
  // CYCLE CRUD ROUTES
  // ===================

  /**
   * @route   POST /api/v1/cycles
   * @desc    Create new cycle
   * @access  Private (Manager, HR, Admin)
   */
  router.post(
    '/',
    validationMiddleware([
      body('name').isString().notEmpty(),
      body('startDate').isISO8601(),
      body('endDate').isISO8601(),
      body('type').isIn(['annual', 'quarterly', 'monthly', 'project_based', 'custom'])
    ]),
    rbacMiddleware(['manager', 'hr', 'admin']),
    controller.createCycle
  );

  /**
   * @route   GET /api/v1/cycles
   * @desc    Get cycle list with filters
   * @access  Private (All authenticated users)
   */
  router.get(
    '/',
    validationMiddleware([
      query('status').optional().isIn(['draft', 'active', 'in_progress', 'closed', 'archived']),
      query('type').optional().isIn(['annual', 'quarterly', 'monthly', 'project_based', 'custom']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 })
    ]),
    controller.getCycleList
  );

  /**
   * @route   GET /api/v1/cycles/summary
   * @desc    Get cycle summary for organization
   * @access  Private (HR, Admin)
   * @note    MUST be before /:id route to avoid conflict
   */
  router.get(
    '/summary',
    rbacMiddleware(['hr', 'admin']),
    controller.getCycleSummary
  );

  /**
   * @route   GET /api/v1/cycles/:id
   * @desc    Get specific cycle by ID
   * @access  Private (All authenticated users)
   */
  router.get(
    '/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getCycle
  );

  /**
   * @route   PUT /api/v1/cycles/:id
   * @desc    Update cycle
   * @access  Private (Creator, HR, Admin)
   */
  router.put(
    '/:id',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('name').optional().isString().notEmpty(),
      body('startDate').optional().isISO8601(),
      body('endDate').optional().isISO8601(),
      body('status').optional().isIn(['draft', 'active', 'in_progress', 'closed', 'archived'])
    ]),
    controller.updateCycle
  );

  /**
   * @route   DELETE /api/v1/cycles/:id
   * @desc    Delete cycle
   * @access  Private (Creator, HR, Admin)
   */
  router.delete(
    '/:id',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.deleteCycle
  );

  // ===================
  // CYCLE ACTIONS
  // ===================

  /**
   * @route   POST /api/v1/cycles/:id/activate
   * @desc    Activate cycle (change status from draft to active)
   * @access  Private (Creator, HR, Admin)
   */
  router.post(
    '/:id/activate',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.activateCycle
  );

  /**
   * @route   POST /api/v1/cycles/:id/close
   * @desc    Close cycle (change status to closed)
   * @access  Private (Creator, HR, Admin)
   */
  router.post(
    '/:id/close',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.closeCycle
  );

  // ===================
  // PARTICIPANT MANAGEMENT
  // ===================

  /**
   * @route   GET /api/v1/cycles/:id/participants
   * @desc    Get cycle participants
   * @access  Private (All authenticated users)
   */
  router.get(
    '/:id/participants',
    validationMiddleware([
      param('id').isString().notEmpty()
    ]),
    controller.getCycleParticipants
  );

  /**
   * @route   POST /api/v1/cycles/:id/participants
   * @desc    Add participants to cycle
   * @access  Private (Creator, HR, Admin)
   */
  router.post(
    '/:id/participants',
    validationMiddleware([
      param('id').isString().notEmpty(),
      body('participants').isArray()
    ]),
    controller.addCycleParticipants
  );

  /**
   * @route   DELETE /api/v1/cycles/:id/participants/:participantId
   * @desc    Remove participant from cycle
   * @access  Private (Creator, HR, Admin)
   */
  router.delete(
    '/:id/participants/:participantId',
    validationMiddleware([
      param('id').isString().notEmpty(),
      param('participantId').isString().notEmpty()
    ]),
    controller.removeCycleParticipant
  );

  // ===================
  // VALIDATION ENDPOINTS
  // ===================

  /**
   * @route   POST /api/v1/cycles/validate-feedback
   * @desc    Validate if feedback can be given in a cycle
   * @access  Private (All authenticated users)
   */
  router.post(
    '/validate-feedback',
    validationMiddleware([
      body('cycleId').isString().notEmpty(),
      body('fromUserId').isString().notEmpty(),
      body('toUserId').isString().notEmpty(),
      body('reviewType').isString().notEmpty()
    ]),
    controller.validateFeedbackPermission
  );

  return router;
}

// Route configuration
export const cycleRoutesConfig = {
  // Rate limiting configuration
  rateLimits: {
    cycles: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // requests per window
    }
  },

  // Permission matrix
  permissions: {
    'cycles:create': ['hr', 'admin'],
    'cycles:read': ['employee', 'manager', 'hr', 'admin'],
    'cycles:update': ['hr', 'admin'], // with creator override
    'cycles:delete': ['hr', 'admin'], // with creator override
    'cycles:activate': ['hr', 'admin'], // with creator override
    'cycles:close': ['hr', 'admin'], // with creator override
    'cycles:summary': ['hr', 'admin'],
    'cycles:validate': ['employee', 'manager', 'hr', 'admin']
  }
};
