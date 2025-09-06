'use client';

import React, { useState, useMemo, memo } from 'react';
import { useRealtimeConnections } from '../../hooks/useRealtimeConnections';
import type { ConnectionUser } from '../../types/monitoring';

interface ConnectionStatusProps {
  className?: string;
  refreshInterval?: number;
}

const ConnectionStatusComponent = function ConnectionStatus({ 
  className = '',
  refreshInterval = 5000 
}: ConnectionStatusProps) {
  const {
    connectedUsers,
    stats,
    connectionStatus,
    isLoading,
    error,
    reconnect,
  } = useRealtimeConnections({
    autoReconnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  const [selectedOrg, setSelectedOrg] = useState<string>('all');

  // 조직 목록 추출
  const organizations = useMemo(() => {
    const orgs = new Set<string>();
    connectedUsers.forEach(user => {
      if (user.organizationId) {
        orgs.add(user.organizationId);
      }
    });
    return Array.from(orgs).sort();
  }, [connectedUsers]);

  // 필터링된 사용자 목록
  const filteredUsers = useMemo(() => {
    if (selectedOrg === 'all') {
      return connectedUsers;
    }
    return connectedUsers.filter(user => user.organizationId === selectedOrg);
  }, [connectedUsers, selectedOrg]);

  // 상대적 시간 포맷
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds}초 전`;
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}분 전`;
    } else {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}시간 전`;
    }
  };

  // 연결 상태 인디케이터 클래스
  const getStatusIndicatorClass = () => {
    const baseClass = 'connection-status-indicator';
    switch (connectionStatus) {
      case 'connecting':
        return `${baseClass} connecting animate-pulse bg-yellow-500`;
      case 'connected':
        return `${baseClass} connected bg-green-500`;
      case 'disconnected':
        return `${baseClass} disconnected bg-red-500`;
      case 'error':
        return `${baseClass} error bg-red-600`;
      default:
        return `${baseClass} bg-gray-500`;
    }
  };

  // 연결 상태 텍스트
  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return '연결 중...';
      case 'connected':
        return '연결됨';
      case 'disconnected':
        return '연결 끊김';
      case 'error':
        return '오류';
      default:
        return '알 수 없음';
    }
  };

  if (isLoading && connectedUsers.length === 0) {
    return (
      <div 
        data-testid="connection-status" 
        className={`p-6 bg-white rounded-lg shadow-md ${className}`}
        role="region"
        aria-label="실시간 접속 현황"
      >
        <div className="flex items-center justify-center">
          <div data-testid="loading-spinner" className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      data-testid="connection-status" 
      className={`p-6 bg-white rounded-lg shadow-md ${className}`}
      role="region"
      aria-label="실시간 접속 현황"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">실시간 접속 현황</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${getStatusIndicatorClass()}`} data-testid="connection-status-indicator"></div>
          <span className="text-sm text-gray-600">{getStatusText()}</span>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center justify-between">
            <p className="text-red-700">{error}</p>
            <button
              onClick={reconnect}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              다시 연결
            </button>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm text-blue-600 font-medium">총 접속자</div>
          <div className="text-2xl font-bold text-blue-900">{stats.totalConnections}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm text-green-600 font-medium">인증된 접속자</div>
          <div className="text-2xl font-bold text-green-900">{stats.authenticatedConnections}</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-purple-600 font-medium">활성 채널</div>
          <div className="text-2xl font-bold text-purple-900">{stats.activeChannels}</div>
        </div>
      </div>

      {/* 조직 필터 */}
      {organizations.length > 0 && (
        <div className="mb-4">
          <label htmlFor="org-filter" className="block text-sm font-medium text-gray-700 mb-2">
            조직별 필터
          </label>
          <select
            id="org-filter"
            data-testid="organization-filter"
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="all">전체</option>
            {organizations.map(org => (
              <option key={org} value={org}>{org}</option>
            ))}
          </select>
        </div>
      )}

      {/* 접속자 목록 테이블 */}
      <div className="overflow-x-auto">
        <table 
          className="min-w-full divide-y divide-gray-200" 
          role="table"
          aria-label="접속자 목록"
        >
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용자
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP 주소
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                접속 시간
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                마지막 활동
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                조직
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  {connectionStatus === 'connected' ? '접속 중인 사용자가 없습니다.' : '연결 상태를 확인하세요.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.socketId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.userName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {user.userId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatRelativeTime(user.connectedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatRelativeTime(user.lastActivity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.authenticated
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.authenticated ? '인증됨' : '미인증'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.organizationId || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 마지막 업데이트 시간 */}
      <div className="mt-4 text-xs text-gray-500 text-right">
        마지막 업데이트: {stats.lastUpdated.toLocaleString()}
      </div>
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ConnectionStatus = memo(ConnectionStatusComponent);
}