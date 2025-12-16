// Feedback Page - Main Entry Point

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FeedbackList } from '../../components/feedback/FeedbackList';
import { GiveFeedback } from '../../components/feedback/GiveFeedback';
import { FeedbackDetail } from '../../components/feedback/FeedbackDetail';
import { useFeedbackStore } from '../../stores/feedbackStore';
import { useAuthStore } from '../../stores/authStore';
import { Feedback } from '../../types/feedback.types';
import { Button } from '../../components/ui/Button';
import { Send, Inbox, Clock } from 'lucide-react';

export default function FeedbackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { feedbackStats, fetchFeedbackStats } = useFeedbackStore();
  const { user } = useAuthStore();

  // Get URL parameters
  const tabParam = searchParams.get('tab');
  const actionParam = searchParams.get('action');
  const viewParam = searchParams.get('view'); // For deep-linking to specific feedback
  const recipientEmail = searchParams.get('recipient');
  const recipientName = searchParams.get('name');
  const statusParam = searchParams.get('status'); // For filtering by status
  const colorFilterParam = searchParams.get('colorFilter'); // For filtering by color classification

  // Determine initial view based on action param or view param
  const initialView = actionParam === 'give' ? 'give' : viewParam ? 'detail' : 'list';
  
  const [view, setView] = useState<'list' | 'give' | 'detail'>(initialView);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    viewParam ? { id: viewParam } as Feedback : null
  );

  // Get current user from auth store
  const currentUserId = user?.id;
  const currentUserEmail = user?.email;
  const isManager = user?.roles?.includes('manager');

  // Get initial tab from URL query parameter
  // For managers: received, given, drafts, all
  // For employees: waiting, acknowledged, received
  const validManagerTabs = ['given', 'received', 'drafts', 'all'];
  const validEmployeeTabs = ['waiting', 'acknowledged', 'received'];
  const defaultTab = isManager ? 'all' : 'waiting';
  
  const initialTab = isManager 
    ? (validManagerTabs.includes(tabParam || '') ? tabParam : defaultTab)
    : (validEmployeeTabs.includes(tabParam || '') ? tabParam : defaultTab);

  useEffect(() => {
    if (currentUserId) {
      fetchFeedbackStats(currentUserId);
    }
  }, [fetchFeedbackStats, currentUserId]);

  // Don't render if user is not authenticated
  if (!user) {
    return (
      <div className="flex justify-center items-center py-20">
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
    // Clear action and recipient params when closing the form
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('action');
    newParams.delete('recipient');
    newParams.delete('name');
    setSearchParams(newParams);
    setView('list');
  };

  const handleCloseFeedbackDetail = () => {
    // Clear view param when closing detail
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('view');
    setSearchParams(newParams);
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
          {/* Page Header */}
          <div className="relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Feedback</h1>
                <p className="text-gray-500 mt-1">Give and receive performance feedback</p>
              </div>
            </div>
          </div>

          {/* Stats Cards - Modern Gradient Design */}
          {feedbackStats && (
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Given Card - Blue Theme */}
              <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-3 sm:p-5 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="order-2 sm:order-1">
                    <p className="text-xs sm:text-sm font-medium text-blue-100">Given</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{feedbackStats.given}</p>
                  </div>
                  <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                    <Send className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Received Card - Emerald Theme */}
              <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 sm:p-5 shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="order-2 sm:order-1">
                    <p className="text-xs sm:text-sm font-medium text-emerald-100">Received</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{feedbackStats.received}</p>
                  </div>
                  <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                    <Inbox className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Pending Card - Amber Theme */}
              <div className="group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 sm:p-5 shadow-lg shadow-amber-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="order-2 sm:order-1">
                    <p className="text-xs sm:text-sm font-medium text-amber-100">Pending</p>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{feedbackStats.pending}</p>
                  </div>
                  <div className="order-1 sm:order-2 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl bg-white/20 backdrop-blur-sm">
                    <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Content Area */}
      <div>
        {view === 'list' && (
          <FeedbackList
            onSelectFeedback={handleSelectFeedback}
            onGiveFeedback={isManager ? handleGiveFeedback : undefined}
            userId={currentUserEmail}
            showFilters={true}
            initialTab={initialTab as any}
            initialStatus={statusParam || undefined}
            initialColorFilter={colorFilterParam || undefined}
            isManager={!!isManager}
          />
        )}

        {view === 'give' && (
          <GiveFeedback
            onClose={handleCloseFeedbackForm}
            onSuccess={handleFeedbackSuccess}
            toUserEmail={recipientEmail || undefined}
            toUserName={recipientName || undefined}
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
