import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useHierarchyStore } from '../../stores/hierarchyStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import api from '../../lib/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  Users, 
  TrendingUp, 
  MessageSquare, 
  BarChart3, 
  CheckCircle,
  AlertCircle,
  UserPlus,
  Activity,
  Target,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  User,
  Sparkles,
  RefreshCw,
  Lightbulb,
  TrendingDown,
  Award,
  Zap,
  XCircle,
  Clock
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { createInsightsDocxBlob } from '../../utils/generateInsightsDocx';
import { ExportButtons } from '../../components/ui/ExportButtons';
import { useDocxExport } from '../../hooks/useDocxExport';
import QuoteOfTheDay from '../../components/dashboard/QuoteOfTheDay';
import CycleInfoCard from '../../components/dashboard/CycleInfoCard';
import FeedbackAcceptanceStatus from '../../components/dashboard/FeedbackAcceptanceStatus';
import ManagerCompletionStatus from '../../components/dashboard/ManagerCompletionStatus';

// Types for Analytics
interface ColorDistribution {
  green: number;
  yellow: number;
  red: number;
  unclassified: number;
  total: number;
}

interface TeamMemberCompletion {
  userId: string;
  name: string;
  email: string;
  position: string;
  department: string;
  avatarUrl?: string;
  hasReceivedFeedback: boolean;
  feedbackCount: number;
}

interface CompletionData {
  teamMembers: TeamMemberCompletion[];
  summary: {
    completed: number;
    total: number;
    percentage: number;
  };
}

// Types for AI Insights
interface TeamInsight {
  generatedAt: string;
  summary: string;
  themes: string[];
  strengths: Array<{
    title: string;
    description: string;
    employeesExcelling: string[];
  }>;
  areasForImprovement: Array<{
    title: string;
    description: string;
    frequency: string;
    suggestedActions: string[];
  }>;
  individualHighlights: Array<{
    employeeName: string;
    positiveHighlight: string;
    growthOpportunity: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
    timeline: string;
  }>;
  teamHealthScore: number | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  teamSize: number;
  feedbackCount: number;
}

