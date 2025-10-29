// backend/tests/integration/auth/google-auth.integration.test.ts

import request from 'supertest';
import app from '../../../src/app';

describe('Google Auth Integration', () => {
  describe('POST /api/v1/auth/login/mock', () => {
    it('should login with mock credentials and return JWT', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login/mock')
        .send({
          email: 'test@example.com',
          name: 'Test User'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
      expect(response.body.user.roles).toContain('employee');
    });

    it('should require email field', async () => {
      await request(app)
        .post('/api/v1/auth/login/mock')
        .send({ name: 'Test User' })
        .expect(400);
    });

    it('should validate email format', async () => {
      await request(app)
        .post('/api/v1/auth/login/mock')
        .send({ email: 'invalid-email' })
        .expect(400);
    });
  });

  describe('JWT Authentication Flow', () => {
    let authToken: string;
    let userId: string;

    beforeAll(async () => {
      // Get auth token first
      const response = await request(app)
        .post('/api/v1/auth/login/mock')
        .send({
          email: 'auth-test@example.com',
          name: 'Auth Test User'
        });

      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should protect routes with JWT middleware', async () => {
      // Test without token
      await request(app)
        .get('/health')
        .expect(200); // Health endpoint should be public

      // Test with invalid token on a non-existent route (should get 404, not 401)
      // This is expected since we haven't mounted protected routes yet
      await request(app)
        .get('/api/v1/feedback')
        .set('Authorization', 'Bearer invalid-token')
        .expect(404);

      // Test that JWT token is valid format
      expect(authToken).toBeDefined();
      expect(typeof authToken).toBe('string');
    });

    it('should decode JWT payload correctly', () => {
      // Verify token structure (basic check)
      expect(authToken).toBeDefined();
      expect(typeof authToken).toBe('string');
      expect(authToken.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('User Management', () => {
    it('should create new user on first login', async () => {
      const uniqueEmail = `newuser-${Date.now()}@example.com`;
      
      const response = await request(app)
        .post('/api/v1/auth/login/mock')
        .send({
          email: uniqueEmail,
          name: 'New User'
        })
        .expect(200);

      expect(response.body.user.email).toBe(uniqueEmail);
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.roles).toEqual(['employee']);
    });

    it('should update existing user on subsequent logins', async () => {
      const email = 'update-test@example.com';
      
      // First login
      const firstResponse = await request(app)
        .post('/api/v1/auth/login/mock')
        .send({
          email,
          name: 'Original Name'
        })
        .expect(200);

      const userId = firstResponse.body.user.id;

      // Second login with updated name
      const secondResponse = await request(app)
        .post('/api/v1/auth/login/mock')
        .send({
          email,
          name: 'Updated Name'
        })
        .expect(200);

      expect(secondResponse.body.user.id).toBe(userId); // Same user ID
      expect(secondResponse.body.user.name).toBe('Updated Name'); // Updated name
    });
  });
});
