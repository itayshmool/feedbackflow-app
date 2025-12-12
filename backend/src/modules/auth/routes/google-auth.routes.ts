// backend/src/modules/auth/routes/google-auth.routes.ts

import { Router } from 'express';
import { GoogleAuthController } from '../controllers/google-auth.controller';
import { validationMiddleware } from '../../../shared/middleware/validation.middleware';
import { rateLimit } from '../../../shared/middleware/rate-limit.middleware';
import { body } from 'express-validator';

// Strict rate limit for authentication endpoints (prevents credential stuffing/brute force)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // Strict in production, lenient in dev/test
  message: 'Too many authentication attempts, please try again later'
});

// Less strict rate limit for session endpoints
const sessionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 requests per 15 minutes per IP
  message: 'Too many requests, please try again later'
});

export function createGoogleAuthRoutes(controller: GoogleAuthController): Router {
  const router = Router();

  router.post(
    '/login/google',
    authRateLimit, // Strict rate limit
    validationMiddleware([body('idToken').isString().notEmpty()]),
    controller.login
  );

  // Mock login for local testing (always available for development)
  router.post(
    '/login/mock',
    authRateLimit, // Strict rate limit - same protection even in dev
    validationMiddleware([body('email').isEmail()]),
    controller.mockLogin
  );

  // Get current authenticated user
  router.get('/me', sessionRateLimit, controller.me);

  // Refresh access token using refresh token
  // Rate limited but more generous than login (users will call this frequently)
  router.post('/refresh', sessionRateLimit, controller.refresh);

  // Logout
  router.post('/logout', sessionRateLimit, controller.logout);

  return router;
}