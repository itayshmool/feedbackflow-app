// backend/src/modules/integrations/controllers/integrations.controller.ts

import { Request, Response, NextFunction } from 'express';
import { WebhookService } from '../services/webhook.service';
import { SlackService } from '../services/slack.service';

export class IntegrationsController {
  constructor(
    private webhookService: WebhookService,
    private slackService: SlackService
  ) {}

  // ===================
  // WEBHOOK ENDPOINTS
  // ===================

  createWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const webhook = await this.webhookService.createWebhook(organizationId, req.body, userId);
      res.status(201).json(webhook);
    } catch (err) {
      next(err);
    }
  };

  getWebhooks = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20 } = req.query as any;
      const response = await this.webhookService.getWebhooks(organizationId, userId, Number(page), Number(limit));
      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  getWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const webhook = await this.webhookService.getWebhookById(req.params.id, userId);
      res.json(webhook);
    } catch (err) {
      next(err);
    }
  };

  updateWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const webhook = await this.webhookService.updateWebhook(req.params.id, req.body, userId);
      res.json(webhook);
    } catch (err) {
      next(err);
    }
  };

  deleteWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.webhookService.deleteWebhook(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  testWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const { event, payload } = req.body;
      const result = await this.webhookService.testWebhook(req.params.id, event, payload, userId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  getWebhookDeliveries = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20 } = req.query as any;
      const response = await this.webhookService.getWebhookDeliveries(req.params.id, Number(page), Number(limit));
      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  // ===================
  // SLACK ENDPOINTS
  // ===================

  createSlackIntegration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const integration = await this.slackService.createSlackIntegration(organizationId, req.body, userId);
      res.status(201).json(integration);
    } catch (err) {
      next(err);
    }
  };

  getSlackIntegrations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20 } = req.query as any;
      const response = await this.slackService.getSlackIntegrations(organizationId, userId, Number(page), Number(limit));
      res.json(response);
    } catch (err) {
      next(err);
    }
  };

  getSlackIntegration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const integration = await this.slackService.getSlackIntegrationById(req.params.id, userId);
      res.json(integration);
    } catch (err) {
      next(err);
    }
  };

  updateSlackIntegration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const integration = await this.slackService.updateSlackIntegration(req.params.id, req.body, userId);
      res.json(integration);
    } catch (err) {
      next(err);
    }
  };

  deleteSlackIntegration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.slackService.deleteSlackIntegration(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  // ===================
  // SLACK WEBHOOK ENDPOINTS
  // ===================

  handleSlackCommand = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.slackService.handleSlackCommand(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  handleSlackInteraction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.slackService.handleSlackInteraction(req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  sendSlackMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message } = req.body;
      const result = await this.slackService.sendSlackMessage(req.params.id, message);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

  // ===================
  // INTEGRATION STATS
  // ===================

  getIntegrationStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      
      // Get webhook stats (placeholder)
      const webhookStats = {
        total: 0,
        active: 0,
        failed: 0,
        lastDelivery: null
      };
      
      // Get Slack integration stats (placeholder)
      const slackStats = {
        total: 0,
        active: 0,
        connectedTeams: 0,
        lastActivity: null
      };
      
      const stats = {
        totalWebhooks: webhookStats.total,
        activeWebhooks: webhookStats.active,
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: webhookStats.failed,
        successRate: 0,
        totalSlackIntegrations: slackStats.total,
        activeSlackIntegrations: slackStats.active,
        last24HoursDeliveries: 0, // TODO: Implement
        averageDeliveryTime: 0 // TODO: Implement
      };
      
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };
}
