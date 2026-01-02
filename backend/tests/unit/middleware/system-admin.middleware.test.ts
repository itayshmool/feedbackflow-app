import { Request, Response, NextFunction } from 'express';
import { requireSystemAdmin, isSystemAdmin, SystemAdminRequest } from '../../../src/shared/middleware/system-admin.middleware';

describe('System Admin Middleware', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.SYSTEM_ADMINS;
    
    // Setup mock objects
    mockReq = {
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User'
      }
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Clear console logs
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.SYSTEM_ADMINS = originalEnv;
    } else {
      delete process.env.SYSTEM_ADMINS;
    }
    
    jest.restoreAllMocks();
  });

  describe('isSystemAdmin helper', () => {
    it('should return true for system admin email', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com,superadmin@example.com';
      expect(isSystemAdmin('admin@example.com')).toBe(true);
    });

    it('should return true for system admin with case insensitive match', () => {
      process.env.SYSTEM_ADMINS = 'Admin@Example.com';
      expect(isSystemAdmin('admin@example.com')).toBe(true);
    });

    it('should return false for non-admin email', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';
      expect(isSystemAdmin('user@example.com')).toBe(false);
    });

    it('should return false when SYSTEM_ADMINS is empty', () => {
      process.env.SYSTEM_ADMINS = '';
      expect(isSystemAdmin('admin@example.com')).toBe(false);
    });

    it('should return false when SYSTEM_ADMINS is not set', () => {
      delete process.env.SYSTEM_ADMINS;
      expect(isSystemAdmin('admin@example.com')).toBe(false);
    });

    it('should return false for empty email', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';
      expect(isSystemAdmin('')).toBe(false);
    });

    it('should handle whitespace in SYSTEM_ADMINS', () => {
      process.env.SYSTEM_ADMINS = ' admin@example.com , user@example.com ';
      expect(isSystemAdmin('admin@example.com')).toBe(true);
      expect(isSystemAdmin('user@example.com')).toBe(true);
    });

    it('should ignore empty entries in SYSTEM_ADMINS', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com,,user@example.com';
      expect(isSystemAdmin('admin@example.com')).toBe(true);
      expect(isSystemAdmin('')).toBe(false);
    });
  });

  describe('requireSystemAdmin middleware', () => {
    it('should allow access for system admin', () => {
      process.env.SYSTEM_ADMINS = 'test@example.com';
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSystemAdmin).toBe(true);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access with case insensitive email match', () => {
      process.env.SYSTEM_ADMINS = 'TEST@EXAMPLE.COM';
      mockReq.user = { email: 'test@example.com' } as any;
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSystemAdmin).toBe(true);
    });

    it('should allow access for one of multiple system admins', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com,test@example.com,superadmin@example.com';
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSystemAdmin).toBe(true);
    });

    it('should deny access for non-system admin', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';
      mockReq.user = { email: 'test@example.com' } as any;
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'System administrator access required',
        message: 'You must be a system administrator to access this resource',
        code: 'SYSTEM_ADMIN_REQUIRED'
      });
    });

    it('should deny access when user is not authenticated', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';
      mockReq.user = undefined;
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    });

    it('should deny access when user has no email', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';
      mockReq.user = { id: 1 } as any;
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    });

    it('should deny access when SYSTEM_ADMINS is not set', () => {
      delete process.env.SYSTEM_ADMINS;
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'System admin access not configured',
        code: 'SYSTEM_ADMIN_NOT_CONFIGURED'
      });
    });

    it('should deny access when SYSTEM_ADMINS is empty string', () => {
      process.env.SYSTEM_ADMINS = '';
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'System admin access not configured',
        code: 'SYSTEM_ADMIN_NOT_CONFIGURED'
      });
    });

    it('should deny access when SYSTEM_ADMINS is only whitespace', () => {
      process.env.SYSTEM_ADMINS = '   ';
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle whitespace in SYSTEM_ADMINS list', () => {
      process.env.SYSTEM_ADMINS = ' test@example.com , admin@example.com ';
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSystemAdmin).toBe(true);
    });

    it('should log access granted for system admin', () => {
      process.env.SYSTEM_ADMINS = 'test@example.com';
      const logSpy = jest.spyOn(console, 'log');
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[System Admin] Access granted'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    });

    it('should log access denied for non-admin', () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';
      mockReq.user = { email: 'test@example.com' } as any;
      const logSpy = jest.spyOn(console, 'log');
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[System Admin] Access denied'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test@example.com'));
    });

    it('should log warning when SYSTEM_ADMINS not configured', () => {
      delete process.env.SYSTEM_ADMINS;
      const warnSpy = jest.spyOn(console, 'warn');
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('SYSTEM_ADMINS environment variable is not set'));
    });

    it('should work with itays@wix.com as specified', () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';
      mockReq.user = { email: 'itays@wix.com' } as any;
      
      const middleware = requireSystemAdmin();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.isSystemAdmin).toBe(true);
    });
  });
});

