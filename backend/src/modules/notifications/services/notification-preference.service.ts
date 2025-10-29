// backend/src/modules/notifications/services/notification-preference.service.ts

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import { 
  NotificationPreference, 
  NotificationPreferenceModel, 
  UpdatePreferenceRequest, 
  NotificationSettings,
  NotificationType,
  NotificationChannel,
  NotificationFrequency
} from '../types/notification.types';
import { NotificationPreferenceModelClass } from '../models/notification-preference.model';
import { ValidationError, NotFoundError, ForbiddenError } from '../../../shared/utils/errors';
import { Logger } from '../../../shared/utils/logger';

export class NotificationPreferenceService {
  private preferenceModel: NotificationPreferenceModelClass;
  private eventEmitter: EventEmitter;
  private logger: Logger;

  constructor(
    private db: Pool,
    eventEmitter: EventEmitter,
    logger: Logger
  ) {
    this.preferenceModel = new NotificationPreferenceModelClass(db);
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  async getUserPreferences(userId: string, organizationId: string): Promise<NotificationPreference[]> {
    const preferences = await this.preferenceModel.findByUserId(userId);
    
    // If no preferences exist, create default ones
    if (preferences.length === 0) {
      return this.createDefaultPreferences(userId, organizationId);
    }
    
    return Promise.all(
      preferences.map(preference => this.buildCompletePreference(preference))
    );
  }

  async updatePreference(
    userId: string,
    organizationId: string,
    request: UpdatePreferenceRequest
  ): Promise<NotificationPreference> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      // Find existing preference
      let preference = await this.preferenceModel.findByUserAndType(
        userId,
        request.type,
        request.channel,
        client
      );
      
      if (preference) {
        // Update existing preference
        const updateData: Partial<NotificationPreferenceModel> = {
          enabled: request.enabled,
          frequency: request.frequency,
          quiet_hours: request.quietHours ? JSON.stringify(request.quietHours) : undefined
        };
        
        const updated = await this.preferenceModel.update(preference.id, updateData, client);
        
        if (!updated) {
          throw new Error('Failed to update preference');
        }
        
        preference = updated;
      } else {
        // Create new preference
        const preferenceData: Omit<NotificationPreferenceModel, 'id' | 'created_at' | 'updated_at'> = {
          user_id: userId,
          organization_id: organizationId,
          type: request.type,
          channel: request.channel,
          enabled: request.enabled,
          frequency: request.frequency,
          quiet_hours: request.quietHours ? JSON.stringify(request.quietHours) : undefined
        };
        
        preference = await this.preferenceModel.create(preferenceData, client);
      }
      
      await client.query('COMMIT');
      
      const completePreference = await this.buildCompletePreference(preference);
      
      // Emit preference updated event
      this.eventEmitter.emit('preference:updated', {
        preference: completePreference,
        userId,
        organizationId
      });
      
      this.logger.info('Preference updated', { 
        userId,
        type: request.type,
        channel: request.channel,
        enabled: request.enabled
      });
      
      return completePreference;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating preference', { error, userId, request });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateBulkPreferences(
    userId: string,
    organizationId: string,
    preferences: UpdatePreferenceRequest[]
  ): Promise<NotificationPreference[]> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      const updatedPreferences: NotificationPreference[] = [];
      
      for (const request of preferences) {
        const preference = await this.updatePreference(userId, organizationId, request);
        updatedPreferences.push(preference);
      }
      
      await client.query('COMMIT');
      
      // Emit bulk preference updated event
      this.eventEmitter.emit('preferences:bulk_updated', {
        preferences: updatedPreferences,
        userId,
        organizationId
      });
      
      this.logger.info('Bulk preferences updated', { 
        userId,
        count: preferences.length
      });
      
