/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserManagementPage } from '@/app/master-admin/users/page';
import { useUserManagement } from '@/hooks/useUserManagement';
import { supabaseAuthService } from '@/services/supabaseAuthService';

// Mock dependencies
jest.mock('@/hooks/useUserManagement');
jest.mock('@/services/supabaseAuthService');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseUserManagement = useUserManagement as jest.MockedFunction<typeof useUserManagement>;
const mockSupabaseAuthService = supabaseAuthService as jest.Mocked<typeof supabaseAuthService>;

describe('UserManagementPage - 사용자 목록 조회 실패 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authenticated MASTER_ADMIN user
    mockSupabaseAuthService.getCurrentUser.mockResolvedValue({
      id: 'master-admin-1',
      email: 'master@company.com',
      user_metadata: { role: 'MASTER_ADMIN' },
    });
  });

  describe('1.1.1 MASTER_ADMIN 권한 없이 접근 시 403 에러', () => {
    it('MASTER_ADMIN 권한이 없는 사용자가 접근하면 403 에러를 표시해야 한다', async () => {
      // Given: Non-MASTER_ADMIN user
      mockSupabaseAuthService.getCurrentUser.mockResolvedValue({
        id: 'regular-user-1',
        email: 'user@company.com',
        user_metadata: { role: 'EMPLOYEE' },
      });

      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: '접근 권한이 없습니다. MASTER_ADMIN 권한이 필요합니다.',
        totalCount: 0,
        searchQuery: '',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Access denied error should be displayed
      await waitFor(() => {
        expect(screen.getByText(/접근 권한이 없습니다/)).toBeInTheDocument();
        expect(screen.getByText(/MASTER_ADMIN 권한이 필요합니다/)).toBeInTheDocument();
      });

      // And: User list should not be visible
      expect(screen.queryByTestId('user-data-grid')).not.toBeInTheDocument();
    });

    it('인증되지 않은 사용자가 접근하면 로그인 페이지로 리디렉션되어야 한다', async () => {
      // Given: Unauthenticated user
      mockSupabaseAuthService.getCurrentUser.mockResolvedValue(null);

      const mockRouter = { push: jest.fn() };
      require('next/navigation').useRouter.mockReturnValue(mockRouter);

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Should redirect to login
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('1.1.2 사용자 목록 API 호출 실패 시 에러 처리', () => {
    it('네트워크 에러 발생 시 에러 메시지를 표시해야 한다', async () => {
      // Given: Network error
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: '네트워크 연결을 확인해주세요.',
        totalCount: 0,
        searchQuery: '',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Network error message should be displayed
      await waitFor(() => {
        expect(screen.getByText(/네트워크 연결을 확인해주세요/)).toBeInTheDocument();
      });

      // And: Retry button should be available
      expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
    });

    it('서버 에러 발생 시 에러 메시지를 표시해야 한다', async () => {
      // Given: Server error
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        totalCount: 0,
        searchQuery: '',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Server error message should be displayed
      await waitFor(() => {
        expect(screen.getByText(/서버 오류가 발생했습니다/)).toBeInTheDocument();
      });
    });

    it('재시도 버튼 클릭 시 사용자 목록을 다시 로드해야 한다', async () => {
      // Given: Error state with retry functionality
      const mockReset = jest.fn();
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: '데이터 로딩에 실패했습니다.',
        totalCount: 0,
        searchQuery: '',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: mockReset,
      });

      render(<UserManagementPage />);

      // When: Retry button is clicked
      const retryButton = screen.getByRole('button', { name: /다시 시도/ });
      await userEvent.click(retryButton);

      // Then: Reset function should be called
      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('1.1.3 빈 사용자 목록 상태 테스트', () => {
    it('사용자가 없는 경우 빈 상태 메시지를 표시해야 한다', async () => {
      // Given: Empty user list
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: null,
        totalCount: 0,
        searchQuery: '',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Empty state should be displayed
      await waitFor(() => {
        expect(screen.getByText(/등록된 사용자가 없습니다/)).toBeInTheDocument();
      });

      // And: Empty state illustration should be visible
      expect(screen.getByTestId('empty-users-illustration')).toBeInTheDocument();
    });

    it('검색 결과가 없는 경우 검색 결과 없음 메시지를 표시해야 한다', async () => {
      // Given: No search results
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: null,
        totalCount: 0,
        searchQuery: 'nonexistent@email.com',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: No search results message should be displayed
      await waitFor(() => {
        expect(screen.getByText(/검색 결과가 없습니다/)).toBeInTheDocument();
        expect(screen.getByText(/nonexistent@email.com/)).toBeInTheDocument();
      });

      // And: Clear search button should be available
      expect(screen.getByRole('button', { name: /검색 초기화/ })).toBeInTheDocument();
    });

    it('필터 적용 결과가 없는 경우 필터 결과 없음 메시지를 표시해야 한다', async () => {
      // Given: No filter results
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: null,
        totalCount: 0,
        searchQuery: '',
        filters: { role: 'MANAGER', status: 'ACTIVE' },
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: No filter results message should be displayed
      await waitFor(() => {
        expect(screen.getByText(/필터 조건에 맞는 사용자가 없습니다/)).toBeInTheDocument();
      });

      // And: Clear filters button should be available
      expect(screen.getByRole('button', { name: /필터 초기화/ })).toBeInTheDocument();
    });
  });

  describe('로딩 상태 테스트', () => {
    it('사용자 목록 로딩 중에는 스켈레톤을 표시해야 한다', async () => {
      // Given: Loading state
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: true,
        error: null,
        totalCount: 0,
        searchQuery: '',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Loading skeleton should be displayed
      await waitFor(() => {
        expect(screen.getByTestId('user-list-skeleton')).toBeInTheDocument();
      });

      // And: Actual data grid should not be visible
      expect(screen.queryByTestId('user-data-grid')).not.toBeInTheDocument();
    });
  });
});

describe('사용자 검색 실패 테스트', () => {
  beforeEach(() => {
    mockSupabaseAuthService.getCurrentUser.mockResolvedValue({
      id: 'master-admin-1',
      email: 'master@company.com',
      user_metadata: { role: 'MASTER_ADMIN' },
    });
  });

  describe('1.2.1 검색어가 없을 때 전체 목록 반환', () => {
    it('빈 검색어로 검색 시 전체 사용자 목록을 반환해야 한다', async () => {
      // Given: Empty search query
      const mockSearchUsers = jest.fn();
      mockUseUserManagement.mockReturnValue({
        users: [
          {
            id: 'user-1',
            email: 'user1@company.com',
            full_name: '김사용자',
            phone: '010-1234-5678',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            created_at: '2024-01-01',
            last_login: '2024-09-06',
          },
          {
            id: 'user-2',
            email: 'user2@company.com',
            full_name: '박직원',
            phone: '010-9876-5432',
            role: 'MANAGER',
            status: 'ACTIVE',
            created_at: '2024-01-02',
            last_login: '2024-09-05',
          },
        ],
        loading: false,
        error: null,
        totalCount: 2,
        searchQuery: '',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: mockSearchUsers,
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      render(<UserManagementPage />);

      // When: Search with empty query
      const searchInput = screen.getByPlaceholderText(/사용자 검색/);
      await userEvent.type(searchInput, '   '); // Empty spaces
      await userEvent.keyboard('{Enter}');

      // Then: Should search with empty query (return all users)
      expect(mockSearchUsers).toHaveBeenCalledWith('');
    });
  });

  describe('1.2.2 잘못된 검색 필터 적용 시 빈 결과', () => {
    it('존재하지 않는 이메일로 검색 시 빈 결과를 반환해야 한다', async () => {
      // Given: Non-existent email search
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: null,
        totalCount: 0,
        searchQuery: 'nonexistent@email.com',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Should show no results message
      await waitFor(() => {
        expect(screen.getByText(/검색 결과가 없습니다/)).toBeInTheDocument();
      });
    });

    it('특수문자가 포함된 검색어 처리를 확인해야 한다', async () => {
      // Given: Special characters in search query
      const mockSearchUsers = jest.fn();
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: null,
        totalCount: 0,
        searchQuery: "'; DROP TABLE users; --",
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: mockSearchUsers,
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      render(<UserManagementPage />);

      // When: Search with special characters
      const searchInput = screen.getByPlaceholderText(/사용자 검색/);
      await userEvent.type(searchInput, "'; DROP TABLE users; --");
      await userEvent.keyboard('{Enter}');

      // Then: Should handle special characters safely
      expect(mockSearchUsers).toHaveBeenCalledWith("'; DROP TABLE users; --");
    });
  });

  describe('1.2.3 검색 API 에러 시 처리', () => {
    it('검색 API 실패 시 에러 메시지를 표시해야 한다', async () => {
      // Given: Search API error
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: false,
        error: '사용자 검색 중 오류가 발생했습니다.',
        totalCount: 0,
        searchQuery: 'test@email.com',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Should display search error
      await waitFor(() => {
        expect(screen.getByText(/사용자 검색 중 오류가 발생했습니다/)).toBeInTheDocument();
      });

      // And: Search query should still be visible
      const searchInput = screen.getByDisplayValue('test@email.com');
      expect(searchInput).toBeInTheDocument();
    });

    it('검색 시도 중 로딩 상태를 표시해야 한다', async () => {
      // Given: Search loading state
      mockUseUserManagement.mockReturnValue({
        users: [],
        loading: true,
        error: null,
        totalCount: 0,
        searchQuery: 'loading-search',
        filters: {},
        pagination: { page: 1, limit: 20 },
        searchUsers: jest.fn(),
        setFilters: jest.fn(),
        loadMore: jest.fn(),
        reset: jest.fn(),
      });

      // When: Component renders
      render(<UserManagementPage />);

      // Then: Should show loading indicator
      expect(screen.getByTestId('search-loading')).toBeInTheDocument();
    });
  });
});