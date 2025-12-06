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
  Building,
  ChevronRight,
  ChevronDown,
  User
} from 'lucide-react';

const ManagerDashboard: React.FC = () => {
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
  
  // State for team member profile modal
  const [selectedMember, setSelectedMember] = useState<HierarchyNode | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // State for expanded tree nodes
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const openProfileModal = (member: HierarchyNode) => {
    setSelectedMember(member);
    setIsProfileModalOpen(true);
  };
  
  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
    setSelectedMember(null);
  };
  
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

  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'analytics'>('overview');

  useEffect(() => {
    if (user?.id) {
      fetchDirectReports(user.id);
      fetchHierarchyStats(user.organizationId || '');
      fetchFeedbackStats();
      // Fetch recent team feedback
      fetchFeedbackList({ fromUserId: user.id }, 1, 5);
      // Fetch hierarchy tree for team view
      if (user.organizationId) {
        fetchHierarchyTree(user.organizationId);
      }
    }
  }, [user, fetchDirectReports, fetchHierarchyTree, fetchHierarchyStats, fetchFeedbackStats, fetchFeedbackList]);
  
  // Auto-expand root node when hierarchy tree loads
  useEffect(() => {
    if (hierarchyTree?.id) {
      setExpandedNodes(prev => new Set(prev).add(hierarchyTree.id));
    }
  }, [hierarchyTree?.id]);

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
    
    // Limit indentation on mobile
    const mobileIndent = Math.min(level, 4);
    const indentPx = mobileIndent * 24;
    
    return (
      <div key={node.id} className="select-none">
        {/* Node card */}
        <div 
          className={`
            relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl mb-2 
            transition-all duration-300 ease-out
            ${isCurrentUser 
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300 shadow-lg shadow-emerald-100' 
              : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-md hover:scale-[1.01]'
            }
          `}
          style={{ marginLeft: `${indentPx}px` }}
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
            onClick={() => hasChildren && toggleNode(node.id)}
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
          `}>
            <span className="text-base sm:text-lg font-bold text-white drop-shadow-sm">
              {node.name.charAt(0).toUpperCase()}
            </span>
            {/* Manager badge */}
            {hasChildren && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-amber-400 rounded-full flex items-center justify-center ring-2 ring-white">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-semibold text-sm sm:text-base ${isCurrentUser ? 'text-emerald-800' : 'text-gray-900'}`}>
                {node.name}
              </h4>
              {isCurrentUser && (
                <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                  You
                </span>
              )}
              {hasChildren && (
                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium hidden sm:inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {node.directReports.length} {node.directReports.length === 1 ? 'report' : 'reports'}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">
              {node.position || 'Team Member'}
              {node.department && <span className="hidden sm:inline text-gray-400"> • {node.department}</span>}
            </p>
          </div>
          
          {/* Actions */}
          {!isCurrentUser && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                openProfileModal(node);
              }}
              className="
                px-3 sm:px-4 py-1.5 sm:py-2 
                text-xs sm:text-sm font-medium
                text-blue-600 hover:text-white
                bg-blue-50 hover:bg-blue-600
                border border-blue-200 hover:border-blue-600
                rounded-lg transition-all duration-200
                flex items-center gap-1.5
              "
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Profile</span>
            </button>
          )}
          
          {/* Mobile team count */}
          {hasChildren && (
            <span className="sm:hidden text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">
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
