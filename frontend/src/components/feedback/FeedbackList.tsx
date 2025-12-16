// Feedback List Component

import React, { useState, useEffect, useCallback } from 'react';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { useCyclesStore } from '../../stores/cyclesStore';
import { Feedback, FeedbackStatus, FeedbackFilters } from '../../types/feedback.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { HighlightText } from '../ui/HighlightText';
import { MessageSquare, Calendar, User, Filter, Download, Eye, Edit, Trash2, RotateCcw, Search, X, ChevronDown, ChevronUp, ChevronRight, FileText, Target } from 'lucide-react';

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
      {/* Header with Search - Modern Glass Design */}
      <div className="flex flex-col gap-4">
        {/* Search and Actions Row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          {/* Search Bar - Enhanced Design */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search feedback by name or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-11 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <div className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {showFilters && (
              <Button
                variant="outline"
                onClick={() => setShowFilterPanel(!showFilterPanel)}
                className={`rounded-lg sm:rounded-xl transition-all duration-200 min-h-[44px] min-w-[44px] ${showFilterPanel ? 'bg-gray-100 border-gray-300' : ''}`}
                icon={Filter}
              >
                <span className="hidden sm:inline">Filters</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleExport} 
              icon={Download}
              className="rounded-lg sm:rounded-xl min-h-[44px] min-w-[44px]"
            >
              <span className="hidden sm:inline">Export</span>
            </Button>
            {onGiveFeedback && (
              <Button 
                onClick={onGiveFeedback}
                className="rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 min-h-[44px] text-sm sm:text-base"
              >
                <span className="hidden sm:inline">Give Feedback</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Pill Tabs - Mobile Optimized */}
      {userId && (
        <div className="bg-gray-100/80 p-1 rounded-xl inline-flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide max-w-full">
          {isManager ? (
            // Manager tabs: Received, Given, Drafts, All
            <>
              <button
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                  activeTab === 'received'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('received')}
              >
                <span className="hidden sm:inline">Received</span>
                <span className="sm:hidden">In</span>
                <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === 'received' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {feedbackStats?.received || 0}
                </span>
              </button>
              <button
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                  activeTab === 'given'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('given')}
              >
                <span className="hidden sm:inline">Given</span>
                <span className="sm:hidden">Out</span>
                <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === 'given' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {feedbackStats?.given || 0}
                </span>
              </button>
              <button
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                  activeTab === 'drafts'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('drafts')}
              >
                Drafts
                <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === 'drafts' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {feedbackStats?.drafts || 0}
                </span>
              </button>
              <button
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                  activeTab === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('all')}
              >
                All
                <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {(feedbackStats?.given || 0) + (feedbackStats?.received || 0) + (feedbackStats?.drafts || 0)}
                </span>
              </button>
            </>
          ) : (
            // Employee tabs: Waiting for Acknowledgement, Acknowledged, All Received
            <>
              <button
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                  activeTab === 'waiting'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('waiting')}
              >
                <span className="hidden sm:inline">Waiting</span>
                <span className="sm:hidden">New</span>
                <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === 'waiting' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {feedbackStats?.pending || 0}
                </span>
              </button>
              <button
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                  activeTab === 'acknowledged'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('acknowledged')}
              >
                <span className="hidden sm:inline">Acknowledged</span>
                <span className="sm:hidden">Done</span>
                <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === 'acknowledged' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {feedbackStats?.acknowledged || 0}
                </span>
              </button>
              <button
                className={`px-2.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all duration-200 min-h-[40px] ${
                  activeTab === 'received'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
                onClick={() => setActiveTab('received')}
              >
                All
                <span className={`ml-1 sm:ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                  activeTab === 'received' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {feedbackStats?.received || 0}
                </span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Filter Panel - Modern Glass Design */}
      {showFilters && showFilterPanel && (
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm">
          {(() => {
            const showColorFilter = isManager && (activeTab === 'given' || activeTab === 'drafts');
            const showStatusFilter = isManager;
            const showDraftStatus = isManager && activeTab !== 'received';
            
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
                {showStatusFilter && (
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus)}
                  >
                    <option value="">All Statuses</option>
                    {showDraftStatus && (
                      <option value={FeedbackStatus.DRAFT}>Draft</option>
                    )}
                    <option value={FeedbackStatus.SUBMITTED}>Submitted</option>
                    <option value={FeedbackStatus.COMPLETED}>Completed</option>
                  </Select>
                )}
                {showColorFilter && (
                  <Select
                    label="Performance"
                    value={colorFilter}
                    onChange={(e) => setColorFilter(e.target.value)}
                  >
                    <option value="">All Levels</option>
                    <option value="green">🟢 Exceeds Expectations</option>
                    <option value="yellow">🟡 Meets Expectations</option>
                    <option value="red">🔴 Needs Improvement</option>
                  </Select>
                )}
              </div>
            );
          })()}
          {(cycleFilter || (isManager && statusFilter) || (isManager && (activeTab === 'given' || activeTab === 'drafts') && colorFilter)) && (
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters} 
                icon={RotateCcw}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Feedback List */}
      {!isLoading && (
        <div className="space-y-2 sm:space-y-3">
          {visibleFeedbackList.length === 0 ? (
            /* Modern Empty State - Mobile Optimized */
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
              <div className="absolute inset-0 bg-grid-pattern opacity-5" />
              <div className="relative">
                <div className="mx-auto w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-blue-500/20">
                  <FileText className="w-7 h-7 sm:w-10 sm:h-10 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No feedback found</h3>
                <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8 max-w-sm mx-auto">
                  {activeTab === 'received'
                    ? "You haven't received any feedback yet."
                    : activeTab === 'drafts'
                    ? "You don't have any drafts yet."
                    : activeTab === 'waiting'
                    ? "No feedback waiting. You're all caught up!"
                    : "You haven't given any feedback yet."}
                </p>
                {onGiveFeedback && (
                  <Button 
                    onClick={onGiveFeedback}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25"
                  >
                    Give Feedback
                  </Button>
                )}
              </div>
            </div>
          ) : (
            visibleFeedbackList.map((feedback) => {
              // Determine border color based on status
              const borderColor = feedback.status === FeedbackStatus.DRAFT 
                ? 'border-l-gray-400' 
                : feedback.status === FeedbackStatus.SUBMITTED || feedback.status === FeedbackStatus.UNDER_REVIEW
                ? 'border-l-amber-400'
                : feedback.status === FeedbackStatus.COMPLETED || feedback.status === FeedbackStatus.ACKNOWLEDGED
                ? 'border-l-emerald-400'
                : 'border-l-blue-400';

              return (
                <div
                  key={feedback.id}
                  className={`group bg-white rounded-lg sm:rounded-xl border border-gray-200 border-l-4 ${borderColor} p-4 sm:p-5 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer active:bg-gray-50`}
                  onClick={() => onSelectFeedback?.(feedback)}
                >
                  <div className="flex items-start justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Header Row */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                        <Badge 
                          color={getStatusColor(feedback.status)}
                          className="capitalize text-xs"
                        >
                          {feedback.status?.replace('_', ' ') || 'Unknown'}
                        </Badge>
                        {feedback.content?.confidential && (
                          <Badge color="gray" className="bg-gray-100 text-gray-600 text-xs">
                            🔒
                          </Badge>
                        )}
                      </div>

                      {/* User & Meta Info */}
                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-x-4 sm:gap-y-1 text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span className="font-medium text-gray-700 truncate">
                            <HighlightText
                              text={activeTab === 'received'
                                ? (feedback.fromUser?.name || feedback.fromUserEmail || feedback.fromUserId || '')
                                : (feedback.toUser?.name || feedback.toUserEmail || feedback.toUserId || '')}
                              highlight={searchQuery}
                            />
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:gap-4 text-gray-400">
                          {feedback.cycle && (
                            <span className="truncate max-w-[120px] sm:max-w-none">{feedback.cycle.name}</span>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>{new Date(feedback.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content Preview */}
                      {feedback.content?.overallComment && (
                        <div className="mt-1.5 sm:mt-2">
                          <p className={`text-gray-600 text-xs sm:text-sm leading-relaxed ${
                            expandedCards[feedback.id] ? '' : 'line-clamp-2'
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
                              className="mt-1.5 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors min-h-[32px] sm:min-h-0"
                            >
                              {expandedCards[feedback.id] ? (
                                <>Show less <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></>
                              ) : (
                                <>Read more <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Meta Badges */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-3">
                        {feedback.comments && feedback.comments.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>{feedback.comments.length}</span>
                          </div>
                        )}
                        {feedback.goals && feedback.goals.length > 0 && (
                          <div className="flex items-center gap-1 text-gray-400 text-xs">
                            <Target className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>{feedback.goals.length} goal{feedback.goals.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Draft Actions */}
                      {feedback.status === FeedbackStatus.DRAFT && (
                        <div className="flex gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditDraft(feedback);
                            }}
                            icon={Edit}
                            className="rounded-lg min-h-[40px] text-xs sm:text-sm"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDraft(feedback.id);
                            }}
                            icon={Trash2}
                            className="rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 min-h-[40px] text-xs sm:text-sm"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Mobile: Tap hint | Desktop: View button on hover */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="sm:hidden text-xs text-gray-400 flex items-center gap-1">
                        Tap to view
                        <ChevronRight className="w-3 h-3" />
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Eye}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFeedback?.(feedback);
                        }}
                        className="hidden sm:flex rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Pagination - Modern Design */}
      {!isLoading && visibleFeedbackList.length > 0 && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-700">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
            <span className="font-medium text-gray-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
            <span className="font-medium text-gray-700">{pagination.total}</span> results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="rounded-lg"
            >
              ← Previous
            </Button>
            <span className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
              className="rounded-lg"
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

