// Feedback List Component

import React, { useState, useEffect, useCallback } from 'react';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { useCyclesStore } from '../../stores/cyclesStore';
import { Feedback, FeedbackStatus, FeedbackFilters } from '../../types/feedback.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { HighlightText } from '../ui/HighlightText';
import { MessageSquare, Calendar, User, Filter, Download, Eye, Edit, Trash2, RotateCcw, Search, X, ChevronDown, ChevronUp } from 'lucide-react';

interface FeedbackListProps {
  onSelectFeedback?: (feedback: Feedback, editMode?: boolean) => void;
  onGiveFeedback?: () => void;
  userId?: string;
  showFilters?: boolean;
  initialTab?: 'received' | 'given' | 'all' | 'drafts' | 'waiting' | 'acknowledged';
  initialStatus?: string;
  initialColorFilter?: string; // 'green' | 'yellow' | 'red'
  isManager?: boolean;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  onSelectFeedback,
  onGiveFeedback,
  userId,
  showFilters = true,
  initialTab = 'all',
  initialStatus,
  initialColorFilter,
  isManager = true, // Default to manager view for backwards compatibility
}) => {
  const {
    feedbackList,
    feedbackStats,
    isLoading,
    error,
    filters,
    pagination,
    fetchFeedbackList,
    fetchFeedbackStats,
    setFilters,
    clearFilters,
    exportFeedback,
    deleteFeedback,
  } = useFeedbackStore();

  // Get cycles for filter dropdown
  const { cycles, fetchCycles, isLoading: isCyclesLoading } = useCyclesStore();

  // For employees, default to 'waiting' tab; for managers, use initialTab
  const defaultTab = isManager ? initialTab : (initialTab === 'all' ? 'waiting' : initialTab);
  const [activeTab, setActiveTab] = useState<'received' | 'given' | 'all' | 'drafts' | 'waiting' | 'acknowledged'>(defaultTab as any);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>(initialStatus as FeedbackStatus || '');
  // typeFilter removed - single feedback type (Manager Review) only
  const [cycleFilter, setCycleFilter] = useState<string>('');
  const [colorFilter, setColorFilter] = useState<string>(initialColorFilter || '');
  const [showFilterPanel, setShowFilterPanel] = useState(!!initialStatus || !!initialColorFilter); // Auto-show filter panel if filters pre-set
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Check if content is long enough to need truncation (~3 lines worth)
  const isLongContent = (text: string) => text.length > 180;

  useEffect(() => {
    loadFeedback();
    if (userId) {
      fetchFeedbackStats(userId);
    }
  }, [activeTab, userId, fetchFeedbackStats]);

  // Fetch available cycles for filter dropdown
  useEffect(() => {
    if (cycles.length === 0) {
      fetchCycles({}, 1, 100); // Fetch up to 100 cycles for dropdown
    }
  }, [cycles.length, fetchCycles]);

  // Auto-apply dropdown filters when they change
  useEffect(() => {
    loadFeedback();
  }, [statusFilter, cycleFilter, colorFilter]);

  // Clear color filter when switching to tabs where it shouldn't apply
  // This prevents a hidden color filter from affecting results
  useEffect(() => {
    const colorFilterAllowedTabs = ['given', 'drafts'];
    if (isManager && colorFilter && !colorFilterAllowedTabs.includes(activeTab)) {
      setColorFilter('');
    }
    // Also clear Draft status filter for employees or when manager is on 'received' tab
    if (statusFilter === FeedbackStatus.DRAFT) {
      if (!isManager || activeTab === 'received') {
        setStatusFilter('');
      }
    }
  }, [activeTab, isManager]);

  // Handle search on Enter key
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      loadFeedback();
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery('');
    // Trigger reload after clearing
    setTimeout(() => loadFeedback(), 0);
  };

  const loadFeedback = () => {
    const newFilters: FeedbackFilters = {};
    
    if (userId) {
      if (activeTab === 'received') {
        // For received feedback, we need to check both toUserId and toUserEmail
        // since the backend stores email in toUserId field
        newFilters.toUserId = userId;
        newFilters.toUserEmail = userId; // Also try email filtering
      } else if (activeTab === 'given') {
        newFilters.fromUserId = userId;
      } else if (activeTab === 'drafts') {
        // Only show drafts created by the current user
        newFilters.fromUserId = userId;
        newFilters.status = FeedbackStatus.DRAFT;
      } else if (activeTab === 'waiting') {
        // Employee tab: Feedback received, waiting to be acknowledged (status = submitted)
        newFilters.toUserId = userId;
        newFilters.toUserEmail = userId;
        newFilters.status = FeedbackStatus.SUBMITTED;
      } else if (activeTab === 'acknowledged') {
        // Employee tab: Feedback received and acknowledged (status = completed)
        newFilters.toUserId = userId;
        newFilters.toUserEmail = userId;
        newFilters.status = FeedbackStatus.COMPLETED;
      }
    }
    
    if (statusFilter && activeTab !== 'waiting' && activeTab !== 'acknowledged') {
      // Don't override status for waiting/acknowledged tabs
      newFilters.status = statusFilter;
    }
    
    // typeFilter removed - single feedback type (Manager Review)
    
    if (searchQuery) {
      newFilters.search = searchQuery;
    }

    if (cycleFilter) {
      newFilters.cycleId = cycleFilter;
    }

    if (colorFilter) {
      newFilters.colorClassification = colorFilter;
    }

    fetchFeedbackList(newFilters, pagination.page, pagination.limit);
  };

  const handleSearch = () => {
    loadFeedback();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setColorFilter('');
    setCycleFilter('');
    clearFilters();
    loadFeedback();
  };

  const handleExport = async () => {
    const blob = await exportFeedback(filters);
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback-export-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const handleEditDraft = (feedback: Feedback) => {
    // Pass the feedback with an indicator that it should open in edit mode
    onSelectFeedback?.(feedback, true);
  };

  const handleDeleteDraft = async (feedbackId: string) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) {
      return;
    }
    
    const success = await deleteFeedback(feedbackId);
    if (success) {
      loadFeedback();
      if (userId) {
        fetchFeedbackStats(userId);
      }
    }
  };

  const getStatusColor = (status: FeedbackStatus): 'blue' | 'yellow' | 'green' | 'gray' => {
    switch (status) {
      case FeedbackStatus.DRAFT:
        return 'gray';
      case FeedbackStatus.SUBMITTED:
      case FeedbackStatus.UNDER_REVIEW:
        return 'yellow';
      case FeedbackStatus.COMPLETED:
      case FeedbackStatus.ACKNOWLEDGED:
        return 'green';
      case FeedbackStatus.ARCHIVED:
        return 'gray';
      default:
        return 'blue';
    }
  };

  // getTypeLabel removed - single feedback type (Manager Review)

  // Show all feedback types (no filtering by reviewType)
  // Note: Backend returns "manager", "peer", etc. (not "manager_review", "peer_review")
  const visibleFeedbackList = feedbackList;

  // Handle pagination with correct filters
  const handlePageChange = (newPage: number) => {
    // Rebuild filters the same way loadFeedback does to ensure consistency
    const currentFilters: FeedbackFilters = {};
    
    if (userId) {
      if (activeTab === 'received') {
        currentFilters.toUserId = userId;
        currentFilters.toUserEmail = userId;
      } else if (activeTab === 'given') {
        currentFilters.fromUserId = userId;
      } else if (activeTab === 'drafts') {
        currentFilters.fromUserId = userId;
        currentFilters.status = FeedbackStatus.DRAFT;
      } else if (activeTab === 'waiting') {
        currentFilters.toUserId = userId;
        currentFilters.toUserEmail = userId;
        currentFilters.status = FeedbackStatus.SUBMITTED;
      } else if (activeTab === 'acknowledged') {
        currentFilters.toUserId = userId;
        currentFilters.toUserEmail = userId;
        currentFilters.status = FeedbackStatus.COMPLETED;
      }
    }
    
    if (statusFilter && activeTab !== 'waiting' && activeTab !== 'acknowledged') {
      currentFilters.status = statusFilter;
    }
    
    // typeFilter removed - single feedback type (Manager Review)
    
    if (searchQuery) {
      currentFilters.search = searchQuery;
    }

    if (cycleFilter) {
      currentFilters.cycleId = cycleFilter;
    }

    fetchFeedbackList(currentFilters, newPage, pagination.limit);
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="mb-4">Error loading feedback: {error}</p>
          <Button onClick={loadFeedback}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Feedback</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Search Bar - Always visible */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 pr-8 py-2 w-full sm:w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        <div className="flex gap-2">
          {showFilters && (
            <Button
              variant="outline"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              icon={Filter}
            >
              Filters
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} icon={Download}>
            Export
          </Button>
          {onGiveFeedback && (
            <Button onClick={onGiveFeedback}>Give Feedback</Button>
          )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {userId && (
        <div className="flex gap-2 border-b">
          {isManager ? (
            // Manager tabs: Received, Given, Drafts, All
            <>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'received'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('received')}
          >
            Received ({feedbackStats?.received || 0})
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'given'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('given')}
          >
            Given ({feedbackStats?.given || 0})
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'drafts'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('drafts')}
          >
            Drafts ({feedbackStats?.drafts || 0})
          </button>
          <button
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'all'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All ({(feedbackStats?.given || 0) + (feedbackStats?.received || 0) + (feedbackStats?.drafts || 0)})
          </button>
            </>
          ) : (
            // Employee tabs: Waiting for Acknowledgement, Acknowledged, All Received
            <>
              <button
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'waiting'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('waiting')}
              >
                Waiting for Acknowledgement ({feedbackStats?.pending || 0})
              </button>
              <button
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'acknowledged'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('acknowledged')}
              >
                Acknowledged ({feedbackStats?.acknowledged || 0})
              </button>
              <button
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'received'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => setActiveTab('received')}
              >
                All Received ({feedbackStats?.received || 0})
              </button>
            </>
          )}
        </div>
      )}

      {/* Filter Panel - Dropdowns auto-apply on change */}
      {showFilters && showFilterPanel && (
        <Card className="p-4">
          {/* 
            Filter visibility rules:
            - Color filter: Only for managers on "given" or "drafts" tabs (their own feedback)
            - Status filter: Only for managers (employees use tabs for status filtering)
            - Cycle filter: Visible to everyone
          */}
          {(() => {
            const showColorFilter = isManager && (activeTab === 'given' || activeTab === 'drafts');
            // Status filter only for managers - employees use tabs for status (waiting/acknowledged/all)
            const showStatusFilter = isManager;
            // Determine if Draft status option should be shown:
            // - For managers: only on "given", "drafts", or "all" tabs (not on "received")
            const showDraftStatus = isManager && activeTab !== 'received';
            
            // Calculate grid columns: 1 for cycle, +1 for status (managers), +1 for color (managers on given/drafts)
            const columnCount = 1 + (showStatusFilter ? 1 : 0) + (showColorFilter ? 1 : 0);
            const gridClass = columnCount === 1 
              ? 'grid-cols-1' 
              : columnCount === 2 
                ? 'grid-cols-1 md:grid-cols-2' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
            
            return (
              <div className={`grid ${gridClass} gap-4`}>
                <Select
                  label="Cycle"
                  value={cycleFilter}
                  onChange={(e) => setCycleFilter(e.target.value)}
                >
                  <option value="">All Cycles</option>
                  {cycles.map((cycle) => (
                    <option key={cycle.id} value={cycle.id}>
                      {cycle.name}
                    </option>
                  ))}
                </Select>
                {/* Status filter - only for managers (employees use tabs for status) */}
                {showStatusFilter && (
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus)}
                  >
                    <option value="">All Statuses</option>
                    {/* Draft option only for managers on appropriate tabs */}
                    {showDraftStatus && (
                      <option value={FeedbackStatus.DRAFT}>Draft</option>
                    )}
                    <option value={FeedbackStatus.SUBMITTED}>Submitted</option>
                    <option value={FeedbackStatus.COMPLETED}>Completed</option>
                  </Select>
                )}
                {/* Type filter removed - single feedback type (Manager Review) */}
                {/* Color filter - only visible to managers on "given" or "drafts" tabs
                    This prevents exposing the color classification of feedback they received */}
                {showColorFilter && (
                  <Select
                    label="Color"
                    value={colorFilter}
                    onChange={(e) => setColorFilter(e.target.value)}
                  >
                    <option value="">All Colors</option>
                    <option value="green">🟢 Exceeds Expectations</option>
                    <option value="yellow">🟡 Meets Expectations</option>
                    <option value="red">🔴 Needs Improvement</option>
                  </Select>
                )}
              </div>
            );
          })()}
          {(cycleFilter || (isManager && statusFilter) || (isManager && (activeTab === 'given' || activeTab === 'drafts') && colorFilter)) && (
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={handleClearFilters} icon={RotateCcw}>
              Clear Filters
            </Button>
          </div>
          )}
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Feedback List */}
      {!isLoading && (
        <div className="space-y-4">
          {visibleFeedbackList.length === 0 ? (
            <Card className="p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No feedback found</h3>
              <p className="text-gray-600 mb-6">
                {activeTab === 'received'
                  ? "You haven't received any feedback yet."
                  : activeTab === 'drafts'
                  ? "You don't have any draft feedback yet."
                  : "You haven't given any feedback yet."}
              </p>
              {onGiveFeedback && (
                <Button onClick={onGiveFeedback}>Give Feedback</Button>
              )}
            </Card>
          ) : (
            visibleFeedbackList.map((feedback) => (
              <Card
                key={feedback.id}
                className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => onSelectFeedback?.(feedback)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge color={getStatusColor(feedback.status)}>
                        {feedback.status?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                      {/* Type badge removed - single feedback type (Manager Review) */}
                      {feedback.content?.confidential && (
                        <Badge color="gray">Confidential</Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>
                          {activeTab === 'received' ? 'From: ' : 'To: '}
                          <HighlightText
                            text={activeTab === 'received'
                              ? (feedback.fromUser?.name || feedback.fromUserEmail || feedback.fromUserId || '')
                              : (feedback.toUser?.name || feedback.toUserEmail || feedback.toUserId || '')}
                            highlight={searchQuery}
                          />
                        </span>
                      </div>

                      {feedback.cycle && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>Cycle: {feedback.cycle.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(feedback.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {feedback.content?.overallComment && (
                      <div className="mt-3">
                        <p className={`text-gray-700 ${
                          expandedCards[feedback.id] ? '' : 'line-clamp-3'
                        }`}>
                          <HighlightText 
                            text={feedback.content.overallComment} 
                            highlight={searchQuery}
                          />
                        </p>
                        {isLongContent(feedback.content.overallComment) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setExpandedCards(prev => ({
                                ...prev,
                                [feedback.id]: !prev[feedback.id]
                              }));
                            }}
                            className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1 transition-colors relative z-10"
                          >
                            {expandedCards[feedback.id] ? (
                              <>
                                Show less
                                <ChevronUp className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                Read more
                                <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-6 mt-4">
                      {feedback.comments && feedback.comments.length > 0 && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">{feedback.comments.length}</span>
                        </div>
                      )}
                      {feedback.goals && feedback.goals.length > 0 && (
                        <span className="text-sm text-gray-600">
                          {feedback.goals.length} goal{feedback.goals.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Draft Actions */}
                    {feedback.status === FeedbackStatus.DRAFT && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDraft(feedback);
                          }}
                          icon={Edit}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDraft(feedback.id);
                          }}
                          icon={Trash2}
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Eye}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFeedback?.(feedback);
                    }}
                  >
                    View
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && visibleFeedbackList.length > 0 && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

