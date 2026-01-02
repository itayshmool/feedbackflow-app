import { query } from '../../../config/real-database.js';
import { settingsCache } from '../../../shared/utils/settings-cache.js';

/**
 * Maintenance mode settings
 */
export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
  allowedUsers: string[];
}

/**
 * Email whitelist settings
 */
export interface EmailWhitelistSettings {
  mode: 'disabled' | 'domain' | 'specific';
  domains: string[];
  emails: string[];
}

/**
 * IP whitelist settings
 */
export interface IPWhitelistSettings {
  enabled: boolean;
  allowedIPs: string[];
  descriptions: Record<string, string>;
}

/**
 * Complete security settings structure
 */
export interface SecuritySettings {
  maintenance: MaintenanceSettings;
  emailWhitelist: EmailWhitelistSettings;
  ipWhitelist: IPWhitelistSettings;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: number;
  setting_key: string;
  old_value: any;
  new_value: any;
  changed_by: string;
  changed_at: Date;
  change_reason: string | null;
}

/**
 * Service for managing system-level security settings
 * Settings are stored in the database but can fallback to environment variables
 */
export class SecuritySettingsService {
  /**
   * Get current security settings
   * Falls back to environment variables if database settings are not available
   */
  static async getSettings(): Promise<SecuritySettings> {
    try {
      const result = await query(
        `SELECT value FROM system_settings WHERE key = $1`,
        ['security_settings']
      );

      if (result.rows.length > 0) {
        return result.rows[0].value as SecuritySettings;
      }

      // Fallback to environment variables
      console.log('[SecuritySettings] No settings in database, using environment variables');
      return this.getSettingsFromEnv();
    } catch (error) {
      console.error('[SecuritySettings] Error fetching settings from database:', error);
      return this.getSettingsFromEnv();
    }
  }

  /**
   * Update security settings
   * Creates an audit log entry for the change
   * Invalidates the settings cache to ensure middleware picks up changes immediately
   */
  static async updateSettings(
    settings: SecuritySettings,
    updatedBy: string,
    reason?: string
  ): Promise<SecuritySettings> {
    try {
      // Get old settings for audit log
      const oldSettings = await this.getSettings();

      // Update settings
      const result = await query(
        `UPDATE system_settings 
         SET value = $1, updated_at = NOW(), updated_by = $2
         WHERE key = $3
         RETURNING value`,
        [JSON.stringify(settings), updatedBy, 'security_settings']
      );

      // Create audit log entry
      await query(
        `INSERT INTO system_settings_audit 
         (setting_key, old_value, new_value, changed_by, change_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'security_settings',
          JSON.stringify(oldSettings),
          JSON.stringify(settings),
          updatedBy,
          reason || null
        ]
      );

      // Invalidate cache so middleware picks up new settings immediately
      settingsCache.invalidate();
      console.log(`[SecuritySettings] Settings updated by ${updatedBy}, cache invalidated`);
      
      return result.rows[0].value as SecuritySettings;
    } catch (error) {
      console.error('[SecuritySettings] Error updating settings:', error);
      throw new Error('Failed to update security settings');
    }
  }

  /**
   * Get settings from environment variables
   * Used as fallback when database is not available or not initialized
   */
  private static getSettingsFromEnv(): SecuritySettings {
    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || 
      'We are currently performing scheduled maintenance. Please check back soon.';
    const maintenanceAllowedUsers = process.env.MAINTENANCE_ALLOWED_USERS 
      ? process.env.MAINTENANCE_ALLOWED_USERS.split(',').map(e => e.trim())
      : [];

    // Parse email whitelist settings
    const emailWhitelist = process.env.EMAIL_WHITELIST 
      ? process.env.EMAIL_WHITELIST.split(',').map(e => e.trim()).filter(e => e)
      : [];
    const emailDomainWhitelist = process.env.EMAIL_DOMAIN_WHITELIST 
      ? process.env.EMAIL_DOMAIN_WHITELIST.split(',').map(d => d.trim()).filter(d => d)
      : [];

    let emailMode: 'disabled' | 'domain' | 'specific' = 'disabled';
    if (emailWhitelist.length > 0) {
      emailMode = 'specific';
    } else if (emailDomainWhitelist.length > 0) {
      emailMode = 'domain';
    }

    // Parse IP whitelist settings
    const ipWhitelist = process.env.IP_WHITELIST 
      ? process.env.IP_WHITELIST.split(',').map(ip => ip.trim()).filter(ip => ip)
      : [];

    return {
      maintenance: {
        enabled: maintenanceMode,
        message: maintenanceMessage,
        allowedUsers: maintenanceAllowedUsers
      },
      emailWhitelist: {
        mode: emailMode,
        domains: emailDomainWhitelist,
        emails: emailWhitelist
      },
      ipWhitelist: {
        enabled: ipWhitelist.length > 0,
        allowedIPs: ipWhitelist,
        descriptions: {}
      }
    };
  }

  /**
   * Migrate current environment variable settings to database
   * Should be called once during application startup
   */
  static async migrateFromEnv(): Promise<void> {
    try {
      // Check if settings already exist in database
      const existing = await query(
        `SELECT id FROM system_settings WHERE key = $1`,
        ['security_settings']
      );

      if (existing.rows.length > 0) {
        console.log('[SecuritySettings] Settings already exist in database, skipping migration');
        return;
      }

      // Get settings from environment
      const settings = this.getSettingsFromEnv();

      // Insert into database
      await query(
        `INSERT INTO system_settings (key, value, description, updated_by)
         VALUES ($1, $2, $3, $4)`,
        [
          'security_settings',
          JSON.stringify(settings),
          'System security and access control settings',
          'system'
        ]
      );

      console.log('[SecuritySettings] Successfully migrated settings from environment to database');
    } catch (error) {
      console.error('[SecuritySettings] Error migrating settings:', error);
      // Don't throw - application can still work with env variables
    }
  }

  /**
   * Get audit log for security settings changes
   */
  static async getAuditLog(limit: number = 50): Promise<AuditLogEntry[]> {
    try {
      const result = await query(
        `SELECT id, setting_key, old_value, new_value, changed_by, changed_at, change_reason
         FROM system_settings_audit
         WHERE setting_key = $1
         ORDER BY changed_at DESC
         LIMIT $2`,
        ['security_settings', limit]
      );

      return result.rows as AuditLogEntry[];
    } catch (error) {
      console.error('[SecuritySettings] Error fetching audit log:', error);
      return [];
    }
  }
}

