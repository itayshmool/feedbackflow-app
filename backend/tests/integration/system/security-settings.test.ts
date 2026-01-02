import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import systemAdminRoutes from '../../../src/modules/system/routes/system-admin.routes';
import { authenticateToken } from '../../../src/shared/middleware/auth.middleware';

// Mock the database
jest.mock('../../../src/config/real-database', () => ({
  query: jest.fn()
}));

// Mock the auth middleware to simulate authenticated requests
jest.mock('../../../src/shared/middleware/auth.middleware', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    // Simulate authenticated user based on test header
    const email = req.headers['x-test-user-email'];
    if (email) {
      req.user = { id: 1, email, name: 'Test User' };
    }
    next();
  }
}));

describe('System Admin API Integration Tests', () => {
  let app: Express;
  let originalEnv: string | undefined;
  const { query } = require('../../../src/config/real-database');

  beforeAll(() => {
    // Setup Express app with routes
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    
    // Add authentication middleware
    app.use((req, res, next) => {
      const email = req.headers['x-test-user-email'] as string;
      if (email) {
        (req as any).user = { id: 1, email, name: 'Test User' };
      }
      next();
    });
    
    app.use('/api/v1/system', systemAdminRoutes);
  });

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env.SYSTEM_ADMINS;
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.SYSTEM_ADMINS = originalEnv;
    } else {
      delete process.env.SYSTEM_ADMINS;
    }
  });

  describe('GET /api/v1/system/check-access', () => {
    it('should return true for system admin', async () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';

      const response = await request(app)
        .get('/api/v1/system/check-access')
        .set('x-test-user-email', 'itays@wix.com');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isSystemAdmin).toBe(true);
      expect(response.body.data.email).toBe('itays@wix.com');
    });

    it('should return false for non-system admin', async () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';

      const response = await request(app)
        .get('/api/v1/system/check-access')
        .set('x-test-user-email', 'user@example.com');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isSystemAdmin).toBe(false);
    });

    it('should return false when not authenticated', async () => {
      const response = await request(app)
        .get('/api/v1/system/check-access');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isSystemAdmin).toBe(false);
    });
  });

  describe('GET /api/v1/system/security-settings', () => {
    it('should return settings for system admin', async () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';
      
      const mockSettings = {
        maintenance: { enabled: false, message: 'Test', allowedUsers: [] },
        emailWhitelist: { mode: 'disabled', domains: [], emails: [] },
        ipWhitelist: { enabled: false, allowedIPs: [], descriptions: {} }
      };

      query.mockResolvedValueOnce({
        rows: [{ value: mockSettings }]
      });

      const response = await request(app)
        .get('/api/v1/system/security-settings')
        .set('x-test-user-email', 'itays@wix.com');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockSettings);
    });

    it('should deny access for non-system admin', async () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';

      const response = await request(app)
        .get('/api/v1/system/security-settings')
        .set('x-test-user-email', 'user@example.com');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('SYSTEM_ADMIN_REQUIRED');
    });

    it('should deny access when not authenticated', async () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';

      const response = await request(app)
        .get('/api/v1/system/security-settings');

      expect(response.status).toBe(401);
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('should handle database errors gracefully', async () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';
      query.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/system/security-settings')
        .set('x-test-user-email', 'itays@wix.com');

      // Should fallback to environment variables (200 with env data)
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('PUT /api/v1/system/security-settings', () => {
    it('should update settings for system admin', async () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';
      
      const oldSettings = {
        maintenance: { enabled: false, message: 'Old', allowedUsers: [] },
        emailWhitelist: { mode: 'disabled', domains: [], emails: [] },
        ipWhitelist: { enabled: false, allowedIPs: [], descriptions: {} }
      };

      const newSettings = {
        maintenance: { enabled: true, message: 'New', allowedUsers: [] },
        emailWhitelist: { mode: 'disabled', domains: [], emails: [] },
        ipWhitelist: { enabled: false, allowedIPs: [], descriptions: {} }
      };

      // Mock getSettings call
      query.mockResolvedValueOnce({
        rows: [{ value: oldSettings }]
      });

      // Mock update call
      query.mockResolvedValueOnce({
        rows: [{ value: newSettings }]
      });

      // Mock audit log insert
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/v1/system/security-settings')
        .set('x-test-user-email', 'itays@wix.com')
        .send({
          settings: newSettings,
          reason: 'Testing update'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(newSettings);
      expect(response.body.message).toBe('Security settings updated successfully');
    });

    it('should deny access for non-system admin', async () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';

      const response = await request(app)
        .put('/api/v1/system/security-settings')
        .set('x-test-user-email', 'user@example.com')
        .send({
          settings: {
            maintenance: { enabled: true, message: 'Test', allowedUsers: [] },
            emailWhitelist: { mode: 'disabled', domains: [], emails: [] },
            ipWhitelist: { enabled: false, allowedIPs: [], descriptions: {} }
          }
        });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SYSTEM_ADMIN_REQUIRED');
    });

    it('should validate settings structure', async () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';

      const response = await request(app)
        .put('/api/v1/system/security-settings')
        .set('x-test-user-email', 'itays@wix.com')
        .send({
          settings: { maintenance: {} } // Invalid structure
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid settings structure');
    });

    it('should require settings in request body', async () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';

      const response = await request(app)
        .put('/api/v1/system/security-settings')
        .set('x-test-user-email', 'itays@wix.com')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Settings are required');
    });
  });

  describe('GET /api/v1/system/security-settings/audit', () => {
    it('should return audit log for system admin', async () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';
      
      const mockAuditLog = [
        {
          id: 1,
          setting_key: 'security_settings',
          old_value: {},
          new_value: {},
          changed_by: 'itays@wix.com',
          changed_at: new Date(),
          change_reason: 'Test change'
        }
      ];

      query.mockResolvedValueOnce({
        rows: mockAuditLog
      });

      const response = await request(app)
        .get('/api/v1/system/security-settings/audit')
        .set('x-test-user-email', 'itays@wix.com');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].changed_by).toBe('itays@wix.com');
    });

    it('should respect limit parameter', async () => {
      process.env.SYSTEM_ADMINS = 'itays@wix.com';
      query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/v1/system/security-settings/audit?limit=10')
        .set('x-test-user-email', 'itays@wix.com');

      expect(response.status).toBe(200);
      expect(query).toHaveBeenCalledWith(
        expect.any(String),
        ['security_settings', 10]
      );
    });

    it('should deny access for non-system admin', async () => {
      process.env.SYSTEM_ADMINS = 'admin@example.com';

      const response = await request(app)
        .get('/api/v1/system/security-settings/audit')
        .set('x-test-user-email', 'user@example.com');

      expect(response.status).toBe(403);
      expect(response.body.code).toBe('SYSTEM_ADMIN_REQUIRED');
    });
  });
});

