// frontend/src/pages/team/EmployeeHistoryPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import api from '../../lib/api';
import {
  ArrowLeft,
  MessageSquare,
  Calendar,
  TrendingUp,
  TrendingDown,
  User,
  Mail,
  Building,
  Eye,
  ChevronRight,
  Award,
  Target,
  AlertCircle,
} from 'lucide-react';

interface FeedbackHistoryItem {
  id: string;
  cycleId: string;
  cycleName: string;
  createdAt: string;
  status: string;
  colorClassification?: 'green' | 'yellow' | 'red';
  reviewType: string;
  contentPreview?: string;
}

interface EmployeeData {
  id: string;
  name: string;
  email: string;
  position: string;
  department: string;
  avatarUrl?: string;
  reportingSince?: string;
}

interface EmployeeHistoryData {
  employee: EmployeeData;
  feedbackHistory: FeedbackHistoryItem[];
  stats: {
    totalFeedback: number;
    greenCount: number;
    yellowCount: number;
    redCount: number;
    lastFeedbackDate?: string;
  };
}

export default function EmployeeHistoryPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [data, setData] = useState<EmployeeHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeHistory();
    }
  }, [employeeId]);

  const fetchEmployeeHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get(`/team/employee/${employeeId}/history`);
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError(response.data.error || 'Failed to load employee history');
      }
    } catch (err: any) {
      console.error('Error fetching employee history:', err);
      setError(err.response?.data?.error || 'Failed to load employee history');
    } finally {
      setIsLoading(false);
    }
  };

  const getColorBadge = (color?: string) => {
    switch (color) {
      case 'green':
        return (
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-sm" title="Exceeds Expectations" />
        );
      case 'yellow':
        return (
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-sm" title="Meets Expectations" />
        );
      case 'red':
        return (
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-sm" title="Needs Improvement" />
        );
      default:
        return (
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 shadow-sm" title="No classification" />
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      acknowledged: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Acknowledged' },
    };
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return (
      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading employee history...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="outline" onClick={() => navigate('/team')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load</h2>
              <p className="text-gray-600 mb-6">{error || 'Employee not found'}</p>
              <Button onClick={fetchEmployeeHistory}>Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { employee, feedbackHistory, stats } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/team')} 
            className="mb-4 -ml-2 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
          
          {/* Employee info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white/30 shadow-xl">
              <span className="text-3xl sm:text-4xl font-bold text-white">
                {employee.name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">{employee.name}</h1>
              <p className="text-white/80 text-base sm:text-lg mt-1">{employee.position || 'Team Member'}</p>
              
              <div className="flex flex-wrap gap-3 sm:gap-4 mt-3 text-sm text-white/70">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{employee.email}</span>
                </span>
                {employee.department && (
                  <span className="flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    {employee.department}
                  </span>
                )}
              </div>
            </div>
            
            {/* Give Feedback Button */}
            <Button
              onClick={() => navigate(`/feedback/give?recipient=${encodeURIComponent(employee.email)}&name=${encodeURIComponent(employee.name)}`)}
              className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-white/90 font-semibold shadow-lg"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Give Feedback
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards - Gradient Design */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 -mt-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="p-2 bg-white/20 rounded-lg w-fit">
                  <MessageSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.totalFeedback}</p>
                  <p className="text-xs sm:text-sm font-medium text-blue-100">Total Feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="p-2 bg-white/20 rounded-lg w-fit">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.greenCount}</p>
                  <p className="text-xs sm:text-sm font-medium text-emerald-100">Exceeds</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="p-2 bg-white/20 rounded-lg w-fit">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.yellowCount}</p>
                  <p className="text-xs sm:text-sm font-medium text-amber-100">Meets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className="p-2 bg-white/20 rounded-lg w-fit">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-bold text-white">{stats.redCount}</p>
                  <p className="text-xs sm:text-sm font-medium text-rose-100">Needs Imp.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Timeline */}
        {feedbackHistory.length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                Performance Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {feedbackHistory.slice(0, 10).map((feedback, index) => (
                  <button
                    key={feedback.id}
                    className="flex flex-col items-center min-w-[70px] sm:min-w-[80px] p-2 rounded-xl hover:bg-gray-50 transition-all cursor-pointer group"
                    onClick={() => navigate(`/feedback/${feedback.id}`)}
                  >
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${
                      feedback.colorClassification === 'green' ? 'bg-gradient-to-br from-green-100 to-green-200 ring-2 ring-green-300' :
                      feedback.colorClassification === 'yellow' ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 ring-2 ring-yellow-300' :
                      feedback.colorClassification === 'red' ? 'bg-gradient-to-br from-red-100 to-red-200 ring-2 ring-red-300' : 
                      'bg-gradient-to-br from-gray-100 to-gray-200 ring-2 ring-gray-300'
                    }`}>
                      {getColorBadge(feedback.colorClassification)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                      {new Date(feedback.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Click on a point to view feedback details</p>
            </CardContent>
          </Card>
        )}

        {/* Feedback History List */}
        <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              Feedback History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackHistory.length === 0 ? (
              <div className="text-center py-12 sm:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No Feedback Yet</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  You haven't given any feedback to {employee.name} yet. Start building their growth story!
                </p>
                <Button
                  onClick={() => navigate(`/feedback/give?recipient=${encodeURIComponent(employee.email)}&name=${encodeURIComponent(employee.name)}`)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Give First Feedback
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackHistory.map((feedback) => (
                  <button
                    key={feedback.id}
                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md text-left group ${
                      feedback.colorClassification === 'green' ? 'bg-white border-l-4 border-l-green-500 border border-gray-200 hover:border-green-300' :
                      feedback.colorClassification === 'yellow' ? 'bg-white border-l-4 border-l-yellow-500 border border-gray-200 hover:border-yellow-300' :
                      feedback.colorClassification === 'red' ? 'bg-white border-l-4 border-l-red-500 border border-gray-200 hover:border-red-300' :
                      'bg-white border-l-4 border-l-gray-300 border border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => navigate(`/feedback/${feedback.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        feedback.colorClassification === 'green' ? 'bg-green-100' :
                        feedback.colorClassification === 'yellow' ? 'bg-yellow-100' :
                        feedback.colorClassification === 'red' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {getColorBadge(feedback.colorClassification)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {feedback.cycleName || 'Performance Review'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(feedback.createdAt).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(feedback.status)}
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
