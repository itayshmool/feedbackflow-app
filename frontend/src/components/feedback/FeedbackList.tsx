// Feedback List Component

import React, { useState, useEffect } from 'react';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { Feedback, FeedbackStatus, ReviewType, FeedbackFilters } from '../../types/feedback.types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { MessageSquare, Calendar, User, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';

interface FeedbackListProps {
  onSelectFeedback?: (feedback: Feedback, editMode?: boolean) => void;
  onGiveFeedback?: () => void;
  userId?: string;
  showFilters?: boolean;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  onSelectFeedback,
  onGiveFeedback,
  userId,
  showFilters = true,
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

  const [activeTab, setActiveTab] = useState<'received' | 'given' | 'all' | 'drafts'>('received');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<ReviewType | ''>('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    loadFeedback();
    if (userId) {
      fetchFeedbackStats(userId);
    }
  }, [activeTab, userId, fetchFeedbackStats]);

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
      }
    }
    
    if (statusFilter) {
      newFilters.status = statusFilter;
    }
    
    if (typeFilter) {
      newFilters.reviewType = typeFilter;
    }
    
    if (searchQuery) {
      newFilters.search = searchQuery;
    }

    fetchFeedbackList(newFilters, pagination.page, pagination.limit);
  };

  const handleSearch = () => {
    loadFeedback();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setTypeFilter('');
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

  const getTypeLabel = (type: ReviewType): string => {
    const labels: Record<ReviewType, string> = {
      [ReviewType.SELF_ASSESSMENT]: 'Self Assessment',
      [ReviewType.MANAGER_REVIEW]: 'Manager Review',
      [ReviewType.PEER_REVIEW]: 'Peer Review',
      [ReviewType.UPWARD_REVIEW]: 'Upward Review',
      [ReviewType.THREE_SIXTY_REVIEW]: '360° Review',
      [ReviewType.PROJECT_REVIEW]: 'Project Review',
    };
    return labels[type] || type;
  };

  // Show all feedback types (no filtering by reviewType)
  // Note: Backend returns "manager", "peer", etc. (not "manager_review", "peer_review")
  const visibleFeedbackList = feedbackList;

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Feedback</h2>
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

      {/* Tabs */}
      {userId && (
        <div className="flex gap-2 border-b">
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
            All ({visibleFeedbackList.length})
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && showFilterPanel && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search"
              placeholder="Search feedback..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FeedbackStatus)}
            >
              <option value="">All Statuses</option>
              <option value={FeedbackStatus.DRAFT}>Draft</option>
              <option value={FeedbackStatus.SUBMITTED}>Submitted</option>
              <option value={FeedbackStatus.UNDER_REVIEW}>Under Review</option>
              <option value={FeedbackStatus.COMPLETED}>Completed</option>
              <option value={FeedbackStatus.ACKNOWLEDGED}>Acknowledged</option>
              <option value={FeedbackStatus.ARCHIVED}>Archived</option>
            </Select>
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ReviewType)}
            >
              <option value="">All Types</option>
              <option value={ReviewType.MANAGER_REVIEW}>Manager Review</option>
              <option value={ReviewType.PROJECT_REVIEW}>Project Review</option>
            </Select>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch}>Apply Filters</Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
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
                      <Badge color="blue">{getTypeLabel(feedback.reviewType)}</Badge>
                      {feedback.content?.confidential && (
                        <Badge color="gray">Confidential</Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>
                          {activeTab === 'received' ? 'From: ' : 'To: '}
                          {activeTab === 'received'
                            ? feedback.fromUser?.name || feedback.fromUserEmail || feedback.fromUserId
                            : feedback.toUser?.name || feedback.toUserEmail || feedback.toUserId}
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
                      <p className="mt-3 text-gray-700 line-clamp-2">
                        {feedback.content.overallComment}
                      </p>
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
              onClick={() => fetchFeedbackList(filters, pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchFeedbackList(filters, pagination.page + 1)}
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

