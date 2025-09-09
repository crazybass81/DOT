import React from 'react';

export const useNotifications = () => {
  return {
    notifications: [],
    markAsRead: () => {},
    clearAll: () => {}
  };
};

export default function NotificationSystem() {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h4 className="text-sm font-medium text-gray-900 mb-2">알림</h4>
      <p className="text-sm text-gray-600">알림이 없습니다.</p>
    </div>
  );
}