// backend/src/modules/notifications/services/notification.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { 
  Notification, 
  NotificationModel, 
  CreateNotificationRequest, 
  NotificationFilters, 
  NotificationListResponse, 
  NotificationStats,
  NotificationStatus,
  NotificationPriority,
  NotificationType,
  NotificationChannel
} from '../types/notification.types';
import { NotificationModelClass } from '../models/notification.model';
import { NotificationTemplateModelClass } from '../models/notification-template.model';
import { NotificationPreferenceModelClass } from '../models/notification-preference.model';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { Logger } from '../../../shared/utils/logger';

export class NotificationService {
  private notificationModel: NotificationModelClass;
  private templateModel: NotificationTemplateModelClass;
  private preferenceModel: NotificationPreferenceModelClass;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.notificationModel = new NotificationModelClass(db);
    this.templateModel = new NotificationTemplateModelClass(db);
    this.preferenceModel = new NotificationPreferenceModelClass(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createNotification(
    organizationId: string,
    request: CreateNotificationRequest,
    createdBy?: string
  ): Promise<Notification> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check user preferences
      const preference = await this.preferenceModel.findByUserAndType(
        request.userId,
        request.type,
        request.channel,
        client
      );
      
      if (preference && !preference.enabled) {
        this.logger.info('Notification skipped due to user preference', {
          userId: request.userId,
          type: request.type,
          channel: request.channel
        });
        throw new ValidationError('Notification disabled by user preference');
      }
      
      // Get template if provided
      let title = request.title;
      let content = request.content;
      let subject: string | undefined;
      
      if (request.templateId) {
        const template = await this.templateModel.findById(request.templateId, client);
        if (template) {
          title = this.processTemplate(template.title, request.data || {});
          content = this.processTemplate(template.content, request.data || {});
          subject = template.subject ? this.processTemplate(template.subject, request.data || {}) : undefined;
        }
      }
      
      // Create notification
      const notificationData: Omit<NotificationModel, 'id' | 'created_at' | 'updated_at'> = {
        user_id: request.userId,
        organization_id: organizationId,
        type: request.type,
        channel: request.channel,
        title,
        content,
        data: request.data ? JSON.stringify(request.data) : undefined,
        status: request.scheduledFor ? NotificationStatus.SCHEDULED : NotificationStatus.PENDING,
        priority: request.priority || NotificationPriority.NORMAL,
        scheduled_for: request.scheduledFor ? new Date(request.scheduledFor) : undefined,
        template_id: request.templateId,
        related_entity_type: request.relatedEntityType,
        related_entity_id: request.relatedEntityId
      };
      
      const notification = await this.notificationModel.create(notificationData, client);
      
      await client.query('COMMIT');
      
      const completeNotification = await this.buildCompleteNotification(notification);
      
      // Emit notification created event
      this.eventEmitter.emit('notification:created', {
        notification: completeNotification,
        organizationId,
        createdBy
      });
      
      // Process notification immediately if not scheduled
      if (!request.scheduledFor) {
        await this.processNotification(completeNotification);
      }
      
      this.logger.info('Notification created', { 
        notificationId: notification.id, 
        userId: request.userId,
        type: request.type,
        channel: request.channel
      });
      
      return completeNotification;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating notification', { error, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async getNotificationById(id: string, requestingUserId?: string): Promise<Notification> {
    const notification = await this.notificationModel.findById(id);
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    
    // Check if user has permission to view this notification
    if (requestingUserId && notification.user_id !== requestingUserId) {
      throw new ForbiddenError('Insufficient permission to view this notification');
    }
    
    return this.buildCompleteNotification(notification);
  }

