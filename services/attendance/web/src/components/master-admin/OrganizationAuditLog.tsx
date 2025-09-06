/**
 * 조직 감사 로그 표시 컴포넌트
 * TDD Green Phase: 테스트를 통과시키는 구현
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OrganizationAuditLogResponse, OrganizationAuditLogEntry } from '@/types/organization.types';
import { useUndoOrganizationStatusChange, statusChangeUtils } from '@/hooks/useOrganizationStatusMutation';

interface OrganizationAuditLogProps {
  organizationId: string;
  limit?: number;
}

// 감사 로그 조회 API 호출
const fetchOrganizationAuditLogs = async (
  organizationId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<OrganizationAuditLogResponse> => {
  const response = await fetch(
    `/api/master-admin/organizations/${organizationId}/audit-logs?page=${page}&pageSize=${pageSize}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export function OrganizationAuditLog({ organizationId, limit = 20 }: OrganizationAuditLogProps) {
  const [page, setPage] = useState(1);
  const [showUndoConfirm, setShowUndoConfirm] = useState<string | null>(null);

  // 감사 로그 조회
  const {
    data: auditLogData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['organizationAuditLogs', organizationId, page],
    queryFn: () => fetchOrganizationAuditLogs(organizationId, page, limit)
  });

  // 실행 취소 mutation
  const { 
    mutate: undoStatusChange, 
    isLoading: isUndoing, 
    error: undoError 
  } = useUndoOrganizationStatusChange({
    onSuccess: () => {
      setShowUndoConfirm(null);
      refetch(); // 감사 로그 새로고침
    }
  });

  const handleUndo = (auditLogId: string, reason?: string) => {
    undoStatusChange({
      auditLogId,
      reason,
      undoneBy: 'current-user' // 실제로는 현재 사용자 ID를 전달
    });
  };

  // 날짜 포맷터
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  // 액션 표시 이름 매핑
  const getActionDisplayName = (action: string) => {
    const actionMap: Record<string, string> = {
      'ORGANIZATION_STATUS_CHANGE': '상태 변경',
      'ORGANIZATION_BULK_STATUS_CHANGE': '벌크 상태 변경',
      'ORGANIZATION_STATUS_UNDO': '상태 변경 취소'
    };
    return actionMap[action] || action;
  };

  // 실행 취소 확인 다이얼로그
  const renderUndoConfirmDialog = () => {
    const auditLog = auditLogData?.auditLogs.find(log => log.id === showUndoConfirm);
    if (!auditLog) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">상태 변경 실행 취소</h3>
          <p className="text-sm text-gray-600 mb-4">
            {auditLog.newStatus}에서 {auditLog.previousStatus}로 되돌리시겠습니까?
          </p>
          <p className="text-xs text-gray-500 mb-4">
            실행 취소 가능 시간: {auditLog.undoExpiresAt && formatDate(auditLog.undoExpiresAt)}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowUndoConfirm(null)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={() => handleUndo(auditLog.id, '관리자에 의한 실행 취소')}
              disabled={isUndoing}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
            >
              {isUndoing ? '처리 중...' : '실행 취소'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">변경 이력</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">변경 이력을 불러오는 중...</span>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">변경 이력</h3>
        <div className="text-center text-red-600">
          <p>변경 이력을 불러오는데 실패했습니다.</p>
          <p className="text-sm mt-2">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const auditLogs = auditLogData?.auditLogs || [];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">변경 이력</h3>
        <p className="text-sm text-gray-500">조직 상태 변경 및 관련 작업 이력</p>
      </div>

      <div className="p-6">
        {auditLogs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-2">📋</div>
            <p className="text-gray-500">변경 이력이 없습니다.</p>
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {auditLogs.map((log, logIdx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {logIdx !== auditLogs.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      {/* 아이콘 */}
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          log.action === 'ORGANIZATION_STATUS_UNDO' 
                            ? 'bg-yellow-500' 
                            : log.newStatus === 'SUSPENDED'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}>
                          <span className="text-white text-sm">
                            {log.action === 'ORGANIZATION_STATUS_UNDO' ? '↶' : '🔄'}
                          </span>
                        </span>
                      </div>
                      
                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {getActionDisplayName(log.action)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {log.previousStatus && log.newStatus ? (
                                <>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                                    statusChangeUtils.getStatusDisplayInfo(log.previousStatus as any).color
                                  }`}>
                                    {statusChangeUtils.getStatusDisplayInfo(log.previousStatus as any).label}
                                  </span>
                                  →
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${
                                    statusChangeUtils.getStatusDisplayInfo(log.newStatus as any).color
                                  }`}>
                                    {statusChangeUtils.getStatusDisplayInfo(log.newStatus as any).label}
                                  </span>
                                </>
                              ) : (
                                '상태 변경 취소'
                              )}
                            </p>
                            {log.reason && (
                              <p className="text-sm text-gray-500 mt-1">사유: {log.reason}</p>
                            )}
                          </div>
                          
                          {/* 실행 취소 버튼 */}
                          {log.canUndo && (
                            <button
                              onClick={() => setShowUndoConfirm(log.id)}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              실행 취소
                            </button>
                          )}
                        </div>
                        
                        {/* 메타 정보 */}
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          <div>변경자: {log.changedByName}</div>
                          <div>시간: {formatDate(log.timestamp)}</div>
                          {log.ipAddress && log.ipAddress !== 'unknown' && (
                            <div>IP: {log.ipAddress}</div>
                          )}
                          {log.canUndo && log.undoExpiresAt && (
                            <div>실행 취소 가능 시간: {formatDate(log.undoExpiresAt)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 페이지네이션 */}
        {auditLogData && auditLogData.total > limit && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-sm text-gray-500">
              {page} / {Math.ceil(auditLogData.total / limit)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(auditLogData.total / limit)}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 실행 취소 확인 다이얼로그 */}
      {showUndoConfirm && renderUndoConfirmDialog()}

      {/* 실행 취소 에러 */}
      {undoError && (
        <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded text-sm text-red-600">
          실행 취소 실패: {undoError.message}
        </div>
      )}
    </div>
  );
}