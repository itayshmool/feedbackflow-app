// frontend/src/services/notification.service.ts

import axios from 'axios';
import {
  Notification,
  NotificationStats,
  NotificationFilters,
  CreateNotificationRequest,
  NotificationListResponse,
  NotificationStatsResponse,
  NotificationResponse
} from '../types/notification.types';

const API_BASE_URL = 'http://localhost:5000/api/v1';

class NotificationService {
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await axios({
        url: `${API_BASE_URL}${endpoint}`,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        data: options.body,
        params: options.params,
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

    // Add user email for filtering
    params.append('userEmail', 'admin@example.com');

    return this.makeRequest<NotificationListResponse>(`/notifications?${params.toString()}`);
  }

  async getNotificationStats(): Promise<NotificationStatsResponse> {
    return this.makeRequest<NotificationStatsResponse>('/notifications/stats?userEmail=admin@example.com');
  }

  async markAsRead(notificationId: string): Promise<NotificationResponse> {
    return this.makeRequest<NotificationResponse>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllAsRead(): Promise<{ success: boolean; data: { count: number } }> {
    return this.makeRequest<{ success: boolean; data: { count: number } }>('/notifications/read-all', {
      method: 'PUT',
      body: JSON.stringify({ userEmail: 'admin@example.com' }),
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
      body: JSON.stringify({
        ...notification,
        userEmail: notification.userEmail || 'admin@example.com',
      }),
    });
  }
}

export const notificationService = new NotificationService();
