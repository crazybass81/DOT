import React, { useEffect, useContext, createContext, useState, useCallback, ReactNode } from 'react';
import { RealtimeNotification } from '@/lib/realtime';

// Toast types
export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  autoClose: boolean;
  duration: number;
  isVisible: boolean;
}

export interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

// Toast positions
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

// Toast context
interface ToastContextType {
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  showNotification: (notification: RealtimeNotification) => void;
  clearAll: () => void;
  getToasts: () => ToastData[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Individual Toast Component
export const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    if (toast.autoClose) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.autoClose, toast.duration, onRemove]);

  const getTypeClasses = (type: string): string => {
    const baseClasses = 'rounded-lg shadow-lg p-4 mb-3 max-w-sm transition-all duration-300 transform';
    
    switch (type) {
      case 'success':
        return `${baseClasses} bg-green-50 border-l-4 border-green-500 toast-success`;
      case 'error':
        return `${baseClasses} bg-red-50 border-l-4 border-red-500 toast-error`;
      case 'warning':
        return `${baseClasses} bg-yellow-50 border-l-4 border-yellow-500 toast-warning`;
      case 'info':
        return `${baseClasses} bg-blue-50 border-l-4 border-blue-500 toast-info`;
      default:
        return `${baseClasses} bg-gray-50 border-l-4 border-gray-500 toast-info`;
    }
  };

  const getTypeIcon = (type: string): string => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div
      data-testid="toast"
      className={getTypeClasses(toast.type)}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg">{getTypeIcon(toast.type)}</span>
        </div>
        
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">
            {toast.title}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {toast.message}
          </p>
        </div>
        
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none"
            onClick={() => onRemove(toast.id)}
            aria-label="Close toast"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar for auto-close */}
      {toast.autoClose && (
        <div className="mt-2 w-full bg-gray-200 rounded-full h-1" data-testid="toast-progress">
          <div 
            className={`h-1 rounded-full transition-all ease-linear ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' :
              toast.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{
              width: '100%',
              animation: `shrink ${toast.duration}ms linear`
            }}
          />
        </div>
      )}

      {/* Keyframes for progress bar animation */}
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// Toast Manager Component
interface ToastManagerProps {
  position?: ToastPosition;
  maxToasts?: number;
  className?: string;
}

export const ToastManager: React.FC<ToastManagerProps> = ({
  position = 'top-right',
  maxToasts = 5,
  className = ''
}) => {
  const toastContext = useContext(ToastContext);
  
  if (!toastContext) {
    throw new Error('ToastManager must be used within ToastProvider');
  }

  const toasts = toastContext.getToasts();

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4 top-right',
    'top-left': 'top-4 left-4 top-left',
    'bottom-right': 'bottom-4 right-4 bottom-right',
    'bottom-left': 'bottom-4 left-4 bottom-left',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2 top-center',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2 bottom-center'
  };

  return (
    <div 
      data-testid="toast-container"
      className={`fixed z-50 ${positionClasses[position]} ${className}`}
      style={{ zIndex: 9999 }}
    >
      {toasts.map((toast) => (
        <Toast 
          key={toast.id} 
          toast={toast} 
          onRemove={(id) => {
            // Find removeToast method from context - will be implemented
            toastContext.clearAll(); // Temporary fallback
          }}
        />
      ))}
    </div>
  );
};

// Toast Provider Component
interface ToastProviderProps {
  children: ReactNode;
  position?: ToastPosition;
  maxToasts?: number;
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000
}) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id' | 'timestamp' | 'isVisible'>) => {
    const newToast: ToastData = {
      ...toast,
      id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      isVisible: true
    };

    setToasts(prevToasts => {
      const updatedToasts = [newToast, ...prevToasts];
      return updatedToasts.slice(0, maxToasts);
    });
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showSuccess = useCallback((title: string, message: string) => {
    addToast({
      type: 'success',
      title,
      message,
      autoClose: true,
      duration: defaultDuration
    });
  }, [addToast, defaultDuration]);

  const showError = useCallback((title: string, message: string) => {
    addToast({
      type: 'error',
      title,
      message,
      autoClose: true,
      duration: defaultDuration * 1.5 // Error toasts stay longer
    });
  }, [addToast, defaultDuration]);

  const showWarning = useCallback((title: string, message: string) => {
    addToast({
      type: 'warning',
      title,
      message,
      autoClose: true,
      duration: defaultDuration
    });
  }, [addToast, defaultDuration]);

  const showInfo = useCallback((title: string, message: string) => {
    addToast({
      type: 'info',
      title,
      message,
      autoClose: true,
      duration: defaultDuration
    });
  }, [addToast, defaultDuration]);

  const showNotification = useCallback((notification: RealtimeNotification) => {
    const type = notification.priority === 'high' ? 'error' : 
                 notification.priority === 'low' ? 'info' : 
                 notification.type === 'attendance_update' ? 'info' : 
                 notification.type === 'approval_update' ? 'success' : 'info';

    addToast({
      type,
      title: notification.title,
      message: notification.message,
      autoClose: true,
      duration: notification.priority === 'high' ? defaultDuration * 2 : defaultDuration
    });
  }, [addToast, defaultDuration]);

  const getToasts = useCallback(() => toasts, [toasts]);

  const contextValue: ToastContextType = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showNotification,
    clearAll,
    getToasts
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastManager position={position} maxToasts={maxToasts} />
    </ToastContext.Provider>
  );
};

// Hook to use toast functionality
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};