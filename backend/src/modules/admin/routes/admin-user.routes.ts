// backend/src/modules/admin/routes/admin-user.routes.ts

import { Router } from 'express';
import { AdminUserController } from '../controllers/admin-user.controller.js';
import { authenticateToken } from '../../../shared/middleware/auth.middleware.js';
import { requireRole } from '../../../shared/middleware/rbac.middleware.js';
import { validateRequest } from '../../../shared/middleware/validation.middleware.js';
import { z } from 'zod';

// Factory function to create routes with optional controller injection for testing
export function createAdminUserRoutes(controller?: AdminUserController): Router {
  const router = Router();
  const userController = controller || new AdminUserController();

  // Apply authentication and admin role requirement to all routes
  router.use(authenticateToken);
  router.use(requireRole(['admin', 'super_admin']));

  // User management routes
  router.get('/users', userController.getUsers.bind(userController));
  router.get('/users/stats', userController.getUserStats.bind(userController));
  router.get('/users/export', userController.exportUsers.bind(userController));
  router.get('/users/:id', userController.getUserById.bind(userController));
  router.post('/users', userController.createUser.bind(userController));
  router.put('/users/:id', userController.updateUser.bind(userController));
  router.delete('/users/:id', userController.deleteUser.bind(userController));

  // Bulk operations
  router.post('/users/bulk', userController.bulkUpdateUsers.bind(userController));
  router.post('/users/import', userController.importUsers.bind(userController));

  // User role management
  router.get('/users/:userId/roles', userController.getUserRoles.bind(userController));
  router.post('/users/:userId/roles', userController.assignUserRole.bind(userController));
  router.delete('/users/:userId/roles/:roleId', userController.removeUserRole.bind(userController));

  // Role management routes
  router.get('/roles', userController.getRoles.bind(userController));
  router.get('/roles/:id', userController.getRoleById.bind(userController));
  router.post('/roles', userController.createRole.bind(userController));
  router.put('/roles/:id', userController.updateRole.bind(userController));
  router.delete('/roles/:id', userController.deleteRole.bind(userController));

  return router;
}

