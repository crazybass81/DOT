/**
 * 사용자 상세 정보 조회 및 관리 훅
 * 사용자 정보, 활동 통계, 조직 멤버십, 최근 활동 등 종합적인 정보 제공
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  profile_image: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  email_verified: boolean;
  phone_verified: boolean;
  two_factor_enabled: boolean;
  timezone: string | null;
  locale: string | null;
  metadata: Record<string, any> | null;
}

interface OrganizationMembership {
  id: string;
  name: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'MASTER_ADMIN';
  status: string;
  joined_at: string;
  approved_at: string | null;
  approved_by: string | null;
  organization_status: string;
}

interface RecentActivity {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
  details: Record<string, any> | null;
}

interface ActivityStats {
  totalWorkDays: number;
  averageWorkHours: number;
  attendanceRate: number;
  punctualityRate: number;
  overtimeHours: number;
  lastAttendance: string | null;
  thisMonth: {
    workDays: number;
    workHours: number;
    attendanceRate: number;
  };
  lastMonth: {
    workDays: number;
    workHours: number;
    attendanceRate: number;
  };
  totalLogins: number;
  lastLoginDate: string | null;
  averageSessionDuration: number;
  organizationsCount: number;
  activeOrganizations: number;
  notificationStats: {
    total: number;
    read: number;
    unread: number;
    readRate: number;
  };
  locationStats: {
    uniqueLocations: number;
    mostUsedLocation: string | null;
    remoteWorkDays: number;
  };
  calculatedAt: string;
  dataRange: {
    startDate: string;
    endDate: string;
  };
}

interface DeletedUser {
  id: string;
  email: string;
  full_name: string;
  deleted_at: string;
  deleted_by: string;
}

interface UseUserDetailState {
  user: User | null;
  loading: boolean;
  error: string | null;
  activityStats: ActivityStats | null;
  activityStatsError: string | null;
  activityStatsLoading: boolean;
  organizationMemberships: OrganizationMembership[];
  organizationMembershipError: string | null;
  recentActivities: RecentActivity[];
  deletedUser: DeletedUser | null;
  partialDataWarning: string | null;
}

interface UseUserDetailActions {
  refreshUser: () => Promise<void>;
  loadActivityStats: () => Promise<void>;
}

type UseUserDetail = UseUserDetailState & UseUserDetailActions;

export function useUserDetail(userId: string | null): UseUserDetail {
  const [state, setState] = useState<UseUserDetailState>({
    user: null,
    loading: false,
    error: null,
    activityStats: null,
    activityStatsError: null,
    activityStatsLoading: false,
    organizationMemberships: [],
    organizationMembershipError: null,
    recentActivities: [],
    deletedUser: null,
    partialDataWarning: null,
  });

  const abortController = useRef<AbortController | null>(null);
  const statsAbortController = useRef<AbortController | null>(null);

  // 사용자 기본 정보 로드
  const loadUser = useCallback(async (targetUserId: string) => {
    // 이전 요청 취소
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        user: null,
        deletedUser: null,
        partialDataWarning: null,
      }));

      const response = await fetch(`/api/master-admin/users/${targetUserId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: abortController.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 404) {
          // 삭제된 사용자인지 확인 (실제로는 별도 API가 필요할 수 있음)
          if (errorData.deletedUser) {
            setState(prev => ({
              ...prev,
              loading: false,
              error: errorData.error || '이 사용자는 삭제되었습니다.',
              deletedUser: errorData.deletedUser,
            }));
            return;
          }
          throw new Error('사용자를 찾을 수 없습니다.');
        } else if (response.status === 403) {
          throw new Error('이 사용자의 정보를 볼 권한이 없습니다.');
        } else {
          throw new Error(errorData.error || `HTTP ${response.status}: 사용자 정보 조회 실패`);
        }
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '사용자 정보를 불러오는데 실패했습니다.');
      }

      // 부분 데이터 경고 체크
      let partialWarning = null;
      const user = data.user;
      
      if (!user.phone && !user.profile_image) {
        partialWarning = '일부 정보를 불러오지 못했습니다.';
      }

      setState(prev => ({
        ...prev,
        user: user,
        organizationMemberships: user.organizations || [],
        recentActivities: user.recent_activities || [],
        loading: false,
        error: null,
        partialDataWarning: partialWarning,
      }));

    } catch (error) {
      // 요청이 취소된 경우는 무시
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('사용자 정보 조회 오류:', error);
      
      let errorMessage = '서버에서 사용자 정보를 불러오는데 실패했습니다.';
      
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.message.includes('네트워크')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  }, []);

  // 활동 통계 로드
  const loadActivityStats = useCallback(async () => {
    if (!userId) return;

    // 이전 요청 취소
    if (statsAbortController.current) {
      statsAbortController.current.abort();
    }
    statsAbortController.current = new AbortController();

    try {
      setState(prev => ({
        ...prev,
        activityStatsLoading: true,
        activityStatsError: null,
      }));

      const response = await fetch(`/api/master-admin/users/${userId}/activity-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: statsAbortController.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403) {
          throw new Error('활동 통계를 볼 권한이 없습니다.');
        } else if (response.status === 404) {
          throw new Error('사용자를 찾을 수 없습니다.');
        } else {
          throw new Error(errorData.error || '활동 통계를 불러오는데 실패했습니다.');
        }
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '활동 통계 계산 중 오류가 발생했습니다.');
      }

      setState(prev => ({
        ...prev,
        activityStats: data.stats,
        activityStatsLoading: false,
        activityStatsError: null,
      }));

    } catch (error) {
      // 요청이 취소된 경우는 무시
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      console.error('활동 통계 조회 오류:', error);
      
      let errorMessage = '활동 통계를 불러오는데 실패했습니다.';
      
      if (error instanceof Error) {
        if (error.message.includes('권한')) {
          errorMessage = error.message;
        } else if (error.message.includes('계산')) {
          errorMessage = '활동 통계 계산 중 오류가 발생했습니다. 데이터에 문제가 있을 수 있습니다.';
        } else if (error.message.includes('fetch') || error.message.includes('네트워크')) {
          errorMessage = '네트워크 연결을 확인해주세요.';
        } else {
          errorMessage = error.message;
        }
      }

      setState(prev => ({
        ...prev,
        activityStatsLoading: false,
        activityStatsError: errorMessage,
      }));
    }
  }, [userId]);

  // 사용자 정보 새로고침
  const refreshUser = useCallback(async () => {
    if (!userId) return;
    
    await loadUser(userId);
    // 활동 통계도 함께 새로고침
    await loadActivityStats();
  }, [userId, loadUser, loadActivityStats]);

  // userId가 변경되면 사용자 정보 로드
  useEffect(() => {
    if (!userId) {
      setState({
        user: null,
        loading: false,
        error: null,
        activityStats: null,
        activityStatsError: null,
        activityStatsLoading: false,
        organizationMemberships: [],
        organizationMembershipError: null,
        recentActivities: [],
        deletedUser: null,
        partialDataWarning: null,
      });
      return;
    }

    loadUser(userId);
  }, [userId, loadUser]);

  // 사용자 정보가 로드된 후 활동 통계 자동 로드
  useEffect(() => {
    if (state.user && !state.activityStats && !state.activityStatsLoading) {
      loadActivityStats();
    }
  }, [state.user, state.activityStats, state.activityStatsLoading, loadActivityStats]);

  // cleanup
  useEffect(() => {
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
      if (statsAbortController.current) {
        statsAbortController.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    refreshUser,
    loadActivityStats,
  };
}