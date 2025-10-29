// backend/tests/unit/analytics/services/analytics.service.test.ts

import { AnalyticsService } from '../../../../src/modules/analytics/services/analytics.service';
import { Pool } from 'pg';
import { EventEmitter } from 'events';
import { Logger } from '../../../../src/shared/utils/logger';
import { MetricCategory, MetricType, PeriodType } from '../../../../src/modules/analytics/types/analytics.types';

// Mock dependencies
jest.mock('pg');
jest.mock('events');
jest.mock('../../../../src/shared/utils/logger');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
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
    analyticsService = new AnalyticsService(mockDb, mockEventEmitter, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMetric', () => {
    it('should create metric successfully', async () => {
      const metricData = {
        name: 'cycle_completion_rate',
        description: 'Percentage of completed cycles',
        category: MetricCategory.CYCLE,
        type: MetricType.PERCENTAGE,
        value: 85.5,
        unit: '%',
        metadata: { totalCycles: 20, completedCycles: 17 },
        period: {
          type: PeriodType.MONTHLY,
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31')
      };

      // Mock the service methods that would be called
      jest.spyOn(analyticsService as any, 'buildCompleteMetric').mockResolvedValue({
        id: 'metric-123',
        name: 'cycle_completion_rate',
        value: 85.5,
        category: MetricCategory.CYCLE,
        type: MetricType.PERCENTAGE
      });

      const result = await analyticsService.createMetric('org-1', metricData);

      expect(result).toBeDefined();
      expect(result.name).toBe('cycle_completion_rate');
      expect(result.value).toBe(85.5);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('analytics:metric_created', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Analytics metric created', expect.any(Object));
    });

    it('should handle database errors gracefully', async () => {
      const metricData = {
        name: 'test_metric',
        category: MetricCategory.CYCLE,
        type: MetricType.COUNT,
        value: 10,
        period: {
          type: PeriodType.DAILY,
          start: new Date('2024-01-01'),
          end: new Date('2024-01-01')
        },
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-01')
      };

      // Mock database error
      (mockDb.connect as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        analyticsService.createMetric('org-1', metricData)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getMetrics', () => {
    it('should return metrics with pagination', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          organization_id: 'org-1',
          name: 'cycle_count',
          category: MetricCategory.CYCLE,
          type: MetricType.COUNT,
          value: 10,
          period_type: PeriodType.MONTHLY,
          period_start: new Date('2024-01-01'),
          period_end: new Date('2024-01-31'),
          calculated_at: new Date()
        }
      ];

      (analyticsService as any).metricModel = {
        findWithFilters: jest.fn().mockResolvedValue({
          metrics: mockMetrics,
          total: 1
        })
      };

      jest.spyOn(analyticsService as any, 'buildCompleteMetric').mockResolvedValue({
        id: 'metric-1',
        name: 'cycle_count',
        value: 10
      });

      const result = await analyticsService.getMetrics('org-1', {}, 'user-1', 1, 20);

      expect(result).toBeDefined();
      expect(result.metrics).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        category: MetricCategory.CYCLE,
        type: MetricType.COUNT,
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      };

      (analyticsService as any).metricModel = {
        findWithFilters: jest.fn().mockResolvedValue({
          metrics: [],
          total: 0
        })
      };

      await analyticsService.getMetrics('org-1', filters, 'user-1');

      expect((analyticsService as any).metricModel.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          category: MetricCategory.CYCLE,
          type: MetricType.COUNT
        }),
        1,
        20
      );
    });
  });

  describe('getMetricById', () => {
    it('should return metric when found', async () => {
      const mockMetric = {
        id: 'metric-123',
        organization_id: 'org-1',
        name: 'test_metric',
        category: MetricCategory.CYCLE,
        type: MetricType.COUNT,
        value: 5,
        period_type: PeriodType.DAILY,
        period_start: new Date('2024-01-01'),
        period_end: new Date('2024-01-01'),
        calculated_at: new Date()
      };

      (analyticsService as any).metricModel = {
        findById: jest.fn().mockResolvedValue(mockMetric)
      };

      jest.spyOn(analyticsService as any, 'buildCompleteMetric').mockResolvedValue({
        id: 'metric-123',
        name: 'test_metric',
        value: 5
      });

      const result = await analyticsService.getMetricById('metric-123', 'user-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('metric-123');
      expect(result.name).toBe('test_metric');
    });

    it('should throw NotFoundError when metric not found', async () => {
      (analyticsService as any).metricModel = {
        findById: jest.fn().mockResolvedValue(null)
      };

      await expect(
        analyticsService.getMetricById('nonexistent-id', 'user-1')
      ).rejects.toThrow('Analytics metric not found');
    });
  });

  describe('getMetricTrends', () => {
    it('should return metric trends', async () => {
      const mockTrends = [
        {
          id: 'metric-1',
          period_start: new Date('2024-01-01'),
          period_type: PeriodType.MONTHLY,
          value: 10
        },
        {
          id: 'metric-2',
          period_start: new Date('2024-02-01'),
          period_type: PeriodType.MONTHLY,
          value: 15
        }
      ];

      (analyticsService as any).metricModel = {
        getMetricTrends: jest.fn().mockResolvedValue(mockTrends)
      };

      const result = await analyticsService.getMetricTrends('org-1', 'cycle_count', PeriodType.MONTHLY, 12);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('period');
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('change');
      expect(result[0]).toHaveProperty('changePercentage');
    });
  });

  describe('getMetricComparison', () => {
    it('should return metric comparison with change calculation', async () => {
      const currentPeriod = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
      const previousPeriod = { start: new Date('2023-12-01'), end: new Date('2023-12-31') };

      const mockComparison = {
        current: {
          id: 'metric-current',
          value: 20,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end
        },
        previous: {
          id: 'metric-previous',
          value: 15,
          period_start: previousPeriod.start,
          period_end: previousPeriod.end
        }
      };

      (analyticsService as any).metricModel = {
        getMetricComparison: jest.fn().mockResolvedValue(mockComparison)
      };

      jest.spyOn(analyticsService as any, 'buildCompleteMetric')
        .mockResolvedValueOnce({ value: 20 })
        .mockResolvedValueOnce({ value: 15 });

      const result = await analyticsService.getMetricComparison(
        'org-1',
        'cycle_count',
        currentPeriod,
        previousPeriod
      );

      expect(result).toBeDefined();
      expect(result.current).toBeDefined();
      expect(result.previous).toBeDefined();
      expect(result.change).toBe(5); // 20 - 15
      expect(result.changePercentage).toBeCloseTo(33.33, 1); // (5/15) * 100
    });

    it('should handle missing previous period', async () => {
      const currentPeriod = { start: new Date('2024-01-01'), end: new Date('2024-01-31') };
      const previousPeriod = { start: new Date('2023-12-01'), end: new Date('2023-12-31') };

      const mockComparison = {
        current: {
          id: 'metric-current',
          value: 20,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end
        },
        previous: null
      };

      (analyticsService as any).metricModel = {
        getMetricComparison: jest.fn().mockResolvedValue(mockComparison)
      };

      jest.spyOn(analyticsService as any, 'buildCompleteMetric').mockResolvedValue({ value: 20 });

      const result = await analyticsService.getMetricComparison(
        'org-1',
        'cycle_count',
        currentPeriod,
        previousPeriod
      );

      expect(result.current).toBeDefined();
      expect(result.previous).toBeNull();
      expect(result.change).toBe(0);
      expect(result.changePercentage).toBe(0);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate all metric types', async () => {
      jest.spyOn(analyticsService as any, 'calculateCycleMetrics').mockResolvedValue(undefined);
      jest.spyOn(analyticsService as any, 'calculateFeedbackMetrics').mockResolvedValue(undefined);
      jest.spyOn(analyticsService as any, 'calculateNotificationMetrics').mockResolvedValue(undefined);
      jest.spyOn(analyticsService as any, 'calculateUserMetrics').mockResolvedValue(undefined);

      await analyticsService.calculateMetrics('org-1');

      expect((analyticsService as any).calculateCycleMetrics).toHaveBeenCalledWith('org-1');
      expect((analyticsService as any).calculateFeedbackMetrics).toHaveBeenCalledWith('org-1');
      expect((analyticsService as any).calculateNotificationMetrics).toHaveBeenCalledWith('org-1');
      expect((analyticsService as any).calculateUserMetrics).toHaveBeenCalledWith('org-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('analytics:metrics_calculated', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Metrics calculation completed', expect.any(Object));
    });

    it('should handle calculation errors gracefully', async () => {
      jest.spyOn(analyticsService as any, 'calculateCycleMetrics').mockRejectedValue(new Error('Calculation failed'));

      await expect(
        analyticsService.calculateMetrics('org-1')
      ).rejects.toThrow('Calculation failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error calculating metrics', expect.any(Object));
    });
  });

  describe('getCycleAnalytics', () => {
    it('should return cycle analytics structure', async () => {
      const result = await analyticsService.getCycleAnalytics('org-1');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalCycles');
      expect(result).toHaveProperty('activeCycles');
      expect(result).toHaveProperty('completedCycles');
      expect(result).toHaveProperty('averageCycleDuration');
      expect(result).toHaveProperty('completionRate');
      expect(result).toHaveProperty('participationRate');
      expect(result).toHaveProperty('overdueCycles');
      expect(result).toHaveProperty('cycleTrends');
      expect(result).toHaveProperty('departmentBreakdown');
    });
  });

  describe('getFeedbackAnalytics', () => {
    it('should return feedback analytics structure', async () => {
      const result = await analyticsService.getFeedbackAnalytics('org-1');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalFeedback');
      expect(result).toHaveProperty('pendingFeedback');
      expect(result).toHaveProperty('completedFeedback');
      expect(result).toHaveProperty('averageResponseTime');
      expect(result).toHaveProperty('acknowledgmentRate');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('feedbackTrends');
      expect(result).toHaveProperty('categoryBreakdown');
      expect(result).toHaveProperty('responseRateByRole');
    });
  });

  describe('getNotificationAnalytics', () => {
    it('should return notification analytics structure', async () => {
      const result = await analyticsService.getNotificationAnalytics('org-1');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalNotifications');
      expect(result).toHaveProperty('sentNotifications');
      expect(result).toHaveProperty('deliveredNotifications');
      expect(result).toHaveProperty('failedNotifications');
      expect(result).toHaveProperty('openRate');
      expect(result).toHaveProperty('clickRate');
      expect(result).toHaveProperty('unsubscribeRate');
      expect(result).toHaveProperty('channelBreakdown');
      expect(result).toHaveProperty('typeBreakdown');
    });
  });

  describe('getUserAnalytics', () => {
    it('should return user analytics structure', async () => {
      const result = await analyticsService.getUserAnalytics('org-1');

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('activeUsers');
      expect(result).toHaveProperty('newUsers');
      expect(result).toHaveProperty('userEngagement');
      expect(result).toHaveProperty('averageSessionDuration');
      expect(result).toHaveProperty('featureAdoption');
      expect(result).toHaveProperty('roleDistribution');
      expect(result).toHaveProperty('departmentDistribution');
    });
  });

  describe('deleteMetric', () => {
    it('should delete metric successfully', async () => {
      const mockMetric = {
        id: 'metric-123',
        organization_id: 'org-1',
        name: 'test_metric'
      };

      (analyticsService as any).metricModel = {
        findById: jest.fn().mockResolvedValue(mockMetric),
        delete: jest.fn().mockResolvedValue(true)
      };

      await analyticsService.deleteMetric('metric-123', 'user-1');

      expect((analyticsService as any).metricModel.delete).toHaveBeenCalledWith('metric-123');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('analytics:metric_deleted', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('Analytics metric deleted', expect.any(Object));
    });

    it('should throw NotFoundError when metric not found', async () => {
      (analyticsService as any).metricModel = {
        findById: jest.fn().mockResolvedValue(null)
      };

      await expect(
        analyticsService.deleteMetric('nonexistent-id', 'user-1')
      ).rejects.toThrow('Analytics metric not found');
    });
  });
});
