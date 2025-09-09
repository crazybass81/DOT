import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../services/authService';
import { UserRole } from '../types/user.types';

export interface AuthGuardState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  isAdmin: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    approval_status: string;
  } | null;
  error: string | null;
}

export interface AuthGuardOptions {
  requireAuth?: boolean;
  requireApproval?: boolean;
  requireAdmin?: boolean;
  redirectOnFail?: string;
  showToastOnFail?: boolean;
}

export function useAuthGuard(options: AuthGuardOptions = {}) {
  const {
    requireAuth = true,
    requireApproval = true,
    requireAdmin = false,
    redirectOnFail = '/login',
    showToastOnFail = true
  } = options;

  const router = useRouter();
  const [state, setState] = useState<AuthGuardState>({
    isLoading: true,
    isAuthenticated: false,
    isApproved: false,
    isAdmin: false,
    user: null,
    error: null
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check if user is authenticated
      const isAuth = await authService.isAuthenticated();
      
      if (requireAuth && !isAuth) {
        if (showToastOnFail) {
          console.log('로그인이 필요합니다.');
        }
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          isAuthenticated: false,
          error: '로그인이 필요합니다.' 
        }));
        if (redirectOnFail) {
          router.push(redirectOnFail);
        }
        return;
      }

      if (!isAuth) {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          isAuthenticated: false 
        }));
        return;
      }

      // Get current user
      const user = await authService.getCurrentUser();
      
      if (!user) {
        if (showToastOnFail) {
          console.log('사용자 정보를 찾을 수 없습니다.');
        }
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          isAuthenticated: false,
          error: '사용자 정보를 찾을 수 없습니다.' 
        }));
        if (redirectOnFail) {
          router.push('/register');
        }
        return;
      }

      const isApproved = user.isVerified || (user.employee?.is_active !== false);
      const isAdmin = await authService.isMasterAdmin() ||
                      await authService.hasRole('admin') ||
                      await authService.hasRole('master_admin');

      // Check approval requirement
      if (requireApproval && !isApproved) {
        const approvalStatus = user.approvalStatus || 'pending';
        
        if (approvalStatus === 'PENDING') {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            isAuthenticated: true,
            isApproved: false,
            user: {
              id: user.id,
              name: user.name || user.email.split('@')[0],
              email: user.email,
              role: user.role || 'EMPLOYEE',
              approval_status: approvalStatus
            },
            error: '승인 대기 중입니다.' 
          }));
          router.push('/approval-pending');
          return;
        } else if (approvalStatus === 'REJECTED') {
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            isAuthenticated: true,
            isApproved: false,
            user: {
              id: user.id,
              name: user.name || user.email.split('@')[0],
              email: user.email,
              role: user.role || 'EMPLOYEE',
              approval_status: approvalStatus
            },
            error: '등록이 거절되었습니다.' 
          }));
          router.push('/approval-pending');
          return;
        } else if (!isApproved) {
          if (showToastOnFail) {
            console.log('계정이 비활성화되었습니다.');
          }
          setState(prev => ({ 
            ...prev, 
            isLoading: false, 
            isAuthenticated: true,
            isApproved: false,
            user: {
              id: user.id,
              name: user.name || user.email.split('@')[0],
              email: user.email,
              role: user.role || 'EMPLOYEE',
              approval_status: approvalStatus
            },
            error: '계정이 비활성화되었습니다.' 
          }));
          router.push('/approval-pending');
          return;
        }
      }

      // Check admin requirement
      if (requireAdmin && !isAdmin) {
        if (showToastOnFail) {
          console.log('관리자 권한이 필요합니다.');
        }
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          isAuthenticated: true,
          isApproved: isApproved,
          isAdmin: false,
          user: {
            id: user.id,
            name: user.name || user.email.split('@')[0],
            email: user.email,
            role: user.role || 'EMPLOYEE',
            approval_status: user.approvalStatus || 'approved'
          },
          error: '관리자 권한이 필요합니다.' 
        }));
        if (redirectOnFail !== '/login') {
          router.push('/dashboard');
        }
        return;
      }

      // All checks passed
      setState({
        isLoading: false,
        isAuthenticated: true,
        isApproved: isApproved,
        isAdmin: isAdmin,
        user: {
          id: user.id,
          name: user.name || user.email.split('@')[0],
          email: user.email,
          role: user.role || 'EMPLOYEE',
          approval_status: user.approvalStatus || 'approved'
        },
        error: null
      });

    } catch (error: any) {
      console.error('Auth guard error:', error);
      const errorMessage = error.message || '인증 확인 중 오류가 발생했습니다.';
      
      if (showToastOnFail) {
        console.log(errorMessage);
      }
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage 
      }));
      
      if (redirectOnFail) {
        router.push(redirectOnFail);
      }
    }
  };

  const refreshAuth = () => {
    checkAuth();
  };

  return {
    ...state,
    refreshAuth
  };
}

// Convenience hooks for common scenarios
export function useRequireAuth() {
  return useAuthGuard({
    requireAuth: true,
    requireApproval: false,
    requireAdmin: false,
    redirectOnFail: '/login'
  });
}

export function useRequireApproval() {
  return useAuthGuard({
    requireAuth: true,
    requireApproval: true,
    requireAdmin: false,
    redirectOnFail: '/login'
  });
}

export function useRequireAdmin() {
  return useAuthGuard({
    requireAuth: true,
    requireApproval: true,
    requireAdmin: true,
    redirectOnFail: '/dashboard'
  });
}