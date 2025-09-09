/**
 * Loading and Skeleton Components for ID-ROLE-PAPER System
 * Provides consistent loading states and skeleton screens
 */

'use client';

import React from 'react';

// Basic spinner component
export const Spinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'gray' | 'white';
  className?: string;
}> = ({ size = 'md', color = 'blue', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};

// Loading button state
export const LoadingButton: React.FC<{
  loading: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({ loading, children, onClick, disabled, className = '', type = 'button' }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn-primary inline-flex items-center justify-center ${className}`}
    >
      {loading && <Spinner size="sm" color="white" className="mr-2" />}
      {children}
    </button>
  );
};

// Skeleton components
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 1, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`skeleton h-4 ${
            index === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`card ${className}`}>
      <div className="card-body space-y-4">
        <div className="skeleton h-6 w-1/2" />
        <SkeletonText lines={3} />
        <div className="flex space-x-2">
          <div className="skeleton h-8 w-20" />
          <div className="skeleton h-8 w-20" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg ${className}`}>
      <table className="table">
        <thead className="table-header">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="table-header-cell">
                <div className="skeleton h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="table-row">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="table-cell">
                  <div className="skeleton h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Page-specific loading components
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Welcome Section Skeleton */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="skeleton h-8 w-80" />
            <div className="skeleton h-4 w-60" />
            <div className="skeleton h-4 w-40" />
            <div className="skeleton h-6 w-32" />
          </div>
          <div className="skeleton h-10 w-20" />
        </div>
      </div>

      {/* Statistics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg border">
            <div className="flex items-center">
              <div className="skeleton h-12 w-12 rounded mr-4" />
              <div className="space-y-2">
                <div className="skeleton h-8 w-12" />
                <div className="skeleton h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="skeleton h-6 w-24 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="skeleton h-8 w-8 rounded mb-2" />
              <div className="skeleton h-5 w-20 mb-1" />
              <div className="skeleton h-4 w-32" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const IdentityListSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="skeleton h-8 w-32" />
        <div className="skeleton h-10 w-24" />
      </div>

      {/* Search/Filter Skeleton */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      </div>

      {/* Table Skeleton */}
      <SkeletonTable rows={8} columns={5} />

      {/* Pagination Skeleton */}
      <div className="flex justify-between items-center">
        <div className="skeleton h-4 w-32" />
        <div className="flex space-x-2">
          <div className="skeleton h-10 w-10" />
          <div className="skeleton h-10 w-10" />
          <div className="skeleton h-10 w-10" />
        </div>
      </div>
    </div>
  );
};

export const BusinessDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-6 w-20" />
        </div>
        <div className="flex space-x-2">
          <div className="skeleton h-10 w-20" />
          <div className="skeleton h-10 w-20" />
        </div>
      </div>

      {/* Info Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Papers Section Skeleton */}
      <div className="bg-white rounded-lg border">
        <div className="card-header">
          <div className="skeleton h-6 w-24" />
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="skeleton h-5 w-32 mb-2" />
                <div className="skeleton h-4 w-24 mb-2" />
                <div className="skeleton h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FormSkeleton: React.FC<{
  fields?: number;
}> = ({ fields = 5 }) => {
  return (
    <div className="space-y-6">
      <div className="skeleton h-8 w-48 mb-4" />
      
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-10 w-full" />
        </div>
      ))}

      <div className="flex justify-end space-x-2 pt-4">
        <div className="skeleton h-10 w-20" />
        <div className="skeleton h-10 w-20" />
      </div>
    </div>
  );
};

// Loading overlay for modal/page transitions
export const LoadingOverlay: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = '로딩 중...', className = '' }) => {
  return (
    <div className={`fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className="bg-white rounded-lg p-6 shadow-lg">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size="lg" />
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
};

// Inline loading state
export const InlineLoader: React.FC<{
  message?: string;
  className?: string;
}> = ({ message = '로딩 중...', className = '' }) => {
  return (
    <div className={`flex items-center justify-center py-8 ${className}`}>
      <div className="flex items-center space-x-3">
        <Spinner size="md" />
        <span className="text-gray-600">{message}</span>
      </div>
    </div>
  );
};

// Progressive loading dots
export const LoadingDots: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
};