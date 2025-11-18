// backend/src/modules/hierarchy/routes/hierarchy.routes.ts

import { Router } from 'express';
import { HierarchyController } from '../controllers/hierarchy.controller.js';
import { authMiddleware } from '../../auth/middleware/google-auth.middleware.js';
import { rbacMiddleware } from '../../auth/middleware/rbac.middleware.js';
import { rateLimitMiddleware } from '../../../shared/middleware/rate-limit.middleware.js';

export function createHierarchyRoutes(controller: HierarchyController): Router {
  const router = Router();

  // Apply authentication middleware to all hierarchy routes
  router.use(authMiddleware);

  // Apply rate limiting
  router.use(rateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each user to 100 requests per windowMs
    message: 'Too many hierarchy requests, please try again later'
  }));

  /**
   * @route   GET /api/v1/hierarchy/tree/:organizationId
   * @desc    Get organizational hierarchy tree
   * @access  Private (All authenticated users)
   */
  router.get('/tree/:organizationId', controller.getHierarchyTree);

  /**
   * @route   GET /api/v1/hierarchy/direct-reports/:managerId
   * @desc    Get direct reports for a manager
   * @access  Private (All authenticated users)
   */
  router.get('/direct-reports/:managerId', controller.getDirectReports);

  /**
   * @route   GET /api/v1/hierarchy/manager-chain/:employeeId
   * @desc    Get manager chain for an employee
   * @access  Private (All authenticated users)
   */
  router.get('/manager-chain/:employeeId', controller.getManagerChain);

  /**
   * @route   GET /api/v1/hierarchy/stats/:organizationId
   * @desc    Get hierarchy statistics
   * @access  Private (All authenticated users)
   */
  router.get('/stats/:organizationId', controller.getHierarchyStats);

  /**
   * @route   GET /api/v1/hierarchy/validate/:organizationId
   * @desc    Validate hierarchy structure
   * @access  Private (All authenticated users)
   */
  router.get('/validate/:organizationId', controller.validateHierarchy);

  /**
   * @route   GET /api/v1/hierarchy/search-employees
   * @desc    Search employees for hierarchy assignment
   * @access  Private (All authenticated users)
   * @query   organizationId, q, role (optional), exclude (optional comma-separated IDs)
   */
  router.get('/search-employees', controller.searchEmployees);

  /**
   * @route   POST /api/v1/hierarchy
   * @desc    Create hierarchy relationship
   * @access  Private (HR, Admin)
   */
  router.post(
    '/',
    rbacMiddleware(['hr', 'admin']),
    controller.createHierarchy
  );

  /**
   * @route   PUT /api/v1/hierarchy/:id
   * @desc    Update hierarchy relationship
   * @access  Private (HR, Admin)
   */
  router.put(
    '/:id',
    rbacMiddleware(['hr', 'admin']),
    controller.updateHierarchy
  );

  /**
   * @route   DELETE /api/v1/hierarchy/:id
   * @desc    Delete hierarchy relationship
   * @access  Private (HR, Admin)
   */
  router.delete(
    '/:id',
    rbacMiddleware(['hr', 'admin']),
    controller.deleteHierarchy
  );

  /**
   * @route   POST /api/v1/hierarchy/bulk
   * @desc    Bulk update hierarchy relationships
   * @access  Private (HR, Admin)
   */
  router.post(
    '/bulk',
    rbacMiddleware(['hr', 'admin']),
    controller.bulkUpdateHierarchy
  );

  return router;
}

