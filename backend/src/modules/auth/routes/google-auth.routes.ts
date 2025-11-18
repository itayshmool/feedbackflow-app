// backend/src/modules/auth/routes/google-auth.routes.ts

import { Router } from 'express';
import { GoogleAuthController } from '../controllers/google-auth.controller';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware';
import { body } from 'express-validator';

export function createGoogleAuthRoutes(controller: GoogleAuthController): Router {
  const router = Router();

  router.post(
    '/login/google',
    validationMiddleware([body('idToken').isString().notEmpty()]),
    controller.login
  );

  // Mock login for local testing (always available for development)
  router.post(
    '/login/mock',
    validationMiddleware([body('email').isEmail()]),
    controller.mockLogin
  );

  // Get current authenticated user
  router.get('/me', controller.me);

  // Logout
  router.post('/logout', controller.logout);

  return router;
}