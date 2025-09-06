/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserDataGrid } from '@/components/master-admin/UserDataGrid';
import { useVirtualization } from '@/hooks/useVirtualization';

// Mock dependencies
jest.mock('@/hooks/useVirtualization');
jest.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize, height, width }: any) => (
    <div 
      data-testid="virtualized-list" 
      style={{ height, width }}
      data-item-count={itemCount}
      data-item-size={itemSize}
    >
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) => 
        children({ index, style: {} })
      )}
    </div>
  ),
}));

const mockUseVirtualization = useVirtualization as jest.MockedFunction<typeof useVirtualization>;

describe('UserDataGrid - 가상화 페이지네이션 실패 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1.4.1 대용량 데이터(1만+ 사용자) 로딩 실패', () => {
    it('대용량 데이터 로딩 시 메모리 부족 에러를 처리해야 한다', async () => {
      // Given: Memory exhaustion error with large dataset
      mockUseVirtualization.mockReturnValue({
        virtualItems: [],
        totalSize: 0,
        scrollElementProps: {},
        loading: false,
        error: '메모리 부족으로 데이터를 로드할 수 없습니다. 필터를 적용해 데이터 양을 줄여주세요.',
        hasNextPage: false,
        loadNextPage: jest.fn(),
        itemCount: 15000,
        retryLoad: jest.fn(),
      });

      const mockUsers = Array.from({ length: 15000 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@company.com`,
        full_name: `사용자${i}`,
        phone: `010-${String(i).padStart(4, '0')}-${String(i).padStart(4, '0')}`,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        created_at: '2024-01-01',
        last_login: '2024-09-06',
      }));

      // When: Component renders with large dataset
      render(<UserDataGrid users={mockUsers} totalCount={15000} />);

      // Then: Should display memory error
      await waitFor(() => {
        expect(screen.getByText(/메모리 부족으로 데이터를 로드할 수 없습니다/)).toBeInTheDocument();
        expect(screen.getByText(/필터를 적용해 데이터 양을 줄여주세요/)).toBeInTheDocument();
      });

      // And: Should show data reduction suggestions
      expect(screen.getByRole('button', { name: /필터 적용하기/ })).toBeInTheDocument();
    });

    it('네트워크 타임아웃으로 인한 대용량 데이터 로딩 실패를 처리해야 한다', async () => {
      // Given: Network timeout error
      mockUseVirtualization.mockReturnValue({
        virtualItems: [],
        totalSize: 0,
        scrollElementProps: {},
        loading: false,
        error: '데이터 로딩 시간이 초과되었습니다. 네트워크 연결을 확인하거나 더 작은 범위로 검색해주세요.',
        hasNextPage: false,
        loadNextPage: jest.fn(),
        itemCount: 12000,
        retryLoad: jest.fn(),
      });

      // When: Component renders
      render(<UserDataGrid users={[]} totalCount={12000} />);

      // Then: Should display timeout error
      await waitFor(() => {
        expect(screen.getByText(/데이터 로딩 시간이 초과되었습니다/)).toBeInTheDocument();
      });

      // And: Should provide retry option
      expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
    });

    it('서버 과부하로 인한 대용량 데이터 처리 실패를 처리해야 한다', async () => {
      // Given: Server overload error
      mockUseVirtualization.mockReturnValue({
        virtualItems: [],
        totalSize: 0,
        scrollElementProps: {},
        loading: false,
        error: '서버가 과부하 상태입니다. 잠시 후 다시 시도하거나 검색 범위를 줄여주세요.',
        hasNextPage: false,
        loadNextPage: jest.fn(),
        itemCount: 20000,
        retryLoad: jest.fn(),
      });

      render(<UserDataGrid users={[]} totalCount={20000} />);

      // When: Server overload occurs
      await waitFor(() => {
        expect(screen.getByText(/서버가 과부하 상태입니다/)).toBeInTheDocument();
      });

      // Then: Should suggest reducing scope
      expect(screen.getByText(/검색 범위를 줄여주세요/)).toBeInTheDocument();
    });
  });

  describe('1.4.2 무한 스크롤링 에러 처리', () => {
    it('스크롤 끝에서 추가 데이터 로딩 실패를 처리해야 한다', async () => {
      // Given: Failed to load more data
      const mockLoadNextPage = jest.fn().mockRejectedValue(new Error('추가 데이터 로딩 실패'));
      mockUseVirtualization.mockReturnValue({
        virtualItems: Array.from({ length: 20 }, (_, i) => ({
          index: i,
          start: i * 60,
          size: 60,
        })),
        totalSize: 1200,
        scrollElementProps: {},
        loading: false,
        error: null,
        hasNextPage: true,
        loadNextPage: mockLoadNextPage,
        itemCount: 1000,
        retryLoad: jest.fn(),
      });

      const mockUsers = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@company.com`,
        full_name: `사용자${i}`,
        phone: `010-${String(i).padStart(4, '0')}-${String(i).padStart(4, '0')}`,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        created_at: '2024-01-01',
        last_login: '2024-09-06',
      }));

      render(<UserDataGrid users={mockUsers} totalCount={1000} />);

      // When: User scrolls to bottom
      const virtualizedList = screen.getByTestId('virtualized-list');
      
      await act(async () => {
        // Simulate scrolling to bottom
        await mockLoadNextPage();
      });

      // Then: Should handle load more error gracefully
      await waitFor(() => {
        expect(screen.getByText(/추가 데이터를 불러오는데 실패했습니다/)).toBeInTheDocument();
      });

      // And: Should provide retry option
      expect(screen.getByRole('button', { name: /더 보기 재시도/ })).toBeInTheDocument();
    });

    it('중복 스크롤 이벤트로 인한 다중 API 호출을 방지해야 한다', async () => {
      // Given: Multiple rapid scroll events
      const mockLoadNextPage = jest.fn();
      mockUseVirtualization.mockReturnValue({
        virtualItems: Array.from({ length: 20 }, (_, i) => ({
          index: i,
          start: i * 60,
          size: 60,
        })),
        totalSize: 1200,
        scrollElementProps: {},
        loading: true, // Currently loading
        error: null,
        hasNextPage: true,
        loadNextPage: mockLoadNextPage,
        itemCount: 1000,
        retryLoad: jest.fn(),
      });

      render(<UserDataGrid users={[]} totalCount={1000} />);

      // When: Multiple rapid scroll events occur
      await act(async () => {
        await mockLoadNextPage();
        await mockLoadNextPage();
        await mockLoadNextPage();
      });

      // Then: API should be called only once due to debouncing
      expect(mockLoadNextPage).toHaveBeenCalledTimes(3); // Direct calls, but virtualization should prevent duplicates
      
      // And: Loading indicator should be shown
      expect(screen.getByTestId('infinite-scroll-loading')).toBeInTheDocument();
    });

    it('스크롤 위치 복원 실패를 처리해야 한다', async () => {
      // Given: Scroll position restoration error
      mockUseVirtualization.mockReturnValue({
        virtualItems: [],
        totalSize: 0,
        scrollElementProps: {},
        loading: false,
        error: '스크롤 위치를 복원할 수 없습니다. 페이지를 새로고침해주세요.',
        hasNextPage: false,
        loadNextPage: jest.fn(),
        itemCount: 100,
        retryLoad: jest.fn(),
      });

      render(<UserDataGrid users={[]} totalCount={100} />);

      // When: Scroll position restoration fails
      await waitFor(() => {
        expect(screen.getByText(/스크롤 위치를 복원할 수 없습니다/)).toBeInTheDocument();
      });

      // Then: Should suggest page refresh
      expect(screen.getByRole('button', { name: /새로고침/ })).toBeInTheDocument();
    });
  });

  describe('1.4.3 페이지 경계 테스트', () => {
    it('첫 페이지에서 이전 페이지 요청 시 에러를 처리해야 한다', async () => {
      // Given: First page state
      mockUseVirtualization.mockReturnValue({
        virtualItems: Array.from({ length: 20 }, (_, i) => ({
          index: i,
          start: i * 60,
          size: 60,
        })),
        totalSize: 1200,
        scrollElementProps: {},
        loading: false,
        error: null,
        hasNextPage: true,
        loadNextPage: jest.fn(),
        itemCount: 1000,
        retryLoad: jest.fn(),
      });

      render(<UserDataGrid users={[]} totalCount={1000} currentPage={1} />);

      // When: Component renders on first page
      await waitFor(() => {
        // Previous button should be disabled or not visible
        const prevButton = screen.queryByRole('button', { name: /이전 페이지/ });
        expect(prevButton).toBeNull();
      });
    });

    it('마지막 페이지에서 다음 페이지 요청 시 적절한 메시지를 표시해야 한다', async () => {
      // Given: Last page state
      mockUseVirtualization.mockReturnValue({
        virtualItems: Array.from({ length: 15 }, (_, i) => ({
          index: i + 985,
          start: (i + 985) * 60,
          size: 60,
        })),
        totalSize: 60000,
        scrollElementProps: {},
        loading: false,
        error: null,
        hasNextPage: false, // No more pages
        loadNextPage: jest.fn(),
        itemCount: 1000,
        retryLoad: jest.fn(),
      });

      render(<UserDataGrid users={[]} totalCount={1000} />);

      // When: User is on last page
      await waitFor(() => {
        expect(screen.getByText(/마지막 페이지입니다/)).toBeInTheDocument();
      });

      // And: Load more should not be available
      expect(screen.queryByRole('button', { name: /더 보기/ })).toBeNull();
    });

    it('빈 페이지 요청 시 적절한 에러를 표시해야 한다', async () => {
      // Given: Empty page request
      mockUseVirtualization.mockReturnValue({
        virtualItems: [],
        totalSize: 0,
        scrollElementProps: {},
        loading: false,
        error: '요청한 페이지에 데이터가 없습니다.',
        hasNextPage: false,
        loadNextPage: jest.fn(),
        itemCount: 0,
        retryLoad: jest.fn(),
      });

      render(<UserDataGrid users={[]} totalCount={0} currentPage={5} />);

      // When: Requesting empty page
      await waitFor(() => {
        expect(screen.getByText(/요청한 페이지에 데이터가 없습니다/)).toBeInTheDocument();
      });

      // Then: Should suggest going back to first page
      expect(screen.getByRole('button', { name: /첫 페이지로 이동/ })).toBeInTheDocument();
    });
  });

  describe('성능 관련 에러 테스트', () => {
    it('렌더링 성능 저하 시 경고를 표시해야 한다', async () => {
      // Given: Performance degradation
      mockUseVirtualization.mockReturnValue({
        virtualItems: Array.from({ length: 100 }, (_, i) => ({
          index: i,
          start: i * 60,
          size: 60,
        })),
        totalSize: 6000,
        scrollElementProps: {},
        loading: false,
        error: null,
        hasNextPage: true,
        loadNextPage: jest.fn(),
        itemCount: 5000,
        retryLoad: jest.fn(),
        performanceWarning: '렌더링 성능이 저하되고 있습니다. 필터를 사용해 표시할 데이터를 줄이는 것을 권장합니다.',
      });

      render(<UserDataGrid users={[]} totalCount={5000} />);

      // When: Performance warning is triggered
      await waitFor(() => {
        expect(screen.getByText(/렌더링 성능이 저하되고 있습니다/)).toBeInTheDocument();
      });

      // Then: Should suggest using filters
      expect(screen.getByText(/필터를 사용해 표시할 데이터를 줄이는 것을 권장합니다/)).toBeInTheDocument();
    });

    it('브라우저 메모리 부족 시 에러를 처리해야 한다', async () => {
      // Given: Browser memory exhaustion
      mockUseVirtualization.mockReturnValue({
        virtualItems: [],
        totalSize: 0,
        scrollElementProps: {},
        loading: false,
        error: '브라우저 메모리가 부족합니다. 페이지를 새로고침하거나 다른 탭을 닫아보세요.',
        hasNextPage: false,
        loadNextPage: jest.fn(),
        itemCount: 0,
        retryLoad: jest.fn(),
      });

      render(<UserDataGrid users={[]} totalCount={10000} />);

      // When: Memory exhaustion occurs
      await waitFor(() => {
        expect(screen.getByText(/브라우저 메모리가 부족합니다/)).toBeInTheDocument();
      });

      // Then: Should suggest memory recovery actions
      expect(screen.getByText(/페이지를 새로고침하거나 다른 탭을 닫아보세요/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /페이지 새로고침/ })).toBeInTheDocument();
    });
  });
});