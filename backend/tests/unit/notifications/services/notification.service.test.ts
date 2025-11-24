// backend/tests/unit/notifications/services/notification.service.test.ts

import { NotificationService } from '../../../../src/modules/notifications/services/notification.service';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { Logger } from '../../../../src/shared/utils/logger';
import { NotificationType, NotificationChannel, NotificationStatus, NotificationPriority } from '../../../../src/modules/notifications/types/notification.types';

// Mock dependencies
jest.mock('pg');
jest.mock('events');
jest.mock('../../../../src/shared/utils/logger');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockDb: any;
  let mockEventEmitter: jest.Mocked<EventEmitter>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Create mocks
    mockDb = {
      connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn(),
      }),
      query: jest.fn(),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    // Create service instance
    notificationService = new NotificationService(mockDb, mockEventEmitter, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create notification successfully', async () => {
      const createRequest = {
        userId: 'user-123',
        type: NotificationType.CYCLE_CREATED,
        channel: NotificationChannel.EMAIL,
        title: 'New Cycle Created',
        content: 'A new cycle has been created for your organization',
        data: { cycleId: 'cycle-123', cycleName: 'Q1 2024' },
        priority: NotificationPriority.NORMAL
      };

      // Mock the service methods that would be called
      jest.spyOn(notificationService as any, 'getNotificationById').mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        organizationId: 'org-1',
        type: NotificationType.CYCLE_CREATED,
        channel: NotificationChannel.EMAIL,
        title: 'New Cycle Created',
        content: 'A new cycle has been created for your organization',
        status: NotificationStatus.PENDING,
        priority: NotificationPriority.NORMAL,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      jest.spyOn(notificationService as any, 'processNotification').mockResolvedValue(undefined);

      const result = await notificationService.createNotification('org-1', createRequest, 'admin-1');

      expect(result).toBeDefined();
      expect(result.title).toBe('New Cycle Created');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification:created', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Notification created', expect.any(Object));
    });

    it('should skip notification when user preference is disabled', async () => {
      const createRequest = {
        userId: 'user-123',
        type: NotificationType.CYCLE_CREATED,
        channel: NotificationChannel.EMAIL,
        title: 'New Cycle Created',
        content: 'A new cycle has been created for your organization'
      };

      // Mock preference as disabled
      (notificationService as any).preferenceModel = {
        findByUserAndType: jest.fn().mockResolvedValue({
          enabled: false
        })
      };

      await expect(
        notificationService.createNotification('org-1', createRequest, 'admin-1')
      ).rejects.toThrow('Notification disabled by user preference');
    });

    it('should process template variables correctly', async () => {
      const createRequest = {
        userId: 'user-123',
        type: NotificationType.CYCLE_CREATED,
        channel: NotificationChannel.EMAIL,
        title: 'New Cycle Created',
        content: 'A new cycle {{cycleName}} has been created',
        data: { cycleName: 'Q1 2024' },
        templateId: 'template-123'
      };

      // Mock template
      (notificationService as any).templateModel = {
        findById: jest.fn().mockResolvedValue({
          title: 'Cycle: {{cycleName}}',
          content: 'A new cycle {{cycleName}} has been created',
          subject: 'New Cycle: {{cycleName}}'
        })
      };

      jest.spyOn(notificationService as any, 'getNotificationById').mockResolvedValue({
        id: 'notification-123',
        title: 'Cycle: Q1 2024',
        content: 'A new cycle Q1 2024 has been created'
      });

      jest.spyOn(notificationService as any, 'processNotification').mockResolvedValue(undefined);

      const result = await notificationService.createNotification('org-1', createRequest, 'admin-1');

      expect(result.title).toBe('Cycle: Q1 2024');
      expect(result.content).toBe('A new cycle Q1 2024 has been created');
    });
  });

  describe('getNotificationById', () => {
    it('should return notification when found', async () => {
      const mockNotification = {
        id: 'notification-123',
        user_id: 'user-123',
        organization_id: 'org-1',
        type: NotificationType.CYCLE_CREATED,
        channel: NotificationChannel.EMAIL,
        title: 'Test Notification',
        content: 'Test content',
        status: NotificationStatus.SENT,
        priority: NotificationPriority.NORMAL,
        created_at: new Date(),
        updated_at: new Date()
      };

      (notificationService as any).notificationModel = {
        findById: jest.fn().mockResolvedValue(mockNotification),
      };

      jest.spyOn(notificationService as any, 'buildCompleteNotification').mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        title: 'Test Notification',
        content: 'Test content'
      });

      const result = await notificationService.getNotificationById('notification-123', 'user-123');

      expect(result).toBeDefined();
      expect(result.id).toBe('notification-123');
    });

    it('should throw NotFoundError when notification not found', async () => {
      (notificationService as any).notificationModel = {
        findById: jest.fn().mockResolvedValue(null),
      };

      await expect(
        notificationService.getNotificationById('nonexistent-id', 'user-123')
      ).rejects.toThrow('Notification not found');
    });

    it('should throw ForbiddenError when user cannot view notification', async () => {
      const mockNotification = {
        id: 'notification-123',
        user_id: 'user-456', // Different user
        organization_id: 'org-1',
        type: NotificationType.CYCLE_CREATED,
        channel: NotificationChannel.EMAIL,
        title: 'Test Notification',
        content: 'Test content',
        status: NotificationStatus.SENT,
        priority: NotificationPriority.NORMAL,
        created_at: new Date(),
        updated_at: new Date()
      };

      (notificationService as any).notificationModel = {
        findById: jest.fn().mockResolvedValue(mockNotification),
      };

      await expect(
        notificationService.getNotificationById('notification-123', 'user-123')
      ).rejects.toThrow('Insufficient permission to view this notification');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const mockNotification = {
        id: 'notification-123',
        user_id: 'user-123',
        organization_id: 'org-1',
        type: NotificationType.CYCLE_CREATED,
        channel: NotificationChannel.EMAIL,
        title: 'Test Notification',
        content: 'Test content',
        status: NotificationStatus.SENT,
        priority: NotificationPriority.NORMAL,
        created_at: new Date(),
        updated_at: new Date()
      };

      (notificationService as any).notificationModel = {
        findById: jest.fn().mockResolvedValue(mockNotification),
        markAsRead: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(notificationService, 'getNotificationById').mockResolvedValue({
        id: 'notification-123',
        userId: 'user-123',
        title: 'Test Notification',
        readAt: new Date()
      } as any);

      const result = await notificationService.markAsRead('notification-123', 'user-123');

      expect(result).toBeDefined();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('notification:read', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Notification marked as read', expect.any(Object));
    });
  });

  describe('handleCycleEvent', () => {
    it('should handle cycle created event', async () => {
      const eventData = {
        cycle: { id: 'cycle-123', name: 'Q1 2024', organizationId: 'org-1' },
        organizationId: 'org-1',
        createdBy: 'admin-1'
      };

      jest.spyOn(notificationService as any, 'notifyCycleCreated').mockResolvedValue(undefined);

      await notificationService.handleCycleEvent('cycle:created', eventData);

      expect((notificationService as any).notifyCycleCreated).toHaveBeenCalledWith(
        eventData.cycle,
        'org-1'
      );
    });

    it('should handle cycle activated event', async () => {
      const eventData = {
        cycle: { id: 'cycle-123', name: 'Q1 2024', organizationId: 'org-1' },
        organizationId: 'org-1',
        activatedBy: 'admin-1'
      };

      jest.spyOn(notificationService as any, 'notifyCycleActivated').mockResolvedValue(undefined);

      await notificationService.handleCycleEvent('cycle:activated', eventData);

      expect((notificationService as any).notifyCycleActivated).toHaveBeenCalledWith(
        eventData.cycle,
        'org-1'
      );
    });

    it('should handle unhandled cycle events gracefully', async () => {
      const eventData = { cycle: { id: 'cycle-123' } };

      // Should not throw an error for unhandled events
      await expect(
        notificationService.handleCycleEvent('cycle:unknown', eventData)
      ).resolves.not.toThrow();
    });
  });

  describe('handleFeedbackEvent', () => {
    it('should handle feedback created event', async () => {
      const eventData = {
        feedback: { id: 'feedback-123', organizationId: 'org-1' },
        organizationId: 'org-1',
        createdBy: 'user-1'
      };

      jest.spyOn(notificationService as any, 'notifyFeedbackRequested').mockResolvedValue(undefined);

      await notificationService.handleFeedbackEvent('feedback:created', eventData);

      expect((notificationService as any).notifyFeedbackRequested).toHaveBeenCalledWith(
        eventData.feedback,
        'org-1'
      );
    });

    it('should handle feedback submitted event', async () => {
      const eventData = {
        feedback: { id: 'feedback-123', organizationId: 'org-1' },
        organizationId: 'org-1',
        submittedBy: 'user-1'
      };

      jest.spyOn(notificationService as any, 'notifyFeedbackReceived').mockResolvedValue(undefined);

      await notificationService.handleFeedbackEvent('feedback:submitted', eventData);

      expect((notificationService as any).notifyFeedbackReceived).toHaveBeenCalledWith(
        eventData.feedback,
        'org-1'
      );
    });
  });

  describe('processScheduledNotifications', () => {
    it('should process scheduled notifications', async () => {
      const mockScheduledNotifications = [
        {
          id: 'notification-1',
          user_id: 'user-123',
          organization_id: 'org-1',
          type: NotificationType.CYCLE_REMINDER,
          channel: NotificationChannel.EMAIL,
          title: 'Reminder',
          content: 'Cycle reminder',
          status: NotificationStatus.SCHEDULED,
          priority: NotificationPriority.NORMAL,
          scheduled_for: new Date(Date.now() - 1000), // Past date
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (notificationService as any).notificationModel = {
        getScheduledNotifications: jest.fn().mockResolvedValue(mockScheduledNotifications),
        update: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(notificationService as any, 'buildCompleteNotification').mockResolvedValue({
        id: 'notification-1',
        title: 'Reminder'
      });

      jest.spyOn(notificationService as any, 'processNotification').mockResolvedValue(undefined);

      await notificationService.processScheduledNotifications();

      expect((notificationService as any).notificationModel.getScheduledNotifications).toHaveBeenCalled();
      expect((notificationService as any).processNotification).toHaveBeenCalled();
    });
  });
});