const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    directReports,
    stats,
    isLoading,
    error,
    fetchDirectReports,
    fetchHierarchyStats
  } = useHierarchyStore();
  
  const {
    feedbackStats,
    feedbackList: recentFeedback,
    isLoading: isFeedbackLoading,
    fetchFeedbackStats,
    fetchFeedbackList
  } = useFeedbackStore();

  // Support URL parameter for direct tab linking (e.g., /dashboard?tab=analytics)
  type TabType = 'overview' | 'analytics' | 'insights';
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs: TabType[] = ['overview', 'analytics', 'insights'];
  const initialTab: TabType = validTabs.includes(tabParam as TabType) ? (tabParam as TabType) : 'overview';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // State for AI Insights
  const [teamInsights, setTeamInsights] = useState<TeamInsight | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  
  // Export hook for AI Insights download and Google Drive
  const { isDownloading, isUploadingToDrive, download, saveToDrive } = useDocxExport();
  
  // State for Analytics
  const [colorDistribution, setColorDistribution] = useState<ColorDistribution | null>(null);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsCycleId, setAnalyticsCycleId] = useState<string>(''); // empty = all cycles
  
  // State for Active Cycles Card
  const [activeCycles, setActiveCycles] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedEmployeeCycleId, setSelectedEmployeeCycleId] = useState<string>(''); // For employee widget
  const [selectedManagerCycleId, setSelectedManagerCycleId] = useState<string>(''); // For manager widget
  const [cycleCompletionData, setCycleCompletionData] = useState<CompletionData | null>(null);
  
  // State for reminder preview with split data (employees and managers)
  interface ReminderPreviewData {
    pendingRecipients: { id: string; name: string; detail?: string }[];
    pendingCount: number;
    totalCount: number;
    completedCount: number;
  }
  
  const [reminderPreview, setReminderPreview] = useState<{
    reminderType: 'give_feedback' | 'acknowledge_feedback';
    buttonText: string;
    pendingCount: number;
    pendingRecipients: { id: string; name: string; detail?: string }[];
    isManagerOfManagers: boolean;
    // New split data fields
    hasEmployeeReports: boolean;
    hasManagerReports: boolean;
    employeeData: ReminderPreviewData | null;
    managerData: ReminderPreviewData | null;
  } | null>(null);
  const [isWidgetDataLoading, setIsWidgetDataLoading] = useState(false);

  // Function to fetch analytics data
  const fetchAnalyticsData = async (cycleId?: string) => {
    setIsAnalyticsLoading(true);
    setAnalyticsError(null);
    
    try {
      // Build params - only include cycleId if it's set (not empty = all cycles)
      const params = cycleId ? { cycleId } : {};
      
      const [colorRes, completionRes] = await Promise.all([
        api.get('/analytics/team-color-distribution', { params }),
        api.get('/analytics/team-completion', { params })
      ]);
      
      if (colorRes.data.success) {
        setColorDistribution(colorRes.data.data);
      }
      if (completionRes.data.success) {
        setCompletionData(completionRes.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setAnalyticsError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  // Fetch analytics when switching to analytics tab or when cycle filter changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData(analyticsCycleId || undefined);
    }
  }, [activeTab, analyticsCycleId]);
  
  // Function to fetch AI team insights
  const fetchTeamInsights = async () => {
    setIsInsightsLoading(true);
    setInsightsError(null);
    try {
      // AI insights can take 30-60+ seconds, use 2 minute timeout
      const response = await api.post('/ai/team-insights', {}, { timeout: 120000 });
      if (response.data.success) {
        setTeamInsights(response.data.data);
      } else {
        setInsightsError(response.data.error || 'Failed to generate insights');
      }
    } catch (error: any) {
      console.error('Error fetching team insights:', error);
      setInsightsError(error.response?.data?.error || 'Failed to generate team insights');
    } finally {
      setIsInsightsLoading(false);
    }
  };

  // Fetch active cycles
  const fetchActiveCycles = async () => {
    try {
      const response = await api.get('/cycles', { 
        params: { status: 'active' } 
      });
      // API returns { success, data: { cycles: [...], pagination: {...} } }
      const cycles = response.data?.data?.cycles || [];
      setActiveCycles(cycles);
      if (cycles.length > 0) {
        const firstCycleId = cycles[0].id;
        if (!selectedCycleId) setSelectedCycleId(firstCycleId);
        if (!selectedEmployeeCycleId) setSelectedEmployeeCycleId(firstCycleId);
        if (!selectedManagerCycleId) setSelectedManagerCycleId(firstCycleId);
      }
    } catch (error: any) {
      console.error('Failed to fetch active cycles:', error);
      setActiveCycles([]);
      // Toast is shown by api.ts interceptor
    }
  };

  // Function to fetch reminder preview data for a specific cycle
  const fetchReminderPreview = async (cycleId: string) => {
    if (!cycleId) return;
    setIsWidgetDataLoading(true);
    try {
      const reminderResponse = await api.get('/notifications/cycle-reminder-preview', { 
        params: { cycleId } 
      });
      if (reminderResponse.data.success) {
        setReminderPreview(reminderResponse.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch reminder preview:', error);
    } finally {
      setIsWidgetDataLoading(false);
    }
  };

  // Fetch cycle completion and reminder preview when selected cycle changes
  useEffect(() => {
    const fetchCycleData = async () => {
      if (!selectedCycleId) return;
      setIsWidgetDataLoading(true);
      try {
        // Fetch both completion data and reminder preview in parallel
        const [completionResponse, reminderResponse] = await Promise.all([
          api.get('/analytics/team-completion', { params: { cycleId: selectedCycleId } }),
          api.get('/notifications/cycle-reminder-preview', { params: { cycleId: selectedCycleId } })
        ]);
        
        if (completionResponse.data.success) {
          setCycleCompletionData(completionResponse.data.data);
        }
        if (reminderResponse.data.success) {
          setReminderPreview(reminderResponse.data.data);
        }
      } catch (error: any) {
        console.error('Failed to fetch cycle data:', error);
        // Toast is shown by api.ts interceptor
      } finally {
        setIsWidgetDataLoading(false);
      }
    };
    fetchCycleData();
  }, [selectedCycleId]);

  // Refresh reminder data when employee/manager widget cycle changes
  useEffect(() => {
    // Only refetch if different from main selectedCycleId
    if (selectedEmployeeCycleId && selectedEmployeeCycleId !== selectedCycleId) {
      fetchReminderPreview(selectedEmployeeCycleId);
    }
  }, [selectedEmployeeCycleId]);

  useEffect(() => {
    // Only refetch if different from main selectedCycleId
    if (selectedManagerCycleId && selectedManagerCycleId !== selectedCycleId) {
      fetchReminderPreview(selectedManagerCycleId);
    }
  }, [selectedManagerCycleId]);

  // Callback for when reminders are sent - refresh the data
  const handleReminderSent = () => {
    if (selectedCycleId) {
      fetchReminderPreview(selectedCycleId);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDirectReports(user.id);
      fetchHierarchyStats(user.organizationId || '');
      fetchFeedbackStats();
      // Fetch recent team feedback (feedback given by manager)
      fetchFeedbackList({ fromUserId: user.id }, 1, 5);
      // Fetch completion data for overview card
      fetchAnalyticsData();
      // Fetch active cycles
      fetchActiveCycles();
    }
  }, [user, fetchDirectReports, fetchHierarchyStats, fetchFeedbackStats, fetchFeedbackList]);
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Daily Growth Quote */}
      <QuoteOfTheDay />

      {/* Stats Cards - Gradient design */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* Direct Reports - Click to go to Team page */}
        <Card 
          className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-1 cursor-pointer active:scale-[0.98]"
          onClick={() => navigate('/team')}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl w-fit">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {directReports.length}
                </p>
                <p className="text-xs sm:text-sm font-medium text-blue-100">Direct Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Feedback Given - Navigate to feedback page with 'given' tab */}
        <Card 
          className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-lg hover:shadow-xl transform transition-all duration-200 hover:-translate-y-1 cursor-pointer active:scale-[0.98]"
          onClick={() => navigate('/feedback?tab=given')}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="p-2.5 bg-white/20 rounded-xl w-fit">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {isFeedbackLoading ? '...' : feedbackStats?.given || 0}
                </p>
                <p className="text-xs sm:text-sm font-medium text-emerald-100">Feedback Given</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cycle Info Card - Shows active cycles at the top */}
      <CycleInfoCard cycles={activeCycles} />

      {/* Status Widgets - Always side by side on sm+, stacked on mobile */}
      {(reminderPreview?.hasEmployeeReports || reminderPreview?.hasManagerReports) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Feedback Acceptance by My Team - For managers with direct employee reports */}
          {reminderPreview?.hasEmployeeReports && (
            <FeedbackAcceptanceStatus
              cycles={activeCycles}
              selectedCycleId={selectedEmployeeCycleId || selectedCycleId}
              onCycleChange={(cycleId) => {
                setSelectedEmployeeCycleId(cycleId);
                setSelectedCycleId(cycleId);
              }}
              employeeData={reminderPreview.employeeData}
              isLoading={isWidgetDataLoading}
              onReminderSent={handleReminderSent}
            />
          )}

          {/* Feedback Completion by Your Managers - For managers of managers */}
          {reminderPreview?.hasManagerReports && (
            <ManagerCompletionStatus
              cycles={activeCycles}
              selectedCycleId={selectedManagerCycleId || selectedCycleId}
              onCycleChange={(cycleId) => {
                setSelectedManagerCycleId(cycleId);
                setSelectedCycleId(cycleId);
              }}
              managerData={reminderPreview.managerData}
              isLoading={isWidgetDataLoading}
              onReminderSent={handleReminderSent}
            />
          )}
        </div>
      )}

      {/* Recent Activity - Stack on mobile, 2 columns on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3">
                <MessageSquare className="h-5 w-5 text-green-600" />
              </div>
              Feedback You Gave
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            {isFeedbackLoading ? (
              <div className="flex justify-center py-6">
                <LoadingSpinner size="md" />
              </div>
            ) : recentFeedback && recentFeedback.length > 0 ? (
              <div className="space-y-2">
                {recentFeedback.slice(0, 3).map((feedback) => (
                  <button 
                    key={feedback.id} 
                    className={`w-full flex items-center gap-3 p-3 bg-white rounded-xl border hover:border-gray-300 hover:shadow-md transition-all min-h-[56px] active:scale-[0.98] text-left ${
                      feedback.status === 'completed' ? 'border-l-4 border-l-green-500 border-gray-200' :
                      (feedback.status as any) === 'pending' || feedback.status === 'submitted' ? 'border-l-4 border-l-yellow-500 border-gray-200' : 
                      feedback.status === 'draft' ? 'border-l-4 border-l-gray-400 border-gray-200' : 'border-l-4 border-l-blue-500 border-gray-200'
                    }`}
                    onClick={() => navigate(`/feedback?view=${feedback.id}`)}
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-medium text-gray-600 flex-shrink-0">
                      {feedback.toUser?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {feedback.toUser?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(feedback.createdAt).toLocaleDateString()} • <span className="capitalize">{feedback.status}</span>
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-7 h-7 text-gray-400" />
                </div>
                <p className="font-medium text-gray-700">No feedback yet</p>
                <p className="text-sm text-gray-500 mt-1">Start giving feedback to your team</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg mr-3">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              Team Feedback Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">Team Coverage</span>
                  <span className="text-sm px-3 py-1 bg-white text-purple-700 rounded-full font-bold shadow-sm">
                    {completionData?.summary ? `${completionData.summary.completed}/${completionData.summary.total}` : `${directReports.length}`}
                  </span>
                </div>
                <div className="w-full bg-white rounded-full h-3 shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500 shadow-sm" 
                    style={{ width: completionData?.summary ? `${completionData.summary.percentage}%` : '0%' }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {completionData?.summary 
                    ? `${completionData.summary.percentage}% of your team has received feedback`
                    : 'View Analytics for detailed data'}
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full min-h-[44px] hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-all"
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Team Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAnalytics = () => {
    // Color chart data with short names for external labels
    const colorChartData = colorDistribution ? [
      { name: 'Exceeds Expectations', shortName: 'Exceeds', value: colorDistribution.green, color: '#22c55e', filterValue: 'green' },
      { name: 'Meets Expectations', shortName: 'Meets', value: colorDistribution.yellow, color: '#eab308', filterValue: 'yellow' },
      { name: 'Needs Improvement', shortName: 'Needs Imp.', value: colorDistribution.red, color: '#ef4444', filterValue: 'red' }
    ].filter(item => item.value > 0) : [];

    // Handle clicking on a pie segment to filter feedback
    const handlePieClick = (data: any) => {
      if (data && data.filterValue) {
        navigate(`/feedback?colorFilter=${data.filterValue}`);
      }
    };

    // Custom legend with counts and percentages - clickable to filter
    const renderCustomLegend = (props: any) => {
      const { payload } = props;
      const total = colorDistribution?.total || 0;
      
      return (
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-2">
          {payload.map((entry: any, index: number) => {
            const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
            return (
              <button
                key={`legend-${index}`}
                onClick={() => handlePieClick(entry.payload)}
                className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group border border-transparent hover:border-gray-200"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs sm:text-sm text-gray-700 group-hover:text-gray-900">
                  <span className="font-semibold">{entry.payload.value}</span>
                  {' '}<span className="hidden sm:inline">{entry.payload.shortName}</span>
                  <span className="text-gray-400 ml-1">({percentage}%)</span>
                </span>
              </button>
            );
          })}
        </div>
      );
    };

    const completionPercent = completionData?.summary?.percentage || 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              Team Analytics
            </h2>
            <p className="text-sm text-gray-600 mt-1">Track feedback distribution and team progress</p>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Total Feedback */}
          <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-5 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <div className="order-2 sm:order-1">
                <p className="text-xs font-medium text-blue-100">Total</p>
                <p className="text-xl sm:text-3xl font-bold text-white">
                  {isAnalyticsLoading ? '...' : colorDistribution?.total || 0}
                </p>
              </div>
              <div className="order-1 sm:order-2 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
          </div>

          {/* Completion Rate */}
          <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 sm:p-5 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <div className="order-2 sm:order-1">
                <p className="text-xs font-medium text-emerald-100">Complete</p>
                <p className="text-xl sm:text-3xl font-bold text-white">
                  {isAnalyticsLoading ? '...' : `${completionPercent}%`}
                </p>
              </div>
              <div className="order-1 sm:order-2 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
          </div>

          {/* Team Size */}
          <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-3 sm:p-5 shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
              <div className="order-2 sm:order-1">
                <p className="text-xs font-medium text-purple-100">Team</p>
                <p className="text-xl sm:text-3xl font-bold text-white">
                  {isAnalyticsLoading ? '...' : completionData?.teamMembers?.length || 0}
                </p>
              </div>
              <div className="order-1 sm:order-2 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1">
              <label className="text-sm font-medium text-gray-700">Cycle:</label>
              <Select
                value={analyticsCycleId}
                onChange={(e) => setAnalyticsCycleId(e.target.value)}
                className="w-full sm:w-48"
              >
                <option value="">All Cycles</option>
                {activeCycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => fetchAnalyticsData(analyticsCycleId || undefined)}
              disabled={isAnalyticsLoading}
              className="flex items-center justify-center gap-2 w-full sm:w-auto min-h-[40px]"
            >
              <RefreshCw className={`h-4 w-4 ${isAnalyticsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {analyticsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {analyticsError}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Color Distribution Chart */}
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl sm:rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <span className="text-base sm:text-lg">Color Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : colorDistribution && colorDistribution.total > 0 ? (
                <div>
                  <div className="h-48 sm:h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={colorChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius="70%"
                          innerRadius="35%"
                          fill="#8884d8"
                          dataKey="value"
                          onClick={handlePieClick}
                          style={{ cursor: 'pointer' }}
                          paddingAngle={2}
                        >
                          {colorChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              stroke="#fff"
                              strokeWidth={2}
                              style={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            const percentage = colorDistribution.total > 0 
                              ? ((value / colorDistribution.total) * 100).toFixed(0) 
                              : 0;
                            return [`${value} feedback (${percentage}%)`, name];
                          }}
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend content={renderCustomLegend} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-2 bg-gray-50 rounded-lg py-2">
                    💡 Click segment or legend to filter feedback
                  </p>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-4">
                      <BarChart3 className="h-7 w-7 text-blue-500" />
                    </div>
                    <p className="font-medium text-gray-700">No feedback data</p>
                    <p className="text-sm text-gray-500 mt-1">Color classifications will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback Completion Progress */}
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-lg rounded-xl sm:rounded-2xl overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg shadow-md">
                  <Target className="h-4 w-4 text-white" />
                </div>
                <span className="text-base sm:text-lg">Completion Status</span>
                {analyticsCycleId && activeCycles.length > 0 && (
                  <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {activeCycles.find(c => c.id === analyticsCycleId)?.name || 'Cycle'}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : completionData && completionData.teamMembers.length > 0 ? (
                <div className="space-y-4">
                  {/* Progress Summary */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Your Feedback Progress
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        {completionData.summary.completed} / {completionData.summary.total}
                      </span>
                    </div>
                    <div className="w-full bg-emerald-100 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${completionData.summary.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      {completionData.summary.percentage}% of direct reports have received feedback
                    </p>
                  </div>

                  {/* Team Members List */}
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {completionData.teamMembers.map((member, index) => {
                      const avatarColors = [
                        'from-blue-500 to-indigo-600',
                        'from-purple-500 to-pink-600',
                        'from-emerald-500 to-teal-600',
                        'from-orange-500 to-red-600',
                        'from-cyan-500 to-blue-600',
                      ];
                      const avatarGradient = avatarColors[index % avatarColors.length];
                      
                      return (
                        <div 
                          key={member.userId}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 hover:shadow-md ${
                            member.hasReceivedFeedback 
                              ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300' 
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-sm font-medium text-white shadow-md`}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.position}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {member.hasReceivedFeedback ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">
                                  {member.feedbackCount} ✓
                                </span>
                              </div>
                            ) : (
                              <button
                                onClick={() => navigate(`/feedback?action=give&recipient=${encodeURIComponent(member.email)}&name=${encodeURIComponent(member.name)}`)}
                                className="px-3 py-1.5 text-xs font-medium text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 hover:border-emerald-600 rounded-lg transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow-md"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Give
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl flex items-center justify-center mb-4">
                      <Users className="h-7 w-7 text-emerald-500" />
                    </div>
                    <p className="font-medium text-gray-700">No direct reports</p>
                    <p className="text-sm text-gray-500 mt-1">Team members will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderInsights = () => (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
            AI Team Insights
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            AI-powered analysis of your team's feedback patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Export Buttons - only visible when insights exist */}
          {teamInsights && !isInsightsLoading && (
            <ExportButtons
              onDownload={() => download(() => createInsightsDocxBlob(teamInsights, user?.name))}
              onSaveToDrive={() => saveToDrive(
                () => createInsightsDocxBlob(teamInsights, user?.name),
                `AI Team Insights for ${user?.name || 'Team'}`
              )}
              downloadLoading={isDownloading}
              driveLoading={isUploadingToDrive}
              downloadTooltip="Download as DOCX"
              driveTooltip="Save to Google Drive"
            />
          )}
          
          {/* Generate/Refresh Button */}
          <Button
            onClick={fetchTeamInsights}
            disabled={isInsightsLoading || directReports.length === 0}
            className={`flex items-center gap-2 ${
              isInsightsLoading || directReports.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all'
            }`}
          >
            {isInsightsLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isInsightsLoading ? 'Generating...' : teamInsights ? 'Refresh Insights' : 'Generate Insights'}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {insightsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{insightsError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isInsightsLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Analyzing team feedback with AI...</p>
          <p className="text-sm text-gray-500 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Empty State - No insights yet */}
      {!isInsightsLoading && !teamInsights && !insightsError && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-12">
            <div className="text-center">
              <Sparkles className="h-16 w-16 mx-auto text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Get AI-Powered Insights
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {directReports.length === 0 
                  ? 'You need team members in your hierarchy before you can generate insights. Add direct reports to get started.'
                  : 'Click the button above to analyze your team\'s feedback and get actionable insights, patterns, and recommendations.'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Content */}
      {!isInsightsLoading && teamInsights && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  <Lightbulb className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">Executive Summary</h3>
                  <p className="text-gray-700">{teamInsights.summary}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {teamInsights.teamSize} team members
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {teamInsights.feedbackCount} feedback items analyzed
                    </span>
                    {teamInsights.teamHealthScore && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-4 w-4" />
                        Health Score: {teamInsights.teamHealthScore}/10
                      </span>
                    )}
                    <span className="px-2 py-1 bg-white rounded text-xs font-medium">
                      Confidence: {teamInsights.confidenceLevel}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Themes */}
          {teamInsights.themes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Key Themes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {teamInsights.themes.map((theme, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two Column Layout for Strengths and Improvements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card className="border-green-200">
              <CardHeader className="bg-green-50 border-b border-green-200">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Award className="h-5 w-5" />
                  Team Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {teamInsights.strengths.length > 0 ? (
                  <div className="space-y-4">
                    {teamInsights.strengths.map((strength, index) => (
                      <div key={index} className="border-l-4 border-green-400 pl-4">
                        <h4 className="font-semibold text-gray-900">{strength.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{strength.description}</p>
                        {strength.employeesExcelling.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {strength.employeesExcelling.map((emp, i) => (
                              <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                {emp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No specific strengths identified yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Areas for Improvement */}
            <Card className="border-orange-200">
              <CardHeader className="bg-orange-50 border-b border-orange-200">
                <CardTitle className="flex items-center gap-2 text-orange-700">
                  <TrendingDown className="h-5 w-5" />
                  Areas for Growth
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {teamInsights.areasForImprovement.length > 0 ? (
                  <div className="space-y-4">
                    {teamInsights.areasForImprovement.map((area, index) => (
                      <div key={index} className="border-l-4 border-orange-400 pl-4">
                        <h4 className="font-semibold text-gray-900">{area.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{area.description}</p>
                        {area.frequency && (
                          <p className="text-xs text-orange-600 mt-1">{area.frequency}</p>
                        )}
                        {area.suggestedActions.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {area.suggestedActions.map((action, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No specific areas identified yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Individual Highlights - Hidden for privacy (TODO: implement anonymization) */}

          {/* Recommendations */}
          {teamInsights.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-500" />
                  Recommended Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teamInsights.recommendations.map((rec, index) => (
                    <div 
                      key={index} 
                      className={`p-4 rounded-lg border-l-4 ${
                        rec.priority === 'high' 
                          ? 'bg-red-50 border-red-400' 
                          : rec.priority === 'medium'
                          ? 'bg-yellow-50 border-yellow-400'
                          : 'bg-blue-50 border-blue-400'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                              rec.priority === 'high'
                                ? 'bg-red-200 text-red-700'
                                : rec.priority === 'medium'
                                ? 'bg-yellow-200 text-yellow-700'
                                : 'bg-blue-200 text-blue-700'
                            }`}>
                              {rec.priority} priority
                            </span>
                            <span className="text-xs text-gray-500">{rec.timeline}</span>
                          </div>
                          <h4 className="font-semibold text-gray-900">{rec.action}</h4>
                          <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated timestamp */}
          <p className="text-xs text-gray-400 text-center">
            Generated on {new Date(teamInsights.generatedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );

  // Calculate active tab index for pill indicator
  const activeTabIndex = tabs.findIndex(t => t.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header - Clean typography */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-base sm:text-lg text-gray-600 mt-1">Manage your team and track performance</p>
      </div>

      {/* Modern Pill Tabs - Works for both desktop and mobile */}
      <div className="px-4 sm:px-6 lg:px-8 pb-6">
        <div className="relative inline-flex bg-gray-100 rounded-full p-1">
          {/* Sliding indicator */}
          <div
            className="absolute top-1 bottom-1 bg-white rounded-full shadow-md transition-all duration-300 ease-out"
            style={{
              width: `${100 / tabs.length}%`,
              left: `calc(${activeTabIndex * (100 / tabs.length)}% + 4px)`,
              right: `calc(${(tabs.length - 1 - activeTabIndex) * (100 / tabs.length)}% + 4px)`,
            }}
          />
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative z-10 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 min-h-[40px] ${
                  isActive
                    ? 'text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.id === 'insights' ? 'AI' : tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content - Responsive padding */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'insights' && renderInsights()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default ManagerDashboard;
