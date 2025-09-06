/**
 * 상태 변경 확인 다이얼로그 컴포넌트
 * TDD Green Phase: 테스트를 통과시키는 구현
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Organization, OrganizationStatus } from '@/types/organization.types';
import { statusChangeUtils } from '@/hooks/useOrganizationStatusMutation';

interface StatusChangeData {
  organizations: Organization[];
  newStatus: OrganizationStatus;
  reason?: string;
}

interface StatusChangeConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: StatusChangeData & { reason: string }) => void;
  statusChangeData: StatusChangeData;
  isLoading?: boolean;
}

export function StatusChangeConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  statusChangeData,
  isLoading = false
}: StatusChangeConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [showReasonField, setShowReasonField] = useState(false);

  // 다이얼로그가 열릴 때마다 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setReason(statusChangeData.reason || '');
      // SUSPENDED 상태 변경 시 항상 사유 입력 필요
      setShowReasonField(
        statusChangeData.newStatus === OrganizationStatus.SUSPENDED ||
        statusChangeData.organizations.length > 1 // 벌크 작업 시에도 사유 입력
      );
    }
  }, [isOpen, statusChangeData]);

  const handleConfirm = () => {
    // 사유가 필수인 경우 검증
    if (showReasonField && !reason.trim()) {
      alert('변경 사유를 입력해주세요.');
      return;
    }

    onConfirm({
      ...statusChangeData,
      reason: reason.trim()
    });
  };

  const handleClose = () => {
    if (isLoading) return; // 로딩 중에는 닫기 불가
    onClose();
  };

  const { organizations, newStatus } = statusChangeData;
  const isSingleOrganization = organizations.length === 1;
  const isSuspendedAction = newStatus === OrganizationStatus.SUSPENDED;
  const statusDisplay = statusChangeUtils.getStatusDisplayInfo(newStatus);

  // 경고 메시지 생성
  const getWarningMessage = () => {
    if (isSuspendedAction) {
      return isSingleOrganization
        ? `${organizations[0].name} 조직을 정지하면 모든 기능이 차단됩니다.`
        : `선택한 ${organizations.length}개 조직을 정지하면 모든 기능이 차단됩니다.`;
    }

    const warnings: string[] = [];
    
    organizations.forEach(org => {
      const warning = statusChangeUtils.getStatusChangeWarning(org.status, newStatus);
      if (warning) {
        warnings.push(`${org.name}: ${warning}`);
      }
    });

    return warnings.length > 0 ? warnings.join('\n') : null;
  };

  const warningMessage = getWarningMessage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-25" onClick={handleClose} />
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl">
        <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center">
          <span className="mr-2 text-2xl">
            {isSuspendedAction ? '⚠️' : statusDisplay.icon}
          </span>
          조직 상태 변경 확인
        </h3>

                <div className="mt-4">
                  <div className="text-sm text-gray-600 mb-4">
                    {isSingleOrganization ? (
                      <p>
                        <span className="font-medium">{organizations[0].name}</span> 조직의 상태를{' '}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>{' '}
                        로 변경하시겠습니까?
                      </p>
                    ) : (
                      <p>
                        선택한 <span className="font-medium">{organizations.length}개 조직</span>의 상태를{' '}
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusDisplay.color}`}>
                          {statusDisplay.icon} {statusDisplay.label}
                        </span>{' '}
                        로 변경하시겠습니까?
                      </p>
                    )}
                  </div>

                  {/* 조직 목록 (벌크 작업 시) */}
                  {!isSingleOrganization && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">변경 대상 조직:</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {organizations.slice(0, 5).map((org) => (
                          <li key={org.id} className="flex justify-between">
                            <span>{org.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${statusChangeUtils.getStatusDisplayInfo(org.status).color}`}>
                              {statusChangeUtils.getStatusDisplayInfo(org.status).label}
                            </span>
                          </li>
                        ))}
                        {organizations.length > 5 && (
                          <li className="text-gray-400 text-xs">
                            ... 외 {organizations.length - 5}개 조직
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* 경고 메시지 */}
                  {warningMessage && (
                    <div className={`p-3 rounded-lg mb-4 ${
                      isSuspendedAction 
                        ? 'bg-red-50 border border-red-200 text-red-700'
                        : 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                    }`}>
                      <div className="flex">
                        <span className="mr-2">
                          {isSuspendedAction ? '🚫' : '⚠️'}
                        </span>
                        <div>
                          <h4 className="font-medium mb-1">주의사항</h4>
                          <p className="text-sm whitespace-pre-line">{warningMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 변경 사유 입력 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      변경 사유 {showReasonField && <span className="text-red-500">*</span>}
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={showReasonField ? '변경 사유를 입력하세요...' : '선택사항: 변경 사유를 입력하세요...'}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={isLoading}
                      required={showReasonField}
                    />
                    {showReasonField && (
                      <p className="mt-1 text-xs text-gray-500">
                        {isSuspendedAction ? '정지 사유는 필수 입력 항목입니다.' : '벌크 작업 시 변경 사유를 기록해주세요.'}
                      </p>
                    )}
                  </div>
        </div>

        <div className="mt-6 flex space-x-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isLoading || (showReasonField && !reason.trim())}
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isSuspendedAction
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                처리 중...
              </div>
            ) : (
              `상태 변경 확인${isSuspendedAction ? ' (정지)' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}