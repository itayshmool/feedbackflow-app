// backend/src/modules/cycles/controllers/cycle.controller.ts

import { Request, Response, NextFunction } from 'express';
import { CycleService } from '../services/cycle.service';
import { CycleValidationService } from '../services/cycle-validation.service';

export class CycleController {
  constructor(
    private cycleService: CycleService,
    private validationService: CycleValidationService
  ) {}

  createCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const cycle = await this.cycleService.createCycle(organizationId, req.body, userId);
      res.status(201).json(cycle);
    } catch (err) {
      next(err);
    }
  };

  getCycleList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20, ...filters } = req.query as any;
      const list = await this.cycleService.getCycleList(organizationId, filters, userId, Number(page), Number(limit));
      res.json(list);
    } catch (err) {
      next(err);
    }
  };

  getCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, organizationId } = (req as any).user;
      const cycle = await this.cycleService.getCycleById(req.params.id, userId, organizationId);
      res.json(cycle);
    } catch (err) {
      next(err);
    }
  };

  updateCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, roles, organizationId } = (req as any).user;
      const cycle = await this.cycleService.updateCycle(req.params.id, req.body, userId, roles, organizationId);
      res.json(cycle);
    } catch (err) {
      next(err);
    }
  };

  deleteCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, roles, organizationId } = (req as any).user;
      await this.cycleService.deleteCycle(req.params.id, userId, roles, organizationId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  activateCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, roles, organizationId } = (req as any).user;
      const cycle = await this.cycleService.activateCycle(req.params.id, userId, roles, organizationId);
      res.json(cycle);
    } catch (err) {
      next(err);
    }
  };

  closeCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, roles, organizationId } = (req as any).user;
      const cycle = await this.cycleService.closeCycle(req.params.id, userId, roles, organizationId);
      res.json(cycle);
    } catch (err) {
      next(err);
    }
  };

  getCycleSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const summary = await this.cycleService.getCycleSummary(organizationId);
      res.json(summary);
    } catch (err) {
      next(err);
    }
  };

  // Participant management endpoints
  getCycleParticipants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, organizationId } = (req as any).user;
      const participants = await this.cycleService.getCycleParticipants(req.params.id, userId, organizationId);
      res.json(participants);
    } catch (err) {
      next(err);
    }
  };

  addCycleParticipants = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, roles, organizationId } = (req as any).user;
      const { participants } = req.body;
      const added = await this.cycleService.addCycleParticipants(req.params.id, participants, userId, roles, organizationId);
      res.status(201).json(added);
    } catch (err) {
      next(err);
    }
  };

  removeCycleParticipant = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: userId, roles, organizationId } = (req as any).user;
      await this.cycleService.removeCycleParticipant(req.params.id, req.params.participantId, userId, roles, organizationId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // Validation endpoint for feedback integration
  validateFeedbackPermission = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cycleId, fromUserId, toUserId, reviewType } = req.body;
      const { organizationId } = (req as any).user;
      const isValid = await this.validationService.validateFeedbackPermission(
        cycleId, fromUserId, toUserId, reviewType, organizationId
      );
      res.json({ valid: isValid });
    } catch (err) {
      next(err);
    }
  };
}
