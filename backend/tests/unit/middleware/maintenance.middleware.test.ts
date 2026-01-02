// backend/tests/unit/middleware/maintenance.middleware.test.ts

import { checkMaintenanceMode } from '../../../src/shared/middleware/maintenance.middleware';
import { Request, Response, NextFunction } from 'express';
import { settingsCache } from '../../../src/shared/utils/settings-cache';

// Mock the settings cache
jest.mock('../../../src/shared/utils/settings-cache', () => ({
  settingsCache: {
    getSettings: jest.fn(),
  },
}));

describe('Maintenance Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let originalEnv: string | undefined;
  const mockGetSettings = settingsCache.getSettings as jest.MockedFunction<typeof settingsCache.getSettings>;

  beforeEach(() => {
    // Save original environment variable
    originalEnv = process.env.MAINTENANCE_MODE;

    // Mock request, response, and next function
    req = {
      path: '/api/v1/feedback',
      method: 'GET',
    } as Partial<Request>;

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment variable
    if (originalEnv === undefined) {
      delete process.env.MAINTENANCE_MODE;
    } else {
      process.env.MAINTENANCE_MODE = originalEnv;
    }
  });

  describe('when maintenance mode is disabled', () => {
    beforeEach(() => {
      // Mock settings with maintenance disabled
      mockGetSettings.mockResolvedValue({
        maintenance: {
          enabled: false,
          message: 'Maintenance disabled',
          allowedUsers: [],
        },
        emailWhitelist: {
          mode: 'disabled',
          domains: [],
          emails: [],
        },
        ipWhitelist: {
          enabled: false,
          allowedIPs: [],
          descriptions: {},
        },
      });
    });

    it('should allow requests to pass through', async () => {
      await checkMaintenanceMode(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow requests to all endpoints', async () => {
      const paths = [
        '/api/v1/feedback',
        '/api/v1/cycles',
        '/api/v1/analytics',
        '/api/v1/auth/login',
        '/api/v1/health',
      ];

      for (const path of paths) {
        const mockReq = { path, method: 'GET' } as Partial<Request>;
        const mockNext = jest.fn();
        await checkMaintenanceMode(mockReq as Request, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });
  });

  describe('when maintenance mode is enabled', () => {
    beforeEach(() => {
      // Mock settings with maintenance enabled
      mockGetSettings.mockResolvedValue({
        maintenance: {
          enabled: true,
          message: 'We are currently performing system maintenance to improve security and performance. Please check back soon.',
          allowedUsers: [],
        },
        emailWhitelist: {
          mode: 'disabled',
          domains: [],
          emails: [],
        },
        ipWhitelist: {
          enabled: false,
          allowedIPs: [],
          descriptions: {},
        },
      });
    });

    it('should block non-allowed endpoints with 503 status', async () => {
      await checkMaintenanceMode(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service temporarily unavailable - system maintenance in progress',
        maintenance: true,
        message: 'We are currently performing system maintenance to improve security and performance. Please check back soon.'
      });
    });

    it('should allow auth endpoints', async () => {
      const authPaths = [
        '/api/v1/auth/login',
        '/api/v1/auth/logout',
        '/api/v1/auth/refresh',
        '/api/v1/auth/me',
      ];

      for (const path of authPaths) {
        const mockReq = { path, method: 'POST' } as Partial<Request>;
        const mockNext = jest.fn();
        await checkMaintenanceMode(mockReq as Request, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('should allow health check endpoint', async () => {
      const mockReq = { path: '/api/v1/health', method: 'GET' } as Partial<Request>;
      await checkMaintenanceMode(mockReq as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow alternative health check path', async () => {
      const mockReq = { path: '/health', method: 'GET' } as Partial<Request>;
      await checkMaintenanceMode(mockReq as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow maintenance status endpoint', async () => {
      const mockReq = { path: '/api/v1/maintenance-status', method: 'GET' } as Partial<Request>;
      await checkMaintenanceMode(mockReq as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow system admin endpoints', async () => {
      const mockReq = { path: '/api/v1/system/security-settings', method: 'GET' } as Partial<Request>;
      await checkMaintenanceMode(mockReq as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow whitelisted users during maintenance', async () => {
      // Mock settings with allowed users
      mockGetSettings.mockResolvedValue({
        maintenance: {
          enabled: true,
          message: 'Maintenance in progress',
          allowedUsers: ['admin@wix.com', 'itays@wix.com'],
        },
        emailWhitelist: {
          mode: 'disabled',
          domains: [],
          emails: [],
        },
        ipWhitelist: {
          enabled: false,
          allowedIPs: [],
          descriptions: {},
        },
      });

      const mockReq = {
        path: '/api/v1/feedback',
        method: 'GET',
        user: { email: 'itays@wix.com', id: 'user-1' },
      } as any;

      await checkMaintenanceMode(mockReq, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block protected endpoints', async () => {
      const blockedPaths = [
        '/api/v1/feedback',
        '/api/v1/cycles',
        '/api/v1/analytics',
        '/api/v1/notifications',
        '/api/v1/users',
      ];

      for (const path of blockedPaths) {
        const mockReq = { path, method: 'GET' } as Partial<Request>;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };
        const mockNext = jest.fn();

        await checkMaintenanceMode(mockReq as Request, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(503);
      }
    });
  });

  describe('when settings cache fails', () => {
    beforeEach(() => {
      // Mock cache failure
      mockGetSettings.mockRejectedValue(new Error('Database error'));
    });

    it('should allow requests to pass through (fail-open)', async () => {
      await checkMaintenanceMode(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

