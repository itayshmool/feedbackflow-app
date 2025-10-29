// backend/tests/integration/notifications/notification.integration.test.ts

import request from 'supertest';
import app from '../../../src/app';

describe('Notification Integration', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Get auth token first
    const response = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'notification-test@example.com',
        name: 'Notification Test User'
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  describe('POST /api/v1/notifications', () => {
    it('should create notification successfully', async () => {
      const notificationData = {
        userId: userId,
        type: 'cycle_created',
        channel: 'email',
        title: 'New Cycle Created',
        content: 'A new cycle has been created for your organization',
        data: { cycleId: 'cycle-123', cycleName: 'Q1 2024' },
        priority: 'normal'
      };

      const response = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('New Cycle Created');
      expect(response.body.type).toBe('cycle_created');
      expect(response.body.channel).toBe('email');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/notifications')
        .send({
          userId: 'user-123',
          type: 'cycle_created',
          channel: 'email',
          title: 'Test Notification',
          content: 'Test content'
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Notification'
          // Missing required fields
        })
        .expect(400);
    });

    it('should validate notification type', async () => {
      await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId,
          type: 'invalid_type',
          channel: 'email',
          title: 'Test Notification',
          content: 'Test content'
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/notifications', () => {
    it('should get notification list', async () => {
      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('unreadCount');
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/v1/notifications?type=cycle_created')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.notifications).toBeDefined();
    });

    it('should filter by channel', async () => {
      const response = await request(app)
        .get('/api/v1/notifications?channel=email')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.notifications).toBeDefined();
    });

    it('should filter unread only', async () => {
      const response = await request(app)
        .get('/api/v1/notifications?unreadOnly=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.notifications).toBeDefined();
    });
  });

  describe('Notification Actions', () => {
    let notificationId: string;

    beforeAll(async () => {
      // Create a notification for testing actions
      const response = await request(app)
        .post('/api/v1/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: userId,
          type: 'cycle_created',
          channel: 'email',
          title: 'Action Test Notification',
          content: 'Test notification for actions'
        });

      notificationId = response.body.id;
    });

    it('should mark notification as read', async () => {
      const response = await request(app)
        .put(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe(notificationId);
    });

    it('should mark all notifications as read', async () => {
      const response = await request(app)
        .put('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('count');
    });

    it('should delete notification', async () => {
      await request(app)
        .delete(`/api/v1/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });
  });

  describe('Notification Templates', () => {
    it('should create notification template', async () => {
      const templateData = {
        name: 'Cycle Created Template',
        description: 'Template for cycle created notifications',
        type: 'cycle_created',
        channel: 'email',
        subject: 'New Cycle: {{cycleName}}',
        title: 'Cycle Created',
        content: 'A new cycle {{cycleName}} has been created',
        variables: ['cycleName', 'cycleId']
      };

      const response = await request(app)
        .post('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send(templateData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Cycle Created Template');
      expect(response.body.type).toBe('cycle_created');
    });

    it('should get notification templates', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter templates by type', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/templates?type=cycle_created')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Notification Preferences', () => {
    it('should get user preferences', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should update notification preference', async () => {
      const preferenceData = {
        type: 'cycle_created',
        channel: 'email',
        enabled: true,
        frequency: 'immediate'
      };

      const response = await request(app)
        .put('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferenceData)
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.type).toBe('cycle_created');
      expect(response.body.channel).toBe('email');
      expect(response.body.enabled).toBe(true);
    });

    it('should update bulk preferences', async () => {
      const preferencesData = {
        preferences: [
          {
            type: 'cycle_created',
            channel: 'email',
            enabled: true,
            frequency: 'immediate'
          },
          {
            type: 'feedback_requested',
            channel: 'in_app',
            enabled: true,
            frequency: 'immediate'
          }
        ]
      };

      const response = await request(app)
        .put('/api/v1/notifications/preferences/bulk')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferencesData)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
    });

    it('should get user settings', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('inApp');
      expect(response.body).toHaveProperty('sms');
    });
  });

  describe('Notification Stats', () => {
    it('should get notification statistics', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalNotifications');
      expect(response.body).toHaveProperty('unreadCount');
      expect(response.body).toHaveProperty('sentToday');
      expect(response.body).toHaveProperty('failedToday');
    });
  });
});
