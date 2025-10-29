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

  // Mock login for local testing (development and test)
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    router.post(
      '/login/mock',
      validationMiddleware([body('email').isEmail()]),
      controller.mockLogin
    );
  }

  return router;
}