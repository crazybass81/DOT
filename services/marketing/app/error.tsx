'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
          문제가 발생했습니다
        </h2>
        
        <p className="mt-2 text-sm text-center text-gray-600">
          {error.message || '알 수 없는 오류가 발생했습니다.'}
        </p>
        
        {error.digest && (
          <p className="mt-2 text-xs text-center text-gray-500">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => window.location.href = '/'}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            홈으로
          </button>
          
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-opacity-90 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  );
}