      return updatedPreferences;
      
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error('Error updating bulk preferences', { error, userId, preferences });
      throw error;
    } finally {
      client.release();
    }
  }

  async getUserSettings(userId: string, organizationId: string): Promise<NotificationSettings> {
    const preferences = await this.getUserPreferences(userId, organizationId);
    
    // Group preferences by channel
    const emailPreferences = preferences.filter(p => p.channel === NotificationChannel.EMAIL);
    const inAppPreferences = preferences.filter(p => p.channel === NotificationChannel.IN_APP);
    const smsPreferences = preferences.filter(p => p.channel === NotificationChannel.SMS);
    
    return {
      email: {
        enabled: emailPreferences.some(p => p.enabled),
        frequency: this.getMostRestrictiveFrequency(emailPreferences),
        quietHours: this.getQuietHours(emailPreferences)
      },
      inApp: {
        enabled: inAppPreferences.some(p => p.enabled),
        showBanner: true, // Default setting
        showBadge: true // Default setting
      },
      sms: {
        enabled: smsPreferences.some(p => p.enabled),
        frequency: this.getMostRestrictiveFrequency(smsPreferences),
        quietHours: this.getQuietHours(smsPreferences)
      }
    };
  }

  async deletePreference(
    id: string,
    requestingUserId: string
  ): Promise<void> {
    const preference = await this.preferenceModel.findByUserId(requestingUserId);
    const targetPreference = preference.find(p => p.id === id);
    
    if (!targetPreference) {
      throw new NotFoundError('Preference not found');
    }
    
    const deleted = await this.preferenceModel.delete(id);
    
    if (!deleted) {
      throw new Error('Failed to delete preference');
    }
    
    // Emit preference deleted event
    this.eventEmitter.emit('preference:deleted', {
      preferenceId: id,
      userId: requestingUserId,
      preference: targetPreference
    });
    
    this.logger.info('Preference deleted', { 
      preferenceId: id, 
      userId: requestingUserId 
    });
  }

  // Private helper methods
  private async createDefaultPreferences(
    userId: string,
    organizationId: string
  ): Promise<NotificationPreference[]> {
    const defaultPreferences = [
      // Email preferences
      { type: NotificationType.CYCLE_CREATED, channel: NotificationChannel.EMAIL, enabled: true, frequency: NotificationFrequency.IMMEDIATE },
      { type: NotificationType.CYCLE_ACTIVATED, channel: NotificationChannel.EMAIL, enabled: true, frequency: NotificationFrequency.IMMEDIATE },
      { type: NotificationType.CYCLE_REMINDER, channel: NotificationChannel.EMAIL, enabled: true, frequency: NotificationFrequency.DAILY },
      { type: NotificationType.FEEDBACK_REQUESTED, channel: NotificationChannel.EMAIL, enabled: true, frequency: NotificationFrequency.IMMEDIATE },
      { type: NotificationType.FEEDBACK_RECEIVED, channel: NotificationChannel.EMAIL, enabled: true, frequency: NotificationFrequency.IMMEDIATE },
      
      // In-app preferences
      { type: NotificationType.CYCLE_CREATED, channel: NotificationChannel.IN_APP, enabled: true, frequency: NotificationFrequency.IMMEDIATE },
      { type: NotificationType.CYCLE_ACTIVATED, channel: NotificationChannel.IN_APP, enabled: true, frequency: NotificationFrequency.IMMEDIATE },
      { type: NotificationType.FEEDBACK_REQUESTED, channel: NotificationChannel.IN_APP, enabled: true, frequency: NotificationFrequency.IMMEDIATE },
      { type: NotificationType.FEEDBACK_RECEIVED, channel: NotificationChannel.IN_APP, enabled: true, frequency: NotificationFrequency.IMMEDIATE },
      
      // SMS preferences (disabled by default)
      { type: NotificationType.CYCLE_DEADLINE, channel: NotificationChannel.SMS, enabled: false, frequency: NotificationFrequency.IMMEDIATE },
      { type: NotificationType.FEEDBACK_OVERDUE, channel: NotificationChannel.SMS, enabled: false, frequency: NotificationFrequency.IMMEDIATE }
    ];
    
    const createdPreferences: NotificationPreference[] = [];
    
    for (const pref of defaultPreferences) {
      const preference = await this.updatePreference(userId, organizationId, pref);
      createdPreferences.push(preference);
    }
    
    this.logger.info('Default preferences created', { 
      userId,
      count: createdPreferences.length
    });
    
    return createdPreferences;
  }

  private async buildCompletePreference(preference: NotificationPreferenceModel): Promise<NotificationPreference> {
    return {
      id: preference.id,
      userId: preference.user_id,
      organizationId: preference.organization_id,
      type: preference.type,
      channel: preference.channel,
      enabled: preference.enabled,
      frequency: preference.frequency,
      quietHours: preference.quiet_hours ? JSON.parse(preference.quiet_hours) : undefined,
      createdAt: preference.created_at,
      updatedAt: preference.updated_at
    };
  }

  private getMostRestrictiveFrequency(preferences: NotificationPreference[]): NotificationFrequency {
    if (preferences.length === 0) return NotificationFrequency.NEVER;
    
    const frequencies = preferences.map(p => p.frequency).filter(Boolean);
    if (frequencies.length === 0) return NotificationFrequency.IMMEDIATE;
    
    // Priority order: NEVER > WEEKLY > DAILY > IMMEDIATE
    if (frequencies.includes(NotificationFrequency.NEVER)) return NotificationFrequency.NEVER;
    if (frequencies.includes(NotificationFrequency.WEEKLY)) return NotificationFrequency.WEEKLY;
    if (frequencies.includes(NotificationFrequency.DAILY)) return NotificationFrequency.DAILY;
    return NotificationFrequency.IMMEDIATE;
  }

  private getQuietHours(preferences: NotificationPreference[]): any {
    const quietHoursPrefs = preferences
      .map(p => p.quietHours)
      .filter(Boolean);
    
    if (quietHoursPrefs.length === 0) return undefined;
    
    // Return the first quiet hours setting found
    return quietHoursPrefs[0];
  }
}
