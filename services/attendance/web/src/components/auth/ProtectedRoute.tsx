/**
 * Protected Route Components
 * Components for implementing role-based route protection
 */

'use client';

import React, { ReactNode } from 'react';
import { useAuth, useRequireAuth, useRequireRole } from '@/src/contexts/AuthContext';
import { UserRole } from '@/src/schemas/auth.schema';
import { AlertTriangle, Lock, User } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
  fallback?: ReactNode;
  showFallback?: boolean;
}

/**
 * Protected Route Component
 * Wraps content that requires authentication
 */
export function ProtectedRoute({ 
  children, 
  requiredRole, 
  fallback,
  showFallback = true 
}: ProtectedRouteProps) {
  const auth = requiredRole ? useRequireRole(requiredRole) : useRequireAuth();

  // Show loading state
  if (auth.isLoading) {
    return <LoadingScreen />;
  }

  // Show unauthorized if not authenticated
  if (!auth.isAuthenticated) {
    if (showFallback && fallback) {
      return <>{fallback}</>;
    }
    return showFallback ? <UnauthorizedScreen /> : null;
  }

  // Show insufficient permissions if role check fails
  if (requiredRole && !auth.hasRole(requiredRole)) {
    if (showFallback && fallback) {
      return <>{fallback}</>;
    }
    return showFallback ? <InsufficientPermissionsScreen currentRole={auth.user?.role} requiredRole={requiredRole} /> : null;
  }

  return <>{children}</>;
}

/**
 * Master Admin Protected Route
 */
export function MasterAdminRoute({ children, fallback, showFallback = true }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute 
      requiredRole="master" 
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </ProtectedRoute>
  );
}

/**
 * Admin Protected Route
 */
export function AdminRoute({ children, fallback, showFallback = true }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute 
      requiredRole="admin" 
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </ProtectedRoute>
  );
}

/**
 * Manager Protected Route
 */
export function ManagerRoute({ children, fallback, showFallback = true }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute 
      requiredRole="manager" 
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </ProtectedRoute>
  );
}

/**
 * Worker Protected Route (any authenticated user)
 */
export function WorkerRoute({ children, fallback, showFallback = true }: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute 
      requiredRole="worker" 
      fallback={fallback}
      showFallback={showFallback}
    >
      {children}
    </ProtectedRoute>
  );
}

/**
 * Loading Screen Component
 */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">인증 확인 중</h3>
        <p className="text-gray-600">잠시만 기다려주세요...</p>
      </div>
    </div>
  );
}

/**
 * Unauthorized Screen Component
 */
function UnauthorizedScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">로그인 필요</h2>
          <p className="text-gray-600 mb-6">
            이 페이지에 접근하려면 로그인이 필요합니다.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full btn-primary"
            >
              로그인 페이지로 이동
            </button>
            <button
              onClick={() => window.history.back()}
              className="w-full btn-secondary"
            >
              이전 페이지로
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Insufficient Permissions Screen Component
 */
interface InsufficientPermissionsScreenProps {
  currentRole?: UserRole;
  requiredRole: UserRole;
}

function InsufficientPermissionsScreen({ currentRole, requiredRole }: InsufficientPermissionsScreenProps) {
  const getRoleName = (role: UserRole) => {
    const roleNames = {
      master: '마스터 관리자',
      admin: '관리자',
      manager: '매니저',
      worker: '직원',
    };
    return roleNames[role] || role;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">접근 권한 없음</h2>
          <div className="space-y-3 text-left mb-6">
            <p className="text-gray-600">
              이 페이지에 접근하기 위한 권한이 부족합니다.
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">현재 권한:</span>
                <span className="text-sm text-gray-900">{currentRole ? getRoleName(currentRole) : '없음'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">필요 권한:</span>
                <span className="text-sm text-gray-900">{getRoleName(requiredRole)} 이상</span>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              관리자에게 권한 승급을 요청하거나, 적절한 권한을 가진 계정으로 로그인하세요.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => window.history.back()}
              className="w-full btn-primary"
            >
              이전 페이지로
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full btn-secondary"
            >
              홈으로 이동
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Role-based content renderer
 */
interface RoleBasedContentProps {
  children: ReactNode;
  roles: UserRole[];
  fallback?: ReactNode;
}

export function RoleBasedContent({ children, roles, fallback = null }: RoleBasedContentProps) {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-200 border-t-indigo-600"></div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return <>{fallback}</>;
  }

  // Check if user has any of the required roles
  const hasRequiredRole = roles.some(role => auth.hasRole(role));
  
  if (!hasRequiredRole) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Navigation item with role protection
 */
interface ProtectedNavItemProps {
  href: string;
  children: ReactNode;
  requiredRole?: UserRole;
  className?: string;
  onClick?: () => void;
}

export function ProtectedNavItem({ 
  href, 
  children, 
  requiredRole, 
  className = '',
  onClick 
}: ProtectedNavItemProps) {
  const auth = useAuth();

  // Don't render if not authenticated
  if (!auth.isAuthenticated) {
    return null;
  }

  // Don't render if insufficient role
  if (requiredRole && !auth.hasRole(requiredRole)) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else {
      e.preventDefault();
      window.location.href = href;
    }
  };

  return (
    <a 
      href={href} 
      className={className}
      onClick={handleClick}
    >
      {children}
    </a>
  );
}

// Export all components
export {
  LoadingScreen,
  UnauthorizedScreen,
  InsufficientPermissionsScreen,
};