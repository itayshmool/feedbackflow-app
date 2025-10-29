// backend/tests/unit/integrations/services/webhook.service.test.ts

import { WebhookService } from '../../../../src/modules/integrations/services/webhook.service';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { Logger } from '../../../../src/shared/utils/logger';
import { DeliveryStatus, WebhookEventType } from '../../../../src/modules/integrations/types/integrations.types';

// Mock dependencies
jest.mock('pg');
jest.mock('events');
jest.mock('../../../../src/shared/utils/logger');

describe('WebhookService', () => {
  let webhookService: WebhookService;
  let mockDb: jest.Mocked<Pool>;
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
    webhookService = new WebhookService(mockDb, mockEventEmitter, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWebhook', () => {
    it('should create webhook successfully', async () => {
      const webhookData = {
        name: 'Test Webhook',
        description: 'A test webhook for events',
        url: 'https://example.com/webhook',
        events: ['cycle:created', 'feedback:submitted'],
        secret: 'test-secret',
        headers: { 'X-Custom-Header': 'value' },
        retryPolicy: {
          maxAttempts: 5,
          initialDelay: 2000,
          maxDelay: 60000,
          backoffMultiplier: 2,
          retryableStatusCodes: [500, 502, 503]
        }
      };

      // Mock the service methods that would be called
      jest.spyOn(webhookService as any, 'buildCompleteWebhook').mockResolvedValue({
        id: 'webhook-123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: webhookData.events.map(event => ({ event, enabled: true }))
      });

      const result = await webhookService.createWebhook('org-1', webhookData, 'user-1');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Webhook');
      expect(result.url).toBe('https://example.com/webhook');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('webhook:created', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Webhook created', expect.any(Object));
    });

    it('should generate secret if not provided', async () => {
      const webhookData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['cycle:created']
      };

      jest.spyOn(webhookService as any, 'buildCompleteWebhook').mockResolvedValue({
        id: 'webhook-123',
        name: 'Test Webhook',
        secret: 'generated-secret-123'
      });

      const result = await webhookService.createWebhook('org-1', webhookData, 'user-1');

      expect(result).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(typeof result.secret).toBe('string');
      expect(result.secret!.length).toBeGreaterThan(0);
    });

    it('should validate webhook URL', async () => {
      const webhookData = {
        name: 'Test Webhook',
        url: 'invalid-url',
        events: ['cycle:created']
      };

      await expect(
        webhookService.createWebhook('org-1', webhookData, 'user-1')
      ).rejects.toThrow('Invalid webhook URL format');
    });

    it('should handle database errors gracefully', async () => {
      const webhookData = {
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['cycle:created']
      };

      // Mock database error
      (mockDb.connect as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        webhookService.createWebhook('org-1', webhookData, 'user-1')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getWebhooks', () => {
    it('should return webhooks with pagination', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          organization_id: 'org-1',
          name: 'Test Webhook 1',
          url: 'https://example.com/webhook1',
          events: JSON.stringify([{ event: 'cycle:created', enabled: true }]),
          is_active: true,
          retry_policy: JSON.stringify({ maxAttempts: 3 }),
          delivery_attempts: 0,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1'
        }
      ];

      (webhookService as any).webhookModel = {
        findByOrganization: jest.fn().mockResolvedValue({
          webhooks: mockWebhooks,
          total: 1
        })
      };

      jest.spyOn(webhookService as any, 'buildCompleteWebhook').mockResolvedValue({
        id: 'webhook-1',
        name: 'Test Webhook 1'
      });

      const result = await webhookService.getWebhooks('org-1', 'user-1', 1, 20);

      expect(result).toBeDefined();
      expect(result.webhooks).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('getWebhookById', () => {
    it('should return webhook when found', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        organization_id: 'org-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: JSON.stringify([{ event: 'cycle:created', enabled: true }]),
        is_active: true,
        retry_policy: JSON.stringify({ maxAttempts: 3 }),
        delivery_attempts: 0,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'user-1'
      };

      (webhookService as any).webhookModel = {
        findById: jest.fn().mockResolvedValue(mockWebhook)
      };

      jest.spyOn(webhookService as any, 'buildCompleteWebhook').mockResolvedValue({
        id: 'webhook-123',
        name: 'Test Webhook'
      });

      const result = await webhookService.getWebhookById('webhook-123', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('webhook-123');
      expect(result.name).toBe('Test Webhook');
    });

    it('should throw NotFoundError when webhook not found', async () => {
      (webhookService as any).webhookModel = {
        findById: jest.fn().mockResolvedValue(null)
      };

      await expect(
        webhookService.getWebhookById('nonexistent-id', 'user-1')
      ).rejects.toThrow('Webhook not found');
    });
  });

  describe('testWebhook', () => {
    it('should test webhook successfully', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        organizationId: 'org-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        isActive: true
      };

      jest.spyOn(webhookService, 'getWebhookById').mockResolvedValue(mockWebhook as any);
      jest.spyOn(webhookService as any, 'deliverWebhook').mockResolvedValue({ success: true });

      const result = await webhookService.testWebhook('webhook-123', 'cycle:created', { test: true });

      expect(result.success).toBe(true);
      expect(result.response).toEqual({ success: true });
    });

    it('should handle webhook test failure', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        organizationId: 'org-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        isActive: true
      };

      jest.spyOn(webhookService, 'getWebhookById').mockResolvedValue(mockWebhook as any);
      jest.spyOn(webhookService as any, 'deliverWebhook').mockRejectedValue(new Error('Connection failed'));

      const result = await webhookService.testWebhook('webhook-123', 'cycle:created');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });

    it('should throw error for inactive webhook', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        organizationId: 'org-1',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        isActive: false
      };

      jest.spyOn(webhookService, 'getWebhookById').mockResolvedValue(mockWebhook as any);

      await expect(
        webhookService.testWebhook('webhook-123', 'cycle:created')
      ).rejects.toThrow('Webhook is not active');
    });
  });

  describe('processEvent', () => {
    it('should process event for active webhooks', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          organization_id: 'org-1',
          name: 'Test Webhook 1',
          url: 'https://example.com/webhook1',
          events: JSON.stringify([{ event: 'cycle:created', enabled: true }]),
          is_active: true,
          retry_policy: JSON.stringify({ maxAttempts: 3 }),
          delivery_attempts: 0,
          created_at: new Date(),
          updated_at: new Date(),
          created_by: 'user-1'
        }
      ];

      (webhookService as any).webhookModel = {
        findActiveByEvent: jest.fn().mockResolvedValue(mockWebhooks)
      };

      jest.spyOn(webhookService as any, 'queueWebhookDelivery').mockResolvedValue(undefined);

      await webhookService.processEvent('cycle:created', { cycleId: 'cycle-123' }, 'org-1');

      expect((webhookService as any).webhookModel.findActiveByEvent).toHaveBeenCalledWith('org-1', 'cycle:created');
      expect((webhookService as any).queueWebhookDelivery).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith('Event processed for webhooks', expect.any(Object));
    });

    it('should handle no active webhooks gracefully', async () => {
      (webhookService as any).webhookModel = {
        findActiveByEvent: jest.fn().mockResolvedValue([])
      };

      await webhookService.processEvent('cycle:created', { cycleId: 'cycle-123' }, 'org-1');

      expect(mockLogger.debug).toHaveBeenCalledWith('No active webhooks found for event', expect.any(Object));
    });
  });

  describe('processPendingDeliveries', () => {
    it('should process pending deliveries', async () => {
      const mockPendingDeliveries = [
        {
          id: 'delivery-1',
          webhook_id: 'webhook-1',
          event: 'cycle:created',
          payload: JSON.stringify({ test: true }),
          status: DeliveryStatus.PENDING,
          attempts: 0,
          max_attempts: 3,
          created_at: new Date()
        }
      ];

      const mockRetryableDeliveries = [
        {
          id: 'delivery-2',
          webhook_id: 'webhook-1',
          event: 'cycle:created',
          payload: JSON.stringify({ test: true }),
          status: DeliveryStatus.RETRYING,
          attempts: 1,
          max_attempts: 3,
          next_retry_at: new Date(Date.now() - 1000),
          created_at: new Date()
        }
      ];

      (webhookService as any).deliveryModel = {
        findPendingDeliveries: jest.fn().mockResolvedValue(mockPendingDeliveries),
        findRetryableDeliveries: jest.fn().mockResolvedValue(mockRetryableDeliveries)
      };

      jest.spyOn(webhookService as any, 'processDelivery').mockResolvedValue(undefined);

      await webhookService.processPendingDeliveries();

      expect((webhookService as any).processDelivery).toHaveBeenCalledTimes(2);
      expect(mockLogger.debug).toHaveBeenCalledWith('Processed pending deliveries', expect.any(Object));
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        organization_id: 'org-1',
        name: 'Test Webhook'
      };

      (webhookService as any).webhookModel = {
        findById: jest.fn().mockResolvedValue(mockWebhook),
        delete: jest.fn().mockResolvedValue(true)
      };

      await webhookService.deleteWebhook('webhook-123', 'user-1');

      expect((webhookService as any).webhookModel.delete).toHaveBeenCalledWith('webhook-123', expect.any(Object));
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('webhook:deleted', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Webhook deleted', expect.any(Object));
    });

    it('should throw NotFoundError when webhook not found', async () => {
      (webhookService as any).webhookModel = {
        findById: jest.fn().mockResolvedValue(null)
      };

      await expect(
        webhookService.deleteWebhook('nonexistent-id', 'user-1')
      ).rejects.toThrow('Webhook not found');
    });
  });

  describe('getWebhookDeliveries', () => {
    it('should return webhook deliveries with pagination', async () => {
      const mockDeliveries = [
        {
          id: 'delivery-1',
          webhook_id: 'webhook-1',
          event: 'cycle:created',
          payload: JSON.stringify({ test: true }),
          status: DeliveryStatus.DELIVERED,
          attempts: 1,
          max_attempts: 3,
          created_at: new Date(),
          completed_at: new Date()
        }
      ];

      (webhookService as any).deliveryModel = {
        findByWebhook: jest.fn().mockResolvedValue({
          deliveries: mockDeliveries,
          total: 1
        })
      };

      jest.spyOn(webhookService as any, 'buildCompleteDelivery').mockResolvedValue({
        id: 'delivery-1',
        status: DeliveryStatus.DELIVERED
      });

      const result = await webhookService.getWebhookDeliveries('webhook-1', 1, 20);

      expect(result).toBeDefined();
      expect(result.deliveries).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });
});
