// Feedback Store

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { feedbackService } from '../services/feedback.service';
import { extractErrorMessage } from '../lib/errorUtils';
import {
  Feedback,
  FeedbackFilters,
  FeedbackSummary,
  FeedbackStats,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  CreateCommentRequest,
  AcknowledgeFeedbackRequest,
} from '../types/feedback.types';

interface FeedbackState {
  // Data
  feedbackList: Feedback[];
  currentFeedback: Feedback | null;
  feedbackSummary: FeedbackSummary | null;
  feedbackStats: FeedbackStats | null;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isSubmitting: boolean;

  // Error states
  error: string | null;
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;

  // Pagination
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  // Filters
  filters: FeedbackFilters;

  // Actions
  fetchFeedbackList: (filters?: FeedbackFilters, page?: number, limit?: number) => Promise<void>;
  fetchFeedbackById: (id: string) => Promise<void>;
  createFeedback: (data: CreateFeedbackRequest) => Promise<Feedback | null>;
  updateFeedback: (id: string, data: UpdateFeedbackRequest) => Promise<Feedback | null>;
  deleteFeedback: (id: string) => Promise<boolean>;
  submitFeedback: (id: string) => Promise<Feedback | null>;
  completeFeedback: (id: string) => Promise<Feedback | null>;
  acknowledgeFeedback: (id: string, message: string) => Promise<Feedback | null>;
  addComment: (feedbackId: string, data: CreateCommentRequest) => Promise<void>;
  deleteComment: (feedbackId: string, commentId: string) => Promise<void>;
  fetchFeedbackSummary: (userId?: string) => Promise<void>;
  fetchFeedbackStats: (userId?: string) => Promise<void>;
  exportFeedback: (filters?: FeedbackFilters) => Promise<Blob | null>;

  // UI Actions
  setFilters: (filters: FeedbackFilters) => void;
  clearFilters: () => void;
  clearErrors: () => void;
  clearCurrentFeedback: () => void;
}

