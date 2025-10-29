// backend/tests/integration/cycles/cycle.integration.test.ts

import request from 'supertest';
import app from '../../../src/app';

describe('Cycle Integration', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Get auth token first
    const response = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'cycle-test@example.com',
        name: 'Cycle Test User'
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  describe('POST /api/v1/cycles', () => {
    it('should create cycle successfully', async () => {
      const cycleData = {
        name: 'Q1 2024 Review',
        description: 'Quarterly performance review',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-03-31T23:59:59.999Z',
        type: 'quarterly',
        participants: [
          {
            userId: 'user-1',
            role: 'employee'
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/cycles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cycleData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Q1 2024 Review');
      expect(response.body.type).toBe('quarterly');
      expect(response.body.status).toBe('draft');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/cycles')
        .send({
          name: 'Test Cycle',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-03-31T23:59:59.999Z',
          type: 'quarterly'
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/v1/cycles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Cycle'
          // Missing required fields
        })
        .expect(400);
    });

    it('should validate date format', async () => {
      await request(app)
        .post('/api/v1/cycles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Cycle',
          startDate: 'invalid-date',
          endDate: '2024-03-31T23:59:59.999Z',
          type: 'quarterly'
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/cycles', () => {
    it('should get cycle list', async () => {
      const response = await request(app)
        .get('/api/v1/cycles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('cycles');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should filter by status', async () => {
      const response = await request(app)
        .get('/api/v1/cycles?status=draft')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.cycles).toBeDefined();
    });
  });

  describe('Cycle Actions', () => {
    let cycleId: string;

    beforeAll(async () => {
      // Create a cycle for testing actions
      const response = await request(app)
        .post('/api/v1/cycles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Action Test Cycle',
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-03-31T23:59:59.999Z',
          type: 'quarterly'
        });

      cycleId = response.body.id;
    });

    it('should activate cycle', async () => {
      const response = await request(app)
        .post(`/api/v1/cycles/${cycleId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('active');
    });

    it('should close cycle', async () => {
      const response = await request(app)
        .post(`/api/v1/cycles/${cycleId}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe('closed');
    });
  });

  describe('Cycle Validation', () => {
    it('should validate feedback permission', async () => {
      const validationData = {
        cycleId: 'cycle-123',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        reviewType: 'peer_review'
      };

      const response = await request(app)
        .post('/api/v1/cycles/validate-feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(200);

      expect(response.body).toHaveProperty('valid');
    });

    it('should require all validation fields', async () => {
      await request(app)
        .post('/api/v1/cycles/validate-feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          cycleId: 'cycle-123'
          // Missing other required fields
        })
        .expect(400);
    });
  });

  describe('Cycle Summary', () => {
    it('should get cycle summary', async () => {
      const response = await request(app)
        .get('/api/v1/cycles/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalCycles');
      expect(response.body).toHaveProperty('activeCycles');
      expect(response.body).toHaveProperty('completedCycles');
      expect(response.body).toHaveProperty('totalParticipants');
      expect(response.body).toHaveProperty('completionRate');
    });
  });
});
