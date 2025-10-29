// frontend/src/components/analytics/AnalyticsTrends.tsx

import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';
import { TrendData, AnalyticsPeriod } from '../../types/analytics.types';

interface AnalyticsTrendsProps {
  trends: TrendData[];
  isLoading: boolean;
  error: string | null;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  currentPeriod: AnalyticsPeriod;
}

export const AnalyticsTrends: React.FC<AnalyticsTrendsProps> = ({
  trends,
  isLoading,
  error,
  onPeriodChange,
  currentPeriod
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p>Error loading trends: {error}</p>
        </div>
      </Card>
    );
  }

  const periods: { value: AnalyticsPeriod; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold">Feedback Trends</h3>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {periods.map((period) => (
              <Button
                key={period.value}
                variant={currentPeriod === period.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPeriodChange(period.value)}
                className="text-xs"
              >
                {period.label}
              </Button>
            ))}
          </div>
          
          {/* Chart Type Selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={chartType === 'line' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
              className="text-xs"
            >
              Line
            </Button>
            <Button
              variant={chartType === 'bar' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="text-xs"
            >
              Bar
            </Button>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="feedbackGiven" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Feedback Given"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="feedbackReceived" 
                stroke="#10b981" 
                strokeWidth={2}
                name="Feedback Received"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="completionRate" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Completion Rate (%)"
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          ) : (
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="feedbackGiven" fill="#3b82f6" name="Feedback Given" />
              <Bar dataKey="feedbackReceived" fill="#10b981" name="Feedback Received" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
