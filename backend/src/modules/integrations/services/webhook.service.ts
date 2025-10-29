// backend/src/modules/integrations/services/webhook.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import { 
  Webhook, 
  WebhookModel, 
  WebhookDelivery, 
  WebhookDeliveryModel,
  CreateWebhookRequest, 
  UpdateWebhookRequest,
  WebhookResponse,
  WebhookDeliveryResponse,
  WebhookPayload,
  DeliveryStatus,
  RetryPolicy,
  WebhookEvent
} from '../types/integrations.types';
import { WebhookModelClass } from '../models/webhook.model';
import { WebhookDeliveryModelClass } from '../models/webhook.model';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { Logger } from '../../../shared/utils/logger';

export class WebhookService {
  private webhookModel: WebhookModelClass;
  private deliveryModel: WebhookDeliveryModelClass;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.webhookModel = new WebhookModelClass(db);
    this.deliveryModel = new WebhookDeliveryModelClass(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async createWebhook(
    organizationId: string,
    request: CreateWebhookRequest,
    createdBy: string
  ): Promise<Webhook> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Validate webhook URL
      this.validateWebhookUrl(request.url);
      
      // Generate webhook secret if not provided
      const secret = request.secret || this.generateWebhookSecret();
      
      // Set default retry policy
      const retryPolicy: RetryPolicy = {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableStatusCodes: [408, 429, 500, 502, 503, 504],
        ...request.retryPolicy
      };
      
      // Create webhook
      const webhookData: Omit<WebhookModel, 'id' | 'created_at' | 'updated_at'> = {
        organization_id: organizationId,
        name: request.name,
        description: request.description,
        url: request.url,
        events: JSON.stringify(request.events.map(event => ({ event, enabled: true }))),
        is_active: true,
        secret,
        headers: JSON.stringify(request.headers || {}),
        retry_policy: JSON.stringify(retryPolicy),
        delivery_attempts: 0,
        created_by: createdBy
      };
      
      const webhook = await this.webhookModel.create(webhookData, client);
      
      await client.query('COMMIT');
      
      const completeWebhook = await this.buildCompleteWebhook(webhook);
      
      // Emit webhook created event
      this.eventEmitter.emit('webhook:created', {
        webhook: completeWebhook,
        organizationId,
        createdBy
      });
      
      this.logger.info('Webhook created', { 
        webhookId: webhook.id, 
        organizationId, 
        createdBy,
        url: request.url
      });
      
      return completeWebhook;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error creating webhook', { error, organizationId, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async getWebhookById(id: string, requestingUserId?: string): Promise<Webhook> {
    const webhook = await this.webhookModel.findById(id);
    
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }
    
    // TODO: Check if user has permission to view this webhook
    // if (requestingUserId && !this.hasViewPermission(webhook, requestingUserId)) {
    //   throw new ForbiddenError('Insufficient permission to view this webhook');
    // }
    
