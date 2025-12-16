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
  ChevronRight,
  Award,
  Target,
  Sparkles,
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

  const getColorConfig = (color?: string) => {
    switch (color) {
      case 'green':
        return { 
          bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', 
          ring: 'ring-emerald-300',
          light: 'bg-emerald-50',
          border: 'border-emerald-500',
          text: 'text-emerald-600'
        };
      case 'yellow':
        return { 
          bg: 'bg-gradient-to-br from-amber-400 to-amber-600', 
          ring: 'ring-amber-300',
          light: 'bg-amber-50',
          border: 'border-amber-500',
          text: 'text-amber-600'
        };
      case 'red':
        return { 
          bg: 'bg-gradient-to-br from-rose-400 to-rose-600', 
          ring: 'ring-rose-300',
          light: 'bg-rose-50',
          border: 'border-rose-500',
          text: 'text-rose-600'
        };
      default:
        return { 
          bg: 'bg-gradient-to-br from-gray-300 to-gray-500', 
          ring: 'ring-gray-300',
          light: 'bg-gray-50',
          border: 'border-gray-400',
          text: 'text-gray-600'
        };
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Completed' },
      submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Submitted' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
      acknowledged: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Acknowledged' },
    };
    const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return (
      <span className={`px-3 py-1 text-xs font-bold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading employee history...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          <Button variant="outline" onClick={() => navigate('/team')} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Team
          </Button>
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl">
            <CardContent className="p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                <User className="w-10 h-10 text-gray-400" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Hero Header with decorative elements */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
        
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-pink-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-blue-400/10 rounded-full blur-2xl" />
        
        {/* Content */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
          {/* Back button */}
          <button 
            onClick={() => navigate('/team')} 
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to Team</span>
          </button>
          
          {/* Employee info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            {/* Avatar with glow effect */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/30 rounded-full blur-xl scale-110" />
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-4 ring-white/40 shadow-2xl">
                <span className="text-4xl sm:text-5xl font-bold text-white drop-shadow-lg">
                  {employee.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{employee.name}</h1>
                <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Team Member</span>
                </div>
              </div>
              <p className="text-white/90 text-lg sm:text-xl font-medium">{employee.position || 'Team Member'}</p>
              
              <div className="flex flex-wrap gap-4 mt-4">
                <span className="flex items-center gap-2 text-sm text-white/80 bg-white/10 px-3 py-1.5 rounded-full">
                  <Mail className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{employee.email}</span>
                </span>
                {employee.department && (
                  <span className="flex items-center gap-2 text-sm text-white/80 bg-white/10 px-3 py-1.5 rounded-full">
                    <Building className="w-4 h-4" />
                    {employee.department}
                  </span>
                )}
              </div>
            </div>
            
            {/* Give Feedback Button */}
            <Button
              onClick={() => navigate(`/feedback?action=give&recipient=${encodeURIComponent(employee.email)}&name=${encodeURIComponent(employee.name)}`)}
              className="w-full sm:w-auto bg-white text-indigo-600 hover:bg-white/90 font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 px-6 py-3"
            >
              <MessageSquare className="w-5 h-5 mr-2" />
              Give Feedback
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - Floating above with shadow */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 -mt-16 mb-8 relative z-10">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl shadow-inner">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl sm:text-4xl font-black text-white">{stats.totalFeedback}</p>
                  <p className="text-sm font-semibold text-blue-100">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl shadow-inner">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl sm:text-4xl font-black text-white">{stats.greenCount}</p>
                  <p className="text-sm font-semibold text-emerald-100">Exceeds</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl shadow-inner">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl sm:text-4xl font-black text-white">{stats.yellowCount}</p>
                  <p className="text-sm font-semibold text-amber-100">Meets</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-rose-500 to-rose-600 border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 rounded-xl shadow-inner">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-3xl sm:text-4xl font-black text-white">{stats.redCount}</p>
                  <p className="text-sm font-semibold text-rose-100">Improve</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Timeline */}
        {feedbackHistory.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl mb-8 overflow-hidden">
            <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
              <CardTitle className="text-xl font-bold flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                Performance Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex items-end gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {feedbackHistory.slice(0, 12).map((feedback, index) => {
                  const colorConfig = getColorConfig(feedback.colorClassification);
                  return (
                    <button
                      key={feedback.id}
                      className="flex flex-col items-center min-w-[90px] group"
                      onClick={() => navigate(`/feedback/${feedback.id}`)}
                    >
                      {/* Timeline dot with glow */}
                      <div className="relative mb-3">
                        <div className={`absolute inset-0 ${colorConfig.bg} rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity`} />
                        <div className={`relative w-14 h-14 sm:w-16 sm:h-16 ${colorConfig.bg} rounded-full flex items-center justify-center shadow-lg ring-4 ${colorConfig.ring} group-hover:scale-110 transition-all cursor-pointer`}>
                          {feedback.colorClassification === 'green' && <TrendingUp className="w-6 h-6 text-white" />}
                          {feedback.colorClassification === 'yellow' && <Target className="w-6 h-6 text-white" />}
                          {feedback.colorClassification === 'red' && <TrendingDown className="w-6 h-6 text-white" />}
                          {!feedback.colorClassification && <MessageSquare className="w-6 h-6 text-white" />}
                        </div>
                      </div>
                      
                      {/* Date label */}
                      <div className="text-center">
                        <p className="text-sm font-bold text-gray-800">
                          {new Date(feedback.createdAt).toLocaleDateString('en-US', { month: 'short' })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(feedback.createdAt).toLocaleDateString('en-US', { day: 'numeric', year: '2-digit' })}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 mt-4 text-center font-medium">Click on a point to view feedback details</p>
            </CardContent>
          </Card>
        )}

        {/* Feedback History List */}
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-xl overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              Feedback History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {feedbackHistory.length === 0 ? (
              <div className="text-center py-16">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full blur-xl opacity-30" />
                  <div className="relative w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner">
                    <MessageSquare className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Feedback Yet</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto text-lg">
                  Start {employee.name.split(' ')[0]}'s growth journey with your first feedback!
                </p>
                <Button
                  onClick={() => navigate(`/feedback?action=give&recipient=${encodeURIComponent(employee.email)}&name=${encodeURIComponent(employee.name)}`)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-105 px-8 py-3 text-lg font-bold"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Give First Feedback
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {feedbackHistory.map((feedback) => {
                  const colorConfig = getColorConfig(feedback.colorClassification);
                  return (
                    <button
                      key={feedback.id}
                      className={`w-full flex items-center justify-between p-5 rounded-2xl transition-all hover:shadow-lg text-left group bg-white border-l-4 ${colorConfig.border} border border-gray-200 hover:border-gray-300`}
                      onClick={() => navigate(`/feedback/${feedback.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${colorConfig.bg} rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                          {feedback.colorClassification === 'green' && <TrendingUp className="w-5 h-5 text-white" />}
                          {feedback.colorClassification === 'yellow' && <Target className="w-5 h-5 text-white" />}
                          {feedback.colorClassification === 'red' && <TrendingDown className="w-5 h-5 text-white" />}
                          {!feedback.colorClassification && <MessageSquare className="w-5 h-5 text-white" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">
                            {feedback.cycleName || 'Performance Review'}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {new Date(feedback.createdAt).toLocaleDateString('en-US', { 
                              weekday: 'short',
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(feedback.status)}
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
