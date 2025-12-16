// frontend/src/components/notifications/NotificationItem.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../stores/notificationStore';
import { Notification, NotificationType } from '../../types/notification.types';
import { Button } from '../ui/Button';
import { Trash2, Check } from 'lucide-react';

interface NotificationItemProps {
  notification: Notification;
  icon: string;
  onNavigate?: () => void; // Optional callback to close dropdown after navigation
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ notification, icon, onNavigate }) => {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotificationStore();

  const handleMarkAsRead = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    await deleteNotification(notification.id);
  };

  const handleClick = async () => {
    // Mark as read when clicked
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    
    // Determine navigation path based on notification type
    let navigationPath: string | null = null;
    
    switch (notification.type) {
      // Feedback-related notifications
      case NotificationType.FEEDBACK_RECEIVED:
      case NotificationType.FEEDBACK_REMINDER:
      case NotificationType.FEEDBACK_SUBMITTED:
      case NotificationType.FEEDBACK_ACKNOWLEDGED:
      case NotificationType.REVIEW_REQUESTED:
      case NotificationType.REVIEW_COMPLETED:
        if (notification.data?.feedbackId) {
          navigationPath = `/feedback/${notification.data.feedbackId}`;
        } else {
          navigationPath = '/feedback';
        }
        break;
      
      // Cycle-related notifications
      case NotificationType.CYCLE_STARTED:
      case NotificationType.CYCLE_ENDING:
      case NotificationType.CYCLE_COMPLETED:
        navigationPath = '/dashboard';
        break;
      
      // Goal-related notifications
      case NotificationType.GOAL_ASSIGNED:
      case NotificationType.GOAL_COMPLETED:
        navigationPath = '/myself';
        break;
      
      // USER_INVITED, USER_JOINED, SYSTEM_ANNOUNCEMENT - no navigation needed
      default:
        break;
    }
    
    // Close dropdown first, then navigate
    onNavigate?.();
    
    // Navigate after closing dropdown
    if (navigationPath) {
      // Small delay to ensure dropdown closes smoothly
      setTimeout(() => {
        navigate(navigationPath!);
      }, 50);
    }
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
    <div 
      className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
      onClick={handleClick}
    >
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
          <div className="flex items-center space-x-1 ml-2" onClick={(e) => e.stopPropagation()}>
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

        {/* Additional Data - show relevant context (not feedbackId) */}
        {notification.data && (notification.data.cycleName || notification.data.fromUser || notification.data.dueDate) && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
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
