// backend/src/modules/feedback/controllers/review.controller.ts

import { Request, Response } from 'express';

export const reviewController = {
  getAssignedReviews: async (_req: Request, res: Response) => {
    res.json([]);
  },

  getGivenReviews: async (_req: Request, res: Response) => {
    res.json([]);
  },

  getReceivedReviews: async (_req: Request, res: Response) => {
    res.json([]);
  },

  completeReview: async (_req: Request, res: Response) => {
    res.json({});
  },

  getReviewDashboard: async (_req: Request, res: Response) => {
    res.json({});
  },

  getReviewTemplates: async (_req: Request, res: Response) => {
    res.json([]);
  },

  getReviewTemplate: async (_req: Request, res: Response) => {
    res.json({});
  },
};


