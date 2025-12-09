// Feedback Page - Main Entry Point

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FeedbackList } from '../../components/feedback/FeedbackList';
import { GiveFeedback } from '../../components/feedback/GiveFeedback';
import { FeedbackDetail } from '../../components/feedback/FeedbackDetail';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { useAuthStore } from '../../stores/authStore';
import { Feedback } from '../../types/feedback.types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MessageSquare, TrendingUp, Users } from 'lucide-react';

export default function FeedbackPage() {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'give' | 'detail'>('list');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const { feedbackStats, fetchFeedbackStats } = useFeedbackStore();
  const { user } = useAuthStore();

  // Get initial tab from URL query parameter
  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam === 'given' || tabParam === 'received' || tabParam === 'drafts') 
    ? tabParam 
    : 'all';

  // Get current user from auth store
  const currentUserId = user?.id;
  const currentUserEmail = user?.email;

  useEffect(() => {
    if (currentUserId) {
      fetchFeedbackStats(currentUserId);
    }
  }, [fetchFeedbackStats, currentUserId]);

  // Don't render if user is not authenticated
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please log in to view feedback</h2>
        </div>
      </div>
    );
  }

  const handleSelectFeedback = (feedback: Feedback, editMode = false) => {
    setSelectedFeedback(feedback);
    setView('detail');
    // Store edit mode in the feedback object for now (we'll pass it as a prop later)
    if (editMode) {
      (feedback as any).openInEditMode = true;
    }
  };

  const handleGiveFeedback = () => {
    setView('give');
  };

  const handleCloseFeedbackForm = () => {
    setView('list');
  };

  const handleCloseFeedbackDetail = () => {
    setSelectedFeedback(null);
    setView('list');
  };

  const handleFeedbackSuccess = () => {
    setView('list');
    fetchFeedbackStats(currentUserId);
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      {view === 'list' && (
        <>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
            <p className="text-gray-600">Give and receive performance feedback</p>
          </div>

          {/* Stats Cards */}
          {feedbackStats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Given</p>
                    <p className="text-2xl font-bold text-gray-900">{feedbackStats.given}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-blue-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Received</p>
                    <p className="text-2xl font-bold text-gray-900">{feedbackStats.received}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-500" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{feedbackStats.pending}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-yellow-500" />
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Content Area */}
      <div>
        {view === 'list' && (
          <FeedbackList
            onSelectFeedback={handleSelectFeedback}
            onGiveFeedback={handleGiveFeedback}
            userId={currentUserEmail}
            showFilters={true}
            initialTab={initialTab}
          />
        )}

        {view === 'give' && (
          <GiveFeedback
            onClose={handleCloseFeedbackForm}
            onSuccess={handleFeedbackSuccess}
          />
        )}

        {view === 'detail' && selectedFeedback && (
          <FeedbackDetail
            feedbackId={selectedFeedback.id}
            onClose={handleCloseFeedbackDetail}
            currentUserId={currentUserId}
            openInEditMode={(selectedFeedback as any).openInEditMode || false}
          />
        )}
      </div>
    </div>
  );
}
