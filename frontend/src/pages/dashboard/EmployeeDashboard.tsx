import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  MessageSquare, 
  Clock,
  Target,
  Activity,
  FileText,
  Calendar,
  User
} from 'lucide-react';
import api from '../../services/api';

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
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section - Only show on main dashboard, not on /myself for managers */}
      {!isMyselfRoute && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 sm:p-6 text-white shadow-lg transform transition-all duration-200 hover:shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {user?.name}!</h1>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 gap-3 sm:gap-6 ${isManager ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <Card 
          className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
          onClick={() => navigate('/feedback?tab=received')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-xl flex-shrink-0">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Feedback Received</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isFeedbackLoading ? '...' : feedbackStats?.received || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Given - Only visible to managers */}
        {isManager && (
          <Card 
            className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
            onClick={() => navigate('/feedback?tab=given')}
          >
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-green-100 rounded-xl flex-shrink-0">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Feedback Given</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {isFeedbackLoading ? '...' : feedbackStats?.given || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card 
          className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
          onClick={() => navigate('/feedback?tab=waiting')}
        >
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-orange-100 rounded-xl flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Waiting for Acknowledgement</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isFeedbackLoading ? '...' : feedbackStats?.pending || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Feedback Received */}
        <Card className="transform transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                Recent Feedback
              </div>
              <Link to="/feedback">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isFeedbackLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="md" />
              </div>
            ) : recentFeedback && recentFeedback.length > 0 ? (
              <div className="space-y-3">
                {recentFeedback.slice(0, 3).map((feedback) => (
                  <div 
                    key={feedback.id} 
                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
                    onClick={() => navigate(`/feedback?view=${feedback.id}`)}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{feedback.fromUser?.name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No feedback received yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Goals & Development */}
        <Card className="transform transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-purple-600" />
              My Development Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Technical Skills</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">In Progress</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: '65%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Communication</span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">On Track</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: '80%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Project Delivery</span>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Needs Attention</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full transition-all duration-500" style={{ width: '45%' }}></div>
                </div>
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-4"
                onClick={() => setActiveTab('goals')}
              >
                <Target className="w-4 h-4 mr-2" />
                View All Goals
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="transform transition-all duration-200 hover:shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid grid-cols-1 gap-4 ${isManager ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {isManager && (
              <Link to="/feedback/give">
                <Button variant="outline" className="w-full h-24 flex-col space-y-2 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <span className="font-medium">Give Feedback</span>
                </Button>
              </Link>
            )}
            <Link to="/feedback">
              <Button variant="outline" className="w-full h-24 flex-col space-y-2 hover:bg-green-50 hover:border-green-300 transition-all duration-200">
                <FileText className="w-6 h-6 text-green-600" />
                <span className="font-medium">View Feedback</span>
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="outline" className="w-full h-24 flex-col space-y-2 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200">
                <User className="w-6 h-6 text-orange-600" />
                <span className="font-medium">My Profile</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMyFeedback = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Feedback History</h2>
        <Link to="/feedback">
          <Button>View All Feedback</Button>
        </Link>
      </div>

      {isFeedbackLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : recentFeedback && recentFeedback.length > 0 ? (
        <div className="space-y-4">
          {recentFeedback.map((feedback) => (
            <Card 
              key={feedback.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/feedback?view=${feedback.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        From: {feedback.fromUser?.name || 'Unknown'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        feedback.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : feedback.status === 'submitted'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {feedback.status === 'completed' ? 'Acknowledged' : 
                         feedback.status === 'submitted' ? 'Waiting for Acknowledgement' : 
                         feedback.status}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {feedback.content?.overallComment || feedback.content || 'No comment provided'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(feedback.createdAt).toLocaleDateString()}
                      </span>
                      {feedback.cycle?.name && (
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                          {feedback.cycle.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <MessageSquare className="w-20 h-20 mx-auto mb-4 text-gray-400" />
          <p className="text-lg mb-4">No feedback received yet</p>
          <p className="text-sm text-gray-600 mb-6">Feedback you receive will appear here</p>
        </div>
      )}
    </div>
  );

  const renderGoals = () => {
    // Extract all goals from received feedback
    const allGoals = recentFeedback?.flatMap(feedback => 
      (feedback.goals || []).map(goal => ({
        ...goal,
        feedbackFrom: feedback.fromUser?.name || 'Manager',
      }))
    ) || [];

    const toggleGoalComplete = async (goalId: string, currentStatus: string) => {
      const completed = currentStatus !== 'completed';
      try {
        await api.put(`/goals/${goalId}`, { completed });
        // Refresh feedback to get updated goals
        if (user?.id) {
          fetchFeedbackList({ toUserId: user.id }, 1, 10);
        }
      } catch (error) {
        console.error('Failed to update goal:', error);
      }
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">My Development Goals</h2>

        {isFeedbackLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : allGoals.length > 0 ? (
          <div className="space-y-3">
            {allGoals.map((goal) => (
              <div 
                key={goal.id}
                className={`flex items-start gap-3 p-4 bg-white rounded-lg border ${
                  goal.status === 'completed' ? 'bg-gray-50' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={goal.status === 'completed'}
                  onChange={() => toggleGoalComplete(goal.id, goal.status)}
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex-1">
                  <h3 className={`font-medium ${goal.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className={`text-sm mt-1 ${goal.status === 'completed' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {goal.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {goal.targetDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </span>
                    )}
                    <span>From: {goal.feedbackFrom}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <Target className="w-20 h-20 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-4">No goals yet</p>
            <p className="text-sm text-gray-600">Goals from your feedback will appear here</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
              <p className="text-gray-600">Track your performance and development</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
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
                      ? 'border-indigo-500 text-indigo-600'
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

      {/* Main Content */}
      <div className="p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'my-feedback' && renderMyFeedback()}
        {activeTab === 'goals' && renderGoals()}
      </div>
    </div>
  );
};

export default EmployeeDashboard;

