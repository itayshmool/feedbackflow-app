// frontend/src/types/analytics.types.ts

export interface AnalyticsOverview {
  totalFeedback: number;
  completedFeedback: number;
  pendingFeedback: number;
  averageResponseTime: number;
  participationRate: number;
  completionRate: number;
  averageRating: number;
  activeGivers: number;
  activeReceivers: number;
  teamSize: number;
}

export interface TrendData {
  period: string;
  value: number;
  averageRating: number;
}

export interface CategoryData {
  [category: string]: {
    count: number;
    averageRating: number;
  };
}

export interface Insight {
  id: string;
  type: 'trend' | 'pattern' | 'alert' | 'recommendation';
  title: string;
  description: string;
  severity: 'positive' | 'negative' | 'neutral';
  createdAt: string;
  actionable?: boolean;
  recommendation?: string;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  trends: TrendData[];
  categories: CategoryData;
  insights: Insight[];
}

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';
