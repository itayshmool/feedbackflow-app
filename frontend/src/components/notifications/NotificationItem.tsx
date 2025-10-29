// frontend/src/components/notifications/NotificationItem.tsx

import React from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import { Notification } from '../../types/notification.types';
import { Button } from '../ui/Button';
import { Trash2, Check } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  icon: string;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, icon }) => {
  const { markAsRead, deleteNotification } = useNotificationStore();

  const handleMarkAsRead = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const handleDelete = async () => {
    await deleteNotification(notification.id);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>;
      case 'high':
        return <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>;
      case 'medium':
        return <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>;
      case 'low':
        return <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-start space-x-3">
      {/* Icon */}
      <div className="flex-shrink-0 text-2xl">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              {getPriorityBadge(notification.priority)}
              <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                {notification.title}
              </h4>
              {!notification.isRead && (
                <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </div>
            <p className={`text-sm mt-1 ${!notification.isRead ? 'text-gray-800' : 'text-gray-600'}`}>
              {notification.message}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatTimeAgo(notification.createdAt)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1 ml-2">
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAsRead}
                icon={Check}
                className="text-gray-400 hover:text-gray-600"
                title="Mark as read"
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              icon={Trash2}
              className="text-gray-400 hover:text-red-600"
              title="Delete notification"
            />
          </div>
        </div>

        {/* Additional Data */}
        {notification.data && Object.keys(notification.data).length > 0 && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
            {notification.data.feedbackId && (
              <div>Feedback ID: {notification.data.feedbackId}</div>
            )}
            {notification.data.cycleName && (
              <div>Cycle: {notification.data.cycleName}</div>
            )}
            {notification.data.fromUser && (
              <div>From: {notification.data.fromUser}</div>
            )}
            {notification.data.dueDate && (
              <div>Due: {new Date(notification.data.dueDate).toLocaleDateString()}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
