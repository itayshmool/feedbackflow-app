// Frontend Feedback Service

import api from '@/lib/api';
import {
  Feedback,
  FeedbackFilters,
  FeedbackListResponse,
  FeedbackSummary,
  FeedbackStats,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  CreateCommentRequest,
  AcknowledgeFeedbackRequest,
  ApiResponse,
} from '@/types/feedback.types';

class FeedbackService {
  private baseUrl = '/feedback';

  // Feedback CRUD
  async getFeedbackList(filters?: FeedbackFilters, page: number = 1, limit: number = 20): Promise<FeedbackListResponse> {
    const response = await api.get<ApiResponse<FeedbackListResponse>>(this.baseUrl, {
      params: { ...filters, page, limit },
    });
    return response.data.data;
  }

  async getFeedbackById(id: string): Promise<Feedback> {
    const response = await api.get<ApiResponse<Feedback>>(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  async createFeedback(data: CreateFeedbackRequest): Promise<Feedback> {
    const response = await api.post<ApiResponse<Feedback>>(this.baseUrl, data);
    return response.data.data;
  }

  async updateFeedback(id: string, data: UpdateFeedbackRequest): Promise<Feedback> {
    const response = await api.put<ApiResponse<Feedback>>(`${this.baseUrl}/${id}`, data);
    return response.data.data;
  }

  async deleteFeedback(id: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  async submitFeedback(id: string): Promise<Feedback> {
    const response = await api.post<ApiResponse<Feedback>>(`${this.baseUrl}/${id}/submit`);
    return response.data.data;
  }

  async completeFeedback(id: string): Promise<Feedback> {
    const response = await api.post<ApiResponse<Feedback>>(`${this.baseUrl}/${id}/complete`);
    return response.data.data;
  }

  async acknowledgeFeedback(id: string, data: AcknowledgeFeedbackRequest): Promise<Feedback> {
    const response = await api.post<ApiResponse<Feedback>>(`${this.baseUrl}/${id}/acknowledge`, data);
    return response.data.data;
  }

  // Comments
  async addComment(feedbackId: string, data: CreateCommentRequest): Promise<Comment> {
    const response = await api.post<ApiResponse<Comment>>(`${this.baseUrl}/${feedbackId}/comments`, data);
    return response.data.data;
  }

  async updateComment(feedbackId: string, commentId: string, content: string): Promise<Comment> {
    const response = await api.put<ApiResponse<Comment>>(
      `${this.baseUrl}/${feedbackId}/comments/${commentId}`,
      { content }
    );
    return response.data.data;
  }

  async deleteComment(feedbackId: string, commentId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/${feedbackId}/comments/${commentId}`);
  }

  // Statistics and Summary
  async getFeedbackSummary(userId?: string): Promise<FeedbackSummary> {
    const response = await api.get<ApiResponse<FeedbackSummary>>(`${this.baseUrl}/summary`, {
      params: { userId },
    });
    return response.data.data;
  }

  async getFeedbackStats(userId?: string): Promise<FeedbackStats> {
    const response = await api.get<ApiResponse<FeedbackStats>>(`${this.baseUrl}/stats`, {
      params: { userId },
    });
    return response.data.data;
  }

  // Export
  async exportFeedback(filters?: FeedbackFilters): Promise<Blob> {
    const response = await api.get(`${this.baseUrl}/export`, {
      params: filters,
      responseType: 'blob',
    });
    return response.data;
  }
}

export const feedbackService = new FeedbackService();

