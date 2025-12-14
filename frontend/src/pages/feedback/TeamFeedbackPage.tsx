// frontend/src/pages/feedback/TeamFeedbackPage.tsx

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCyclesStore } from '@/stores/cyclesStore';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Search, Filter, Eye } from 'lucide-react';

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

  if (!isManager) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Manager role required to view team feedback.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">Loading team feedback...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <Button onClick={fetchTeamFeedback} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Manager's Feedback</h1>
        <p className="mt-2 text-gray-600">
          View feedback given by your managers to their direct reports.
        </p>
      </div>

      {/* Filters - Responsive grid */}
      <Card className="mb-6">
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </Select>

            {/* Cycle Filter - populated from cycles store */}
            <Select
              value={cycleFilter}
              onChange={(e) => setCycleFilter(e.target.value)}
              disabled={isCyclesLoading}
            >
              <option value="">All Cycles</option>
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </Select>

            {/* Color Classification Filter */}
            <Select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
            >
              <option value="all">All Classifications</option>
              <option value="green">🟢 Exceeds Expectations</option>
              <option value="yellow">🟡 Meets Expectations</option>
              <option value="red">🔴 Needs Improvement</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <Card>
        <div className="p-4 sm:p-6">
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              Feedback ({filteredFeedback.length})
            </h2>
          </div>

          {filteredFeedback.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No feedback found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' || cycleFilter || colorFilter !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'No feedback has been given to your team members yet.'}
              </p>
            </div>
          ) : (
            /* Table container with scroll hint for mobile */
            <div className="relative">
              {/* Scroll fade indicator on right edge - hints there's more content on mobile */}
              <div className="md:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
              
              <div className="overflow-x-auto pr-8 md:pr-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Giver
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      {/* Type column removed - single feedback type (Manager Review) */}
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Classification
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFeedback.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.giverName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.giverEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.recipientName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.recipientEmail}
                            </div>
                          </div>
                        </td>
                        {/* Type column removed - single feedback type (Manager Review) */}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'submitted'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </td>
                        {/* Classification Cell */}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          {item.colorClassification ? (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              item.colorClassification === 'green' 
                                ? 'bg-green-100 text-green-800' 
                                : item.colorClassification === 'yellow'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${
                                item.colorClassification === 'green' ? 'bg-green-500' :
                                item.colorClassification === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              {item.colorClassification === 'green' ? 'Exceeds' :
                               item.colorClassification === 'yellow' ? 'Meets' : 'Needs Imp.'}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewFeedback(item.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