  async getNotificationList(
    organizationId: string,
    filters: NotificationFilters,
    requestingUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<NotificationListResponse> {
    // Apply user filter for non-admin users
    const userFilters = { ...filters, organizationId };
    if (!this.isAdminUser(requestingUserId)) {
      userFilters.userId = requestingUserId;
    }
    
    const { notifications, total } = await this.notificationModel.findWithFilters(userFilters, page, limit);
    const unreadCount = await this.notificationModel.getUnreadCount(requestingUserId);
    
    const completeNotifications = await Promise.all(
      notifications.map(notification => this.buildCompleteNotification(notification))
    );
    
    return {
      notifications: completeNotifications,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1,
      unreadCount
    };
  }

  async markAsRead(id: string, requestingUserId: string): Promise<Notification> {
    const notification = await this.notificationModel.findById(id);
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    
    if (notification.user_id !== requestingUserId) {
      throw new ForbiddenError('Insufficient permission to modify this notification');
    }
    
    const updated = await this.notificationModel.markAsRead(id);
    
    if (!updated) {
      throw new Error('Failed to mark notification as read');
    }
    
    const completeNotification = await this.getNotificationById(id, requestingUserId);
    
    // Emit notification read event
    this.eventEmitter.emit('notification:read', {
      notification: completeNotification,
      userId: requestingUserId
    });
    
    this.logger.info('Notification marked as read', { 
      notificationId: id, 
      userId: requestingUserId 
    });
    
    return completeNotification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const count = await this.notificationModel.markAllAsRead(userId);
    
    // Emit bulk read event
    this.eventEmitter.emit('notifications:bulk_read', {
      userId,
      count
    });
    
    this.logger.info('All notifications marked as read', { 
      userId, 
      count 
    });
    
    return count;
  }

  async deleteNotification(id: string, requestingUserId: string): Promise<void> {
    const notification = await this.notificationModel.findById(id);
    
    if (!notification) {
      throw new NotFoundError('Notification not found');
    }
    
    if (notification.user_id !== requestingUserId) {
      throw new ForbiddenError('Insufficient permission to delete this notification');
    }
    
    const deleted = await this.notificationModel.delete(id);
    
    if (!deleted) {
      throw new Error('Failed to delete notification');
    }
    
    // Emit notification deleted event
    this.eventEmitter.emit('notification:deleted', {
      notificationId: id,
      userId: requestingUserId,
      notification
    });
    
    this.logger.info('Notification deleted', { 
      notificationId: id, 
      userId: requestingUserId 
    });
  }

  async getNotificationStats(
    organizationId: string,
    requestingUserId: string
  ): Promise<NotificationStats> {
    if (this.isAdminUser(requestingUserId)) {
      return this.notificationModel.getStatsByOrganization(organizationId);
    } else {
      return this.notificationModel.getStatsByUser(requestingUserId);
    }
  }

  async processScheduledNotifications(): Promise<void> {
    const now = new Date();
    const scheduledNotifications = await this.notificationModel.getScheduledNotifications(now);
    
    this.logger.info('Processing scheduled notifications', { 
      count: scheduledNotifications.length 
    });
    
    for (const notification of scheduledNotifications) {
      try {
        const completeNotification = await this.buildCompleteNotification(notification);
        await this.processNotification(completeNotification);
      } catch (error) {
        this.logger.error('Error processing scheduled notification', {
          notificationId: notification.id,
          error
        });
      }
    }
  }

  // Event-driven notification creation
  async handleCycleEvent(eventType: string, data: any): Promise<void> {
    const organizationId = data.organizationId || data.cycle?.organizationId;
    
    if (!organizationId) {
      this.logger.warn('No organization ID in cycle event', { eventType, data });
      return;
    }
    
    switch (eventType) {
      case 'cycle:created':
        await this.notifyCycleCreated(data.cycle, organizationId);
        break;
      case 'cycle:activated':
        await this.notifyCycleActivated(data.cycle, organizationId);
        break;
      case 'cycle:updated':
        await this.notifyCycleUpdated(data.cycle, organizationId);
        break;
      default:
        this.logger.debug('Unhandled cycle event', { eventType, data });
    }
  }

  async handleFeedbackEvent(eventType: string, data: any): Promise<void> {
    const organizationId = data.organizationId || data.feedback?.organizationId;
    
    if (!organizationId) {
      this.logger.warn('No organization ID in feedback event', { eventType, data });
      return;
    }
    
    switch (eventType) {
      case 'feedback:created':
        await this.notifyFeedbackRequested(data.feedback, organizationId);
        break;
      case 'feedback:submitted':
        await this.notifyFeedbackReceived(data.feedback, organizationId);
        break;
      case 'feedback:acknowledged':
        await this.notifyFeedbackAcknowledged(data.feedback, organizationId);
        break;
      default:
        this.logger.debug('Unhandled feedback event', { eventType, data });
    }
  }

  // Private helper methods
  private async processNotification(notification: Notification): Promise<void> {
    try {
      // Update status to sent
      await this.notificationModel.update(notification.id, {
        status: NotificationStatus.SENT,
        sent_at: new Date()
      });
      
      // Emit notification sent event
      this.eventEmitter.emit('notification:sent', {
        notification,
        channel: notification.channel
      });
      
      this.logger.info('Notification processed', {
        notificationId: notification.id,
        channel: notification.channel,
        type: notification.type
      });
      
    } catch (error) {
      // Update status to failed
      await this.notificationModel.update(notification.id, {
        status: NotificationStatus.FAILED
      });
      
      this.logger.error('Error processing notification', {
        notificationId: notification.id,
        error
      });
      
      throw error;
    }
  }

  private async buildCompleteNotification(notification: NotificationModel): Promise<Notification> {
    return {
      id: notification.id,
      userId: notification.user_id,
      organizationId: notification.organization_id,
      type: notification.type,
      channel: notification.channel,
      title: notification.title,
      content: notification.content,
      data: notification.data ? JSON.parse(notification.data) : undefined,
      status: notification.status,
      priority: notification.priority,
      scheduledFor: notification.scheduled_for,
      sentAt: notification.sent_at,
      readAt: notification.read_at,
      templateId: notification.template_id,
      relatedEntityType: notification.related_entity_type,
      relatedEntityId: notification.related_entity_id,
      createdAt: notification.created_at,
      updatedAt: notification.updated_at
    };
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private isAdminUser(userId: string): boolean {
    // TODO: Implement proper admin check
    return false;
  }

  // Event-specific notification methods
  private async notifyCycleCreated(cycle: any, organizationId: string): Promise<void> {
    // TODO: Get cycle participants and send notifications
    this.logger.info('Cycle created notification triggered', { cycleId: cycle.id });
  }

  private async notifyCycleActivated(cycle: any, organizationId: string): Promise<void> {
    // TODO: Get cycle participants and send notifications
    this.logger.info('Cycle activated notification triggered', { cycleId: cycle.id });
  }

  private async notifyCycleUpdated(cycle: any, organizationId: string): Promise<void> {
    // TODO: Get cycle participants and send notifications
    this.logger.info('Cycle updated notification triggered', { cycleId: cycle.id });
  }

  private async notifyFeedbackRequested(feedback: any, organizationId: string): Promise<void> {
    try {
      // Notify the receiver (toUserId) that feedback is being prepared for them
      const toUserId = feedback.toUserId;
      if (!toUserId) {
        this.logger.warn('No toUserId in feedback, skipping notification', { feedbackId: feedback.id });
        return;
      }

      // Get the giver's name for the notification
      const giverResult = await this.db.query(
        'SELECT name, email FROM users WHERE id = $1',
        [feedback.fromUserId]
      );
      const giverName = giverResult.rows[0]?.name || giverResult.rows[0]?.email || 'Someone';

      // Get receiver's organization if not provided
      let orgId = organizationId;
      if (!orgId) {
        const receiverResult = await this.db.query(
          'SELECT organization_id FROM users WHERE id = $1',
          [toUserId]
        );
        orgId = receiverResult.rows[0]?.organization_id;
      }

      // Insert notification into database
      const insertQuery = `
        INSERT INTO user_notifications (
          user_id, organization_id, type, category, title, message, data, priority, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING id
      `;

      const result = await this.db.query(insertQuery, [
        toUserId,
        orgId,
        'in_app',
        'feedback',
        'Feedback Created',
        `${giverName} has started writing feedback for you.`,
        JSON.stringify({
          feedbackId: feedback.id,
          fromUserId: feedback.fromUserId,
          cycleId: feedback.cycleId,
          type: 'feedback_created'
        }),
        'normal'
      ]);

      this.logger.info('Feedback created notification sent', { 
        feedbackId: feedback.id,
        notificationId: result.rows[0]?.id,
        toUserId
      });

      // Emit event for real-time updates
      this.eventEmitter.emit('notification:created', {
        userId: toUserId,
        notificationId: result.rows[0]?.id
      });

    } catch (error) {
      this.logger.error('Error sending feedback created notification', { 
        feedbackId: feedback.id, 
        error 
      });
    }
  }

  private async notifyFeedbackReceived(feedback: any, organizationId: string): Promise<void> {
    try {
      // Notify the requester (fromUserId) that their feedback was submitted
      const fromUserId = feedback.fromUserId;
      if (!fromUserId) {
        this.logger.warn('No fromUserId in feedback, skipping notification', { feedbackId: feedback.id });
        return;
      }

      // Get the receiver's name for the notification
      const receiverResult = await this.db.query(
        'SELECT name, email FROM users WHERE id = $1',
        [feedback.toUserId]
      );
      const receiverName = receiverResult.rows[0]?.name || receiverResult.rows[0]?.email || 'the recipient';

      // Get giver's organization if not provided
      let orgId = organizationId;
      if (!orgId) {
        const giverResult = await this.db.query(
          'SELECT organization_id FROM users WHERE id = $1',
          [fromUserId]
        );
        orgId = giverResult.rows[0]?.organization_id;
      }

      // Insert notification into database
      const insertQuery = `
        INSERT INTO user_notifications (
          user_id, organization_id, type, category, title, message, data, priority, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        RETURNING id
      `;

      const result = await this.db.query(insertQuery, [
        fromUserId,
        orgId,
        'in_app',
        'feedback',
        'Feedback Submitted',
        `Your feedback for ${receiverName} has been successfully submitted.`,
        JSON.stringify({
          feedbackId: feedback.id,
          toUserId: feedback.toUserId,
          cycleId: feedback.cycleId,
          type: 'feedback_submitted'
        }),
        'normal'
      ]);

      this.logger.info('Feedback submitted notification sent', { 
        feedbackId: feedback.id,
        notificationId: result.rows[0]?.id,
        fromUserId
      });

      // Emit event for real-time updates
      this.eventEmitter.emit('notification:created', {
        userId: fromUserId,
        notificationId: result.rows[0]?.id
      });

    } catch (error) {
      this.logger.error('Error sending feedback submitted notification', { 
        feedbackId: feedback.id, 
        error 
      });
    }
  }

  private async notifyFeedbackAcknowledged(feedback: any, organizationId: string): Promise<void> {
    // TODO: Send notification to feedback giver
    this.logger.info('Feedback acknowledged notification triggered', { feedbackId: feedback.id });
  }
}
