// backend/src/modules/feedback/controllers/feedback.controller.ts

import { Request, Response, NextFunction } from 'express';
import { FeedbackService } from '../services/feedback.service.js';

export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  createFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as string;
      const feedback = await this.feedbackService.createFeedback(userId, req.body);
      res.status(201).json(feedback);
    } catch (err) {
      next(err);
    }
  };

  getFeedbackList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as string;
      const { page = 1, limit = 20, ...filters } = req.query as any;
      const list = await this.feedbackService.getFeedbackList(filters, userId, Number(page), Number(limit));
      res.json(list);
    } catch (err) {
      next(err);
    }
  };

  getFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as string;
      const feedback = await this.feedbackService.getFeedbackById(req.params.id, userId);
      res.json(feedback);
    } catch (err) {
      next(err);
    }
  };

  updateFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as string;
      const feedback = await this.feedbackService.updateFeedback(req.params.id, req.body, userId);
      res.json(feedback);
    } catch (err) {
      next(err);
    }
  };

  submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as string;
      const feedback = await this.feedbackService.submitFeedback(req.params.id, userId);
      res.json(feedback);
    } catch (err) {
      next(err);
    }
  };

  deleteFeedback = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as string;
      await this.feedbackService.deleteFeedback(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getFeedbackSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req.params.userId as string) || (req as any).user?.id;
      const { cycleId } = req.query as any;
      const summary = await this.feedbackService.getFeedbackSummary(userId, cycleId);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  };

  // Placeholders for extended endpoints
  getUserFeedbackStats = async (_req: Request, res: Response) => {
    res.json({});
  };

  getDraftFeedbacks = async (_req: Request, res: Response) => {
    res.json([]);
  };

  getPendingFeedbacks = async (_req: Request, res: Response) => {
    res.json([]);
  };

  acknowledgeFeedback = async (_req: Request, res: Response) => {
    res.json({});
  };

  getAcknowledgment = async (_req: Request, res: Response) => {
    res.json({});
  };

  bulkSubmitFeedback = async (_req: Request, res: Response) => {
    res.json({});
  };

  exportFeedback = async (_req: Request, res: Response) => {
    res.json({});
  };
}


