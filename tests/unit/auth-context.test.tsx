/**
 * Authentication Context Tests
 * Tests for React authentication context provider
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext';
import { RoleType } from '../../src/types/id-role-paper';

// Mock Supabase
const mockSupabase = {
  auth: {
    getSession: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } }
    }))
  }
};

jest.mock('../../src/lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test component to access context
const TestComponent = () => {
  const { user, identity, loading, hasPermission, hasRole, isAuthenticated } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="authenticated">{isAuthenticated.toString()}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
      <div data-testid="identity-name">{identity?.identity.fullName || 'none'}</div>
      <div data-testid="has-permission">{hasPermission('identity:read').toString()}</div>
      <div data-testid="has-role">{hasRole(RoleType.MANAGER).toString()}</div>
    </div>
  );
};

const TestComponentWithProvider = () => (
  <AuthProvider>
    <TestComponent />
  </AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    
    // Default mock returns
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });
  });

  describe('초기 상태', () => {
    it('로딩 상태로 시작한다', () => {
      render(<TestComponentWithProvider />);
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
    });

    it('인증되지 않은 상태로 시작한다', async () => {
      render(<TestComponentWithProvider />);
      
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('세션 복원', () => {
    it('기존 세션이 있을 때 사용자를 복원한다', async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' },
        access_token: 'token123'
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{
            identity: { fullName: '홍길동' },
            primaryRole: RoleType.MANAGER,
            availableRoles: [RoleType.WORKER, RoleType.MANAGER],
            permissions: [{ resource: 'identity', action: 'read' }]
          }]
        })
      });

      render(<TestComponentWithProvider />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('identity-name')).toHaveTextContent('홍길동');
      });

      expect(localStorage.getItem('access_token')).toBe('token123');
    });
  });

  describe('로그인', () => {
    it('성공적인 로그인을 처리한다', async () => {
      const TestLoginComponent = () => {
        const { login } = useAuth();
        
        return (
          <button onClick={() => login('test@example.com', 'password')}>
            로그인
          </button>
        );
      };

      const mockAuthResponse = {
        data: {
          user: { id: 'user1', email: 'test@example.com' },
          session: { access_token: 'new-token' }
        },
        error: null
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue(mockAuthResponse);
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{
            identity: { fullName: '홍길동' },
            primaryRole: RoleType.MANAGER,
            availableRoles: [RoleType.WORKER, RoleType.MANAGER],
            permissions: [{ resource: 'identity', action: 'read' }]
          }]
        })
      });

      render(
        <AuthProvider>
          <TestLoginComponent />
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('로그인');
      
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password'
      });
    });

    it('로그인 실패를 처리한다', async () => {
      const TestLoginComponent = () => {
        const { login } = useAuth();
        const [error, setError] = React.useState<string>('');
        
        const handleLogin = async () => {
          const result = await login('test@example.com', 'wrongpassword');
          if (!result.success) {
            setError(result.error || '로그인 실패');
          }
        };
        
        return (
          <div>
            <button onClick={handleLogin}>로그인</button>
            <div data-testid="error">{error}</div>
          </div>
        );
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      render(
        <AuthProvider>
          <TestLoginComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('로그인');
      
      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      });
    });
  });

  describe('로그아웃', () => {
    it('로그아웃을 처리한다', async () => {
      // Setup authenticated state first
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' },
        access_token: 'token123'
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const TestLogoutComponent = () => {
        const { logout } = useAuth();
        return <button onClick={logout}>로그아웃</button>;
      };

      render(
        <AuthProvider>
          <TestLogoutComponent />
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial auth state
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByText('로그아웃');
      
      await act(async () => {
        logoutButton.click();
      });

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('권한 확인', () => {
    beforeEach(async () => {
      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' },
        access_token: 'token123'
      };
      
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession }
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{
            identity: { fullName: '홍길동' },
            primaryRole: RoleType.MANAGER,
            availableRoles: [RoleType.WORKER, RoleType.MANAGER],
            permissions: [
              { resource: 'identity', action: 'read' },
              { resource: 'business', action: 'write' }
            ]
          }]
        })
      });
    });

    it('권한이 있는 경우 true를 반환한다', async () => {
      render(<TestComponentWithProvider />);

      await waitFor(() => {
        expect(screen.getByTestId('has-permission')).toHaveTextContent('true');
      });
    });

    it('역할이 있는 경우 true를 반환한다', async () => {
      render(<TestComponentWithProvider />);

      await waitFor(() => {
        expect(screen.getByTestId('has-role')).toHaveTextContent('true');
      });
    });
  });

  describe('인증 상태 변경 리스너', () => {
    it('SIGNED_IN 이벤트를 처리한다', async () => {
      let authStateCallback: (event: string, session: any) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      render(<TestComponentWithProvider />);

      const mockSession = {
        user: { id: 'user1', email: 'test@example.com' },
        access_token: 'new-token'
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{
            identity: { fullName: '홍길동' },
            primaryRole: RoleType.MANAGER,
            availableRoles: [RoleType.MANAGER],
            permissions: []
          }]
        })
      });

      await act(async () => {
        authStateCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });
    });

    it('SIGNED_OUT 이벤트를 처리한다', async () => {
      let authStateCallback: (event: string, session: any) => void = () => {};
      
      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      // Set initial authenticated state
      localStorage.setItem('access_token', 'token123');

      render(<TestComponentWithProvider />);

      await act(async () => {
        authStateCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      });

      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });
});