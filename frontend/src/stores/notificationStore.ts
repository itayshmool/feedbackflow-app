// frontend/src/stores/notificationStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notificationService } from '../services/notification.service';
import {
  Notification,
  NotificationStats,
  NotificationFilters,
  CreateNotificationRequest,
  NotificationType,
  NotificationPriority
} from '../types/notification.types';

interface NotificationState {
  notifications: Notification[];
  stats: NotificationStats | null;
  isLoading: boolean;
  isMarkingAsRead: boolean;
  error: string | null;
  lastFetched: number | null;
  
  // Actions
  fetchNotifications: (filters?: NotificationFilters) => Promise<void>;
  fetchStats: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  createNotification: (notification: CreateNotificationRequest) => Promise<void>;
  clearError: () => void;
  refreshNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      stats: null,
      isLoading: false,
      isMarkingAsRead: false,
      error: null,
      lastFetched: null,

      fetchNotifications: async (filters: NotificationFilters = {}) => {
        set({ isLoading: true, error: null });
        try {
          const response = await notificationService.getNotifications(filters);
          set({
            notifications: response.data,
            lastFetched: Date.now(),
            isLoading: false,
          });
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
          });
        }
      },

      fetchStats: async () => {
        try {
          const response = await notificationService.getNotificationStats();
          set({ stats: response.data });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      markAsRead: async (notificationId: string) => {
        set({ isMarkingAsRead: true, error: null });
        try {
          await notificationService.markAsRead(notificationId);
          
          // Update local state
          const { notifications, stats } = get();
          const updatedNotifications = notifications.map(notification =>
            notification.id === notificationId
              ? { ...notification, isRead: true, updatedAt: new Date().toISOString() }
              : notification
          );
          
          // Update stats
          const updatedStats = stats ? {
            ...stats,
            unread: Math.max(0, stats.unread - 1),
            read: stats.read + 1
          } : null;
          
          set({
            notifications: updatedNotifications,
            stats: updatedStats,
            isMarkingAsRead: false,
          });
        } catch (error: any) {
          set({
            error: error.message,
            isMarkingAsRead: false,
          });
        }
      },

      markAllAsRead: async () => {
        set({ isMarkingAsRead: true, error: null });
        try {
          const response = await notificationService.markAllAsRead();
          
          // Update local state
          const { notifications, stats } = get();
          const updatedNotifications = notifications.map(notification => ({
            ...notification,
            isRead: true,
            updatedAt: new Date().toISOString()
          }));
          
          // Update stats
          const updatedStats = stats ? {
            ...stats,
            unread: 0,
            read: stats.total
          } : null;
          
          set({
            notifications: updatedNotifications,
            stats: updatedStats,
            isMarkingAsRead: false,
          });
        } catch (error: any) {
          set({
            error: error.message,
            isMarkingAsRead: false,
          });
        }
      },

      deleteNotification: async (notificationId: string) => {
        try {
          await notificationService.deleteNotification(notificationId);
          
          // Update local state
          const { notifications, stats } = get();
          const deletedNotification = notifications.find(n => n.id === notificationId);
          const updatedNotifications = notifications.filter(n => n.id !== notificationId);
          
          // Update stats
          const updatedStats = stats && deletedNotification ? {
            ...stats,
            total: stats.total - 1,
            unread: deletedNotification.isRead ? stats.unread : Math.max(0, stats.unread - 1),
            read: deletedNotification.isRead ? Math.max(0, stats.read - 1) : stats.read
          } : stats;
          
          set({
            notifications: updatedNotifications,
            stats: updatedStats,
          });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      createNotification: async (notification: CreateNotificationRequest) => {
        try {
          const response = await notificationService.createNotification(notification);
          
          // Add to local state
          const { notifications, stats } = get();
          const updatedNotifications = [response.data, ...notifications];
          
          // Update stats
          const updatedStats = stats ? {
            ...stats,
            total: stats.total + 1,
            unread: stats.unread + 1
          } : null;
          
          set({
            notifications: updatedNotifications,
            stats: updatedStats,
          });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      refreshNotifications: async () => {
        const { fetchNotifications, fetchStats } = get();
        await Promise.all([
          fetchNotifications(),
          fetchStats()
        ]);
      },
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        notifications: state.notifications,
        stats: state.stats,
        lastFetched: state.lastFetched,
      }),
    }
  )
);
