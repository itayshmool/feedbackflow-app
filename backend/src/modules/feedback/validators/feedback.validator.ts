// backend/src/modules/feedback/validators/feedback.validator.ts

import { body, param, query } from 'express-validator';

export const createFeedbackValidator = [
  body('cycleId').isString().notEmpty(),
  body('toUserId').isString().notEmpty(),
  body('reviewType').isString().notEmpty(),
  body('content.overallComment').isString().notEmpty(),
];

export const updateFeedbackValidator = [
  param('id').isString().notEmpty(),
  body('status').optional().isString(),
];

export const feedbackQueryValidator = [
  query('cycleId').optional().isString(),
  query('fromUserId').optional().isString(),
  query('toUserId').optional().isString(),
  query('reviewType').optional().isString(),
  query('status').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

export const commentValidator = [
  body('content').isString().notEmpty(),
  body('parentCommentId').optional().isString(),
  body('isPrivate').optional().isBoolean(),
];


