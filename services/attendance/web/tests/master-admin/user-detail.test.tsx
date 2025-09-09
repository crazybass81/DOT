/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserDetailModal } from '@/components/master-admin/UserDetailModal';
import { useUserDetail } from '@/hooks/useUserDetail';

// Mock dependencies
jest.mock('@/hooks/useUserDetail');
jest.mock('@/services/supabaseAuthService');

const mockUseUserDetail = useUserDetail as jest.MockedFunction<typeof useUserDetail>;

describe('UserDetailModal - 사용자 상세 정보 실패 테스트', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1.5.1 존재하지 않는 사용자 ID 조회', () => {
    it('존재하지 않는 사용자 ID로 조회 시 404 에러를 표시해야 한다', async () => {
      // Given: Non-existent user ID
      mockUseUserDetail.mockReturnValue({
        user: null,
        loading: false,
        error: '사용자를 찾을 수 없습니다.',
        activityStats: null,
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      // When: Modal opens with non-existent user ID
      render(
        <UserDetailModal 
          userId="non-existent-user-id" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // Then: Should display user not found error
      await waitFor(() => {
        expect(screen.getByText(/사용자를 찾을 수 없습니다/)).toBeInTheDocument();
      });

      // And: Should show empty state illustration
      expect(screen.getByTestId('user-not-found-illustration')).toBeInTheDocument();

      // And: Close button should be available
      expect(screen.getByRole('button', { name: /닫기/ })).toBeInTheDocument();
    });

    it('삭제된 사용자 조회 시 적절한 메시지를 표시해야 한다', async () => {
      // Given: Deleted user
      mockUseUserDetail.mockReturnValue({
        user: null,
        loading: false,
        error: '이 사용자는 삭제되었습니다.',
        activityStats: null,
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
        deletedUser: {
          id: 'deleted-user-id',
          email: 'deleted@example.com',
          full_name: '삭제된 사용자',
          deleted_at: '2024-08-01',
          deleted_by: 'admin@company.com',
        },
      });

      render(
        <UserDetailModal 
          userId="deleted-user-id" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Viewing deleted user
      await waitFor(() => {
        expect(screen.getByText(/이 사용자는 삭제되었습니다/)).toBeInTheDocument();
      });

      // Then: Should show deleted user info
      expect(screen.getByText('삭제된 사용자')).toBeInTheDocument();
      expect(screen.getByText('deleted@example.com')).toBeInTheDocument();
      expect(screen.getByText(/2024-08-01에 삭제됨/)).toBeInTheDocument();
    });

    it('권한이 없는 사용자 정보 조회 시 접근 거부 메시지를 표시해야 한다', async () => {
      // Given: Access denied for user
      mockUseUserDetail.mockReturnValue({
        user: null,
        loading: false,
        error: '이 사용자의 정보를 볼 권한이 없습니다.',
        activityStats: null,
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="restricted-user-id" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Access is denied
      await waitFor(() => {
        expect(screen.getByText(/이 사용자의 정보를 볼 권한이 없습니다/)).toBeInTheDocument();
      });

      // Then: Should show access denied state
      expect(screen.getByTestId('access-denied-icon')).toBeInTheDocument();
    });
  });

  describe('1.5.2 사용자 상세 정보 API 실패', () => {
    it('사용자 정보 로딩 중 네트워크 에러 발생 시 에러를 표시해야 한다', async () => {
      // Given: Network error during user info loading
      mockUseUserDetail.mockReturnValue({
        user: null,
        loading: false,
        error: '네트워크 연결을 확인해주세요.',
        activityStats: null,
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Network error occurs
      await waitFor(() => {
        expect(screen.getByText(/네트워크 연결을 확인해주세요/)).toBeInTheDocument();
      });

      // Then: Should provide retry option
      expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
    });

    it('서버 오류로 사용자 정보 로딩 실패 시 에러를 처리해야 한다', async () => {
      // Given: Server error
      mockUseUserDetail.mockReturnValue({
        user: null,
        loading: false,
        error: '서버에서 사용자 정보를 불러오는데 실패했습니다.',
        activityStats: null,
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Server error occurs
      await waitFor(() => {
        expect(screen.getByText(/서버에서 사용자 정보를 불러오는데 실패했습니다/)).toBeInTheDocument();
      });
    });

    it('부분적으로 로드된 사용자 정보를 적절히 표시해야 한다', async () => {
      // Given: Partially loaded user data
      mockUseUserDetail.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'user@company.com',
          full_name: '김사용자',
          phone: null, // Missing phone
          profile_image: null, // Missing image
          created_at: '2024-01-01',
          updated_at: '2024-09-06',
        },
        loading: false,
        error: null,
        activityStats: null, // Failed to load stats
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
        partialDataWarning: '일부 정보를 불러오지 못했습니다.',
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Partial data is loaded
      await waitFor(() => {
        expect(screen.getByText('김사용자')).toBeInTheDocument();
        expect(screen.getByText('user@company.com')).toBeInTheDocument();
      });

      // Then: Should show partial data warning
      expect(screen.getByText(/일부 정보를 불러오지 못했습니다/)).toBeInTheDocument();

      // And: Should show placeholders for missing data
      expect(screen.getByText(/전화번호 정보 없음/)).toBeInTheDocument();
      expect(screen.getByTestId('default-profile-avatar')).toBeInTheDocument();
    });

    it('재시도 버튼 클릭 시 사용자 정보를 다시 로드해야 한다', async () => {
      // Given: Error state with retry functionality
      const mockRefreshUser = jest.fn();
      mockUseUserDetail.mockReturnValue({
        user: null,
        loading: false,
        error: '사용자 정보 로딩에 실패했습니다.',
        activityStats: null,
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: mockRefreshUser,
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Retry button is clicked
      const retryButton = screen.getByRole('button', { name: /다시 시도/ });
      await userEvent.click(retryButton);

      // Then: Refresh function should be called
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('1.5.3 활동 통계 로딩 실패', () => {
    it('활동 통계 API 실패 시 기본 사용자 정보만 표시해야 한다', async () => {
      // Given: User info loaded but activity stats failed
      mockUseUserDetail.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'user@company.com',
          full_name: '김사용자',
          phone: '010-1234-5678',
          created_at: '2024-01-01',
          updated_at: '2024-09-06',
        },
        loading: false,
        error: null,
        activityStats: null,
        activityStatsError: '활동 통계를 불러오는데 실패했습니다.',
        organizationMemberships: [
          {
            id: 'membership-1',
            organization_id: 'org-1',
            organization_name: '테크 컴퍼니',
            role: 'EMPLOYEE',
            status: 'ACTIVE',
            joined_at: '2024-01-01',
          },
        ],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Activity stats fail to load
      await waitFor(() => {
        expect(screen.getByText('김사용자')).toBeInTheDocument();
        expect(screen.getByText('user@company.com')).toBeInTheDocument();
      });

      // Then: Should show activity stats error
      expect(screen.getByText(/활동 통계를 불러오는데 실패했습니다/)).toBeInTheDocument();

      // And: Should show placeholder for activity stats
      expect(screen.getByTestId('activity-stats-placeholder')).toBeInTheDocument();

      // And: Should provide option to retry activity stats
      expect(screen.getByRole('button', { name: /활동 통계 다시 로드/ })).toBeInTheDocument();
    });

    it('활동 통계 계산 오류 시 에러 메시지를 표시해야 한다', async () => {
      // Given: Activity stats calculation error
      mockUseUserDetail.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'user@company.com',
          full_name: '김사용자',
        },
        loading: false,
        error: null,
        activityStats: null,
        activityStatsError: '활동 통계 계산 중 오류가 발생했습니다. 데이터에 문제가 있을 수 있습니다.',
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Stats calculation error occurs
      await waitFor(() => {
        expect(screen.getByText(/활동 통계 계산 중 오류가 발생했습니다/)).toBeInTheDocument();
        expect(screen.getByText(/데이터에 문제가 있을 수 있습니다/)).toBeInTheDocument();
      });
    });

    it('권한 부족으로 활동 통계 접근 실패 시 적절한 메시지를 표시해야 한다', async () => {
      // Given: Insufficient permissions for activity stats
      mockUseUserDetail.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'user@company.com',
          full_name: '김사용자',
        },
        loading: false,
        error: null,
        activityStats: null,
        activityStatsError: '활동 통계를 볼 권한이 없습니다.',
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Permission denied for activity stats
      await waitFor(() => {
        expect(screen.getByText(/활동 통계를 볼 권한이 없습니다/)).toBeInTheDocument();
      });

      // Then: Should hide activity stats section
      expect(screen.queryByTestId('activity-stats-section')).toBeNull();
    });
  });

  describe('조직 멤버십 로딩 실패 테스트', () => {
    it('조직 멤버십 정보 로딩 실패 시 에러를 처리해야 한다', async () => {
      // Given: Organization membership loading error
      mockUseUserDetail.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'user@company.com',
          full_name: '김사용자',
        },
        loading: false,
        error: null,
        activityStats: {
          totalWorkDays: 150,
          averageWorkHours: 8.5,
          attendanceRate: 95.2,
          lastAttendance: '2024-09-06',
        },
        organizationMemberships: [],
        organizationMembershipError: '조직 정보를 불러오는데 실패했습니다.',
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: Organization membership loading fails
      await waitFor(() => {
        expect(screen.getByText(/조직 정보를 불러오는데 실패했습니다/)).toBeInTheDocument();
      });

      // Then: Should show error in organization section
      expect(screen.getByTestId('organization-error-state')).toBeInTheDocument();
    });

    it('삭제된 조직에 소속된 사용자 정보를 적절히 표시해야 한다', async () => {
      // Given: User belongs to deleted organization
      mockUseUserDetail.mockReturnValue({
        user: {
          id: 'user-1',
          email: 'user@company.com',
          full_name: '김사용자',
        },
        loading: false,
        error: null,
        activityStats: null,
        organizationMemberships: [
          {
            id: 'membership-1',
            organization_id: 'deleted-org-id',
            organization_name: '삭제된 조직',
            role: 'EMPLOYEE',
            status: 'INACTIVE',
            joined_at: '2024-01-01',
            organization_deleted: true,
            organization_deleted_at: '2024-08-01',
          },
        ],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // When: User has deleted organization membership
      await waitFor(() => {
        expect(screen.getByText('삭제된 조직')).toBeInTheDocument();
        expect(screen.getByText(/조직이 삭제됨/)).toBeInTheDocument();
        expect(screen.getByText(/2024-08-01/)).toBeInTheDocument();
      });

      // Then: Should mark membership as inactive
      expect(screen.getByText('INACTIVE')).toBeInTheDocument();
    });
  });

  describe('로딩 상태 테스트', () => {
    it('사용자 정보 로딩 중에는 스켈레톤을 표시해야 한다', async () => {
      // Given: Loading state
      mockUseUserDetail.mockReturnValue({
        user: null,
        loading: true,
        error: null,
        activityStats: null,
        organizationMemberships: [],
        recentActivities: [],
        refreshUser: jest.fn(),
        loadActivityStats: jest.fn(),
      });

      // When: Component renders in loading state
      render(
        <UserDetailModal 
          userId="user-1" 
          isOpen={true} 
          onClose={jest.fn()} 
        />
      );

      // Then: Should display loading skeleton
      await waitFor(() => {
        expect(screen.getByTestId('user-detail-skeleton')).toBeInTheDocument();
      });

      // And: Should show loading indicator
      expect(screen.getByTestId('modal-loading-spinner')).toBeInTheDocument();
    });
  });
});