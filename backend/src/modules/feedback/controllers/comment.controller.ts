// backend/src/modules/feedback/controllers/comment.controller.ts

import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service.js';

export class CommentController {
  constructor(private commentService: CommentService) {}

  getComments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const comments = await this.commentService.findByFeedbackId(req.params.feedbackId);
      res.json(comments);
    } catch (err) {
      next(err);
    }
  };

  addComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id as string;
      const comment = await this.commentService.addComment(req.params.feedbackId, userId, req.body);
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  };

  updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await this.commentService.updateComment(req.params.commentId, req.body.content);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  };

  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.commentService.deleteComment(req.params.commentId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}


