import { api } from '../lib/api';

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
  changed_at: string;
  change_reason: string | null;
}

/**
 * System Admin API service
 * Handles all system administration operations
 */
export const systemAdminService = {
  /**
   * Check if current user has system admin access
   */
  async checkAccess(): Promise<boolean> {
    try {
      const response = await api.get('/system/check-access');
      return response.data.data.isSystemAdmin;
    } catch (error) {
      console.error('[System Admin] Error checking access:', error);
      return false;
    }
  },

  /**
   * Get current security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await api.get('/system/security-settings');
    return response.data.data;
  },

  /**
   * Update security settings
   */
  async updateSecuritySettings(
    settings: SecuritySettings,
    reason?: string
  ): Promise<SecuritySettings> {
    const response = await api.put('/system/security-settings', {
      settings,
      reason
    });
    return response.data.data;
  },

  /**
   * Get audit log for security settings changes
   */
  async getAuditLog(limit: number = 50): Promise<AuditLogEntry[]> {
    const response = await api.get('/system/security-settings/audit', {
      params: { limit }
    });
    return response.data.data;
  }
};

