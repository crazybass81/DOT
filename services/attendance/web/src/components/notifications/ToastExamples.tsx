import React, { useState } from 'react';
import { useToast } from './Toast';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import { NotificationCenter } from './NotificationCenter';
import { NotificationMessage } from '@/lib/notification-manager';

/**
 * Example component demonstrating how to use the Toast notification system
 * This file can be removed in production - it's for demonstration purposes only
 */
export const ToastExamples: React.FC = () => {
  const [lastNotificationClick, setLastNotificationClick] = useState<NotificationMessage | null>(null);
  
  // Basic toast hooks
  const {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    clearAll
  } = useToast();

  // Enhanced toast hooks with WebSocket integration
  const {
    showAttendanceSuccess,
    showAttendanceError,
    showApprovalUpdate,
    showSystemMessage,
    isRealtimeConnected
  } = useToastNotifications('user-123', 'org-456', {
    enableRealtimeIntegration: true,
    enableSounds: true,
    debounceMs: 300
  });

  const handleBasicToasts = () => {
    showSuccess('Success!', 'Operation completed successfully');
    showError('Error!', 'Something went wrong');
    showWarning('Warning!', 'Please check your input');
    showInfo('Info', 'Just so you know');
  };

  const handleAttendanceToasts = () => {
    showAttendanceSuccess('John Doe', 'check-in');
    showAttendanceError('Jane Smith', 'Network timeout');
    showApprovalUpdate('Bob Johnson', 'approved');
    showSystemMessage('System maintenance scheduled for tonight', 'warning');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold mb-6">Toast Notification Examples</h2>
      
      <div className="space-y-4">
        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Basic Toast Notifications</h3>
          <button 
            onClick={handleBasicToasts}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
          >
            Show Basic Toasts
          </button>
          <button 
            onClick={clearAll}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            Clear All
          </button>
        </div>

        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Attendance-Specific Notifications</h3>
          <div className="mb-2">
            <span className={`px-2 py-1 rounded text-sm ${
              isRealtimeConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              WebSocket: {isRealtimeConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button 
            onClick={handleAttendanceToasts}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Show Attendance Toasts
          </button>
        </div>

        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Individual Toast Examples</h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => showSuccess('Success', 'Task completed')}
              className="bg-green-500 hover:bg-green-700 text-white py-2 px-4 rounded"
            >
              Success Toast
            </button>
            <button 
              onClick={() => showError('Error', 'Task failed')}
              className="bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded"
            >
              Error Toast
            </button>
            <button 
              onClick={() => showWarning('Warning', 'Please be careful')}
              className="bg-yellow-500 hover:bg-yellow-700 text-white py-2 px-4 rounded"
            >
              Warning Toast
            </button>
            <button 
              onClick={() => showInfo('Info', 'Helpful information')}
              className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Info Toast
            </button>
          </div>
        </div>

        <div className="border p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">WebSocket Event Simulation</h3>
          <div className="space-y-2">
            <button 
              onClick={() => showAttendanceSuccess('Alice Cooper', 'check-in')}
              className="block w-full bg-indigo-500 hover:bg-indigo-700 text-white py-2 px-4 rounded"
            >
              Simulate Check-in Event
            </button>
            <button 
              onClick={() => showApprovalUpdate('Charlie Brown', 'rejected')}
              className="block w-full bg-orange-500 hover:bg-orange-700 text-white py-2 px-4 rounded"
            >
              Simulate Approval Rejection
            </button>
            <button 
              onClick={() => showSystemMessage('Database backup completed', 'info')}
              className="block w-full bg-purple-500 hover:bg-purple-700 text-white py-2 px-4 rounded"
            >
              Simulate System Message
            </button>
          </div>
        </div>

        <div className="border p-4 rounded-lg bg-gray-50">
          <h3 className="text-lg font-semibold mb-3">Usage Instructions</h3>
          <div className="text-sm space-y-2">
            <p><strong>Basic Usage:</strong></p>
            <code className="block bg-gray-200 p-2 rounded">
              {`const { showSuccess, showError } = useToast();`}
            </code>
            
            <p><strong>Enhanced Usage with WebSocket:</strong></p>
            <code className="block bg-gray-200 p-2 rounded">
              {`const { showAttendanceSuccess } = useToastNotifications(userId, orgId);`}
            </code>
            
            <p><strong>Provider Setup:</strong></p>
            <code className="block bg-gray-200 p-2 rounded">
              {`<ToastProvider position="top-right" maxToasts={5}>
  <YourApp />
</ToastProvider>`}
            </code>

            <p><strong>Enhanced Provider Setup:</strong></p>
            <code className="block bg-gray-200 p-2 rounded">
              {`<EnhancedNotificationSystem
  userId="user-123"
  organizationId="org-456"
  position="top-right"
  enableRealtimeIntegration={true}
/>`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};