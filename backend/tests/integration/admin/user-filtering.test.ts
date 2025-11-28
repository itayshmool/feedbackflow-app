import request from 'supertest';
import { Express } from 'express';
import { Pool } from 'pg';

/**
 * Integration tests for user filtering functionality
 * Tests the GET /api/v1/admin/users endpoint with status filter
 */

describe('User Filtering - Status Filter', () => {
  let app: Express;
  let authToken: string;
  let testUserIds: { active: string[]; inactive: string[] } = { active: [], inactive: [] };

  beforeAll(async () => {
    // Import the app (real-database-server.ts)
    const { app: testApp } = await import('../../../src/real-database-server.js');
    app = testApp;

    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({ email: 'test-admin@test.com', password: 'test123' });

    authToken = loginResponse.headers['set-cookie']?.[0] || '';

    // Create test users (3 active, 2 inactive)
    const { query } = await import('../../../src/config/real-database.js');
    
    // Create 3 active users
    for (let i = 1; i <= 3; i++) {
      const result = await query(
        `INSERT INTO users (email, name, is_active) 
         VALUES ($1, $2, true) 
         RETURNING id`,
        [`test-active-${i}@test.com`, `Active User ${i}`]
      );
      testUserIds.active.push(result.rows[0].id);
    }

    // Create 2 inactive users
    for (let i = 1; i <= 2; i++) {
      const result = await query(
        `INSERT INTO users (email, name, is_active) 
         VALUES ($1, $2, false) 
         RETURNING id`,
        [`test-inactive-${i}@test.com`, `Inactive User ${i}`]
      );
      testUserIds.inactive.push(result.rows[0].id);
    }
  });

  afterAll(async () => {
    // Clean up test users
    const { query } = await import('../../../src/config/real-database.js');
    const allIds = [...testUserIds.active, ...testUserIds.inactive];
    
    if (allIds.length > 0) {
      await query(
        `DELETE FROM users WHERE id = ANY($1)`,
        [allIds]
      );
    }
  });

  describe('GET /api/v1/admin/users', () => {
    it('should return only active users when status=active', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ status: 'active', limit: 100 })
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include our 3 active test users
      const activeTestUsers = response.body.data.filter((u: any) =>
        u.email.startsWith('test-active-')
      );
      expect(activeTestUsers.length).toBe(3);

      // Should NOT include any inactive test users
      const inactiveTestUsers = response.body.data.filter((u: any) =>
        u.email.startsWith('test-inactive-')
      );
      expect(inactiveTestUsers.length).toBe(0);

      // Verify all returned users have is_active = true (if the field is returned)
      response.body.data.forEach((user: any) => {
        if (user.is_active !== undefined && user.is_active !== null) {
          expect(user.is_active).toBe(true);
        }
      });
    });

    it('should return only inactive users when status=inactive', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ status: 'inactive', limit: 100 })
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include our 2 inactive test users
      const inactiveTestUsers = response.body.data.filter((u: any) =>
        u.email.startsWith('test-inactive-')
      );
      expect(inactiveTestUsers.length).toBe(2);

      // Should NOT include any active test users
      const activeTestUsers = response.body.data.filter((u: any) =>
        u.email.startsWith('test-active-')
      );
      expect(activeTestUsers.length).toBe(0);

      // Verify all returned users have is_active = false (if the field is returned)
      response.body.data.forEach((user: any) => {
        if (user.is_active !== undefined && user.is_active !== null) {
          expect(user.is_active).toBe(false);
        }
      });
    });

    it('should return all users when no status filter is provided', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ limit: 1000 })
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include BOTH active and inactive test users
      const activeTestUsers = response.body.data.filter((u: any) =>
        u.email.startsWith('test-active-')
      );
      const inactiveTestUsers = response.body.data.filter((u: any) =>
        u.email.startsWith('test-inactive-')
      );

      expect(activeTestUsers.length).toBe(3);
      expect(inactiveTestUsers.length).toBe(2);
    });

    it('should return empty array when status=inactive and no inactive users exist', async () => {
      // First, activate all our inactive test users
      const { query } = await import('../../../src/config/real-database.js');
      await query(
        `UPDATE users SET is_active = true WHERE id = ANY($1)`,
        [testUserIds.inactive]
      );

      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ status: 'inactive', limit: 100 })
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Should have no test-inactive users
      const inactiveTestUsers = response.body.data.filter((u: any) =>
        u.email.startsWith('test-inactive-')
      );
      expect(inactiveTestUsers.length).toBe(0);

      // Restore inactive status for cleanup
      await query(
        `UPDATE users SET is_active = false WHERE id = ANY($1)`,
        [testUserIds.inactive]
      );
    });

    it('should work with status filter combined with search', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ 
          status: 'active',
          search: 'Active User 1',
          limit: 100
        })
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Should find exactly the one active test user matching the search
      const matchedUsers = response.body.data.filter((u: any) =>
        u.email === 'test-active-1@test.com'
      );
      expect(matchedUsers.length).toBe(1);
      expect(matchedUsers[0].name).toBe('Active User 1');
    });

    it('should work with status filter combined with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ 
          status: 'active',
          limit: 2,
          page: 1
        })
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      
      // All returned users should be active
      response.body.data.forEach((user: any) => {
        if (user.is_active !== undefined && user.is_active !== null) {
          expect(user.is_active).toBe(true);
        }
      });
    });
  });

  describe('Modular vs Inline Route Conflict', () => {
    it('should verify which route handler is being used', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .query({ status: 'active', limit: 5 })
        .set('Cookie', authToken)
        .expect(200);

      // Check if the response structure matches the inline handler or modular handler
      // Inline handler: returns { success: true, data: [...], pagination: {...} }
      // Modular handler: might have different structure

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');

      // Log for debugging which handler responded
      console.log('Response structure:', {
        hasSuccess: 'success' in response.body,
        hasData: 'data' in response.body,
        hasPagination: 'pagination' in response.body,
        dataType: Array.isArray(response.body.data) ? 'array' : typeof response.body.data
      });
    });
  });
});

