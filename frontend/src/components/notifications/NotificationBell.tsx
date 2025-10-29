// frontend/src/components/notifications/NotificationBell.tsx

import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import { Bell, BellRing } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { stats, fetchStats, refreshNotifications } = useNotificationStore();

  useEffect(() => {
    fetchStats();
    refreshNotifications();
  }, [fetchStats, refreshNotifications]);

  const unreadCount = stats?.unread || 0;
  const hasUnread = unreadCount > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notifications"
      >
        {hasUnread ? (
          <BellRing className="w-6 h-6 text-blue-600" />
        ) : (
          <Bell className="w-6 h-6" />
        )}
        
        {hasUnread && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
