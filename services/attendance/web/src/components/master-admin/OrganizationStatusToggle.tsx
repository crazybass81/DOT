/**
 * 개별 조직 상태 토글 컴포넌트
 * TDD Green Phase: 테스트를 통과시키는 구현
 */

'use client';

import React, { useState } from 'react';
import { Organization, OrganizationStatus } from '@/types/organization.types';
import { useChangeOrganizationStatus, statusChangeUtils } from '@/hooks/useOrganizationStatusMutation';

interface User {
  id: string;
  role: string;
  name: string;
}

interface OrganizationStatusToggleProps {
  organization: Organization;
  onStatusChange?: (organizationId: string, newStatus: OrganizationStatus) => void;
  currentUser: User;
  disabled?: boolean;
}

export function OrganizationStatusToggle({
  organization,
  onStatusChange,
  currentUser,
  disabled = false
}: OrganizationStatusToggleProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  const { mutate: changeStatus, isLoading, error } = useChangeOrganizationStatus({
    onSuccess: (data) => {
      setShowStatusMenu(false);
      onStatusChange?.(data.organizationId, data.newStatus);
    },
    onError: (error) => {
      console.error('상태 변경 실패:', error);
      // 에러 처리는 부모 컴포넌트나 전역 에러 핸들러에서 처리
    }
  });

  const statusInfo = statusChangeUtils.getStatusDisplayInfo(organization.status);
  
  // 사용 가능한 상태 옵션들
  const availableStatuses = Object.values(OrganizationStatus).filter(status => {
    // 현재 상태는 제외
    if (status === organization.status) return false;
    
    // 권한 확인
    return statusChangeUtils.canChangeToStatus(status, currentUser.role);
  });

  const handleStatusChange = (newStatus: OrganizationStatus) => {
    // 상태 변경 유효성 검증
    if (!statusChangeUtils.isValidStatusChange(organization.status, newStatus)) {
      return;
    }

    // 권한 확인
    if (!statusChangeUtils.canChangeToStatus(newStatus, currentUser.role)) {
      return;
    }

    changeStatus({
      organizationId: organization.id,
      newStatus,
      changedBy: currentUser.id
    });
  };

  // 상태 변경 메뉴 렌더링
  const renderStatusMenu = () => {
    if (!showStatusMenu) return null;

    return (
      <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
        <div className="py-1">
          {availableStatuses.map((status) => {
            const statusDisplay = statusChangeUtils.getStatusDisplayInfo(status);
            const warning = statusChangeUtils.getStatusChangeWarning(organization.status, status);
            
            return (
              <button
                key={status}
                onClick={() => {
                  if (warning && !confirm(warning)) {
                    return;
                  }
                  handleStatusChange(status);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-left hover:bg-gray-100 disabled:opacity-50"
                disabled={isLoading}
              >
                <span className="mr-2">{statusDisplay.icon}</span>
                <span>{statusDisplay.label}</span>
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

  return (
    <div className="relative">
      <button
        onClick={() => setShowStatusMenu(!showStatusMenu)}
        disabled={disabled || isLoading || availableStatuses.length === 0}
        className={`
          inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
          ${statusInfo.color}
          ${!disabled && !isLoading && availableStatuses.length > 0 
            ? 'hover:opacity-80 cursor-pointer' 
            : 'cursor-default'
          }
          ${isLoading ? 'opacity-50' : ''}
        `}
        data-testid={`status-toggle-${organization.id}`}
      >
        <span className="mr-1">{statusInfo.icon}</span>
        <span>{statusInfo.label}</span>
        {!disabled && !isLoading && availableStatuses.length > 0 && (
          <svg className="ml-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
        {isLoading && (
          <div className="ml-1 animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
        )}
      </button>

      {renderStatusMenu()}
      
      {/* 메뉴 외부 클릭 시 닫기 */}
      {showStatusMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStatusMenu(false)}
        />
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-red-100 border border-red-200 rounded text-xs text-red-600 z-50">
          {error.message}
        </div>
      )}
    </div>
  );
}