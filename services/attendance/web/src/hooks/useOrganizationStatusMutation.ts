/**
 * 조직 상태 변경을 위한 React Query Mutation 훅
 * 개별 상태 변경, 벌크 상태 변경, 실행 취소 기능 제공
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  OrganizationStatusChangeRequest,
  OrganizationStatusChangeResponse,
  BulkOrganizationStatusChangeRequest,
  BulkOrganizationStatusChangeResponse,
  UndoStatusChangeRequest,
  UndoStatusChangeResponse,
  OrganizationStatus
} from '@/types/organization.types';

// API 호출 함수들
const changeOrganizationStatus = async (
  request: OrganizationStatusChangeRequest
): Promise<OrganizationStatusChangeResponse> => {
  const response = await fetch(`/api/master-admin/organizations/${request.organizationId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newStatus: request.newStatus,
      reason: request.reason,
      changedBy: request.changedBy
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

const changeBulkOrganizationStatus = async (
  request: BulkOrganizationStatusChangeRequest
): Promise<BulkOrganizationStatusChangeResponse> => {
  const response = await fetch('/api/master-admin/organizations/bulk-status', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

const undoStatusChange = async (
  request: UndoStatusChangeRequest
): Promise<UndoStatusChangeResponse> => {
  const response = await fetch('/api/master-admin/organizations/undo-status-change', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// 훅 인터페이스
interface UseOrganizationStatusMutationOptions {
  onSuccess?: (data: any, variables: any) => void;
  onError?: (error: Error, variables: any) => void;
  onSettled?: (data: any, error: Error | null, variables: any) => void;
}

export interface OrganizationStatusMutations {
  // 개별 조직 상태 변경
  changeStatus: {
    mutate: (request: OrganizationStatusChangeRequest) => void;
    mutateAsync: (request: OrganizationStatusChangeRequest) => Promise<OrganizationStatusChangeResponse>;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    data: OrganizationStatusChangeResponse | undefined;
    reset: () => void;
  };
  
  // 벌크 조직 상태 변경
  changeBulkStatus: {
    mutate: (request: BulkOrganizationStatusChangeRequest) => void;
    mutateAsync: (request: BulkOrganizationStatusChangeRequest) => Promise<BulkOrganizationStatusChangeResponse>;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    data: BulkOrganizationStatusChangeResponse | undefined;
    reset: () => void;
  };
  
  // 상태 변경 실행 취소
  undoStatusChange: {
    mutate: (request: UndoStatusChangeRequest) => void;
    mutateAsync: (request: UndoStatusChangeRequest) => Promise<UndoStatusChangeResponse>;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    data: UndoStatusChangeResponse | undefined;
    reset: () => void;
  };
}

/**
 * 조직 상태 관리를 위한 통합 Mutation 훅
 */
export function useOrganizationStatusMutation(
  options: UseOrganizationStatusMutationOptions = {}
): OrganizationStatusMutations {
  const queryClient = useQueryClient();

  // 개별 조직 상태 변경 mutation
  const changeStatusMutation = useMutation({
    mutationFn: changeOrganizationStatus,
    onSuccess: (data, variables) => {
      // 조직 목록 쿼리 무효화 및 재로드
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizationStats'] });
      
      // 감사 로그 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['organizationAuditLogs', data.organizationId] 
      });
      
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      console.error('조직 상태 변경 실패:', error);
      options.onError?.(error, variables);
    },
    onSettled: options.onSettled
  });

  // 벌크 조직 상태 변경 mutation
  const changeBulkStatusMutation = useMutation({
    mutationFn: changeBulkOrganizationStatus,
    onSuccess: (data, variables) => {
      // 관련된 모든 쿼리 무효화
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizationStats'] });
      
      // 성공한 조직들의 개별 쿼리 무효화
      data.results.forEach(result => {
        if (result.success) {
          queryClient.invalidateQueries({ 
            queryKey: ['organization', result.organizationId] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['organizationAuditLogs', result.organizationId] 
          });
        }
      });
      
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      console.error('벌크 조직 상태 변경 실패:', error);
      options.onError?.(error, variables);
    },
    onSettled: options.onSettled
  });

  // 상태 변경 실행 취소 mutation
  const undoStatusChangeMutation = useMutation({
    mutationFn: undoStatusChange,
    onSuccess: (data, variables) => {
      // 조직 목록 쿼리 무효화 및 재로드
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', data.organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizationStats'] });
      
      // 감사 로그 쿼리 무효화 (실행 취소 내역 반영)
      queryClient.invalidateQueries({ 
        queryKey: ['organizationAuditLogs', data.organizationId] 
      });
      
      options.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      console.error('상태 변경 실행 취소 실패:', error);
      options.onError?.(error, variables);
    },
    onSettled: options.onSettled
  });

  return {
    changeStatus: {
      mutate: changeStatusMutation.mutate,
      mutateAsync: changeStatusMutation.mutateAsync,
      isLoading: changeStatusMutation.isPending,
      isError: changeStatusMutation.isError,
      error: changeStatusMutation.error,
      data: changeStatusMutation.data,
      reset: changeStatusMutation.reset
    },
    changeBulkStatus: {
      mutate: changeBulkStatusMutation.mutate,
      mutateAsync: changeBulkStatusMutation.mutateAsync,
      isLoading: changeBulkStatusMutation.isPending,
      isError: changeBulkStatusMutation.isError,
      error: changeBulkStatusMutation.error,
      data: changeBulkStatusMutation.data,
      reset: changeBulkStatusMutation.reset
    },
    undoStatusChange: {
      mutate: undoStatusChangeMutation.mutate,
      mutateAsync: undoStatusChangeMutation.mutateAsync,
      isLoading: undoStatusChangeMutation.isPending,
      isError: undoStatusChangeMutation.isError,
      error: undoStatusChangeMutation.error,
      data: undoStatusChangeMutation.data,
      reset: undoStatusChangeMutation.reset
    }
  };
}

