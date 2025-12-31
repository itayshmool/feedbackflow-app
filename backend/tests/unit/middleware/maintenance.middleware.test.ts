// backend/tests/unit/middleware/maintenance.middleware.test.ts

import { checkMaintenanceMode } from '../../../src/shared/middleware/maintenance.middleware';
import { Request, Response, NextFunction } from 'express';

describe('Maintenance Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let originalEnv: string | undefined;

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
      process.env.MAINTENANCE_MODE = 'false';
    });

    it('should allow requests to pass through', () => {
      checkMaintenanceMode(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow requests to all endpoints', () => {
      const paths = [
        '/api/v1/feedback',
        '/api/v1/cycles',
        '/api/v1/analytics',
        '/api/v1/auth/login',
        '/api/v1/health',
      ];

      paths.forEach((path) => {
        const mockReq = { path, method: 'GET' } as Partial<Request>;
        const mockNext = jest.fn();
        checkMaintenanceMode(mockReq as Request, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('when maintenance mode is enabled', () => {
    beforeEach(() => {
      process.env.MAINTENANCE_MODE = 'true';
    });

    it('should block non-allowed endpoints with 503 status', () => {
      checkMaintenanceMode(req as Request, res as Response, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Service temporarily unavailable - system maintenance in progress',
        maintenance: true,
        message: 'We are currently performing system maintenance to improve security and performance. Please check back soon.'
      });
    });

    it('should allow auth endpoints', () => {
      const authPaths = [
        '/api/v1/auth/login',
        '/api/v1/auth/logout',
        '/api/v1/auth/refresh',
        '/api/v1/auth/me',
      ];

      authPaths.forEach((path) => {
        const mockReq = { path, method: 'POST' } as Partial<Request>;
        const mockNext = jest.fn();
        checkMaintenanceMode(mockReq as Request, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      });
    });

    it('should allow health check endpoint', () => {
      const mockReq = { path: '/api/v1/health', method: 'GET' } as Partial<Request>;
      checkMaintenanceMode(mockReq as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow alternative health check path', () => {
      const mockReq = { path: '/health', method: 'GET' } as Partial<Request>;
      checkMaintenanceMode(mockReq as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow maintenance status endpoint', () => {
      const mockReq = { path: '/api/v1/maintenance-status', method: 'GET' } as Partial<Request>;
      checkMaintenanceMode(mockReq as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block protected endpoints', () => {
      const blockedPaths = [
        '/api/v1/feedback',
        '/api/v1/cycles',
        '/api/v1/analytics',
        '/api/v1/notifications',
        '/api/v1/users',
      ];

      blockedPaths.forEach((path) => {
        const mockReq = { path, method: 'GET' } as Partial<Request>;
        const mockRes = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };
        const mockNext = jest.fn();

        checkMaintenanceMode(mockReq as Request, mockRes as any, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.status).toHaveBeenCalledWith(503);
      });
    });
  });

  describe('when MAINTENANCE_MODE is not set', () => {
    beforeEach(() => {
      delete process.env.MAINTENANCE_MODE;
    });

    it('should allow requests to pass through', () => {
      checkMaintenanceMode(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

