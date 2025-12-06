import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useHierarchyStore } from '../../stores/hierarchyStore';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { HierarchyNode } from '../../types/hierarchy.types';
import { 
  Users, 
  TrendingUp, 
  MessageSquare, 
  BarChart3, 
  Clock,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Activity,
  Target,
  X,
  Mail,
  Briefcase,
  Building
} from 'lucide-react';

const ManagerDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const {
    directReports,
    stats,
    isLoading,
    error,
    fetchDirectReports,
    fetchHierarchyStats
  } = useHierarchyStore();
  
  // State for team member profile modal
  const [selectedMember, setSelectedMember] = useState<HierarchyNode | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const openProfileModal = (member: HierarchyNode) => {
    setSelectedMember(member);
    setIsProfileModalOpen(true);
  };
  
  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedMember(null);
  };
  const {
    feedbackStats,
    feedbackList: recentFeedback,
    isLoading: isFeedbackLoading,
    fetchFeedbackStats,
    fetchFeedbackList
  } = useFeedbackStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'analytics'>('overview');

  useEffect(() => {
    if (user?.id) {
      fetchDirectReports(user.id);
      fetchHierarchyStats(user.organizationId || '');
      fetchFeedbackStats();
      // Fetch recent team feedback
      fetchFeedbackList({ fromUserId: user.id }, 1, 5);
    }
  }, [user, fetchDirectReports, fetchHierarchyStats, fetchFeedbackStats, fetchFeedbackList]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'team', label: 'Team', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const renderOverview = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-4 sm:p-6 text-white shadow-lg transform transition-all duration-200 hover:shadow-xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
          <p className="text-green-100 text-base sm:text-lg">
            Manage your team and track performance
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <Card className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-xl flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Direct Reports</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {directReports.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-green-100 rounded-xl flex-shrink-0">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
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

        <Card className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-xl flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
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

      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="transform transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
              Recent Team Feedback
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
                  <div key={feedback.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150">
                    <div className={`w-2 h-2 rounded-full ${
                      feedback.status === 'completed' ? 'bg-green-500' :
                      (feedback.status as any) === 'pending' || feedback.status === 'submitted' ? 'bg-yellow-500' : 
                      feedback.status === 'draft' ? 'bg-gray-400' : 'bg-blue-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {feedback.toUser?.name} - {feedback.reviewType}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(feedback.createdAt).toLocaleDateString()} • {feedback.status}
                      </p>
                    </div>
                    {feedback.ratings && feedback.ratings.length > 0 && (
                      <div className="text-sm font-medium text-gray-900">
                        {feedback.ratings[0].score}/5
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent feedback activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="transform transition-all duration-200 hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-purple-600" />
              Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Feedback Completion</span>
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    {feedbackStats?.completionRate ? `${Math.round(feedbackStats.completionRate * 100)}%` : '85%'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: feedbackStats?.completionRate ? `${feedbackStats.completionRate * 100}%` : '85%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Team Development</span>
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">In Progress</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full transition-all duration-500" style={{ width: '60%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Team Engagement</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">On Track</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Your Team</h2>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <Card className="p-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {directReports.map((member) => (
            <Card key={member.id} className="transform transition-all duration-200 hover:shadow-lg hover:-translate-y-1">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-xl font-bold text-white">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{member.name}</h3>
                    <p className="text-sm text-gray-600">{member.position}</p>
                    {member.department && (
                      <p className="text-xs text-gray-500">{member.department}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full hover:bg-blue-50 hover:border-blue-300 transition-colors duration-200"
                    onClick={() => openProfileModal(member)}
                  >
                    View Profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Team Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Performance charts coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feedback Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Analytics charts coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
              <p className="text-gray-600">Manage your team and track performance</p>
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

      {/* Main Content */}
      <div className="p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'team' && renderTeam()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Team Member Profile Modal */}
      {isProfileModalOpen && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={closeProfileModal}
          />
          
          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all">
              {/* Close button */}
              <button
                onClick={closeProfileModal}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Profile content */}
              <div className="p-6">
                {/* Avatar and name */}
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-3xl font-bold text-white">
                      {selectedMember.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedMember.name}</h2>
                  {selectedMember.position && (
                    <p className="text-gray-600">{selectedMember.position}</p>
                  )}
                </div>

                {/* Info grid */}
                <div className="space-y-4">
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-5 h-5 mr-3 text-gray-400" />
                    <span>{selectedMember.email}</span>
                  </div>
                  
                  {selectedMember.department && (
                    <div className="flex items-center text-gray-600">
                      <Building className="w-5 h-5 mr-3 text-gray-400" />
                      <span>{selectedMember.department}</span>
                    </div>
                  )}
                  
                  {selectedMember.position && (
                    <div className="flex items-center text-gray-600">
                      <Briefcase className="w-5 h-5 mr-3 text-gray-400" />
                      <span>{selectedMember.position}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
