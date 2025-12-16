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
  BellRing,
  Inbox,
  CheckCircle2
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-base sm:text-lg text-gray-600 mt-1">Stay updated with your feedback activities</p>
        </div>

        {/* Stats Cards - Gradient Design */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
            <Card className="bg-gradient-to-br from-gray-600 to-gray-700 border-0 shadow-lg">
              <div className="p-3 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl w-fit">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs sm:text-sm font-medium text-gray-200">Total</p>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-lg">
              <div className="p-3 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl w-fit">
                    <BellRing className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{stats.unread}</p>
                    <p className="text-xs sm:text-sm font-medium text-blue-100">Unread</p>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 shadow-lg">
              <div className="p-3 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 bg-white/20 rounded-xl w-fit">
                    <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{stats.read}</p>
                    <p className="text-xs sm:text-sm font-medium text-emerald-100">Read</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filter & Actions Bar */}
        <Card className="bg-white/50 backdrop-blur-sm border border-gray-200 shadow-lg mb-6">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-500" />
              <Select
                value={showRead === undefined ? '' : showRead.toString()}
                onChange={(e) => setShowRead(e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-32 sm:w-36"
              >
                <option value="">All</option>
                <option value="false">Unread</option>
                <option value="true">Read</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex-1 sm:flex-none min-h-[40px]"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              {stats && stats.unread > 0 && (
                <Button
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAsRead}
                  className="flex-1 sm:flex-none min-h-[40px] bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                >
                  {isMarkingAsRead ? (
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  <span className="hidden sm:inline">Mark All Read</span>
                  <span className="sm:hidden">Read All</span>
                </Button>
              )}
            </div>
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
          <div className="flex flex-col items-center justify-center py-16">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <Card className="bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
            <div className="p-12 sm:p-16 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-600 text-sm sm:text-base max-w-sm mx-auto">
                {showRead === false 
                  ? "You're all caught up! No unread notifications." 
                  : "Check back later for updates on your feedback activities."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-all duration-200 hover:shadow-lg ${
                  !notification.isRead 
                    ? 'bg-gradient-to-r from-blue-50 to-white border-l-4 border-l-blue-500 border-blue-200' 
                    : 'bg-white/80 backdrop-blur-sm border border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-4 sm:p-5">
                  <NotificationItem
                    notification={notification}
                    icon={getNotificationIcon(notification.type)}
                  />
                </div>
              </Card>
            ))}
            
            {/* Load More Button */}
            {notifications.length >= (filters.limit || 20) && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="min-h-[44px] hover:bg-gray-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
