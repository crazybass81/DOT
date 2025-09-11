'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

interface NotificationToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  duration?: number;
  className?: string;
}

export default function NotificationToast({ 
  type, 
  message, 
  onClose, 
  duration = 3000,
  className = '' 
}: NotificationToastProps) {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-500',
          textColor: 'text-white'
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: 'bg-red-500',
          textColor: 'text-white'
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: 'bg-amber-500',
          textColor: 'text-white'
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-500',
          textColor: 'text-white'
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-gray-500',
          textColor: 'text-white'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className={`fixed top-4 right-4 ${config.bgColor} ${config.textColor} px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2 ${className}`}>
      <Icon className="w-5 h-5" />
      <span className="font-medium">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-200 transition-colors"
        >
          ×
        </button>
      )}
    </div>
  );
}

// Utility function to show toast notifications programmatically
export const showToast = (type: 'success' | 'error' | 'warning' | 'info', message: string, duration = 3000) => {
  // Remove any existing toasts
  const existingToasts = document.querySelectorAll('[data-toast]');
  existingToasts.forEach(toast => toast.remove());

  // Create new toast
  const toast = document.createElement('div');
  toast.setAttribute('data-toast', 'true');
  
  const getConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✅',
          bgColor: 'bg-green-500'
        };
      case 'error':
        return {
          icon: '❌',
          bgColor: 'bg-red-500'
        };
      case 'warning':
        return {
          icon: '⚠️',
          bgColor: 'bg-amber-500'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          bgColor: 'bg-blue-500'
        };
      default:
        return {
          icon: 'ℹ️',
          bgColor: 'bg-gray-500'
        };
    }
  };

  const config = getConfig();
  toast.className = `fixed top-4 right-4 ${config.bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2`;
  toast.innerHTML = `
    <span>${config.icon}</span>
    <span class="font-medium">${message}</span>
  `;

  document.body.appendChild(toast);

  // Auto remove after duration
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, duration);

  return toast;
};