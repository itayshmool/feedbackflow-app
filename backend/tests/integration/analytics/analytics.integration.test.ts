// backend/tests/integration/analytics/analytics.integration.test.ts

import request from 'supertest';
import app from '../../../src/app';

describe('Analytics Integration', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    // Get auth token first
    const response = await request(app)
      .post('/api/v1/auth/login/mock')
      .send({
        email: 'analytics-test@example.com',
        name: 'Analytics Test User'
      });

    authToken = response.body.token;
    userId = response.body.user.id;
  });

  describe('POST /api/v1/analytics/metrics', () => {
    it('should create analytics metric successfully', async () => {
      const metricData = {
        name: 'cycle_completion_rate',
        description: 'Percentage of completed cycles',
        category: 'cycle',
        type: 'percentage',
        value: 85.5,
        unit: '%',
        metadata: { totalCycles: 20, completedCycles: 17 },
        period: {
          type: 'monthly',
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-31T23:59:59.999Z'
        }
      };

      const response = await request(app)
        .post('/api/v1/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send(metricData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('cycle_completion_rate');
      expect(response.body.category).toBe('cycle');
      expect(response.body.type).toBe('percentage');
      expect(response.body.value).toBe(85.5);
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/analytics/metrics')
        .send({
          name: 'test_metric',
          category: 'cycle',
          type: 'count',
          value: 10,
          period: {
            type: 'daily',
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-01T23:59:59.999Z'
          }
        })
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/v1/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test_metric'
          // Missing required fields
        })
        .expect(400);
    });

    it('should validate metric category', async () => {
      await request(app)
        .post('/api/v1/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test_metric',
          category: 'invalid_category',
          type: 'count',
          value: 10,
          period: {
            type: 'daily',
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-01T23:59:59.999Z'
          }
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/analytics/metrics', () => {
    it('should get analytics metrics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('metrics');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should filter by category', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/metrics?category=cycle')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.metrics).toBeDefined();
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/metrics?type=count')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.metrics).toBeDefined();
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/metrics?dateFrom=2024-01-01&dateTo=2024-01-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.metrics).toBeDefined();
    });
  });

  describe('GET /api/v1/analytics/metrics/:metricName/trends', () => {
    it('should get metric trends', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/metrics/cycle_count/trends?periodType=monthly&periods=12')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should validate period type', async () => {
      await request(app)
        .get('/api/v1/analytics/metrics/cycle_count/trends?periodType=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/analytics/metrics/:metricName/comparison', () => {
    it('should get metric comparison', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/metrics/cycle_count/comparison?currentStart=2024-01-01&currentEnd=2024-01-31&previousStart=2023-12-01&previousEnd=2023-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('current');
      expect(response.body).toHaveProperty('previous');
      expect(response.body).toHaveProperty('change');
      expect(response.body).toHaveProperty('changePercentage');
    });

    it('should validate date parameters', async () => {
      await request(app)
        .get('/api/v1/analytics/metrics/cycle_count/comparison?currentStart=invalid&currentEnd=2024-01-31&previousStart=2023-12-01&previousEnd=2023-12-31')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Specific Analytics Endpoints', () => {
    it('should get cycle analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/cycles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalCycles');
      expect(response.body).toHaveProperty('activeCycles');
      expect(response.body).toHaveProperty('completedCycles');
      expect(response.body).toHaveProperty('averageCycleDuration');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('participationRate');
      expect(response.body).toHaveProperty('overdueCycles');
      expect(response.body).toHaveProperty('cycleTrends');
      expect(response.body).toHaveProperty('departmentBreakdown');
    });

    it('should get feedback analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalFeedback');
      expect(response.body).toHaveProperty('pendingFeedback');
      expect(response.body).toHaveProperty('completedFeedback');
      expect(response.body).toHaveProperty('averageResponseTime');
      expect(response.body).toHaveProperty('acknowledgmentRate');
      expect(response.body).toHaveProperty('qualityScore');
      expect(response.body).toHaveProperty('feedbackTrends');
      expect(response.body).toHaveProperty('categoryBreakdown');
      expect(response.body).toHaveProperty('responseRateByRole');
    });

    it('should get notification analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalNotifications');
      expect(response.body).toHaveProperty('sentNotifications');
      expect(response.body).toHaveProperty('deliveredNotifications');
      expect(response.body).toHaveProperty('failedNotifications');
      expect(response.body).toHaveProperty('openRate');
      expect(response.body).toHaveProperty('clickRate');
      expect(response.body).toHaveProperty('unsubscribeRate');
      expect(response.body).toHaveProperty('channelBreakdown');
      expect(response.body).toHaveProperty('typeBreakdown');
    });

    it('should get user analytics', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalUsers');
      expect(response.body).toHaveProperty('activeUsers');
      expect(response.body).toHaveProperty('newUsers');
      expect(response.body).toHaveProperty('userEngagement');
      expect(response.body).toHaveProperty('averageSessionDuration');
      expect(response.body).toHaveProperty('featureAdoption');
      expect(response.body).toHaveProperty('roleDistribution');
      expect(response.body).toHaveProperty('departmentDistribution');
    });
  });

  describe('Dashboard Management', () => {
    it('should create dashboard', async () => {
      const dashboardData = {
        name: 'Test Dashboard',
        description: 'A test dashboard for analytics',
        isPublic: false,
        widgets: [
          {
            type: 'metric_card',
            title: 'Cycle Count',
            position: { x: 0, y: 0, width: 4, height: 2 },
            size: 'medium',
            config: { metric: 'cycle_count' },
            dataSource: 'analytics'
          }
        ],
        layout: {
          columns: 12,
          rows: 8,
          gap: 16
        },
        filters: {}
      };

      const response = await request(app)
        .post('/api/v1/analytics/dashboards')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dashboardData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Dashboard');
      expect(response.body.widgets).toHaveLength(1);
    });

    it('should get dashboards', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboards')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('dashboards');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should get public dashboards', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboards/public')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get default dashboard', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/dashboards/default')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // May return null if no default dashboard exists
      expect(response.body === null || typeof response.body === 'object').toBe(true);
    });
  });

  describe('Report Management', () => {
    it('should create report', async () => {
      const reportData = {
        name: 'Cycle Summary Report',
        description: 'Monthly cycle summary report',
        type: 'cycle_summary',
        format: 'pdf',
        metrics: ['cycle_count', 'completion_rate'],
        recipients: ['admin@example.com'],
        schedule: {
          frequency: 'monthly',
          dayOfMonth: 1,
          time: '09:00',
          timezone: 'UTC'
        },
        filters: {
          dateRange: {
            start: '2024-01-01T00:00:00.000Z',
            end: '2024-01-31T23:59:59.999Z'
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/analytics/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send(reportData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Cycle Summary Report');
      expect(response.body.type).toBe('cycle_summary');
      expect(response.body.format).toBe('pdf');
    });

    it('should get reports', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('reports');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
    });

    it('should get reports by type', async () => {
      const response = await request(app)
        .get('/api/v1/analytics/reports/type/cycle_summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should validate report type', async () => {
      await request(app)
        .get('/api/v1/analytics/reports/type/invalid_type')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('Metrics Calculation', () => {
    it('should trigger metrics calculation', async () => {
      const response = await request(app)
        .post('/api/v1/analytics/metrics/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Metrics calculation started');
    });
  });
});
