/**
 * ID-ROLE-PAPER System Integration Tests
 * End-to-end workflow validation for the complete system
 * Tests authentication, navigation, component integration, and API interactions
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../../src/contexts/AuthContext';
import IDRolePaperDashboard from '../../src/app/id-role-paper/page';
import IdentityPage from '../../src/app/identity/page';
import BusinessPage from '../../src/app/business/page';
import PapersPage from '../../src/app/papers/page';
import PermissionsPage from '../../src/app/permissions/page';
import { RoleType } from '../../src/types/id-role-paper';

// Mock Next.js router
const mockPush = jest.fn();
const mockPathname = '/id-role-paper';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

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

// Mock fetch for API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Test data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com'
};

const mockIdentity = {
  identity: {
    id: 'identity-123',
    fullName: '홍길동',
    identityType: 'personal',
    personalInfo: {
      phone: '010-1234-5678',
      address: '서울시 강남구'
    }
  },
  primaryRole: RoleType.MANAGER,
  availableRoles: [RoleType.WORKER, RoleType.MANAGER],
  permissions: [
    { resource: 'identity', action: 'read' },
    { resource: 'identity', action: 'write' },
    { resource: 'business', action: 'read' },
    { resource: 'papers', action: 'read' }
  ],
  businessContext: {
    id: 'business-123',
    name: '테스트 회사',
    businessType: 'individual'
  }
};

describe('ID-ROLE-PAPER System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    
    // Setup default authenticated state
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { 
        session: { 
          user: mockUser, 
          access_token: 'test-token' 
        } 
      }
    });
    
    mockLocalStorage.getItem.mockReturnValue('test-token');
    
    // Default successful API responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/identity')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockIdentity] })
        });
      }
      if (url.includes('/api/business')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] })
        });
      }
      if (url.includes('/api/papers')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: [] })
      });
    });
  });

  describe('인증 및 메인 대시보드', () => {
    it('인증된 사용자에게 대시보드를 표시한다', async () => {
      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        expect(screen.getByText('ID-ROLE-PAPER 시스템에 오신 것을 환영합니다')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
        expect(screen.getByText('신원: 홍길동')).toBeInTheDocument();
        expect(screen.getByText('주요 역할: MANAGER')).toBeInTheDocument();
      });
    });

    it('통계 데이터를 로드하고 표시한다', async () => {
      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        expect(screen.getByText('등록된 신원')).toBeInTheDocument();
        expect(screen.getByText('등록된 사업자')).toBeInTheDocument();
        expect(screen.getByText('관리 문서')).toBeInTheDocument();
        expect(screen.getByText('활성 권한')).toBeInTheDocument();
      });

      // Verify API calls for statistics
      expect(mockFetch).toHaveBeenCalledWith('/api/identity?limit=1', expect.any(Object));
      expect(mockFetch).toHaveBeenCalledWith('/api/business?limit=1', expect.any(Object));
      expect(mockFetch).toHaveBeenCalledWith('/api/papers?limit=1', expect.any(Object));
    });

    it('모듈 간 네비게이션이 작동한다', async () => {
      const user = userEvent.setup();
      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        expect(screen.getByText('신원 관리')).toBeInTheDocument();
      });

      // Click on identity management
      const identityButton = screen.getByText('신원 관리');
      await user.click(identityButton);

      await waitFor(() => {
        expect(screen.getByTestId('identity-management')).toBeInTheDocument();
      });
    });

    it('로그아웃 기능이 작동한다', async () => {
      const user = userEvent.setup();
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        expect(screen.getByText('로그아웃')).toBeInTheDocument();
      });

      const logoutButton = screen.getByText('로그아웃');
      await user.click(logoutButton);

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('신원 관리 페이지', () => {
    it('신원 관리 페이지를 렌더링한다', async () => {
      render(<IdentityPage />);

      await waitFor(() => {
        expect(screen.getByText('신원 관리')).toBeInTheDocument();
        expect(screen.getByText('대시보드로 돌아가기')).toBeInTheDocument();
      });
    });

    it('신원 목록을 로드하고 표시한다', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/identity')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ 
              data: [
                {
                  identity: {
                    id: 'identity-1',
                    fullName: '홍길동',
                    identityType: 'personal'
                  },
                  primaryRole: RoleType.MANAGER,
                  availableRoles: [RoleType.MANAGER],
                  permissions: []
                },
                {
                  identity: {
                    id: 'identity-2',
                    fullName: '김영희',
                    identityType: 'personal'
                  },
                  primaryRole: RoleType.WORKER,
                  availableRoles: [RoleType.WORKER],
                  permissions: []
                }
              ]
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockIdentity] })
        });
      });

      render(<IdentityPage />);

      await waitFor(() => {
        expect(screen.getByText('홍길동')).toBeInTheDocument();
        expect(screen.getByText('김영희')).toBeInTheDocument();
      });
    });
  });

  describe('사업자 관리 페이지', () => {
    it('사업자 관리 페이지를 렌더링한다', async () => {
      render(<BusinessPage />);

      await waitFor(() => {
        expect(screen.getByText('사업자 관리')).toBeInTheDocument();
        expect(screen.getByText('대시보드로 돌아가기')).toBeInTheDocument();
      });
    });

    it('사업자 목록을 로드하고 표시한다', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/business')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ 
              data: [
                {
                  id: 'business-1',
                  name: '테스트 회사 1',
                  businessType: 'individual',
                  businessNumber: '123-45-67890',
                  verificationStatus: 'verified'
                },
                {
                  id: 'business-2',
                  name: '테스트 회사 2',
                  businessType: 'corporate',
                  businessNumber: '123456-1234567',
                  verificationStatus: 'pending'
                }
              ]
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockIdentity] })
        });
      });

      render(<BusinessPage />);

      await waitFor(() => {
        expect(screen.getByText('테스트 회사 1')).toBeInTheDocument();
        expect(screen.getByText('테스트 회사 2')).toBeInTheDocument();
      });
    });
  });

  describe('문서 관리 페이지', () => {
    it('문서 관리 페이지를 렌더링한다', async () => {
      render(<PapersPage />);

      await waitFor(() => {
        expect(screen.getByText('문서 관리')).toBeInTheDocument();
        expect(screen.getByText('대시보드로 돌아가기')).toBeInTheDocument();
      });
    });

    it('문서 목록을 로드하고 표시한다', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/papers')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ 
              data: [
                {
                  id: 'paper-1',
                  paperType: 'BUSINESS_REGISTRATION',
                  title: '사업자등록증',
                  validFrom: '2024-01-01',
                  validUntil: '2024-12-31',
                  isValid: true
                },
                {
                  id: 'paper-2',
                  paperType: 'TAX_REGISTRATION',
                  title: '세금계산서발급사업자등록증',
                  validFrom: '2024-01-01',
                  validUntil: '2024-12-31',
                  isValid: true
                }
              ]
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockIdentity] })
        });
      });

      render(<PapersPage />);

      await waitFor(() => {
        expect(screen.getByText('사업자등록증')).toBeInTheDocument();
        expect(screen.getByText('세금계산서발급사업자등록증')).toBeInTheDocument();
      });
    });
  });

  describe('권한 관리 페이지', () => {
    it('권한 관리 페이지를 렌더링한다', async () => {
      render(<PermissionsPage />);

      await waitFor(() => {
        expect(screen.getByText('권한 관리')).toBeInTheDocument();
        expect(screen.getByText('대시보드로 돌아가기')).toBeInTheDocument();
      });
    });

    it('권한 매트릭스를 로드하고 표시한다', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/permissions/matrix')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ 
              data: {
                identity: mockIdentity.identity,
                permissions: {
                  'identity:read': true,
                  'identity:write': true,
                  'business:read': true,
                  'business:write': false,
                  'papers:read': true,
                  'papers:write': false
                }
              }
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [mockIdentity] })
        });
      });

      render(<PermissionsPage />);

      await waitFor(() => {
        expect(screen.getByText('권한 매트릭스')).toBeInTheDocument();
      });

      // Verify permission matrix API call
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/permissions/matrix'),
        expect.any(Object)
      );
    });
  });

  describe('오류 처리', () => {
    it('API 오류를 적절히 처리한다', async () => {
      mockFetch.mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ error: '서버 오류가 발생했습니다.' })
        });
      });

      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        expect(screen.getByText('서버 오류가 발생했습니다.')).toBeInTheDocument();
      });
    });

    it('네트워크 오류를 처리한다', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load dashboard stats/)).toBeInTheDocument();
      });
    });

    it('인증되지 않은 사용자에게 로그인 요구 메시지를 표시한다', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        expect(screen.getByText('로그인이 필요합니다')).toBeInTheDocument();
        expect(screen.getByText('ID-ROLE-PAPER 시스템에 접근하려면 로그인해주세요.')).toBeInTheDocument();
      });
    });
  });

  describe('반응형 디자인', () => {
    it('모바일 화면에서 올바르게 렌더링된다', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        const navigation = screen.getByRole('navigation');
        expect(navigation).toBeInTheDocument();
        
        // Check that responsive classes are applied
        const mainContent = screen.getByRole('main');
        expect(mainContent).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
      });
    });

    it('데스크톱 화면에서 올바르게 렌더링된다', async () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      });
      
      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        const statsGrid = screen.getByText('등록된 신원').closest('.grid');
        expect(statsGrid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
      });
    });
  });

  describe('접근성', () => {
    it('적절한 ARIA 라벨을 포함한다', async () => {
      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        // Check for main navigation
        expect(screen.getByRole('navigation')).toBeInTheDocument();
        
        // Check for main content area
        expect(screen.getByRole('main')).toBeInTheDocument();
        
        // Check for button accessibility
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    it('키보드 네비게이션을 지원한다', async () => {
      const user = userEvent.setup();
      render(<IDRolePaperDashboard />);

      await waitFor(() => {
        const firstButton = screen.getAllByRole('button')[0];
        expect(firstButton).toBeInTheDocument();
      });

      // Test tab navigation
      const buttons = screen.getAllByRole('button');
      await user.tab();
      expect(document.activeElement).toBe(buttons[0]);
    });
  });
});