// 편의를 위한 개별 훅들
export function useChangeOrganizationStatus(options?: UseOrganizationStatusMutationOptions) {
  const mutations = useOrganizationStatusMutation(options);
  return mutations.changeStatus;
}

export function useBulkChangeOrganizationStatus(options?: UseOrganizationStatusMutationOptions) {
  const mutations = useOrganizationStatusMutation(options);
  return mutations.changeBulkStatus;
}

export function useUndoOrganizationStatusChange(options?: UseOrganizationStatusMutationOptions) {
  const mutations = useOrganizationStatusMutation(options);
  return mutations.undoStatusChange;
}

// 상태 변경 유틸리티 함수들
export const statusChangeUtils = {
  /**
   * 상태 변경이 유효한지 검증
   */
  isValidStatusChange: (from: OrganizationStatus, to: OrganizationStatus): boolean => {
    // 같은 상태로의 변경은 무효
    if (from === to) return false;
    
    // 모든 상태 간 변경 허용 (비즈니스 로직에 따라 제한 가능)
    return true;
  },

  /**
   * 상태 변경에 따른 경고 메시지 생성
   */
  getStatusChangeWarning: (from: OrganizationStatus, to: OrganizationStatus): string | null => {
    if (to === OrganizationStatus.SUSPENDED) {
      return '조직을 정지하면 모든 기능이 차단됩니다. 정말로 진행하시겠습니까?';
    }
    
    if (from === OrganizationStatus.SUSPENDED && to === OrganizationStatus.ACTIVE) {
      return '정지된 조직을 활성화하면 모든 기능이 복원됩니다.';
    }
    
    if (from === OrganizationStatus.INACTIVE && to === OrganizationStatus.ACTIVE) {
      return '비활성 조직을 활성화하면 모든 직원이 재활성화됩니다.';
    }
    
    return null;
  },

  /**
   * 상태 변경 권한 확인
   */
  canChangeToStatus: (to: OrganizationStatus, userRole: string): boolean => {
    // SUSPENDED 상태는 MASTER_ADMIN만 설정 가능
    if (to === OrganizationStatus.SUSPENDED) {
      return userRole === 'MASTER_ADMIN';
    }
    
    // 다른 상태는 ADMIN 이상 권한으로 변경 가능
    return ['MASTER_ADMIN', 'ADMIN'].includes(userRole);
  },

  /**
   * 상태에 따른 UI 스타일 정보 반환
   */
  getStatusDisplayInfo: (status: OrganizationStatus) => {
    const statusInfo = {
      [OrganizationStatus.ACTIVE]: {
        label: '활성',
        color: 'bg-green-100 text-green-800',
        icon: '✅'
      },
      [OrganizationStatus.INACTIVE]: {
        label: '비활성',
        color: 'bg-yellow-100 text-yellow-800',
        icon: '⏸️'
      },
      [OrganizationStatus.SUSPENDED]: {
        label: '정지',
        color: 'bg-red-100 text-red-800',
        icon: '🚫'
      },
      [OrganizationStatus.PENDING]: {
        label: '승인 대기',
        color: 'bg-orange-100 text-orange-800',
        icon: '⏳'
      }
    };

    return statusInfo[status] || {
      label: status,
      color: 'bg-gray-100 text-gray-800',
      icon: '❓'
    };
  }
};