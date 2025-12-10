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
  User,
  Mail,
  Briefcase,
  Building,
  Clock,
  Eye,
  ChevronRight,
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
        return <span className="w-3 h-3 rounded-full bg-green-500" title="Exceeds Expectations" />;
      case 'yellow':
        return <span className="w-3 h-3 rounded-full bg-yellow-500" title="Meets Expectations" />;
      case 'red':
        return <span className="w-3 h-3 rounded-full bg-red-500" title="Needs Improvement" />;
      default:
        return <span className="w-3 h-3 rounded-full bg-gray-300" title="No classification" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      submitted: 'bg-blue-100 text-blue-700',
      draft: 'bg-gray-100 text-gray-700',
      acknowledged: 'bg-purple-100 text-purple-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading employee history...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Button variant="outline" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            <User className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load</h2>
            <p className="text-gray-600 mb-4">{error || 'Employee not found'}</p>
            <Button onClick={fetchEmployeeHistory}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { employee, feedbackHistory, stats } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
          
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-3xl font-bold text-white">
                {employee.name.charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
              <p className="text-gray-600">{employee.position || 'Team Member'}</p>
              
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {employee.email}
                </span>
                {employee.department && (
                  <span className="flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    {employee.department}
                  </span>
                )}
              </div>
            </div>
            
            {/* Give Feedback Button */}
            <Button
              onClick={() => navigate(`/feedback?action=give&recipient=${encodeURIComponent(employee.email)}&name=${encodeURIComponent(employee.name)}`)}
              className="bg-green-600 hover:bg-green-700"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Give Feedback
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalFeedback}</p>
                  <p className="text-xs text-gray-500">Total Feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.greenCount}</p>
                  <p className="text-xs text-gray-500">Exceeds</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.yellowCount}</p>
                  <p className="text-xs text-gray-500">Meets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.redCount}</p>
                  <p className="text-xs text-gray-500">Needs Improvement</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Timeline */}
        {feedbackHistory.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Performance Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {feedbackHistory.slice(0, 8).map((feedback, index) => (
                  <div
                    key={feedback.id}
                    className="flex flex-col items-center min-w-[80px] cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => navigate(`/feedback?view=${feedback.id}`)}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      feedback.colorClassification === 'green' ? 'bg-green-100' :
                      feedback.colorClassification === 'yellow' ? 'bg-yellow-100' :
                      feedback.colorClassification === 'red' ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      {getColorBadge(feedback.colorClassification)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">
                      {new Date(feedback.createdAt).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback History List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Feedback History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackHistory.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Yet</h3>
                <p className="text-gray-500 mb-4">You haven't given any feedback to {employee.name} yet.</p>
                <Button
                  onClick={() => navigate(`/feedback?action=give&recipient=${encodeURIComponent(employee.email)}&name=${encodeURIComponent(employee.name)}`)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Give First Feedback
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackHistory.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/feedback?view=${feedback.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {getColorBadge(feedback.colorClassification)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {feedback.cycleName || feedback.reviewType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

