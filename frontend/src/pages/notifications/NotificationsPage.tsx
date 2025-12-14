// frontend/src/pages/notifications/NotificationsPage.tsx

import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import { NotificationItem } from '../../components/notifications/NotificationItem';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { 
  Bell, 
  Check, 
  RefreshCw, 
  Filter,
  BellRing
} from 'lucide-react';
import { NotificationType, NotificationFilters } from '../../types/notification.types';
// NotificationType still used for getNotificationIcon function

export default function NotificationsPage() {
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

  const [filters, setFilters] = useState<NotificationFilters>({
    limit: 20,
    offset: 0
  });
  const [showRead, setShowRead] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const currentFilters = {
      ...filters,
      isRead: showRead
    };
    fetchNotifications(currentFilters);
  }, [fetchNotifications, filters, showRead]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleRefresh = async () => {
    await refreshNotifications();
  };

  const handleLoadMore = () => {
    setFilters(prev => ({
      ...prev,
      offset: (prev.offset || 0) + (prev.limit || 20)
    }));
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header - Mobile responsive */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <BellRing className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              Notifications
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Stay updated with your feedback activities</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              icon={isLoading ? LoadingSpinner : RefreshCw}
              className="flex-1 sm:flex-none"
            >
              Refresh
            </Button>
            {stats && stats.unread > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAsRead}
                icon={isMarkingAsRead ? LoadingSpinner : Check}
                className="flex-1 sm:flex-none"
              >
                Mark All Read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Bell className="w-8 h-8 text-gray-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
              </div>
              <BellRing className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Read</p>
                <p className="text-2xl font-bold text-green-600">{stats.read}</p>
              </div>
              <Check className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filter */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <Select
            value={showRead === undefined ? '' : showRead.toString()}
            onChange={(e) => setShowRead(e.target.value === '' ? undefined : e.target.value === 'true')}
            className="w-36"
          >
            <option value="">All</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </Select>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              Dismiss
            </Button>
          </div>
        </Card>
      )}

      {/* Notifications List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications found</h3>
          <p className="text-gray-600">Try adjusting your filters or check back later for updates.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-6 ${!notification.isRead ? 'bg-blue-50 ring-2 ring-blue-100' : ''}`}
            >
              <NotificationItem
                notification={notification}
                icon={getNotificationIcon(notification.type)}
              />
            </Card>
          ))}
          
          {/* Load More Button */}
          {notifications.length >= (filters.limit || 20) && (
            <div className="text-center pt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoading}
                icon={isLoading ? LoadingSpinner : RefreshCw}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
