// frontend/src/stores/analyticsStore.ts

import { create } from 'zustand';
import { analyticsService } from '../services/analytics.service';
import { api } from '../lib/api';
import { AnalyticsOverview, TrendData, CategoryData, Insight, AnalyticsPeriod } from '../types/analytics.types';

interface AnalyticsState {
  // Data
  overview: AnalyticsOverview | null;
  trends: TrendData[];
  categories: CategoryData | null;
  insights: Insight[];
  
  // Loading states
  isLoadingOverview: boolean;
  isLoadingTrends: boolean;
  isLoadingCategories: boolean;
  isLoadingInsights: boolean;
  
  // Error states
  overviewError: string | null;
  trendsError: string | null;
  categoriesError: string | null;
  insightsError: string | null;
  
  // Manager role and cycle filtering
  selectedCycleId: string | null;
  isManager: boolean;
  
  // Actions
  fetchOverview: () => Promise<void>;
  fetchTrends: (period?: AnalyticsPeriod) => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchInsights: () => Promise<void>;
  fetchAll: () => Promise<void>;
  setSelectedCycle: (cycleId: string | null) => void;
  checkManagerRole: (userId: string) => Promise<boolean>;
  clearErrors: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial state
  overview: null,
  trends: [],
  categories: null,
  insights: [],
  
  isLoadingOverview: false,
  isLoadingTrends: false,
  isLoadingCategories: false,
  isLoadingInsights: false,
  
  overviewError: null,
  trendsError: null,
  categoriesError: null,
  insightsError: null,
  
  selectedCycleId: null,
  isManager: false,
  
  // Actions
  fetchOverview: async () => {
    const { selectedCycleId } = get();
    set({ isLoadingOverview: true, overviewError: null });
    try {
      const overview = await analyticsService.getOverview(selectedCycleId || undefined);
      set({ overview, isLoadingOverview: false });
    } catch (error) {
      set({ 
        overviewError: error instanceof Error ? error.message : 'Failed to fetch overview',
        isLoadingOverview: false 
      });
    }
  },
  
  fetchTrends: async (period = 'monthly') => {
    const { selectedCycleId } = get();
    set({ isLoadingTrends: true, trendsError: null });
    try {
      const trends = await analyticsService.getTrends(period, selectedCycleId || undefined);
      set({ trends, isLoadingTrends: false });
    } catch (error) {
      set({ 
        trendsError: error instanceof Error ? error.message : 'Failed to fetch trends',
        isLoadingTrends: false 
      });
    }
  },
  
  fetchCategories: async () => {
    const { selectedCycleId } = get();
    set({ isLoadingCategories: true, categoriesError: null });
    try {
      const categories = await analyticsService.getCategories(selectedCycleId || undefined);
      set({ categories, isLoadingCategories: false });
    } catch (error) {
      set({ 
        categoriesError: error instanceof Error ? error.message : 'Failed to fetch categories',
        isLoadingCategories: false 
      });
    }
  },
  
  fetchInsights: async () => {
    set({ isLoadingInsights: true, insightsError: null });
    try {
      const insights = await analyticsService.getInsights();
      set({ insights, isLoadingInsights: false });
    } catch (error) {
      set({ 
        insightsError: error instanceof Error ? error.message : 'Failed to fetch insights',
        isLoadingInsights: false 
      });
    }
  },
  
  fetchAll: async () => {
    const { fetchOverview, fetchTrends, fetchCategories, fetchInsights } = get();
    await Promise.all([
      fetchOverview(),
      fetchTrends(),
      fetchCategories(),
      fetchInsights()
    ]);
  },
  
  setSelectedCycle: (cycleId) => {
    set({ selectedCycleId: cycleId });
    const { fetchAll } = get();
    fetchAll();
  },

  checkManagerRole: async (userId) => {
    try {
      // Get user data from auth store instead of making API call
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        const user = parsed.state?.user;
        if (user && user.roles) {
          const isManager = user.roles.includes('manager');
          set({ isManager });
          return isManager;
        }
      }
      set({ isManager: false });
      return false;
    } catch (error) {
      set({ isManager: false });
      return false;
    }
  },
  
  clearErrors: () => {
    set({
      overviewError: null,
      trendsError: null,
      categoriesError: null,
      insightsError: null
    });
  }
}));
