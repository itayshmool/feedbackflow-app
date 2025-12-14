import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useHierarchyStore } from '../../stores/hierarchyStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { HierarchyNode } from '../../types/hierarchy.types';
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
  Download,
  XCircle,
  Clock
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { generateInsightsDocx } from '../../utils/generateInsightsDocx';
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
    hierarchyTree,
    stats,
    isLoading,
    error,
    fetchDirectReports,
    fetchHierarchyTree,
    fetchHierarchyStats
  } = useHierarchyStore();
  
  // State for expanded tree nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };
  const {
    feedbackStats,
    feedbackList: recentFeedback,
    isLoading: isFeedbackLoading,
    fetchFeedbackStats,
    fetchFeedbackList
  } = useFeedbackStore();

  // Support URL parameter for direct tab linking (e.g., /dashboard?tab=team)
  type TabType = 'overview' | 'team' | 'analytics' | 'insights';
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs: TabType[] = ['overview', 'team', 'analytics', 'insights'];
  const initialTab: TabType = validTabs.includes(tabParam as TabType) ? (tabParam as TabType) : 'overview';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // State for AI Insights
  const [teamInsights, setTeamInsights] = useState<TeamInsight | null>(null);
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  
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
      // Fetch hierarchy tree for team view
      if (user.organizationId) {
        fetchHierarchyTree(user.organizationId);
      }
      // Fetch completion data for overview card
      fetchAnalyticsData();
      // Fetch active cycles
      fetchActiveCycles();
    }
  }, [user, fetchDirectReports, fetchHierarchyTree, fetchHierarchyStats, fetchFeedbackStats, fetchFeedbackList]);
  
  // Set initial expanded state when hierarchy tree loads (collapsed by default)
  useEffect(() => {
    if (hierarchyTree && user?.id) {
      // Find the current user's node in the hierarchy
      const userNode = findUserNode(hierarchyTree, user.id);
      if (userNode) {
        // Only expand the user's own node to show first-level direct reports
        setExpandedNodes(new Set([userNode.id]));
      } else {
        // Fallback: just expand root
        setExpandedNodes(new Set([hierarchyTree.id]));
      }
    }
  }, [hierarchyTree, user?.id]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Daily Growth Quote */}
      <QuoteOfTheDay />

      {/* Stats Cards - 2 columns on all sizes for compact mobile view */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {/* Direct Reports - Click to switch to Team tab */}
        <Card 
          className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-[0.98]"
          onClick={() => setActiveTab('team')}
        >
          <CardContent className="p-3 sm:p-4 md:p-6">
            {/* Mobile: centered stacked layout, Desktop: horizontal layout */}
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <div className="p-2.5 sm:p-3 bg-blue-100 rounded-xl flex-shrink-0 mb-2 sm:mb-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="sm:ml-4 min-w-0">
                <p className="text-2xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  {directReports.length}
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate mt-0.5">Direct Reports</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Feedback Given - Navigate to feedback page with 'given' tab */}
        <Card 
          className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-[0.98]"
          onClick={() => navigate('/feedback?tab=given')}
        >
          <CardContent className="p-3 sm:p-4 md:p-6">
            {/* Mobile: centered stacked layout, Desktop: horizontal layout */}
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <div className="p-2.5 sm:p-3 bg-green-100 rounded-xl flex-shrink-0 mb-2 sm:mb-0">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="sm:ml-4 min-w-0">
                <p className="text-2xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                  {isFeedbackLoading ? '...' : feedbackStats?.given || 0}
                </p>
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate mt-0.5">Feedback Given</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cycle Info Card - Shows active cycles at the top */}
      <CycleInfoCard cycles={activeCycles} />

      {/* Status Widgets - Side by side on larger screens */}
      {(reminderPreview?.hasEmployeeReports || reminderPreview?.hasManagerReports) && (
        <div className={`grid gap-4 ${
          reminderPreview?.hasEmployeeReports && reminderPreview?.hasManagerReports 
            ? 'grid-cols-1 md:grid-cols-2' 
            : 'grid-cols-1'
        }`}>
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
        <Card className="transform transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-base sm:text-lg flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
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
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all min-h-[56px] active:scale-[0.98] text-left"
                    onClick={() => navigate(`/feedback?view=${feedback.id}`)}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      feedback.status === 'completed' ? 'bg-green-500' :
                      (feedback.status as any) === 'pending' || feedback.status === 'submitted' ? 'bg-yellow-500' : 
                      feedback.status === 'draft' ? 'bg-gray-400' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        To: {feedback.toUser?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(feedback.createdAt).toLocaleDateString()} • {feedback.status}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Activity className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent feedback given</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="transform transition-all duration-200 hover:shadow-lg">
          <CardHeader className="pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
            <CardTitle className="text-base sm:text-lg flex items-center">
              <Target className="h-5 w-5 mr-2 text-purple-600" />
              Team Feedback Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Team Members with Feedback</span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                    {completionData?.summary ? `${completionData.summary.completed}/${completionData.summary.total}` : `${directReports.length} reports`}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: completionData?.summary ? `${completionData.summary.percentage}%` : '0%' }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  {completionData?.summary 
                    ? `${completionData.summary.percentage}% of your team has received feedback from you`
                    : 'View Analytics tab for detailed completion data'}
                </p>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full min-h-[44px]"
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

  // Avatar color gradients by level
  const avatarGradients = [
    'from-emerald-500 to-teal-600',      // Level 0 - Current user
    'from-blue-500 to-indigo-600',        // Level 1
    'from-purple-500 to-pink-600',        // Level 2
    'from-orange-500 to-red-600',         // Level 3
    'from-cyan-500 to-blue-600',          // Level 4+
  ];
  
  const getAvatarGradient = (level: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return avatarGradients[0];
    return avatarGradients[Math.min(level, avatarGradients.length - 1)];
  };

  // Recursive function to render hierarchy tree nodes
  const renderHierarchyNode = (node: HierarchyNode, level: number = 0, isCurrentUser: boolean = false): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.directReports && node.directReports.length > 0;
    const isDirectReport = directReports.some(dr => dr.id === node.id);
    
    // Limit indentation on mobile
    const mobileIndent = Math.min(level, 4);
    const indentPx = mobileIndent * 24;
    
    // Handle click on the row - only for direct reports
    const handleRowClick = () => {
      if (isDirectReport && !isCurrentUser) {
        navigate(`/team/${node.id}`);
      }
    };
    
    return (
      <div key={node.id} className="select-none">
        {/* Node card */}
        <div 
          className={`
            relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl mb-2 
            transition-all duration-200 ease-out
            ${isCurrentUser 
              ? 'bg-white border-l-4 border-l-emerald-500 border border-emerald-200 shadow-md' 
              : isDirectReport
                ? 'bg-white border border-gray-200 hover:border-primary-400 hover:shadow-lg hover:bg-primary-50/30 hover:-translate-y-0.5 cursor-pointer group'
                : 'bg-gray-50/80 border border-gray-100'
            }
          `}
          style={{ marginLeft: `${indentPx}px` }}
          onClick={handleRowClick}
        >
          {/* Connecting line to parent */}
          {level > 0 && (
            <div 
              className="hidden sm:block absolute -left-3 top-1/2 w-3 h-px bg-gray-300"
              style={{ marginLeft: `${-indentPx + 12}px` }}
            />
          )}
          
          {/* Expand/collapse button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              hasChildren && toggleNode(node.id);
            }}
            className={`
              p-1.5 rounded-lg transition-all duration-200
              ${hasChildren 
                ? 'hover:bg-gray-100 cursor-pointer active:scale-95' 
                : 'opacity-0'
              }
            `}
            disabled={!hasChildren}
          >
            {hasChildren && (
              <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </button>
          
          {/* Avatar */}
          <div className={`
            relative w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0
            bg-gradient-to-br ${getAvatarGradient(level, isCurrentUser)}
            shadow-md ring-2 ring-white
            ${isDirectReport && !isCurrentUser ? 'group-hover:ring-primary-200 group-hover:shadow-lg transition-all duration-200' : ''}
          `}>
            <span className="text-base sm:text-lg font-bold text-white drop-shadow-sm">
              {node.name.charAt(0).toUpperCase()}
            </span>
            {/* Manager badge - improved contrast */}
            {hasChildren && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-indigo-500 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-semibold text-sm sm:text-base ${isCurrentUser ? 'text-emerald-700' : 'text-gray-900'} ${isDirectReport && !isCurrentUser ? 'group-hover:text-primary-700 transition-colors' : ''}`}>
                {node.name}
              </h4>
              {isCurrentUser && (
                <span className="text-xs px-2.5 py-0.5 bg-emerald-500 text-white rounded-full font-medium shadow-sm">
                  You
                </span>
              )}
              {isDirectReport && !isCurrentUser && (
                <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium group-hover:bg-primary-200 transition-colors">
                  Direct
                </span>
              )}
              {hasChildren && (
                <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-medium hidden sm:inline-flex items-center gap-1.5 border border-slate-200">
                  <Users className="w-3 h-3" />
                  {node.directReports.length} {node.directReports.length === 1 ? 'report' : 'reports'}
                </span>
              )}
            </div>
            <p className={`text-xs sm:text-sm text-gray-500 truncate mt-0.5 ${isDirectReport && !isCurrentUser ? 'group-hover:text-gray-600 transition-colors' : ''}`}>
              {node.position || 'Team Member'}
              {node.department && <span className="hidden sm:inline text-gray-400"> • {node.department}</span>}
            </p>
          </div>
          
          {/* Clickable indicator for direct reports - enhanced hover */}
          {isDirectReport && !isCurrentUser && (
            <div className="flex items-center text-gray-300 group-hover:text-primary-500 transition-colors">
              <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          )}
          
          {/* Mobile team count - improved contrast */}
          {hasChildren && (
            <span className="sm:hidden text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full font-medium border border-slate-200">
              {node.directReports.length}
            </span>
          )}
        </div>
        
        {/* Children with animation */}
        {hasChildren && (
          <div 
            className={`
              relative overflow-hidden transition-all duration-300 ease-out
              ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
            `}
          >
            {/* Vertical connecting line */}
            <div 
              className="hidden sm:block absolute top-0 bottom-4 w-0.5 bg-gradient-to-b from-gray-300 to-transparent rounded-full"
              style={{ left: `${indentPx + 32}px` }}
            />
            {node.directReports.map((child) => renderHierarchyNode(child, level + 1, false))}
          </div>
        )}
      </div>
    );
  };

  // Find the current user's node in the hierarchy tree
  const findUserNode = (tree: HierarchyNode | null, userId: string): HierarchyNode | null => {
    if (!tree) return null;
    if (tree.id === userId) return tree;
    for (const child of tree.directReports || []) {
      const found = findUserNode(child, userId);
      if (found) return found;
    }
    return null;
  };

  const renderTeam = () => {
    // Find current user's position in the tree to show their subtree
    const userNode = user?.id ? findUserNode(hierarchyTree, user.id) : null;
    
    // Count total team members (recursive)
    const countTeamMembers = (node: HierarchyNode | null): number => {
      if (!node) return 0;
      let count = 0;
      for (const child of node.directReports || []) {
        count += 1 + countTeamMembers(child);
      }
      return count;
    };
    const totalTeamSize = userNode ? countTeamMembers(userNode) : directReports.length;
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Team Hierarchy</h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {directReports.length} direct report{directReports.length !== 1 ? 's' : ''}
              {totalTeamSize > directReports.length && (
                <span className="text-gray-400">• {totalTeamSize} total team members</span>
              )}
            </p>
          </div>
          
          {/* Expand/Collapse all */}
          {userNode && userNode.directReports?.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Expand all nodes
                  const allIds = new Set<string>();
                  const collectIds = (n: HierarchyNode) => {
                    allIds.add(n.id);
                    (n.directReports || []).forEach(collectIds);
                  };
                  collectIds(userNode);
                  setExpandedNodes(allIds);
                }}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={() => setExpandedNodes(new Set([userNode.id]))}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Collapse
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-500 mt-4">Loading team hierarchy...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-6 border-red-200 bg-red-50">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </Card>
        ) : userNode ? (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-6 border border-gray-200">
            <div className="space-y-2">
              {renderHierarchyNode(userNode, 0, true)}
            </div>
          </div>
        ) : directReports.length > 0 ? (
          // Fallback to direct reports if no hierarchy tree
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 sm:p-6 border border-gray-200">
            <div className="space-y-2">
              {directReports.map((member) => renderHierarchyNode(member, 0, false))}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 border border-gray-200 text-center">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Team Members</h3>
            <p className="text-gray-500">Your team hierarchy will appear here once team members are added.</p>
          </div>
        )}
      </div>
    );
  };

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

    // Custom label showing count + short name outside the pie
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, value, shortName }: any) => {
      const radius = outerRadius + 25;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      
      return (
        <text 
          x={x} 
          y={y} 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central" 
          className="text-xs font-semibold"
          fill="#374151"
        >
          {value} {shortName}
        </text>
      );
    };

    // Custom legend with counts and percentages - clickable to filter
    const renderCustomLegend = (props: any) => {
      const { payload } = props;
      const total = colorDistribution?.total || 0;
      
      return (
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          {payload.map((entry: any, index: number) => {
            const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
            return (
              <button
                key={`legend-${index}`}
                onClick={() => handlePieClick(entry.payload)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group border border-transparent hover:border-gray-200"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  <span className="font-semibold">{entry.payload.value}</span>
                  {' '}{entry.payload.shortName}
                  <span className="text-gray-400 ml-1">({percentage}%)</span>
                </span>
              </button>
            );
          })}
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Team Analytics</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Cycle Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <label className="text-sm text-gray-600">Filter by cycle:</label>
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
              className="flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isAnalyticsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {analyticsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {analyticsError}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Color Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Feedback Color Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isAnalyticsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : colorDistribution && colorDistribution.total > 0 ? (
                <div>
                  {/* Responsive height: smaller on mobile */}
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
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend content={renderCustomLegend} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-1">
                    Click segment or legend to filter feedback by color
                  </p>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No feedback data available</p>
                    <p className="text-sm mt-1">Feedback with color classifications will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback Completion Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Feedback Completion Status
                {analyticsCycleId && activeCycles.length > 0 && (
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    ({activeCycles.find(c => c.id === analyticsCycleId)?.name || 'Selected Cycle'})
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
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Your Feedback Progress
                      </span>
                      <span className="text-sm font-semibold text-blue-600">
                        {completionData.summary.completed} / {completionData.summary.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${completionData.summary.percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {completionData.summary.percentage}% of your direct reports have received feedback from you
                    </p>
                  </div>

                  {/* Team Members List */}
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {completionData.teamMembers.map((member) => (
                      <div 
                        key={member.userId}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          member.hasReceivedFeedback 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-medium text-gray-600">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.position}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.hasReceivedFeedback ? (
                            <>
                              <span className="text-xs text-green-600 font-medium">
                                {member.feedbackCount} feedback{member.feedbackCount !== 1 ? 's' : ''}
                              </span>
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            </>
                          ) : (
                            <button
                              onClick={() => navigate(`/feedback?action=give&recipient=${encodeURIComponent(member.email)}&name=${encodeURIComponent(member.name)}`)}
                              className="px-3 py-1 text-xs font-medium text-green-600 hover:text-white bg-green-50 hover:bg-green-600 border border-green-200 hover:border-green-600 rounded-lg transition-all duration-200 flex items-center gap-1"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Give Feedback
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No direct reports found</p>
                    <p className="text-sm mt-1">Your team members will appear here</p>
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
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            AI Team Insights
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            AI-powered analysis of your team's feedback patterns
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Download Button - only visible when insights exist */}
          {teamInsights && !isInsightsLoading && (
            <Button
              onClick={() => generateInsightsDocx(teamInsights, user?.name)}
              className="flex items-center gap-2 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 shadow-sm transition-all"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
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

  return (
    <div className="bg-gray-50">
      {/* Header - Responsive: smaller padding/text on mobile */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-sm md:text-base text-gray-600 hidden md:block">Manage your team and track performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Tabs - Hidden on mobile */}
      <div className="hidden md:block bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Tabs - Horizontally scrollable pills, hidden on desktop */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 relative">
        {/* Scroll fade indicator on right edge - hints there's more content */}
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
        
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 pr-12">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 min-h-[44px] ${
                    isActive
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Responsive padding */}
      <div className="p-4 md:p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'team' && renderTeam()}
        {activeTab === 'insights' && renderInsights()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default ManagerDashboard;