export const useFeedbackStore = create<FeedbackState>()(
  devtools(
    (set, get) => ({
      // Initial state
      feedbackList: [],
      currentFeedback: null,
      feedbackSummary: null,
      feedbackStats: null,

      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isSubmitting: false,

      error: null,
      createError: null,
      updateError: null,
      deleteError: null,

      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },

      filters: {},

      // Actions
      fetchFeedbackList: async (filters = {}, page = 1, limit = 20) => {
        set({ isLoading: true, error: null });
        try {
          const response = await feedbackService.getFeedbackList(filters, page, limit);
          // response is FeedbackListResponse: { data: Feedback[], pagination: {...} }
          set({
            feedbackList: response.data || [],  // Extract the feedback array
            pagination: response.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 },
            filters,
            isLoading: false,
          });
        } catch (error) {
          set({
            feedbackList: [],
            error: extractErrorMessage(error, 'Failed to fetch feedback'),
            isLoading: false,
          });
        }
      },

      fetchFeedbackById: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          const feedback = await feedbackService.getFeedbackById(id);
          set({
            currentFeedback: feedback,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch feedback',
            isLoading: false,
          });
        }
      },

      createFeedback: async (data: CreateFeedbackRequest) => {
        set({ isCreating: true, createError: null });
        try {
          const feedback = await feedbackService.createFeedback(data);
          const currentList = get().feedbackList;
          set({
            feedbackList: Array.isArray(currentList) ? [feedback, ...currentList] : [feedback],
            isCreating: false,
          });
          return feedback;
        } catch (error: any) {
          // Extract user-friendly error message from axios response
          const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create feedback';
          set({
            createError: errorMessage,
            isCreating: false,
          });
          return null;
        }
      },

      updateFeedback: async (id: string, data: UpdateFeedbackRequest) => {
        set({ isUpdating: true, updateError: null });
        try {
          const feedback = await feedbackService.updateFeedback(id, data);
          set({
            feedbackList: get().feedbackList.map((f) => (f.id === id ? feedback : f)),
            currentFeedback: get().currentFeedback?.id === id ? feedback : get().currentFeedback,
            isUpdating: false,
          });
          return feedback;
        } catch (error: any) {
          // Extract user-friendly error message from axios response
          const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update feedback';
          set({
            updateError: errorMessage,
            isUpdating: false,
          });
          return null;
        }
      },

      deleteFeedback: async (id: string) => {
        set({ isDeleting: true, deleteError: null });
        try {
          await feedbackService.deleteFeedback(id);
          set({
            feedbackList: get().feedbackList.filter((f) => f.id !== id),
            currentFeedback: get().currentFeedback?.id === id ? null : get().currentFeedback,
            isDeleting: false,
          });
          return true;
        } catch (error: any) {
          // Extract user-friendly error message from axios response
          const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete feedback';
          set({
            deleteError: errorMessage,
            isDeleting: false,
          });
          return false;
        }
      },

      submitFeedback: async (id: string) => {
        set({ isSubmitting: true, error: null });
        try {
          const feedback = await feedbackService.submitFeedback(id);
          set({
            feedbackList: get().feedbackList.map((f) => (f.id === id ? feedback : f)),
            currentFeedback: get().currentFeedback?.id === id ? feedback : get().currentFeedback,
            isSubmitting: false,
          });
          return feedback;
        } catch (error: any) {
          // Extract user-friendly error message from axios response
          const errorMessage = error?.response?.data?.error || error?.message || 'Failed to submit feedback';
          set({
            error: errorMessage,
            isSubmitting: false,
          });
          return null;
        }
      },

      completeFeedback: async (id: string) => {
        set({ isUpdating: true, updateError: null });
        try {
          const feedback = await feedbackService.completeFeedback(id);
          set({
            feedbackList: get().feedbackList.map((f) => (f.id === id ? feedback : f)),
            currentFeedback: get().currentFeedback?.id === id ? feedback : get().currentFeedback,
            isUpdating: false,
          });
          return feedback;
        } catch (error: any) {
          // Extract user-friendly error message from axios response
          const errorMessage = error?.response?.data?.error || error?.message || 'Failed to complete feedback';
          set({
            updateError: errorMessage,
            isUpdating: false,
          });
          return null;
        }
      },

      acknowledgeFeedback: async (id: string, message: string) => {
        set({ isUpdating: true, updateError: null });
        try {
          const feedback = await feedbackService.acknowledgeFeedback(id, { response: message });
          set({
            feedbackList: get().feedbackList.map((f) => (f.id === id ? feedback : f)),
            currentFeedback: get().currentFeedback?.id === id ? feedback : get().currentFeedback,
            isUpdating: false,
          });
          return feedback;
        } catch (error: any) {
          // Extract user-friendly error message from axios response
          const errorMessage = error?.response?.data?.error || error?.message || 'Failed to acknowledge feedback';
          set({
            updateError: errorMessage,
            isUpdating: false,
          });
          return null;
        }
      },

      addComment: async (feedbackId: string, data: CreateCommentRequest) => {
        try {
          await feedbackService.addComment(feedbackId, data);
          // Refresh the feedback to get updated comments
          if (get().currentFeedback?.id === feedbackId) {
            await get().fetchFeedbackById(feedbackId);
          }
        } catch (error) {
          set({
            error: extractErrorMessage(error, 'Failed to add comment'),
          });
        }
      },

      deleteComment: async (feedbackId: string, commentId: string) => {
        try {
          await feedbackService.deleteComment(feedbackId, commentId);
          // Refresh the feedback to get updated comments
          if (get().currentFeedback?.id === feedbackId) {
            await get().fetchFeedbackById(feedbackId);
          }
        } catch (error) {
          set({
            error: extractErrorMessage(error, 'Failed to delete comment'),
          });
        }
      },

      fetchFeedbackSummary: async (userId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const summary = await feedbackService.getFeedbackSummary(userId);
          set({
            feedbackSummary: summary,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch feedback summary',
            isLoading: false,
          });
        }
      },

      fetchFeedbackStats: async (userId?: string) => {
        try {
          const stats = await feedbackService.getFeedbackStats(userId);
          set({ feedbackStats: stats });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch feedback stats',
          });
        }
      },

      exportFeedback: async (filters?: FeedbackFilters) => {
        try {
          const blob = await feedbackService.exportFeedback(filters);
          return blob;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to export feedback',
          });
          return null;
        }
      },

      // UI Actions
      setFilters: (filters: FeedbackFilters) => {
        set({ filters });
      },

      clearFilters: () => {
        set({ filters: {} });
      },

      clearErrors: () => {
        set({
          error: null,
          createError: null,
          updateError: null,
          deleteError: null,
        });
      },

      clearCurrentFeedback: () => {
        set({ currentFeedback: null });
      },
    }),
    { name: 'FeedbackStore' }
  )
);

