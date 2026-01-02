import { SecuritySettingsService, SecuritySettings } from '../../modules/system/services/security-settings.service.js';

/**
 * Cache for security settings to avoid hitting the database on every request
 * Cached for 30 seconds by default
 */
class SettingsCache {
  private cachedSettings: SecuritySettings | null = null;
  private cacheExpiry: number = 0;
  private cacheDuration: number = 30000; // 30 seconds in milliseconds
  private isRefreshing: boolean = false;

  /**
   * Get cached settings or fetch from database if expired
   */
  async getSettings(): Promise<SecuritySettings> {
    const now = Date.now();

    // Return cached if still valid
    if (this.cachedSettings && now < this.cacheExpiry) {
      return this.cachedSettings;
    }

    // If already refreshing, wait for it
    if (this.isRefreshing) {
      // Wait up to 5 seconds for refresh
      const maxWait = 5000;
      const startWait = Date.now();
      while (this.isRefreshing && (Date.now() - startWait) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // Return cached after wait (even if stale)
      if (this.cachedSettings) {
        return this.cachedSettings;
      }
    }

    // Refresh cache
    try {
      this.isRefreshing = true;
      this.cachedSettings = await SecuritySettingsService.getSettings();
      this.cacheExpiry = now + this.cacheDuration;
      return this.cachedSettings;
    } catch (error) {
      console.error('[SettingsCache] Error fetching settings:', error);
      // Return stale cache if available
      if (this.cachedSettings) {
        console.warn('[SettingsCache] Returning stale cache due to error');
        return this.cachedSettings;
      }
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Manually invalidate the cache (e.g., after settings update)
   */
  invalidate(): void {
    console.log('[SettingsCache] Cache invalidated');
    this.cachedSettings = null;
    this.cacheExpiry = 0;
  }

  /**
   * Set cache duration (for testing or configuration)
   */
  setCacheDuration(durationMs: number): void {
    this.cacheDuration = durationMs;
  }
}

// Export singleton instance
export const settingsCache = new SettingsCache();

