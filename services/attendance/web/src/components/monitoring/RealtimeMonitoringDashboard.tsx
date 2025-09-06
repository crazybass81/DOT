'use client';

import React from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { ConnectionStatusErrorBoundary } from './ConnectionStatusErrorBoundary';

interface RealtimeMonitoringDashboardProps {
  className?: string;
  title?: string;
  refreshInterval?: number;
  showErrorDetails?: boolean;
}

export function RealtimeMonitoringDashboard({
  className = '',
  title = '시스템 모니터링 대시보드',
  refreshInterval = 5000,
  showErrorDetails = false,
}: RealtimeMonitoringDashboardProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {title && (
        <header className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            실시간 사용자 접속 현황 및 시스템 상태를 모니터링합니다.
          </p>
        </header>
      )}

      <div className="grid grid-cols-1 gap-6">
        <ConnectionStatusErrorBoundary
          fallback={
            showErrorDetails ? undefined : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      모니터링 일시 중단
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      실시간 모니터링 서비스에 일시적인 문제가 발생했습니다. 
                      잠시 후 다시 시도해주세요.
                    </p>
                  </div>
                </div>
              </div>
            )
          }
        >
          <ConnectionStatus 
            refreshInterval={refreshInterval}
          />
        </ConnectionStatusErrorBoundary>

        {/* 향후 확장을 위한 추가 모니터링 컴포넌트 자리 */}
        {/* 
        <SystemHealthStatus />
        <PerformanceMetrics />
        <AlertsPanel />
        */}
      </div>

      <footer className="text-xs text-gray-500 text-center">
        <p>
          모니터링 데이터는 WebSocket을 통해 실시간으로 업데이트됩니다. 
          연결 문제가 있는 경우 자동으로 재연결을 시도합니다.
        </p>
      </footer>
    </div>
  );
}