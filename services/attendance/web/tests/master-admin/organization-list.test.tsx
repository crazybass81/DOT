/**
 * TDD Phase 3.3.1.1: 마스터 어드민 조직 목록/검색/필터 시스템 테스트
 * 🔴 RED: 실패하는 테스트 먼저 작성
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { jest } from '@jest/globals';
import { OrganizationListPage } from '@/components/master-admin/OrganizationListPage';
import { OrganizationType, OrganizationStatus } from '@/types/organization.types';

// Mock modules
jest.mock('@/api/organization.api', () => ({
  organizationApi: {
    getOrganizationList: jest.fn(),
    getOrganizationStats: jest.fn()
  }
}));

jest.mock('@/hooks/useAuthGuard', () => ({
  useAuthGuard: () => ({
    user: {
      id: 'master-admin-1',
      isMasterAdmin: true,
      roles: []
    },
    loading: false,
    hasPermission: () => true
  })
}));

// Test data
const mockOrganizations = [
  {
    id: 'org-1',
    name: '테스트 회사 A',
    type: OrganizationType.CORP,
    businessRegistrationNumber: '123-45-67890',
    address: '서울시 강남구',
    phone: '02-1234-5678',
    status: OrganizationStatus.ACTIVE,
    employeeCount: 25,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'org-2',
    name: '테스트 개인사업자',
    type: OrganizationType.PERSONAL,
    businessRegistrationNumber: '987-65-43210',
    status: OrganizationStatus.INACTIVE,
    employeeCount: 3,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-02-20')
  }
];

const mockStats = {
  totalOrganizations: 2,
  activeOrganizations: 1,
  inactiveOrganizations: 1,
  pendingOrganizations: 0,
  totalEmployees: 28,
  organizationsByType: {
    [OrganizationType.CORP]: 1,
    [OrganizationType.PERSONAL]: 1,
    [OrganizationType.FRANCHISE]: 0
  },
  recentCreations: 2
};

// Helper function to create test wrapper
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('OrganizationListPage - TDD Red Phase', () => {
  let mockGetOrganizationList: jest.Mock;
  let mockGetOrganizationStats: jest.Mock;

  beforeEach(() => {
    const { organizationApi } = require('@/api/organization.api');
    mockGetOrganizationList = organizationApi.getOrganizationList as jest.Mock;
    mockGetOrganizationStats = organizationApi.getOrganizationStats as jest.Mock;
    
    mockGetOrganizationList.mockResolvedValue({
      organizations: mockOrganizations,
      total: 2,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false
    });
    
    mockGetOrganizationStats.mockResolvedValue(mockStats);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('🔴 권한 검증 테스트', () => {
    test('MASTER_ADMIN 권한이 있는 사용자만 접근 가능해야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      // 권한 검증 로직이 실행되고 페이지가 렌더링되어야 함
      expect(screen.queryByText('접근 권한이 없습니다')).not.toBeInTheDocument();
      
      // 조직 목록 제목이 표시되어야 함
      await waitFor(() => {
        expect(screen.getByText('조직 관리')).toBeInTheDocument();
      });
    });

    test('MASTER_ADMIN 권한이 없는 사용자는 접근이 거부되어야 함', async () => {
      // Mock 일반 사용자
      const { useAuthGuard } = require('@/hooks/useAuthGuard');
      useAuthGuard.mockReturnValue({
        user: {
          id: 'user-1',
          isMasterAdmin: false,
          roles: [{ roleType: 'WORKER' }]
        },
        loading: false,
        hasPermission: () => false
      });

      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('접근 권한이 없습니다')).toBeInTheDocument();
      });
    });
  });

  describe('🔴 조직 목록 로딩 및 표시 테스트', () => {
    test('조직 목록이 정상적으로 로딩되고 표시되어야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      // 로딩 상태 확인
      expect(screen.getByText('조직 목록을 불러오는 중...')).toBeInTheDocument();

      // 조직 목록 로딩 완료 후 표시 확인
      await waitFor(() => {
        expect(screen.getByText('테스트 회사 A')).toBeInTheDocument();
        expect(screen.getByText('테스트 개인사업자')).toBeInTheDocument();
      });

      // 조직 정보 확인
      expect(screen.getByText('123-45-67890')).toBeInTheDocument();
      expect(screen.getByText('법인')).toBeInTheDocument();
      expect(screen.getByText('개인사업자')).toBeInTheDocument();
      expect(screen.getByText('활성')).toBeInTheDocument();
      expect(screen.getByText('비활성')).toBeInTheDocument();
    });

    test('통계 정보가 정상적으로 표시되어야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('전체 조직')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(screen.getByText('활성 조직')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(screen.getByText('전체 직원')).toBeInTheDocument();
        expect(screen.getByText('28')).toBeInTheDocument();
      });
    });
  });

  describe('🔴 검색 기능 테스트', () => {
    test('조직명으로 검색할 수 있어야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('조직명 또는 사업자번호로 검색')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('조직명 또는 사업자번호로 검색');
      
      fireEvent.change(searchInput, { target: { value: '테스트 회사' } });
      fireEvent.click(screen.getByText('검색'));

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              search: '테스트 회사'
            })
          })
        );
      });
    });

    test('사업자번호로 검색할 수 있어야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('조직명 또는 사업자번호로 검색');
        fireEvent.change(searchInput, { target: { value: '123-45-67890' } });
        fireEvent.click(screen.getByText('검색'));
      });

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              search: '123-45-67890'
            })
          })
        );
      });
    });
  });

  describe('🔴 필터링 기능 테스트', () => {
    test('상태별 필터링이 가능해야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const statusFilter = screen.getByLabelText('상태');
        fireEvent.click(statusFilter);
      });

      fireEvent.click(screen.getByText('활성만'));

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              status: [OrganizationStatus.ACTIVE]
            })
          })
        );
      });
    });

    test('조직 타입별 필터링이 가능해야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const typeFilter = screen.getByLabelText('조직 타입');
        fireEvent.click(typeFilter);
      });

      fireEvent.click(screen.getByText('법인만'));

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              type: [OrganizationType.CORP]
            })
          })
        );
      });
    });

    test('직원수 범위 필터링이 가능해야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const employeeFilter = screen.getByLabelText('직원수');
        fireEvent.change(employeeFilter, { target: { value: '10-50' } });
      });

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.objectContaining({
              employeeCountRange: {
                min: 10,
                max: 50
              }
            })
          })
        );
      });
    });
  });

  describe('🔴 정렬 기능 테스트', () => {
    test('조직명으로 정렬할 수 있어야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const nameHeader = screen.getByText('조직명');
        fireEvent.click(nameHeader);
      });

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: {
              field: 'name',
              direction: 'asc'
            }
          })
        );
      });
    });

    test('생성일로 정렬할 수 있어야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const createdAtHeader = screen.getByText('생성일');
        fireEvent.click(createdAtHeader);
      });

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: {
              field: 'createdAt',
              direction: 'desc'
            }
          })
        );
      });
    });

    test('직원수로 정렬할 수 있어야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const employeeCountHeader = screen.getByText('직원수');
        fireEvent.click(employeeCountHeader);
      });

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: {
              field: 'employeeCount',
              direction: 'desc'
            }
          })
        );
      });
    });
  });

  describe('🔴 페이지네이션 테스트', () => {
    test('페이지네이션이 정상적으로 작동해야 함', async () => {
      mockGetOrganizationList.mockResolvedValue({
        organizations: mockOrganizations,
        total: 100,
        page: 1,
        pageSize: 20,
        totalPages: 5,
        hasNextPage: true,
        hasPreviousPage: false
      });

      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('페이지 1 / 5')).toBeInTheDocument();
        expect(screen.getByText('다음')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('다음'));

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2
          })
        );
      });
    });

    test('페이지 크기 변경이 가능해야 함', async () => {
      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const pageSizeSelect = screen.getByLabelText('페이지 크기');
        fireEvent.change(pageSizeSelect, { target: { value: '50' } });
      });

      await waitFor(() => {
        expect(mockGetOrganizationList).toHaveBeenCalledWith(
          expect.objectContaining({
            pageSize: 50
          })
        );
      });
    });
  });

  describe('🔴 에러 처리 테스트', () => {
    test('네트워크 오류 시 에러 메시지가 표시되어야 함', async () => {
      mockGetOrganizationList.mockRejectedValue(new Error('네트워크 오류'));

      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('조직 목록을 불러오는데 실패했습니다')).toBeInTheDocument();
      });
    });

    test('권한 없음 오류 시 적절한 메시지가 표시되어야 함', async () => {
      mockGetOrganizationList.mockRejectedValue({
        response: { status: 403, data: { error: 'Insufficient permissions' } }
      });

      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('접근 권한이 없습니다')).toBeInTheDocument();
      });
    });
  });

  describe('🔴 성능 테스트', () => {
    test('대용량 데이터 렌더링 시 가상화가 적용되어야 함', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `org-${i}`,
        name: `조직 ${i}`,
        type: OrganizationType.CORP,
        status: OrganizationStatus.ACTIVE,
        employeeCount: Math.floor(Math.random() * 100),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      mockGetOrganizationList.mockResolvedValue({
        organizations: largeDataset,
        total: 1000,
        page: 1,
        pageSize: 1000,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false
      });

      const TestWrapper = createTestWrapper();
      
      render(
        <TestWrapper>
          <OrganizationListPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // 가상화된 테이블이 렌더링되어야 함
        expect(screen.getByTestId('virtualized-table')).toBeInTheDocument();
        
        // 모든 항목이 DOM에 있지 않아야 함 (가상화 효과)
        const visibleRows = screen.getAllByTestId(/^organization-row-/);
        expect(visibleRows.length).toBeLessThan(1000);
        expect(visibleRows.length).toBeGreaterThan(0);
      });
    });
  });
});