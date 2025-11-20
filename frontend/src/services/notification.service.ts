// frontend/src/services/notification.service.ts

import { api } from '../lib/api';
import type { AxiosRequestConfig } from 'axios';
import {
  NotificationFilters,
  CreateNotificationRequest,
  NotificationListResponse,
  NotificationStatsResponse,
  NotificationResponse
} from '../types/notification.types';
import { useAuthStore } from '../stores/authStore';

class NotificationService {
  private getUserEmail(): string {
    const user = useAuthStore.getState().user;
    if (!user?.email) {
      throw new Error('User not authenticated');
    }
    return user.email;
  }

  private async makeRequest<T>(endpoint: string, options: AxiosRequestConfig = {}): Promise<T> {
    try {
      const response = await api({
        url: endpoint,
        method: options.method || 'GET',
        ...options,
      });
      return response.data;
    } catch (error: any) {
      console.error('Notification service error:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch notifications');
    }
  }

  async getNotifications(filters: NotificationFilters = {}): Promise<NotificationListResponse> {
    const params = new URLSearchParams();
    
    if (filters.isRead !== undefined) {
      params.append('isRead', filters.isRead.toString());
    }
    if (filters.type) {
      params.append('type', filters.type);
    }
    if (filters.priority) {
      params.append('priority', filters.priority);
    }
    if (filters.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters.offset) {
      params.append('offset', filters.offset.toString());
    }

    // Add authenticated user email for filtering
    params.append('userEmail', this.getUserEmail());

    return this.makeRequest<NotificationListResponse>(`/notifications?${params.toString()}`);
  }

  async getNotificationStats(): Promise<NotificationStatsResponse> {
    const userEmail = this.getUserEmail();
    return this.makeRequest<NotificationStatsResponse>(`/notifications/stats?userEmail=${encodeURIComponent(userEmail)}`);
  }

  async markAsRead(notificationId: string): Promise<NotificationResponse> {
    return this.makeRequest<NotificationResponse>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllAsRead(): Promise<{ success: boolean; data: { count: number } }> {
    return this.makeRequest<{ success: boolean; data: { count: number } }>('/notifications/read-all', {
      method: 'PUT',
      data: { userEmail: this.getUserEmail() },
    });
  }

  async deleteNotification(notificationId: string): Promise<{ success: boolean; data: { id: string } }> {
    return this.makeRequest<{ success: boolean; data: { id: string } }>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async createNotification(notification: CreateNotificationRequest): Promise<NotificationResponse> {
    return this.makeRequest<NotificationResponse>('/notifications', {
      method: 'POST',
      data: {
        ...notification,
        userEmail: notification.userEmail || this.getUserEmail(),
      },
    });
  }
}

export const notificationService = new NotificationService();
