// frontend/src/components/analytics/AnalyticsOverview.tsx

import React from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Users, 
  Target 
} from 'lucide-react';

interface AnalyticsOverviewProps {
  overview: any;
  isLoading: boolean;
  error: string | null;
}

export const AnalyticsOverview: React.FC<AnalyticsOverviewProps> = ({
  overview,
  isLoading,
  error
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>Error loading analytics: {error}</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center text-gray-500 p-4">
        <p>No analytics data available</p>
      </div>
    );
  }

  const metrics = [
    {
      title: 'Total Feedback',
      value: overview.totalFeedback,
      icon: MessageSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Completed',
      value: overview.completedFeedback,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Pending',
      value: overview.pendingFeedback,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    {
      title: 'Completion Rate',
      value: `${overview.completionRate}%`,
      icon: Target,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Avg Response Time',
      value: `${overview.averageResponseTime} days`,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Participation Rate',
      value: `${overview.participationRate}%`,
      icon: Users,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {metrics.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${metric.bgColor}`}>
                <IconComponent className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
