// frontend/src/services/analytics.service.ts

import { api } from '../lib/api';
import { AnalyticsOverview, TrendData, CategoryData, Insight, AnalyticsPeriod } from '../types/analytics.types';

class AnalyticsService {
  private baseUrl = '/analytics';

  async getOverview(cycleId?: string): Promise<AnalyticsOverview> {
    const params = cycleId ? { cycleId } : {};
    const response = await api.get(`${this.baseUrl}/overview`, { params });
    return response.data.data;
  }

  async getTrends(period: AnalyticsPeriod = 'monthly', cycleId?: string): Promise<TrendData[]> {
    const params = cycleId ? { period, cycleId } : { period };
    const response = await api.get(`${this.baseUrl}/trends`, { params });
    return response.data.data;
  }

  async getCategories(cycleId?: string): Promise<CategoryData> {
    const params = cycleId ? { cycleId } : {};
    const response = await api.get(`${this.baseUrl}/categories`, { params });
    return response.data.data;
  }

  async getInsights(): Promise<Insight[]> {
    const response = await api.get(`${this.baseUrl}/insights`);
    return response.data.data;
  }
}

export const analyticsService = new AnalyticsService();
