/**
 * 벌크 조직 상태 변경 도구모음 컴포넌트
 * TDD Green Phase: 테스트를 통과시키는 구현
 */

'use client';

import React, { useState } from 'react';
import { Organization, OrganizationStatus } from '@/types/organization.types';
import { useBulkChangeOrganizationStatus, statusChangeUtils } from '@/hooks/useOrganizationStatusMutation';

interface User {
  id: string;
  role: string;
  name: string;
}

interface BulkStatusActionsProps {
  selectedOrganizations: Organization[];
  onBulkStatusChange?: (results: any) => void;
  currentUser: User;
  disabled?: boolean;
}

interface BulkActionProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  isRunning: boolean;
}

export function BulkStatusActions({
  selectedOrganizations,
  onBulkStatusChange,
  currentUser,
  disabled = false
}: BulkStatusActionsProps) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [progress, setProgress] = useState<BulkActionProgress | null>(null);
  
  const { mutate: changeBulkStatus, isLoading, error, data } = useBulkChangeOrganizationStatus({
    onSuccess: (data) => {
      setShowActionMenu(false);
      setProgress({
        total: data.totalCount,
        processed: data.totalCount,
        successful: data.successCount,
        failed: data.failureCount,
        isRunning: false
      });
      onBulkStatusChange?.(data);
      
      // 5초 후 진행률 표시 숨김
      setTimeout(() => setProgress(null), 5000);
    },
    onError: (error) => {
      console.error('벌크 상태 변경 실패:', error);
      setProgress(null);
    }
  });

  // 선택된 조직이 없으면 비활성화
  const hasSelectedOrganizations = selectedOrganizations.length > 0;
  
  // 사용 가능한 벌크 액션 상태들
  const availableBulkStatuses = Object.values(OrganizationStatus).filter(status => {
    // 권한 확인
    return statusChangeUtils.canChangeToStatus(status, currentUser.role);
  });

  const handleBulkStatusChange = (newStatus: OrganizationStatus, reason?: string) => {
    if (!hasSelectedOrganizations) return;

    const organizationIds = selectedOrganizations.map(org => org.id);
    
    // 권한 재확인
    if (!statusChangeUtils.canChangeToStatus(newStatus, currentUser.role)) {
      alert('이 상태로 변경할 권한이 없습니다.');
      return;
    }

    // SUSPENDED 상태 변경 시 추가 확인
    if (newStatus === OrganizationStatus.SUSPENDED) {
      const confirmMessage = `선택한 ${selectedOrganizations.length}개 조직을 정지하시겠습니까?\n\n정지된 조직의 모든 기능이 차단됩니다.`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    // 진행률 초기화
    setProgress({
      total: selectedOrganizations.length,
      processed: 0,
      successful: 0,
      failed: 0,
      isRunning: true
    });

    changeBulkStatus({
      organizationIds,
      newStatus,
      reason,
      changedBy: currentUser.id
    });
  };

  // 벌크 액션 메뉴 렌더링
  const renderBulkActionMenu = () => {
    if (!showActionMenu) return null;

    return (
      <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-50">
        <div className="p-3 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">
            {selectedOrganizations.length}개 조직 상태 변경
          </h4>
        </div>
        <div className="py-1">
          {availableBulkStatuses.map((status) => {
            const statusDisplay = statusChangeUtils.getStatusDisplayInfo(status);
            
            return (
              <button
                key={status}
                onClick={() => {
                  const reason = prompt('변경 사유를 입력하세요 (선택사항):');
                  if (reason !== null) { // 취소하지 않은 경우에만 실행
                    handleBulkStatusChange(status, reason || undefined);
                  }
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
                disabled={isLoading}
              >
                <span className="mr-2">{statusDisplay.icon}</span>
                <span>모두 {statusDisplay.label}으로 변경</span>
                {status === OrganizationStatus.SUSPENDED && (
                  <span className="ml-2 text-xs text-red-500">(관리자 전용)</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 진행률 표시 렌더링
  const renderProgress = () => {
    if (!progress) return null;

    const progressPercentage = progress.total > 0 
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

    return (
      <div className="fixed top-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-900">벌크 상태 변경 진행률</h4>
          {!progress.isRunning && (
            <button
              onClick={() => setProgress(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className={`h-2 rounded-full ${
              progress.isRunning ? 'bg-blue-600' : 
              progress.failed === 0 ? 'bg-green-600' : 
              progress.successful === 0 ? 'bg-red-600' : 'bg-yellow-600'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-600">
          <div className="flex justify-between">
            <span>전체: {progress.total}</span>
            <span>{progressPercentage}%</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-green-600">성공: {progress.successful}</span>
            <span className="text-red-600">실패: {progress.failed}</span>
          </div>
          {progress.isRunning && (
            <div className="mt-2 flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
              <span>처리 중...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowActionMenu(!showActionMenu)}
          disabled={disabled || isLoading || !hasSelectedOrganizations}
          className={`
            inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium
            ${hasSelectedOrganizations && !disabled && !isLoading
              ? 'text-gray-700 bg-white hover:bg-gray-50 cursor-pointer'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            }
            ${isLoading ? 'opacity-50' : ''}
          `}
          data-testid="bulk-status-actions"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          벌크 상태 변경
          {selectedOrganizations.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
              {selectedOrganizations.length}
            </span>
          )}
          {isLoading && (
            <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          )}
        </button>

        {renderBulkActionMenu()}
        
        {/* 메뉴 외부 클릭 시 닫기 */}
        {showActionMenu && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowActionMenu(false)}
          />
        )}

        {/* 에러 표시 */}
        {error && (
          <div className="absolute top-full right-0 mt-1 p-3 bg-red-100 border border-red-200 rounded text-sm text-red-600 z-50 min-w-[200px]">
            <h5 className="font-medium mb-1">벌크 작업 오류</h5>
            <p>{error.message}</p>
          </div>
        )}
      </div>

      {renderProgress()}
    </>
  );
}