// frontend/src/pages/analytics/AnalyticsPage.tsx

import React, { useEffect, useState } from 'react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { useAuthStore } from '../../stores/authStore';
import { useCycleStore } from '../../stores/cycleStore';
import { AnalyticsOverview } from '../../components/analytics/AnalyticsOverview';
import { AnalyticsTrends } from '../../components/analytics/AnalyticsTrends';
import { AnalyticsCategories } from '../../components/analytics/AnalyticsCategories';
import { AnalyticsInsights } from '../../components/analytics/AnalyticsInsights';
import { AnalyticsPeriod } from '../../types/analytics.types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { RefreshCw, Download, Filter } from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuthStore();
  const { cycles, fetchCycles } = useCycleStore();
  const {
    overview,
    trends,
    categories,
    insights,
    isLoadingOverview,
    isLoadingTrends,
    isLoadingCategories,
    isLoadingInsights,
    overviewError,
    trendsError,
    categoriesError,
    insightsError,
    isManager,
    selectedCycleId,
    checkManagerRole,
    setSelectedCycle,
    fetchOverview,
    fetchTrends,
    fetchCategories,
    fetchInsights,
    fetchAll,
    clearErrors
  } = useAnalyticsStore();

  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<AnalyticsPeriod>('monthly');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'categories' | 'insights'>('overview');

  useEffect(() => {
    const checkRole = async () => {
      if (user?.id) {
        await checkManagerRole(user.id);
      }
      setIsCheckingRole(false);
    };
    checkRole();
  }, [user?.id, checkManagerRole]);

  useEffect(() => {
    if (isManager) {
      fetchCycles();
      fetchAll();
    }
  }, [isManager, fetchCycles, fetchAll]);

  // Set default cycle to current active cycle
  const activeCycles = cycles.filter(c => c.status === 'active');
  const defaultCycle = activeCycles.length > 0 ? activeCycles[0] : null;
  
  useEffect(() => {
    if (defaultCycle && !selectedCycleId) {
      setSelectedCycle(defaultCycle.id);
    }
  }, [defaultCycle, selectedCycleId, setSelectedCycle]);

  if (isCheckingRole) {
    return (
      <div className="flex justify-center items-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex justify-center items-center py-20">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Manager Access Required
          </h2>
          <p className="text-gray-600">
            Analytics is only available for users with manager role.
          </p>
        </Card>
      </div>
    );
  }

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    setCurrentPeriod(period);
    fetchTrends(period);
  };

  const handleRefresh = () => {
    clearErrors();
    fetchAll();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export analytics data');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', count: null },
    { id: 'trends', label: 'Trends', count: null },
    { id: 'categories', label: 'Categories', count: null },
    { id: 'insights', label: 'Insights', count: insights?.length || 0 }
  ];

  const isLoading = isLoadingOverview || isLoadingTrends || isLoadingCategories || isLoadingInsights;
  const hasError = overviewError || trendsError || categoriesError || insightsError;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Analytics</h1>
          <p className="text-gray-600">View performance metrics for your team</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Cycle Filter */}
          <Select
            value={selectedCycleId || ''}
            onChange={(e) => setSelectedCycle(e.target.value || null)}
            className="min-w-[200px]"
          >
            <option value="">All Cycles</option>
            {cycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {hasError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <p className="text-red-800 text-sm">
              Some data failed to load. Click refresh to try again.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <AnalyticsOverview
            overview={overview}
            isLoading={isLoadingOverview}
            error={overviewError}
          />
        )}

        {activeTab === 'trends' && (
          <AnalyticsTrends
            trends={trends}
            isLoading={isLoadingTrends}
            error={trendsError}
            onPeriodChange={handlePeriodChange}
            currentPeriod={currentPeriod}
          />
        )}

        {activeTab === 'categories' && (
          <AnalyticsCategories
            categories={categories}
            isLoading={isLoadingCategories}
            error={categoriesError}
          />
        )}

        {activeTab === 'insights' && (
          <AnalyticsInsights
            insights={insights}
            isLoading={isLoadingInsights}
            error={insightsError}
          />
        )}
      </div>
    </div>
  );
}
