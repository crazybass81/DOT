/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserSearchFilters } from '@/components/master-admin/UserSearchFilters';
import { useUserSearch } from '@/hooks/useUserSearch';

// Mock dependencies
jest.mock('@/hooks/useUserSearch');

const mockUseUserSearch = useUserSearch as jest.MockedFunction<typeof useUserSearch>;

describe('UserSearchFilters - 필터링 실패 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1.3.1 역할별 필터링 실패', () => {
    it('존재하지 않는 역할로 필터링 시 빈 결과를 반환해야 한다', async () => {
      // Given: Invalid role filter
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: null,
        filters: { role: 'INVALID_ROLE' },
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      // When: Component renders with invalid role filter
      render(<UserSearchFilters />);

      // Then: Should show no results for invalid role
      await waitFor(() => {
        expect(screen.getByText(/필터 조건에 맞는 사용자가 없습니다/)).toBeInTheDocument();
      });
    });

    it('역할 필터 API 에러 시 에러 메시지를 표시해야 한다', async () => {
      // Given: Role filter API error
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: '역할별 필터링 중 오류가 발생했습니다.',
        filters: { role: 'MANAGER' },
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      // When: Component renders
      render(<UserSearchFilters />);

      // Then: Should display role filter error
      await waitFor(() => {
        expect(screen.getByText(/역할별 필터링 중 오류가 발생했습니다/)).toBeInTheDocument();
      });
    });

    it('다중 역할 선택 시 필터 조합 오류를 처리해야 한다', async () => {
      // Given: Multiple conflicting role filters
      const mockSetFilters = jest.fn();
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: '역할 필터를 하나만 선택해주세요.',
        filters: { role: ['MANAGER', 'EMPLOYEE'] }, // Invalid multiple selection
        setFilters: mockSetFilters,
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      render(<UserSearchFilters />);

      // When: Try to select multiple roles
      const managerCheckbox = screen.getByLabelText('매니저');
      const employeeCheckbox = screen.getByLabelText('직원');

      await userEvent.click(managerCheckbox);
      await userEvent.click(employeeCheckbox);

      // Then: Should show error for multiple role selection
      await waitFor(() => {
        expect(screen.getByText(/역할 필터를 하나만 선택해주세요/)).toBeInTheDocument();
      });
    });
  });

  describe('1.3.2 조직별 필터링 실패', () => {
    it('존재하지 않는 조직으로 필터링 시 빈 결과를 반환해야 한다', async () => {
      // Given: Non-existent organization filter
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: null,
        filters: { organizationId: 'non-existent-org-id' },
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      // When: Component renders
      render(<UserSearchFilters />);

      // Then: Should show no users for non-existent organization
      await waitFor(() => {
        expect(screen.getByText(/해당 조직에 소속된 사용자가 없습니다/)).toBeInTheDocument();
      });
    });

    it('조직 목록 로딩 실패 시 에러를 처리해야 한다', async () => {
      // Given: Organization list loading error
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: '조직 목록을 불러오는데 실패했습니다.',
        filters: {},
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      // When: Component renders
      render(<UserSearchFilters />);

      // Then: Should display organization loading error
      await waitFor(() => {
        expect(screen.getByText(/조직 목록을 불러오는데 실패했습니다/)).toBeInTheDocument();
      });

      // And: Organization filter should be disabled
      const orgSelect = screen.getByTestId('organization-filter-select');
      expect(orgSelect).toBeDisabled();
    });

    it('삭제된 조직으로 필터링 시 적절한 메시지를 표시해야 한다', async () => {
      // Given: Deleted organization filter
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: null,
        filters: { organizationId: 'deleted-org-id', organizationStatus: 'DELETED' },
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      render(<UserSearchFilters />);

      // When: Filter by deleted organization
      await waitFor(() => {
        expect(screen.getByText(/삭제된 조직입니다/)).toBeInTheDocument();
        expect(screen.getByText(/다른 조직을 선택해주세요/)).toBeInTheDocument();
      });
    });
  });

  describe('1.3.3 날짜 범위 필터링 실패', () => {
    it('잘못된 날짜 형식 입력 시 에러를 표시해야 한다', async () => {
      // Given: Invalid date format
      const mockSetFilters = jest.fn();
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: null,
        filters: {},
        setFilters: mockSetFilters,
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      render(<UserSearchFilters />);

      // When: Enter invalid date format
      const startDateInput = screen.getByLabelText('시작 날짜');
      await userEvent.type(startDateInput, 'invalid-date');

      // Then: Should show date format error
      await waitFor(() => {
        expect(screen.getByText(/올바른 날짜 형식을 입력해주세요/)).toBeInTheDocument();
      });

      // And: Filter should not be applied
      expect(mockSetFilters).not.toHaveBeenCalled();
    });

    it('종료 날짜가 시작 날짜보다 이전인 경우 에러를 표시해야 한다', async () => {
      // Given: End date before start date
      const mockSetFilters = jest.fn();
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: null,
        filters: {},
        setFilters: mockSetFilters,
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      render(<UserSearchFilters />);

      // When: Set end date before start date
      const startDateInput = screen.getByLabelText('시작 날짜');
      const endDateInput = screen.getByLabelText('종료 날짜');

      await userEvent.type(startDateInput, '2024-09-06');
      await userEvent.type(endDateInput, '2024-09-01');

      // Then: Should show date range error
      await waitFor(() => {
        expect(screen.getByText(/종료 날짜는 시작 날짜보다 이후여야 합니다/)).toBeInTheDocument();
      });
    });

    it('미래 날짜로 필터링 시 적절한 메시지를 표시해야 한다', async () => {
      // Given: Future date filter
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: null,
        filters: { 
          startDate: futureDate.toISOString().split('T')[0],
          endDate: futureDate.toISOString().split('T')[0]
        },
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      render(<UserSearchFilters />);

      // When: Component renders with future date filter
      await waitFor(() => {
        expect(screen.getByText(/미래 날짜로는 사용자를 찾을 수 없습니다/)).toBeInTheDocument();
      });
    });

    it('날짜 범위가 너무 넓은 경우 경고를 표시해야 한다', async () => {
      // Given: Very wide date range (more than 2 years)
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2024-09-06');
      
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: null,
        filters: { 
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      render(<UserSearchFilters />);

      // When: Component renders with wide date range
      await waitFor(() => {
        expect(screen.getByText(/날짜 범위가 너무 넓습니다/)).toBeInTheDocument();
        expect(screen.getByText(/성능을 위해 더 짧은 기간을 선택해주세요/)).toBeInTheDocument();
      });
    });
  });

  describe('상태 필터링 실패 테스트', () => {
    it('잘못된 상태 값으로 필터링 시 에러를 처리해야 한다', async () => {
      // Given: Invalid status filter
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: '잘못된 상태 값입니다.',
        filters: { status: 'INVALID_STATUS' },
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      // When: Component renders
      render(<UserSearchFilters />);

      // Then: Should display invalid status error
      await waitFor(() => {
        expect(screen.getByText(/잘못된 상태 값입니다/)).toBeInTheDocument();
      });
    });

    it('복합 필터 적용 시 충돌하는 조건 에러를 처리해야 한다', async () => {
      // Given: Conflicting filter conditions
      mockUseUserSearch.mockReturnValue({
        searchResults: [],
        loading: false,
        error: '필터 조건이 충돌합니다. 설정을 확인해주세요.',
        filters: { 
          status: 'INACTIVE',
          lastLogin: 'TODAY' // Conflict: inactive users can't have today's login
        },
        setFilters: jest.fn(),
        searchQuery: '',
        setSearchQuery: jest.fn(),
        totalCount: 0,
        clearFilters: jest.fn(),
        applyFilters: jest.fn(),
      });

      render(<UserSearchFilters />);

      // When: Apply conflicting filters
      await waitFor(() => {
        expect(screen.getByText(/필터 조건이 충돌합니다/)).toBeInTheDocument();
        expect(screen.getByText(/설정을 확인해주세요/)).toBeInTheDocument();
      });
    });
  });
});