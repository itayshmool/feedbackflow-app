// frontend/src/components/analytics/AnalyticsCategories.tsx

import React from 'react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';
import { CategoryData } from '../../types/analytics.types';

interface AnalyticsCategoriesProps {
  categories: CategoryData | null;
  isLoading: boolean;
  error: string | null;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

export const AnalyticsCategories: React.FC<AnalyticsCategoriesProps> = ({
  categories,
  isLoading,
  error
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="flex justify-center items-center h-64">
              <LoadingSpinner />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <p>Error loading categories: {error}</p>
      </div>
    );
  }

  if (!categories) {
    return (
      <div className="text-center text-gray-500 p-4">
        <p>No category data available</p>
      </div>
    );
  }

  // Transform data for charts - convert the flat structure to chart data
  const typeData = Object.entries(categories).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: data.count
  }));

  const ratingData = Object.entries(categories).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: data.averageRating
  }));

  const renderPieChart = (data: any[], title: string, icon: React.ReactNode) => (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  const renderBarChart = (data: any[], title: string, icon: React.ReactNode) => (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
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
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );

  // Note: Feedback type charts removed - single feedback type (Manager Review)
  // If category data is needed for other purposes, it can be displayed here
  return (
    <div className="space-y-6">
      <div className="text-center text-gray-500 p-8">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-lg font-medium">Category Analytics</p>
        <p className="text-sm">All feedback uses the Manager Review format.</p>
      </div>
    </div>
  );
};
