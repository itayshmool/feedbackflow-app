// backend/src/modules/auth/routes/profile.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/google-auth.middleware.js';
import { rateLimitMiddleware } from '../../../shared/middleware/rate-limit.middleware.js';

const router = Router();

// Apply authentication to all profile routes
router.use(authMiddleware);

// Apply rate limiting
router.use(rateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many profile requests, please try again later'
}));

/**
 * @route   GET /api/v1/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title || '',
        department: user.department || '',
        organizationId: user.organizationId,
        avatarUrl: user.avatarUrl || 'https://via.placeholder.com/150',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || '',
        timezone: user.timezone || 'UTC',
        language: user.language || 'en',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /api/v1/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    // In a real implementation, update the user in the database
    // For now, return success
    res.json({
      success: true,
      data: {
        ...user,
        ...req.body,
        updatedAt: new Date()
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/v1/profile/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post('/avatar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, handle file upload
    res.json({
      success: true,
      data: {
        avatarUrl: 'https://via.placeholder.com/150'
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/v1/profile/stats
 * @desc    Get user profile statistics
 * @access  Private
 */
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    res.json({
      success: true,
      data: {
        feedbackGiven: 0,
        feedbackReceived: 0,
        cyclesCompleted: 0,
        goalsAchieved: 0,
        teamSize: 0
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;

