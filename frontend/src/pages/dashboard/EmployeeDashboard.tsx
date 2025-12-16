import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Select } from '../../components/ui/Select';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Clock,
  Target,
  Activity,
  FileText,
  Calendar,
  User,
  ChevronDown,
  ChevronUp,
  Inbox,
  Send,
  CheckCircle,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import api from '../../lib/api';
import QuoteOfTheDay from '../../components/dashboard/QuoteOfTheDay';

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const {
    feedbackStats,
    feedbackList: recentFeedback,
    isLoading: isFeedbackLoading,
    fetchFeedbackStats,
    fetchFeedbackList
  } = useFeedbackStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'my-feedback' | 'goals'>('overview');
  const [goalsCycleFilter, setGoalsCycleFilter] = useState<string>('');
  const [goalsStatusFilter, setGoalsStatusFilter] = useState<string>('');
  const [expandedFeedback, setExpandedFeedback] = useState<Record<string, boolean>>({});

  // Get feedback content text
  const getContentText = (feedback: any) => {
    return typeof feedback.content === 'string' 
      ? feedback.content 
      : feedback.content?.overallComment || 'No comment provided';
  };

  // Check if content needs truncation
  const isLongContent = (text: string) => text.length > 150;
  
  // Check if user is a manager (managers see "Feedback Given" stat)
  const isManager = user?.roles?.includes('manager');
  
  // Check if this is the /myself route (managers accessing personal dashboard)
  // Don't show welcome banner on /myself since managers already see it on their Dashboard
  const isMyselfRoute = location.pathname === '/myself';

  useEffect(() => {
    if (user?.id) {
      fetchFeedbackStats();
      fetchFeedbackList({ toUserId: user.id }, 1, 5);
    }
  }, [user, fetchFeedbackStats, fetchFeedbackList]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'my-feedback', label: 'My Feedback', icon: MessageSquare },
    { id: 'goals', label: 'My Goals', icon: Target },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Daily Growth Quote */}
      {!isMyselfRoute && <QuoteOfTheDay />}

      {/* Stats Cards - Modern Gradient Design */}
      <div className={`grid gap-2 sm:gap-4 ${isManager ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {/* Feedback Received - Blue Theme */}
        <div 
          className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-5 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 cursor-pointer"
          onClick={() => navigate('/feedback?tab=received')}
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="order-2 sm:order-1">
              <p className="text-xs sm:text-sm font-medium text-blue-100">Received</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {isFeedbackLoading ? '...' : feedbackStats?.received || 0}
              </p>
            </div>
            <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
              <Inbox className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Feedback Given - Emerald Theme (Managers only) */}
        {isManager && (
          <div 
            className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 sm:p-5 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 cursor-pointer"
            onClick={() => navigate('/feedback?tab=given')}
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="order-2 sm:order-1">
                <p className="text-xs sm:text-sm font-medium text-emerald-100">Given</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">
                  {isFeedbackLoading ? '...' : feedbackStats?.given || 0}
                </p>
              </div>
              <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                <Send className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Waiting for Acknowledgement - Amber Theme */}
        <div 
          className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 sm:p-5 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 cursor-pointer"
          onClick={() => navigate('/feedback?tab=waiting')}
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="order-2 sm:order-1">
              <p className="text-xs sm:text-sm font-medium text-amber-100">Waiting</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {isFeedbackLoading ? '...' : feedbackStats?.pending || 0}
              </p>
            </div>
            <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
              <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Feedback Received */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Recent Feedback</h3>
              </div>
              <Link to="/feedback">
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {isFeedbackLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : recentFeedback && recentFeedback.length > 0 ? (
              <div className="space-y-2">
                {recentFeedback.slice(0, 3).map((feedback) => (
                  <div 
                    key={feedback.id} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150 cursor-pointer group"
                    onClick={() => navigate(`/feedback?view=${feedback.id}`)}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium shrink-0">
                      {(feedback.fromUser?.name || 'A').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{feedback.fromUser?.name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(feedback.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No feedback received yet</p>
              </div>
            )}
          </div>
        </div>

        {/* My Goals & Development */}
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <Target className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">My Development Goals</h3>
            </div>
          </div>
          <div className="p-4 sm:p-5">
            {(() => {
              const allGoals = recentFeedback?.flatMap(feedback => 
                (feedback.goals || []).map(goal => ({
                  ...goal,
                  feedbackFrom: feedback.fromUser?.name || 'Manager',
                  cycleName: feedback.cycle?.name,
                }))
              ) || [];
              const displayGoals = allGoals.slice(0, 3);
              
              return (
                <div className="space-y-3">
                  {displayGoals.length > 0 ? (
                    <>
                      {displayGoals.map((goal) => (
                        <div key={goal.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            goal.status === 'completed' 
                              ? 'bg-emerald-500 border-emerald-500' 
                              : 'border-gray-300 bg-white'
                          }`}>
                            {goal.status === 'completed' && (
                              <CheckCircle className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-medium ${goal.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                {goal.title}
                              </p>
                              {goal.cycleName && (
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs whitespace-nowrap flex-shrink-0">
                                  {goal.cycleName}
                                </span>
                              )}
                            </div>
                            {goal.targetDate && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {allGoals.length > 3 && (
                        <p className="text-xs text-gray-400 text-center pt-1">
                          +{allGoals.length - 3} more goals
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <div className="mx-auto w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                        <Target className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">No goals yet</p>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 rounded-lg"
                    onClick={() => setActiveTab('goals')}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    View All Goals
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

    </div>
  );

  const renderMyFeedback = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Feedback History</h2>
        <Link to="/feedback" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25">
            View All Feedback
          </Button>
        </Link>
      </div>

      {isFeedbackLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : recentFeedback && recentFeedback.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {recentFeedback.map((feedback) => {
            const borderColor = feedback.status === 'completed' 
              ? 'border-l-emerald-400' 
              : feedback.status === 'submitted'
              ? 'border-l-amber-400'
              : 'border-l-gray-400';
              
            return (
              <div 
                key={feedback.id} 
                className={`bg-white rounded-lg sm:rounded-xl border border-gray-200 border-l-4 ${borderColor} p-4 sm:p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer active:bg-gray-50`}
                onClick={() => navigate(`/feedback?view=${feedback.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-medium shrink-0">
                        {(feedback.fromUser?.name || 'A').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 text-sm">
                        {feedback.fromUser?.name || 'Unknown'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        feedback.status === 'completed' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : feedback.status === 'submitted'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {feedback.status === 'completed' ? 'Acknowledged' : 
                         feedback.status === 'submitted' ? 'Waiting' : 
                         feedback.status}
                      </span>
                    </div>
                    
                    {/* Content */}
                    <div className="mt-2">
                      <p className={`text-gray-600 text-sm leading-relaxed ${
                        expandedFeedback[feedback.id] ? '' : 'line-clamp-2'
                      }`}>
                        {getContentText(feedback)}
                      </p>
                      {isLongContent(getContentText(feedback)) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setExpandedFeedback(prev => ({
                              ...prev,
                              [feedback.id]: !prev[feedback.id]
                            }));
                          }}
                          className="mt-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors min-h-[32px] sm:min-h-0"
                        >
                          {expandedFeedback[feedback.id] ? (
                            <>Show less <ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <>Read more <ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(feedback.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      {feedback.cycle?.name && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                          {feedback.cycle.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Modern Empty State */
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative">
            <div className="mx-auto w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-blue-500/20">
              <MessageSquare className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No feedback received yet</h3>
            <p className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">
              Feedback you receive from your manager will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderGoals = () => {
    // Extract all goals from received feedback with cycle info
    const allGoals = recentFeedback?.flatMap(feedback => 
      (feedback.goals || []).map(goal => ({
        ...goal,
        feedbackFrom: feedback.fromUser?.name || 'Manager',
        cycleName: feedback.cycle?.name || 'No Cycle',
        cycleId: feedback.cycle?.id || '',
      }))
    ) || [];

    // Get unique cycles for filter dropdown
    const uniqueCycles = Array.from(
      new Map(allGoals.map(g => [g.cycleId || 'no-cycle', { id: g.cycleId || 'no-cycle', name: g.cycleName || 'No Cycle' }])).values()
    );

    // Filter goals
    let filteredGoals = allGoals;
    if (goalsCycleFilter) {
      filteredGoals = goalsCycleFilter === 'no-cycle'
        ? filteredGoals.filter(g => !g.cycleId)
        : filteredGoals.filter(g => g.cycleId === goalsCycleFilter);
    }
    if (goalsStatusFilter) {
      filteredGoals = goalsStatusFilter === 'completed'
        ? filteredGoals.filter(g => g.status === 'completed')
        : filteredGoals.filter(g => g.status !== 'completed');
    }

    const completedCount = allGoals.filter(g => g.status === 'completed').length;
    const pendingCount = allGoals.filter(g => g.status !== 'completed').length;
    const hasActiveFilters = goalsCycleFilter || goalsStatusFilter;
    const progressPercent = allGoals.length > 0 ? Math.round((completedCount / allGoals.length) * 100) : 0;

    const toggleGoalComplete = async (goalId: string, currentStatus: string) => {
      const completed = currentStatus !== 'completed';
      try {
        await api.put(`/goals/${goalId}`, { completed });
        if (user?.id) {
          fetchFeedbackList({ toUserId: user.id }, 1, 10);
        }
      } catch (error: any) {
        console.error('Failed to update goal:', error);
      }
    };

    const clearGoalFilters = () => {
      setGoalsCycleFilter('');
      setGoalsStatusFilter('');
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">My Development Goals</h2>
            {allGoals.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {completedCount} of {allGoals.length} goals completed
              </p>
            )}
          </div>
        </div>

        {/* Gradient Stats Cards */}
        {allGoals.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Total Goals - Slate */}
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 p-3 sm:p-5 shadow-lg shadow-slate-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <div className="order-2 sm:order-1">
                  <p className="text-xs font-medium text-slate-200">Total</p>
                  <p className="text-xl sm:text-3xl font-bold text-white">{allGoals.length}</p>
                </div>
                <div className="order-1 sm:order-2 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
            </div>

            {/* Completed - Emerald */}
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 sm:p-5 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <div className="order-2 sm:order-1">
                  <p className="text-xs font-medium text-emerald-100">Done</p>
                  <p className="text-xl sm:text-3xl font-bold text-white">{completedCount}</p>
                </div>
                <div className="order-1 sm:order-2 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
            </div>

            {/* Pending - Amber */}
            <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 sm:p-5 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <div className="order-2 sm:order-1">
                  <p className="text-xs font-medium text-amber-100">Pending</p>
                  <p className="text-xl sm:text-3xl font-bold text-white">{pendingCount}</p>
                </div>
                <div className="order-1 sm:order-2 flex h-8 w-8 sm:h-11 sm:w-11 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {allGoals.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-bold text-purple-600">{progressPercent}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Filters */}
        {allGoals.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                value={goalsCycleFilter}
                onChange={(e) => setGoalsCycleFilter(e.target.value)}
                label="Cycle"
              >
                <option value="">All Cycles</option>
                {uniqueCycles.map(cycle => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </Select>
              <Select
                value={goalsStatusFilter}
                onChange={(e) => setGoalsStatusFilter(e.target.value)}
                label="Status"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </Select>
            </div>
            {hasActiveFilters && (
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearGoalFilters}
                  icon={RotateCcw}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {isFeedbackLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredGoals.length > 0 ? (
          <div className="space-y-3">
            {filteredGoals.map((goal) => (
              <div 
                key={goal.id}
                className={`bg-white rounded-xl border border-gray-200 border-l-4 p-4 sm:p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
                  goal.status === 'completed' 
                    ? 'border-l-emerald-400 bg-emerald-50/30' 
                    : 'border-l-purple-400'
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Icon Badge */}
                  <div className={`p-2 rounded-lg shadow-md flex-shrink-0 ${
                    goal.status === 'completed'
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                      : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                  }`}>
                    <Target className="w-4 h-4 text-white" />
                  </div>

                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleGoalComplete(goal.id, goal.status);
                    }}
                    className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                      goal.status === 'completed' 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50 bg-white'
                    }`}
                  >
                    {goal.status === 'completed' && (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className={`text-sm sm:text-base ${goal.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {goal.title}
                      </p>
                      {goal.cycleName && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs whitespace-nowrap font-medium">
                          {goal.cycleName}
                        </span>
                      )}
                    </div>
                    {goal.description && (
                      <p className={`text-sm mt-2 leading-relaxed ${goal.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                        {goal.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-3 text-xs text-gray-400">
                      {goal.targetDate && (
                        <span className="flex items-center gap-1.5 bg-gray-100 px-2 py-1 rounded-full">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {goal.feedbackFrom}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : allGoals.length > 0 ? (
          /* No matches for filters */
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
            <div className="relative">
              <div className="mx-auto w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals match filters</h3>
              <p className="text-sm text-gray-500 mb-6">Try adjusting your filter criteria</p>
              <Button 
                variant="outline" 
                onClick={clearGoalFilters}
                className="rounded-xl"
                icon={RotateCcw}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        ) : (
          /* No goals at all */
          <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
            <div className="absolute inset-0 grid-pattern-bg opacity-50" />
            <div className="relative">
              <div className="mx-auto w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-purple-500/20">
                <Target className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No goals yet</h3>
              <p className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">
                Goals from your feedback will appear here once your manager adds them.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Dashboard</h1>
        <p className="text-gray-500 mt-1">Track your performance and development</p>
      </div>

      {/* Modern Pill Tabs */}
      <div className="bg-gray-100/80 p-1 rounded-xl inline-flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide max-w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[40px] flex items-center gap-1.5 sm:gap-2 ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'my-feedback' && renderMyFeedback()}
        {activeTab === 'goals' && renderGoals()}
      </div>
    </div>
  );
};

export default EmployeeDashboard;