    return this.buildCompleteWebhook(webhook);
  }

  async getWebhooks(
    organizationId: string,
    requestingUserId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<WebhookResponse> {
    const { webhooks, total } = await this.webhookModel.findByOrganization(organizationId, page, limit);
    
    const completeWebhooks = await Promise.all(
      webhooks.map(webhook => this.buildCompleteWebhook(webhook))
    );
    
    return {
      webhooks: completeWebhooks,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  async updateWebhook(
    id: string,
    updates: UpdateWebhookRequest,
    requestingUserId: string
  ): Promise<Webhook> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const existingWebhook = await this.webhookModel.findById(id, client);
      if (!existingWebhook) {
        throw new NotFoundError('Webhook not found');
      }
      
      // TODO: Check if user has permission to update
      // if (!this.hasUpdatePermission(existingWebhook, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to update this webhook');
      // }
      
      // Validate URL if being updated
      if (updates.url) {
        this.validateWebhookUrl(updates.url);
      }
      
      // Update webhook
      const updateData: Partial<WebhookModel> = {};
      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.url) updateData.url = updates.url;
      if (updates.events) updateData.events = JSON.stringify(updates.events.map(event => ({ event, enabled: true })));
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.secret) updateData.secret = updates.secret;
      if (updates.headers) updateData.headers = JSON.stringify(updates.headers);
      if (updates.retryPolicy) {
        const currentPolicy = JSON.parse(existingWebhook.retry_policy);
        updateData.retry_policy = JSON.stringify({ ...currentPolicy, ...updates.retryPolicy });
      }
      
      const updatedWebhook = await this.webhookModel.update(id, updateData, client);
      
      if (!updatedWebhook) {
        throw new Error('Failed to update webhook');
      }
      
      await client.query('COMMIT');
      
      const completeWebhook = await this.getWebhookById(id);
      
      // Emit webhook updated event
      this.eventEmitter.emit('webhook:updated', {
        webhook: completeWebhook,
        updatedBy: requestingUserId,
        changes: updates
      });
      
      this.logger.info('Webhook updated', { 
        webhookId: id, 
        updatedBy: requestingUserId 
      });
      
      return completeWebhook;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating webhook', { error, webhookId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteWebhook(id: string, requestingUserId: string): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const webhook = await this.webhookModel.findById(id, client);
      if (!webhook) {
        throw new NotFoundError('Webhook not found');
      }
      
      // TODO: Check permissions
      // if (!this.hasDeletePermission(webhook, requestingUserId)) {
      //   throw new ForbiddenError('Insufficient permission to delete this webhook');
      // }
      
      // Delete webhook
      const deleted = await this.webhookModel.delete(id, client);
      
      if (!deleted) {
        throw new Error('Failed to delete webhook');
      }
      
      await client.query('COMMIT');
      
      // Emit webhook deleted event
      this.eventEmitter.emit('webhook:deleted', {
        webhookId: id,
        deletedBy: requestingUserId,
        webhook
      });
      
      this.logger.info('Webhook deleted', { 
        webhookId: id, 
        deletedBy: requestingUserId 
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error deleting webhook', { error, webhookId: id, requestingUserId });
      throw error;
    } finally {
      client.release();
    }
  }

  async testWebhook(id: string, event: string, payload?: any, requestingUserId?: string): Promise<{ success: boolean; response?: any; error?: string }> {
    const webhook = await this.getWebhookById(id, requestingUserId);
    
    if (!webhook.isActive) {
      throw new ValidationError('Webhook is not active');
    }
    
    // Create test payload
    const testPayload: WebhookPayload = {
      id: 'test_' + Math.random().toString(36).slice(2),
      event,
      timestamp: new Date().toISOString(),
      organizationId: webhook.organizationId,
      data: payload || { test: true, message: 'This is a test webhook delivery' },
      metadata: {
        source: 'webhook-test',
        version: '1.0',
        correlationId: 'test-' + Date.now()
      }
    };
    
    try {
      const result = await this.deliverWebhook(webhook as any, testPayload);
      return { success: true, response: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async processEvent(event: string, data: any, organizationId: string): Promise<void> {
    try {
      // Find active webhooks for this event
      const webhooks = await this.webhookModel.findActiveByEvent(organizationId, event);
      
      if (webhooks.length === 0) {
        this.logger.debug('No active webhooks found for event', { event, organizationId });
        return;
      }
      
      // Create webhook payload
      const payload: WebhookPayload = {
        id: 'evt_' + Math.random().toString(36).slice(2),
        event,
        timestamp: new Date().toISOString(),
        organizationId,
        data,
        metadata: {
          source: 'event-system',
          version: '1.0',
          correlationId: 'evt-' + Date.now()
        }
      };
      
      // Queue deliveries for all matching webhooks
      for (const webhook of webhooks) {
        await this.queueWebhookDelivery(webhook, payload);
      }
      
      this.logger.info('Event processed for webhooks', { 
        event, 
        organizationId, 
        webhookCount: webhooks.length 
      });
      
    } catch (error) {
      this.logger.error('Error processing event for webhooks', { error, event, organizationId });
      throw error;
    }
  }

  async processPendingDeliveries(): Promise<void> {
    try {
      // Get pending deliveries
      const pendingDeliveries = await this.deliveryModel.findPendingDeliveries(100);
      
      for (const delivery of pendingDeliveries) {
        await this.processDelivery(delivery);
      }
      
      // Get retryable deliveries
      const retryableDeliveries = await this.deliveryModel.findRetryableDeliveries(100);
      
      for (const delivery of retryableDeliveries) {
        await this.processDelivery(delivery);
      }
      
      this.logger.debug('Processed pending deliveries', { 
        pendingCount: pendingDeliveries.length,
        retryableCount: retryableDeliveries.length
      });
      
    } catch (error) {
      this.logger.error('Error processing pending deliveries', { error });
      throw error;
    }
  }

  async getWebhookDeliveries(
    webhookId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<WebhookDeliveryResponse> {
    const { deliveries, total } = await this.deliveryModel.findByWebhook(webhookId, page, limit);
    
    const completeDeliveries = await Promise.all(
      deliveries.map(delivery => this.buildCompleteDelivery(delivery))
    );
    
    return {
      deliveries: completeDeliveries,
      total,
      page,
      limit,
      hasNext: page * limit < total,
      hasPrev: page > 1
    };
  }

  // Private helper methods
  private async buildCompleteWebhook(webhook: WebhookModel): Promise<Webhook> {
    return {
      id: webhook.id,
      organizationId: webhook.organization_id,
      name: webhook.name,
      description: webhook.description,
      url: webhook.url,
      events: JSON.parse(webhook.events),
      isActive: webhook.is_active,
      secret: webhook.secret,
      headers: webhook.headers ? JSON.parse(webhook.headers) : undefined,
      retryPolicy: JSON.parse(webhook.retry_policy),
      deliveryAttempts: webhook.delivery_attempts,
      lastDeliveryAttempt: webhook.last_delivery_attempt,
      lastSuccessfulDelivery: webhook.last_successful_delivery,
      lastFailedDelivery: webhook.last_failed_delivery,
      failureReason: webhook.failure_reason,
      createdAt: webhook.created_at,
      updatedAt: webhook.updated_at,
      createdBy: webhook.created_by
    };
  }

  private async buildCompleteDelivery(delivery: WebhookDeliveryModel): Promise<WebhookDelivery> {
    return {
      id: delivery.id,
      webhookId: delivery.webhook_id,
      event: delivery.event,
      payload: JSON.parse(delivery.payload),
      status: delivery.status,
      attempts: delivery.attempts,
      maxAttempts: delivery.max_attempts,
      nextRetryAt: delivery.next_retry_at,
      lastAttemptAt: delivery.last_attempt_at,
      lastAttemptStatus: delivery.last_attempt_status,
      lastAttemptResponse: delivery.last_attempt_response,
      createdAt: delivery.created_at,
      completedAt: delivery.completed_at
    };
  }

  private validateWebhookUrl(url: string): void {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new ValidationError('Webhook URL must use HTTP or HTTPS protocol');
      }
    } catch (error) {
      throw new ValidationError('Invalid webhook URL format');
    }
  }

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async queueWebhookDelivery(webhook: WebhookModel, payload: WebhookPayload): Promise<void> {
    const retryPolicy: RetryPolicy = JSON.parse(webhook.retry_policy);
    
    const deliveryData: Omit<WebhookDeliveryModel, 'id' | 'created_at'> = {
      webhook_id: webhook.id,
      event: payload.event,
      payload: JSON.stringify(payload),
      status: DeliveryStatus.PENDING,
      attempts: 0,
      max_attempts: retryPolicy.maxAttempts
    };
    
    await this.deliveryModel.create(deliveryData);
    
    this.logger.debug('Webhook delivery queued', { 
      webhookId: webhook.id, 
      event: payload.event 
    });
  }

  private async processDelivery(delivery: WebhookDeliveryModel): Promise<void> {
    const webhook = await this.webhookModel.findById(delivery.webhook_id);
    if (!webhook) {
      this.logger.error('Webhook not found for delivery', { deliveryId: delivery.id });
      return;
    }
    
    const payload: WebhookPayload = JSON.parse(delivery.payload);
    const retryPolicy: RetryPolicy = JSON.parse(webhook.retry_policy);
    
    try {
      // Update status to delivering
      await this.deliveryModel.updateStatus(delivery.id, DeliveryStatus.DELIVERING);
      
      // Deliver webhook
      const result = await this.deliverWebhook(webhook, payload);
      
      // Update status to delivered
      await this.deliveryModel.updateStatus(delivery.id, DeliveryStatus.DELIVERED, {
        lastAttemptAt: new Date(),
        lastAttemptStatus: 200,
        lastAttemptResponse: JSON.stringify(result),
        completedAt: new Date()
      });
      
      // Update webhook stats
      await this.webhookModel.updateDeliveryStats(webhook.id, {
        lastSuccessfulDelivery: new Date()
      });
      
      this.logger.info('Webhook delivered successfully', { 
        deliveryId: delivery.id, 
        webhookId: webhook.id 
      });
      
    } catch (error) {
      const attempts = delivery.attempts + 1;
      const shouldRetry = attempts < retryPolicy.maxAttempts && 
                         this.isRetryableError(error, retryPolicy.retryableStatusCodes);
      
      if (shouldRetry) {
        const delay = this.calculateRetryDelay(attempts, retryPolicy);
        const nextRetryAt = new Date(Date.now() + delay);
        
        await this.deliveryModel.updateStatus(delivery.id, DeliveryStatus.RETRYING, {
          nextRetryAt
        });
        
        await this.deliveryModel.incrementAttempts(delivery.id);
        
        this.logger.warn('Webhook delivery failed, will retry', { 
          deliveryId: delivery.id, 
          webhookId: webhook.id,
          attempts,
          nextRetryAt
        });
      } else {
        await this.deliveryModel.updateStatus(delivery.id, DeliveryStatus.FAILED, {
          lastAttemptAt: new Date(),
          lastAttemptStatus: this.getErrorStatusCode(error),
          lastAttemptResponse: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        });
        
        // Update webhook stats
        await this.webhookModel.updateDeliveryStats(webhook.id, {
          lastFailedDelivery: new Date(),
          failureReason: error instanceof Error ? error.message : 'Unknown error'
        });
        
        this.logger.error('Webhook delivery failed permanently', { 
          deliveryId: delivery.id, 
          webhookId: webhook.id,
          attempts
        });
      }
    }
  }

  private async deliverWebhook(webhook: WebhookModel, payload: WebhookPayload): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'FeedbackFlow-Webhook/1.0',
      ...JSON.parse(webhook.headers || '{}')
    };
    
    // Add webhook signature if secret is provided
    if (webhook.secret) {
      const signature = this.generateWebhookSignature(JSON.stringify(payload), webhook.secret);
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }
    
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  }

  private generateWebhookSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private isRetryableError(error: any, retryableStatusCodes: number[]): boolean {
    if (error.message && error.message.includes('HTTP')) {
      const statusCode = parseInt(error.message.match(/HTTP (\d+)/)?.[1] || '0');
      return retryableStatusCodes.includes(statusCode);
    }
    return true; // Retry network errors
  }

  private getErrorStatusCode(error: any): number {
    if (error.message && error.message.includes('HTTP')) {
      return parseInt(error.message.match(/HTTP (\d+)/)?.[1] || '500');
    }
    return 500;
  }

  private calculateRetryDelay(attempt: number, retryPolicy: RetryPolicy): number {
    const delay = retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, attempt - 1);
    return Math.min(delay, retryPolicy.maxDelay);
  }
}
