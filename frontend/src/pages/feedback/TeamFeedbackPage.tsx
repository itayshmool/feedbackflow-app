// frontend/src/pages/feedback/TeamFeedbackPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCyclesStore } from '@/stores/cyclesStore';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, Eye, Users, CheckCircle, Clock, FileText, X, RotateCcw, User, Calendar } from 'lucide-react';

interface TeamFeedback {
  id: string;
  giverName: string;
  giverEmail: string;
  recipientName: string;
  recipientEmail: string;
  reviewType: string;
  status: string;
  createdAt: string;
  cycleId?: string;
  colorClassification?: 'green' | 'yellow' | 'red';
  content: {
    overallComment: string;
    strengths: string[];
    areasForImprovement: string[];
  };
}

export default function TeamFeedbackPage() {
  const { user } = useAuthStore();
  const { cycles, fetchCycles, isLoading: isCyclesLoading } = useCyclesStore();
  const [feedback, setFeedback] = useState<TeamFeedback[]>([]);
  const [filteredFeedback, setFilteredFeedback] = useState<TeamFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cycleFilter, setCycleFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('all');

  // Check if user is manager
  const isManager = user?.roles?.includes('manager');

  useEffect(() => {
    if (!isManager) {
      setError('Access denied. Manager role required.');
      setLoading(false);
      return;
    }

    fetchTeamFeedback();
  }, [isManager]);

  // Fetch available cycles for filter dropdown
  useEffect(() => {
    if (cycles.length === 0) {
      fetchCycles({}, 1, 100); // Fetch up to 100 cycles for dropdown
    }
  }, [cycles.length, fetchCycles]);

  useEffect(() => {
    applyFilters();
  }, [feedback, searchTerm, statusFilter, cycleFilter, colorFilter]);

  const fetchTeamFeedback = async () => {
    try {
      setLoading(true);
      const response = await api.get('/team/feedback');
      setFeedback(response.data.data || []);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || 'Failed to fetch team feedback';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...feedback];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.giverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.giverEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.recipientEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Cycle filter
    if (cycleFilter) {
      filtered = filtered.filter(item => item.cycleId === cycleFilter);
    }

    // Color classification filter
    if (colorFilter !== 'all') {
      filtered = filtered.filter(item => item.colorClassification === colorFilter);
    }

    setFilteredFeedback(filtered);
  };

  const handleViewFeedback = (feedbackId: string) => {
    window.location.href = `/feedback/${feedbackId}`;
  };

  // Calculate stats
  const stats = useMemo(() => {
    const total = feedback.length;
    const completed = feedback.filter(f => f.status === 'completed').length;
    const submitted = feedback.filter(f => f.status === 'submitted').length;
    return { total, completed, submitted };
  }, [feedback]);

  // Check if any filter is active
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || cycleFilter || colorFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCycleFilter('');
    setColorFilter('all');
  };

  // Get border color based on status
  const getBorderColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-l-emerald-400';
      case 'submitted': return 'border-l-amber-400';
      default: return 'border-l-gray-400';
    }
  };

  if (!isManager) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-12 text-center">
          <div className="relative">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/20">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-500">Manager role required to view team feedback.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center py-20">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-500">Loading team feedback...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-12 text-center">
          <div className="relative">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/20">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Feedback</h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <Button 
              onClick={fetchTeamFeedback}
              className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Manager's Feedback</h1>
        <p className="text-gray-500 mt-1">View feedback given by your managers to their direct reports</p>
      </div>

      {/* Stats Cards - Modern Gradient Design */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total Card - Blue Theme */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-5 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="order-2 sm:order-1">
              <p className="text-xs sm:text-sm font-medium text-blue-100">Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{stats.total}</p>
            </div>
            <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
              <Users className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Completed Card - Emerald Theme */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 sm:p-5 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="order-2 sm:order-1">
              <p className="text-xs sm:text-sm font-medium text-emerald-100">Completed</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{stats.completed}</p>
            </div>
            <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
              <CheckCircle className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Submitted Card - Amber Theme */}
        <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 sm:p-5 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="order-2 sm:order-1">
              <p className="text-xs sm:text-sm font-medium text-amber-100">Submitted</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">{stats.submitted}</p>
            </div>
            <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
              <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <div className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </div>
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              label="Status"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </Select>

            <Select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              disabled={isCyclesLoading}
              label="Cycle"
            >
              <option value="">All Cycles</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </Select>

            <Select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              label="Performance"
            >
              <option value="all">All Levels</option>
              <option value="green">🟢 Exceeds Expectations</option>
              <option value="yellow">🟡 Meets Expectations</option>
              <option value="red">🔴 Needs Improvement</option>
            </Select>
          </div>
          
          {hasActiveFilters && (
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                icon={RotateCcw}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing <span className="font-medium text-gray-700">{filteredFeedback.length}</span> of{' '}
          <span className="font-medium text-gray-700">{feedback.length}</span> feedback items
        </p>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        /* Modern Empty State */
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
          <div className="absolute inset-0 bg-grid-pattern opacity-5" />
          <div className="relative">
            <div className="mx-auto w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-blue-500/20">
              <FileText className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No feedback found</h3>
            <p className="text-sm sm:text-base text-gray-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? "No feedback matches your filters. Try adjusting them."
                : "No feedback has been given to your team members yet."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="mt-6 rounded-xl"
                icon={RotateCcw}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Giver
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Recipient
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredFeedback.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                          {item.giverName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.giverName}</div>
                          <div className="text-xs text-gray-500">{item.giverEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-sm font-medium">
                          {item.recipientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.recipientName}</div>
                          <div className="text-xs text-gray-500">{item.recipientEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                        item.status === 'completed' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'submitted'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.colorClassification ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          item.colorClassification === 'green' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : item.colorClassification === 'yellow'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            item.colorClassification === 'green' ? 'bg-emerald-500' :
                            item.colorClassification === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          {item.colorClassification === 'green' ? 'Exceeds' :
                           item.colorClassification === 'yellow' ? 'Meets' : 'Needs Imp.'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewFeedback(item.id)}
                        className="rounded-lg"
                        icon={Eye}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-2">
            {filteredFeedback.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-lg border border-gray-200 border-l-4 ${getBorderColor(item.status)} p-4 active:bg-gray-50 cursor-pointer transition-all duration-200`}
                onClick={() => handleViewFeedback(item.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Status & Performance Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                        item.status === 'completed' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.status === 'submitted'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                      {item.colorClassification && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.colorClassification === 'green' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : item.colorClassification === 'yellow'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.colorClassification === 'green' ? 'bg-emerald-500' :
                            item.colorClassification === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          {item.colorClassification === 'green' ? 'Exceeds' :
                           item.colorClassification === 'yellow' ? 'Meets' : 'Needs Imp.'}
                        </span>
                      )}
                    </div>

                    {/* Giver & Recipient */}
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs w-14">From:</span>
                        <span className="font-medium text-gray-900 truncate">{item.giverName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs w-14">To:</span>
                        <span className="font-medium text-gray-900 truncate">{item.recipientName}</span>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  {/* View Icon */}
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-500">
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
