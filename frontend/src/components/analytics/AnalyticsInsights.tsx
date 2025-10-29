// frontend/src/components/analytics/AnalyticsInsights.tsx

import React from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Badge } from '../ui/Badge';
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { Insight } from '../../types/analytics.types';

interface AnalyticsInsightsProps {
  insights: Insight[];
  isLoading: boolean;
  error: string | null;
}

export const AnalyticsInsights: React.FC<AnalyticsInsightsProps> = ({
  insights,
  isLoading,
  error
}) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center h-32">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p>Error loading insights: {error}</p>
        </div>
      </Card>
    );
  }

  const getInsightIcon = (type: string, severity: string) => {
    if (type === 'alert') {
      return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
    if (type === 'trend') {
      return <TrendingUp className="w-5 h-5 text-blue-500" />;
    }
    if (type === 'pattern') {
      return <Info className="w-5 h-5 text-gray-500" />;
    }
    if (type === 'recommendation') {
      return <Lightbulb className="w-5 h-5 text-yellow-500" />;
    }
    return <Target className="w-5 h-5 text-gray-500" />;
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      positive: 'success',
      negative: 'destructive',
      neutral: 'secondary'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'secondary'}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">AI Insights & Recommendations</h3>
      </div>

      {insights.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No insights available yet</p>
          <p className="text-sm">Insights will appear as more feedback data is collected</p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getInsightIcon(insight.type, insight.severity)}
                  <div>
                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      {getSeverityBadge(insight.severity)}
                      <span className="text-sm text-gray-500">
                        {new Date(insight.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                {insight.actionable && (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Actionable</span>
                  </div>
                )}
              </div>

              <p className="text-gray-600 mb-3">{insight.description}</p>

              {insight.recommendation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-1">Recommendation:</p>
                      <p className="text-sm text-blue-800">{insight.recommendation}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
