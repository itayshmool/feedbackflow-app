// backend/src/modules/notifications/controllers/notification.controller.ts

import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { NotificationTemplateService } from '../services/notification-template.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';

export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private templateService: NotificationTemplateService,
    private preferenceService: NotificationPreferenceService
  ) {}

  // Notification CRUD operations
  createNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const notification = await this.notificationService.createNotification(organizationId, req.body, userId);
      res.status(201).json(notification);
    } catch (err) {
      next(err);
    }
  };

  getNotificationList = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const { page = 1, limit = 20, ...filters } = req.query as any;
      const list = await this.notificationService.getNotificationList(organizationId, filters, userId, Number(page), Number(limit));
      res.json(list);
    } catch (err) {
      next(err);
    }
  };

  getNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const notification = await this.notificationService.getNotificationById(req.params.id, userId);
      res.json(notification);
    } catch (err) {
      next(err);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const notification = await this.notificationService.markAsRead(req.params.id, userId);
      res.json(notification);
    } catch (err) {
      next(err);
    }
  };

  markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const count = await this.notificationService.markAllAsRead(userId);
      res.json({ count });
    } catch (err) {
      next(err);
    }
  };

  deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.notificationService.deleteNotification(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  getNotificationStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const stats = await this.notificationService.getNotificationStats(organizationId, userId);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  };

  // Template operations
  createTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const template = await this.templateService.createTemplate(organizationId, req.body, userId);
      res.status(201).json(template);
    } catch (err) {
      next(err);
    }
  };

  getTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const { type, channel } = req.query as any;
      const templates = await this.templateService.getTemplatesByOrganization(organizationId, type, channel);
      res.json(templates);
    } catch (err) {
      next(err);
    }
  };

  getTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const template = await this.templateService.getTemplateById(req.params.id, userId);
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  updateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const template = await this.templateService.updateTemplate(req.params.id, req.body, userId);
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  deleteTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.templateService.deleteTemplate(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };

  activateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const template = await this.templateService.activateTemplate(req.params.id, userId);
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  deactivateTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const template = await this.templateService.deactivateTemplate(req.params.id, userId);
      res.json(template);
    } catch (err) {
      next(err);
    }
  };

  // Preference operations
  getPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const preferences = await this.preferenceService.getUserPreferences(userId, organizationId);
      res.json(preferences);
    } catch (err) {
      next(err);
    }
  };

  updatePreference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const preference = await this.preferenceService.updatePreference(userId, organizationId, req.body);
      res.json(preference);
    } catch (err) {
      next(err);
    }
  };

  updateBulkPreferences = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const preferences = await this.preferenceService.updateBulkPreferences(userId, organizationId, req.body.preferences);
      res.json(preferences);
    } catch (err) {
      next(err);
    }
  };

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as any).user?.organizationId || 'default-org';
      const userId = (req as any).user?.id;
      const settings = await this.preferenceService.getUserSettings(userId, organizationId);
      res.json(settings);
    } catch (err) {
      next(err);
    }
  };

  deletePreference = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      await this.preferenceService.deletePreference(req.params.id, userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  };
}
