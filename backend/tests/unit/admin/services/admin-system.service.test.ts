// backend/tests/unit/admin/services/admin-system.service.test.ts

import { AdminSystemService } from '../../../../src/modules/admin/services/admin-system.service';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { Logger } from '../../../../src/shared/utils/logger';
import { LogLevel, BackupFrequency } from '../../../../src/modules/admin/types/admin.types';

// Mock dependencies
jest.mock('pg');
jest.mock('events');
jest.mock('../../../../src/shared/utils/logger');

describe('AdminSystemService', () => {
  let adminSystemService: AdminSystemService;
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
    adminSystemService = new AdminSystemService(mockDb, mockEventEmitter, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSystemSettings', () => {
    it('should return existing system settings', async () => {
      const mockSettings = {
        id: 'system_settings',
        maintenance_mode: false,
        system_version: '1.0.0',
        backup_frequency: BackupFrequency.DAILY,
        log_level: LogLevel.INFO,
        monitoring: JSON.stringify({
          enabled: true,
          metricsCollection: true,
          errorTracking: true,
          performanceMonitoring: true,
          alerting: true,
          retentionDays: 30
        }),
        performance: JSON.stringify({
          cacheEnabled: true,
          cacheTtl: 300,
          rateLimiting: true,
          compressionEnabled: true,
          cdnEnabled: false
        }),
        security: JSON.stringify({
          encryptionAtRest: true,
          encryptionInTransit: true,
          auditLogging: true,
          dataRetention: 2555,
          complianceMode: 'none'
        }),
        updated_at: new Date(),
        updated_by: 'system'
      };

      (adminSystemService as any).systemSettingsModel = {
        get: jest.fn().mockResolvedValue(mockSettings)
      };

      jest.spyOn(adminSystemService as any, 'buildCompleteSystemSettings').mockResolvedValue({
        id: 'system_settings',
        maintenanceMode: false,
        systemVersion: '1.0.0',
        logLevel: LogLevel.INFO
      });

      const result = await adminSystemService.getSystemSettings();

      expect(result).toBeDefined();
      expect(result.id).toBe('system_settings');
      expect(result.maintenanceMode).toBe(false);
      expect(result.systemVersion).toBe('1.0.0');
    });

    it('should create default settings if none exist', async () => {
      (adminSystemService as any).systemSettingsModel = {
        get: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: 'system_settings',
          maintenance_mode: false,
          system_version: '1.0.0',
          backup_frequency: BackupFrequency.DAILY,
          log_level: LogLevel.INFO,
          monitoring: JSON.stringify({}),
          performance: JSON.stringify({}),
          security: JSON.stringify({}),
          updated_at: new Date(),
          updated_by: 'system'
        })
      };

      jest.spyOn(adminSystemService as any, 'buildCompleteSystemSettings').mockResolvedValue({
        id: 'system_settings',
        maintenanceMode: false,
        systemVersion: '1.0.0'
      });

      const result = await adminSystemService.getSystemSettings();

      expect(result).toBeDefined();
      expect((adminSystemService as any).systemSettingsModel.create).toHaveBeenCalled();
    });
  });

  describe('updateSystemSettings', () => {
    it('should update system settings successfully', async () => {
      const updates = {
        maintenanceMode: true,
        maintenanceMessage: 'System maintenance in progress',
        logLevel: LogLevel.DEBUG
      };

      const existingSettings = {
        id: 'system_settings',
        maintenance_mode: false,
        system_version: '1.0.0',
        backup_frequency: BackupFrequency.DAILY,
        log_level: LogLevel.INFO,
        monitoring: JSON.stringify({}),
        performance: JSON.stringify({}),
        security: JSON.stringify({}),
        updated_at: new Date(),
        updated_by: 'system'
      };

      (adminSystemService as any).systemSettingsModel = {
        get: jest.fn().mockResolvedValue(existingSettings),
        update: jest.fn().mockResolvedValue({
          ...existingSettings,
          maintenance_mode: true,
          maintenance_message: 'System maintenance in progress',
          log_level: LogLevel.DEBUG
        })
      };

      jest.spyOn(adminSystemService as any, 'buildCompleteSystemSettings').mockResolvedValue({
        id: 'system_settings',
        maintenanceMode: true,
        maintenanceMessage: 'System maintenance in progress',
        logLevel: LogLevel.DEBUG
      });

      const result = await adminSystemService.updateSystemSettings(updates, 'admin-1');

      expect(result).toBeDefined();
      expect(result.maintenanceMode).toBe(true);
      expect(result.maintenanceMessage).toBe('System maintenance in progress');
      expect(result.logLevel).toBe(LogLevel.DEBUG);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('admin:system_settings_updated', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('System settings updated', expect.any(Object));
    });

    it('should handle database errors gracefully', async () => {
      const updates = {
        maintenanceMode: true
      };

      // Mock database error
      (mockDb.connect as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        adminSystemService.updateSystemSettings(updates, 'admin-1')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('setMaintenanceMode', () => {
    it('should set maintenance mode successfully', async () => {
      (adminSystemService as any).systemSettingsModel = {
        updateMaintenanceMode: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(adminSystemService, 'getSystemSettings').mockResolvedValue({
        id: 'system_settings',
        maintenanceMode: true,
        maintenanceMessage: 'System maintenance in progress',
        systemVersion: '1.0.0',
        backupFrequency: BackupFrequency.DAILY,
        logLevel: LogLevel.INFO,
        monitoring: {} as any,
        performance: {} as any,
        security: {} as any,
        updatedAt: new Date(),
        updatedBy: 'admin-1'
      });

      const result = await adminSystemService.setMaintenanceMode(true, 'System maintenance in progress', 'admin-1');

      expect(result).toBeDefined();
      expect(result.maintenanceMode).toBe(true);
      expect(result.maintenanceMessage).toBe('System maintenance in progress');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('admin:maintenance_mode_changed', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Maintenance mode updated', expect.any(Object));
    });
  });

  describe('updateLogLevel', () => {
    it('should update log level successfully', async () => {
      (adminSystemService as any).systemSettingsModel = {
        updateLogLevel: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(adminSystemService, 'getSystemSettings').mockResolvedValue({
        id: 'system_settings',
        maintenanceMode: false,
        systemVersion: '1.0.0',
        backupFrequency: BackupFrequency.DAILY,
        logLevel: LogLevel.DEBUG,
        monitoring: {} as any,
        performance: {} as any,
        security: {} as any,
        updatedAt: new Date(),
        updatedBy: 'admin-1'
      });

      const result = await adminSystemService.updateLogLevel(LogLevel.DEBUG, 'admin-1');

      expect(result).toBeDefined();
      expect(result.logLevel).toBe(LogLevel.DEBUG);
      expect(mockLogger.info).toHaveBeenCalledWith('Log level updated', expect.any(Object));
    });
  });

  describe('getSystemStats', () => {
    it('should return system statistics', async () => {
      const result = await adminSystemService.getSystemStats();

      expect(result).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.organizations).toBeDefined();
      expect(result.cycles).toBeDefined();
      expect(result.feedback).toBeDefined();
      expect(result.system).toBeDefined();
      expect(result.performance).toBeDefined();

      // Check user stats structure
      expect(result.users.total).toBeDefined();
      expect(result.users.active).toBeDefined();
      expect(result.users.inactive).toBeDefined();
      expect(result.users.byRole).toBeDefined();

      // Check system health stats
      expect(result.system.uptime).toBeDefined();
      expect(result.system.memoryUsage).toBeDefined();
      expect(result.system.cpuUsage).toBeDefined();
      expect(result.system.diskUsage).toBeDefined();
    });
  });

  describe('getAdminDashboard', () => {
    it('should return admin dashboard data', async () => {
      jest.spyOn(adminSystemService, 'getSystemStats').mockResolvedValue({
        users: { total: 100, active: 80, inactive: 20, newThisMonth: 10, byRole: {} as any, byOrganization: [] },
        organizations: { total: 5, active: 4, inactive: 1, newThisMonth: 1, byPlan: {} as any, averageUsersPerOrg: 20 },
        cycles: { total: 25, active: 8, completed: 15, overdue: 2, averageDuration: 14, completionRate: 85.5 },
        feedback: { total: 1250, pending: 150, completed: 1100, averageResponseTime: 2.5, acknowledgmentRate: 78.5 },
        system: { uptime: 86400, memoryUsage: 65.5, cpuUsage: 45.2, diskUsage: 78.3, databaseConnections: 25, activeSessions: 45 },
        performance: { averageResponseTime: 250, requestsPerMinute: 120, errorRate: 0.5, cacheHitRate: 85.2, databaseQueryTime: 45 }
      });

      jest.spyOn(adminSystemService, 'getRecentActivity').mockResolvedValue([
        {
          id: 'audit-1',
          userId: 'user-1',
          userEmail: 'admin@example.com',
          organizationId: 'org-1',
          action: 'create' as any,
          resource: 'user',
          resourceId: 'user-123',
          details: { email: 'newuser@example.com' },
          timestamp: new Date(),
          success: true
        }
      ]);

      jest.spyOn(adminSystemService, 'getSystemAlerts').mockResolvedValue([
        {
          id: 'alert-1',
          type: 'system' as any,
          severity: 'medium' as any,
          title: 'High Memory Usage',
          message: 'System memory usage is above 80%',
          timestamp: new Date(),
          acknowledged: false
        }
      ]);

      const result = await adminSystemService.getAdminDashboard();

      expect(result).toBeDefined();
      expect(result.stats).toBeDefined();
      expect(result.recentActivity).toBeDefined();
      expect(result.systemHealth).toBeDefined();
      expect(result.alerts).toBeDefined();
      expect(result.quickActions).toBeDefined();

      expect(result.stats.users.total).toBe(100);
      expect(result.recentActivity).toHaveLength(1);
      expect(result.alerts).toHaveLength(1);
      expect(result.quickActions).toHaveLength(4);
    });
  });

  describe('getSystemAlerts', () => {
    it('should return system alerts', async () => {
      const result = await adminSystemService.getSystemAlerts();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const alert = result[0];
      expect(alert.id).toBeDefined();
      expect(alert.type).toBeDefined();
      expect(alert.severity).toBeDefined();
      expect(alert.title).toBeDefined();
      expect(alert.message).toBeDefined();
      expect(alert.timestamp).toBeDefined();
      expect(alert.acknowledged).toBeDefined();
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity', async () => {
      const result = await adminSystemService.getRecentActivity();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const activity = result[0];
      expect(activity.id).toBeDefined();
      expect(activity.userId).toBeDefined();
      expect(activity.userEmail).toBeDefined();
      expect(activity.organizationId).toBeDefined();
      expect(activity.action).toBeDefined();
      expect(activity.resource).toBeDefined();
      expect(activity.timestamp).toBeDefined();
      expect(activity.success).toBeDefined();
    });
  });

  describe('isMaintenanceMode', () => {
    it('should return maintenance mode status', async () => {
      (adminSystemService as any).systemSettingsModel = {
        isMaintenanceMode: jest.fn().mockResolvedValue(true)
      };

      const result = await adminSystemService.isMaintenanceMode();

      expect(result).toBe(true);
    });
  });

  describe('getSystemVersion', () => {
    it('should return system version', async () => {
      (adminSystemService as any).systemSettingsModel = {
        getSystemVersion: jest.fn().mockResolvedValue('1.0.0')
      };

      const result = await adminSystemService.getSystemVersion();

      expect(result).toBe('1.0.0');
    });
  });

  describe('getLastBackup', () => {
    it('should return last backup date', async () => {
      const lastBackup = new Date('2024-01-15T10:30:00Z');
      (adminSystemService as any).systemSettingsModel = {
        getLastBackup: jest.fn().mockResolvedValue(lastBackup)
      };

      const result = await adminSystemService.getLastBackup();

      expect(result).toEqual(lastBackup);
    });

    it('should return null if no backup exists', async () => {
      (adminSystemService as any).systemSettingsModel = {
        getLastBackup: jest.fn().mockResolvedValue(null)
      };

      const result = await adminSystemService.getLastBackup();

      expect(result).toBeNull();
    });
  });
});
