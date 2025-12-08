// frontend/src/components/notifications/NotificationDropdown.tsx

import React, { useEffect, useRef } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import { NotificationItem } from './NotificationItem';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';
import { Check, Trash2, RefreshCw } from 'lucide-react';
import { NotificationType } from '../../types/notification.types';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    notifications,
    stats,
    isLoading,
    isMarkingAsRead,
    error,
    fetchNotifications,
    markAllAsRead,
    refreshNotifications,
    clearError
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications({ limit: 10 });
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRefresh = async () => {
    await refreshNotifications();
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.FEEDBACK_RECEIVED:
        return '📝';
      case NotificationType.FEEDBACK_REMINDER:
        return '⏰';
      case NotificationType.CYCLE_STARTED:
        return '🚀';
      case NotificationType.CYCLE_ENDING:
        return '⚠️';
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return '📢';
      case NotificationType.USER_INVITED:
        return '👤';
      case NotificationType.GOAL_ASSIGNED:
        return '🎯';
      default:
        return '🔔';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-gray-400';
      default:
        return 'border-l-gray-400';
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Notifications
            {stats && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({stats.unread} unread)
              </span>
            )}
          </h3>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              icon={isLoading ? LoadingSpinner : RefreshCw}
            >
              Refresh
            </Button>
            {stats && stats.unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAsRead}
                icon={isMarkingAsRead ? LoadingSpinner : Check}
              >
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-red-800 text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearError}
            className="mt-2 text-red-600 hover:text-red-800"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p>No notifications yet</p>
            <p className="text-sm">You'll see updates here when they arrive</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${getPriorityColor(notification.priority)} ${
                  !notification.isRead ? 'bg-blue-50' : ''
                }`}
              >
                <NotificationItem
                  notification={notification}
                  icon={getNotificationIcon(notification.type)}
                  onNavigate={onClose}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              // Navigate to full notifications page
              window.location.href = '/notifications';
            }}
            className="w-full"
          >
            View All Notifications
          </Button>
        </div>
      )}
    </div>
  );
};
