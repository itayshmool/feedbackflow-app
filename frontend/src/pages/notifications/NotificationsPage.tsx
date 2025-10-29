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
  Trash2, 
  RefreshCw, 
  Filter,
  BellRing,
  AlertCircle,
  Info,
  CheckCircle
} from 'lucide-react';
import { NotificationType, NotificationPriority, NotificationFilters } from '../../types/notification.types';

export default function NotificationsPage() {
  const {
    notifications,
    stats,
    isLoading,
    isMarkingAsRead,
    error,
    fetchNotifications,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    clearError
  } = useNotificationStore();

  const [filters, setFilters] = useState<NotificationFilters>({
    limit: 20,
    offset: 0
  });
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [showRead, setShowRead] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const currentFilters = {
      ...filters,
      type: selectedType ? selectedType as NotificationType : undefined,
      priority: selectedPriority ? selectedPriority as NotificationPriority : undefined,
      isRead: showRead
    };
    fetchNotifications(currentFilters);
  }, [fetchNotifications, filters, selectedType, selectedPriority, showRead]);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-gray-400 bg-gray-50';
      default:
        return 'border-l-gray-400 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'medium':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'low':
        return <CheckCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BellRing className="w-8 h-8 text-blue-600" />
              Notifications
            </h1>
            <p className="text-gray-600 mt-2">Stay updated with your feedback activities</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              icon={isLoading ? LoadingSpinner : RefreshCw}
            >
              Refresh
            </Button>
            {stats && stats.unread > 0 && (
              <Button
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

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(stats.byPriority.high || 0) + (stats.byPriority.urgent || 0)}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <div className="flex items-center space-x-4">
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              placeholder="All Types"
              className="w-48"
            >
              <option value="">All Types</option>
              <option value="feedback_received">Feedback Received</option>
              <option value="feedback_reminder">Feedback Reminder</option>
              <option value="cycle_started">Cycle Started</option>
              <option value="cycle_ending">Cycle Ending</option>
              <option value="system_announcement">System Announcement</option>
              <option value="user_invited">User Invited</option>
              <option value="goal_assigned">Goal Assigned</option>
            </Select>
            
            <Select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              placeholder="All Priorities"
              className="w-48"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
            
            <Select
              value={showRead === undefined ? '' : showRead.toString()}
              onChange={(e) => setShowRead(e.target.value === '' ? undefined : e.target.value === 'true')}
              placeholder="All Status"
              className="w-32"
            >
              <option value="">All Status</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </Select>
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
              className={`p-6 border-l-4 ${getPriorityColor(notification.priority)} ${
                !notification.isRead ? 'ring-2 ring-blue-100' : ''
              }`}
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
