/**
 * API Metrics Dashboard Component
 * 실시간 API 성능 메트릭 시각화 대시보드
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement,
} from 'chart.js';
import { useApiMetrics } from '../../hooks/useApiMetrics';
import {
  ApiEndpointStats,
  PerformanceAlert,
  UseApiMetricsOptions,
} from '../../types/performance-metrics';
import { formatDateTime, formatDuration, formatPercentage, cn } from '../../lib/utils';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
  ArcElement
);

interface ApiMetricsDashboardProps {
  refreshInterval?: number;
  realTime?: boolean;
  className?: string;
}

type ChartTab = 'requests' | 'responseTime' | 'errorRate';

export function ApiMetricsDashboard({
  refreshInterval = 30000,
  realTime = true,
  className,
}: ApiMetricsDashboardProps) {
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('requests');
  const [endpointFilter, setEndpointFilter] = useState('');
  const [sortBy, setSortBy] = useState<keyof ApiEndpointStats>('avgResponseTime');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [windowWidth, setWindowWidth] = useState(0);

  const options: UseApiMetricsOptions = {
    autoRefresh: !realTime,
    refreshInterval,
    realTime,
  };

  const {
    metrics,
    isLoading,
    error,
    connectionStatus,
    lastUpdated,
    activeAlerts,
    refresh,
  } = useApiMetrics(options);

  // 반응형 처리
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 레이아웃 클래스 결정
  const layoutClass = useMemo(() => {
    if (windowWidth < 768) return 'mobile-layout';
    if (windowWidth < 1024) return 'tablet-layout';
    return 'desktop-layout';
  }, [windowWidth]);

  // 엔드포인트 통계 필터링 및 정렬
  const filteredEndpointStats = useMemo(() => {
    if (!metrics?.endpointStats) return [];

    let filtered = metrics.endpointStats.filter(stat =>
      stat.endpoint.toLowerCase().includes(endpointFilter.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aVal = a[sortBy] as number;
      const bVal = b[sortBy] as number;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [metrics?.endpointStats, endpointFilter, sortBy, sortOrder]);

  // 차트 데이터 생성
  const chartData = useMemo(() => {
    if (!metrics?.timeSeries) return null;

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time',
          },
        },
      },
    };

    const timeLabels = metrics.timeSeries.requests.map(point =>
      point.timestamp.toLocaleTimeString()
    );

    return {
      requests: {
        data: {
          labels: timeLabels,
          datasets: [{
            label: 'Requests per Minute',
            data: metrics.timeSeries.requests.map(point => point.value),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.1,
          }],
        },
        options: {
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            y: {
              title: {
                display: true,
                text: 'Requests',
              },
              beginAtZero: true,
            },
          },
        },
      },
      responseTime: {
        data: {
          labels: timeLabels,
          datasets: [{
            label: 'Avg Response Time (ms)',
            data: metrics.timeSeries.responseTime.map(point => point.value),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.1,
          }],
        },
        options: {
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            y: {
              title: {
                display: true,
                text: 'Response Time (ms)',
              },
              beginAtZero: true,
            },
          },
        },
      },
      errorRate: {
        data: {
          labels: timeLabels,
          datasets: [{
            label: 'Error Rate (%)',
            data: metrics.timeSeries.errorRate.map(point => point.value * 100),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.1,
          }],
        },
        options: {
          ...baseOptions,
          scales: {
            ...baseOptions.scales,
            y: {
              title: {
                display: true,
                text: 'Error Rate (%)',
              },
              beginAtZero: true,
              max: 100,
            },
          },
        },
      },
    };
  }, [metrics?.timeSeries]);

  // 상태 코드 분포 차트 데이터
  const statusCodeChartData = useMemo(() => {
    if (!metrics?.statusCodeDistribution) return null;

    const entries = Object.entries(metrics.statusCodeDistribution);
    return {
      labels: entries.map(([code]) => code),
      datasets: [{
        data: entries.map(([, count]) => count),
        backgroundColor: [
          '#10B981', // 2xx - Green
          '#3B82F6', // 3xx - Blue
          '#F59E0B', // 4xx - Yellow
          '#EF4444', // 5xx - Red
        ],
        borderWidth: 2,
      }],
    };
  }, [metrics?.statusCodeDistribution]);

  // 엔드포인트 성능 차트 데이터
  const endpointChartData = useMemo(() => {
    if (!metrics?.endpointStats) return null;

    const topEndpoints = metrics.endpointStats
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    return {
      labels: topEndpoints.map(stat => `${stat.method} ${stat.endpoint}`),
      datasets: [{
        label: 'Avg Response Time (ms)',
        data: topEndpoints.map(stat => stat.avgResponseTime),
        backgroundColor: topEndpoints.map(stat => 
          stat.avgResponseTime > 1000 ? '#EF4444' : 
          stat.avgResponseTime > 500 ? '#F59E0B' : '#10B981'
        ),
      }],
    };
  }, [metrics?.endpointStats]);

  // 테이블 정렬 핸들러
  const handleSort = (column: keyof ApiEndpointStats) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // 알림 해제 핸들러
  const handleDismissAlert = (alertId: string) => {
    // 실제 구현에서는 API 호출로 알림 상태 업데이트
    console.log('Dismiss alert:', alertId);
  };

  if (isLoading && !metrics) {
    return (
      <div data-testid="dashboard-loading" className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="dashboard-error" className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="font-medium">Failed to load metrics</p>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div data-testid="dashboard-empty" className="flex items-center justify-center p-8">
        <div className="text-center text-gray-500">
          <p>No metrics available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="api-metrics-dashboard"
      className={cn(
        'api-metrics-dashboard',
        layoutClass,
        className
      )}
      aria-label="API Performance Dashboard"
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Performance</h1>
          {lastUpdated && (
            <p data-testid="last-updated" className="text-sm text-gray-500 mt-1">
              Last updated: {formatDateTime(lastUpdated)}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 연결 상태 */}
          <div
            data-testid="connection-status"
            className={cn(
              'flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium',
              connectionStatus === 'connected' ? 'bg-green-100 text-green-800 connected' :
              connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800 disconnected'
            )}
          >
            <div
              data-testid="realtime-indicator"
              className={cn(
                'w-2 h-2 rounded-full',
                connectionStatus === 'connected' ? 'bg-green-500 connected' : 'bg-red-500 disconnected'
              )}
            />
            <span>{connectionStatus}</span>
          </div>

          {/* 새로고침 버튼 */}
          <button
            data-testid="refresh-button"
            onClick={refresh}
            disabled={isLoading}
            tabIndex={0}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50',
              isLoading && 'loading'
            )}
          >
            <svg className={cn('w-4 h-4', isLoading && 'animate-spin')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          {/* 내보내기 버튼 */}
          <div className="relative">
            <button
              data-testid="export-button"
              tabIndex={0}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>
            {/* 내보내기 메뉴는 실제 구현에서 추가 */}
            <div data-testid="export-menu" style={{ display: 'none' }}>
              <div>Export as JSON</div>
              <div>Export as CSV</div>
              <div>Export Charts</div>
            </div>
          </div>
        </div>
      </div>

      {/* 라이브 업데이트 알림 */}
      <div
        aria-live="polite"
        aria-label="Live metrics updates"
        className="sr-only"
      >
        {lastUpdated && 'Metrics updated'}
      </div>

      {/* 개요 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div data-testid="metric-total-requests" className="metric-card">
          <div className="text-sm text-gray-600 font-medium">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.overview.totalRequests.toLocaleString()}
          </div>
        </div>

        <div data-testid="metric-active-requests" className="metric-card">
          <div className="text-sm text-gray-600 font-medium">Active</div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.overview.activeRequests}
          </div>
        </div>

        <div data-testid="metric-rps" className="metric-card">
          <div className="text-sm text-gray-600 font-medium">RPS</div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.overview.requestsPerSecond}
          </div>
        </div>

        <div data-testid="metric-avg-response-time" className="metric-card">
          <div className="text-sm text-gray-600 font-medium">Avg Response</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatDuration(metrics.overview.avgResponseTime)}
          </div>
        </div>

        <div data-testid="metric-success-rate" className="metric-card success">
          <div className="text-sm text-green-600 font-medium">Success Rate</div>
          <div className="text-2xl font-bold text-green-900">
            {formatPercentage(metrics.overview.successRate)}
          </div>
        </div>

        <div data-testid="metric-error-rate" className="metric-card error">
          <div className="text-sm text-red-600 font-medium">Error Rate</div>
          <div className="text-2xl font-bold text-red-900">
            {formatPercentage(metrics.overview.errorRate)}
          </div>
        </div>
      </div>

      {/* 알림 섹션 */}
      {activeAlerts.length > 0 && (
        <div data-testid="alerts-section" aria-label="Active alerts" className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts</h2>
          <div className="space-y-3">
            {activeAlerts.slice(0, 5).map(alert => (
              <div
                key={alert.id}
                data-testid={`alert-${alert.id}`}
                className={cn(
                  'flex items-center justify-between p-4 rounded-lg border',
                  alert.severity === 'high' ? 'bg-red-50 border-red-200 alert-high' :
                  alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-200 alert-medium' :
                  'bg-blue-50 border-blue-200 alert-low'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      alert.severity === 'high' ? 'bg-red-500' :
                      alert.severity === 'medium' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    )} />
                    <span className="font-medium">{alert.message}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {alert.endpoint && `Endpoint: ${alert.endpoint} • `}
                    Value: {alert.metricValue} • Threshold: {alert.threshold} •
                    {formatDateTime(alert.timestamp)}
                  </div>
                </div>
                <button
                  data-testid={`dismiss-alert-${alert.id}`}
                  onClick={() => handleDismissAlert(alert.id)}
                  className="ml-4 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeAlerts.length === 0 && (
        <div data-testid="no-alerts-message" className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">No active alerts</p>
        </div>
      )}

      {/* 차트 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* 시간 시리즈 차트 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div data-testid="chart-tabs" className="flex space-x-4 mb-4 border-b">
            {(['requests', 'responseTime', 'errorRate'] as ChartTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveChartTab(tab)}
                className={cn(
                  'px-4 py-2 font-medium text-sm border-b-2 transition-colors',
                  activeChartTab === tab
                    ? 'border-blue-500 text-blue-600 active'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {tab === 'requests' ? 'Requests' :
                 tab === 'responseTime' ? 'Response Time' : 'Error Rate'}
              </button>
            ))}
          </div>

          <div className="h-64">
            {chartData && (
              <Line
                data-testid={`${activeChartTab}-chart`}
                data={chartData[activeChartTab].data}
                options={chartData[activeChartTab].options}
              />
            )}
          </div>

          <div
            data-testid={`${activeChartTab}-chart-description`}
            className="sr-only"
          >
            Chart showing {activeChartTab} over time
          </div>
        </div>

        {/* 상태 코드 분포 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status Code Distribution</h3>
          <div className="h-64">
            {statusCodeChartData && (
              <Doughnut
                data-testid="status-code-chart"
                data={statusCodeChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* 엔드포인트 성능 차트 */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Slowest Endpoints</h3>
        <div className="h-64">
          {endpointChartData && (
            <Bar
              data-testid="endpoint-performance-chart"
              data={endpointChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Response Time (ms)',
                    },
                  },
                },
              }}
            />
          )}
        </div>
      </div>

      {/* 엔드포인트 통계 테이블 */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Endpoint Statistics</h3>
          <input
            data-testid="endpoint-filter"
            type="text"
            placeholder="Filter endpoints..."
            value={endpointFilter}
            onChange={(e) => setEndpointFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
        </div>

        <div className="overflow-x-auto">
          <table
            data-testid="endpoint-stats-table"
            aria-label="Endpoint statistics table"
            className="min-w-full divide-y divide-gray-200"
          >
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('endpoint')}
                >
                  Endpoint
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('method')}
                >
                  Method
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalRequests')}
                >
                  Requests
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('successRate')}
                >
                  Success Rate
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('avgResponseTime')}
                >
                  Avg Response
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('p95ResponseTime')}
                >
                  P95
                </th>
                {windowWidth >= 1024 && (
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('p99ResponseTime')}
                  >
                    P99
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEndpointStats.map(stat => (
                <tr
                  key={`${stat.method}-${stat.endpoint}`}
                  data-testid={`endpoint-row-${stat.endpoint}`}
                  className={cn(
                    'hover:bg-gray-50',
                    stat.avgResponseTime > 1000 && 'slow-endpoint bg-red-50'
                  )}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.endpoint}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={cn(
                      'px-2 py-1 text-xs font-medium rounded',
                      stat.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      stat.method === 'POST' ? 'bg-green-100 text-green-800' :
                      stat.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      stat.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    )}>
                      {stat.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {stat.totalRequests.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPercentage(stat.successRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(stat.avgResponseTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDuration(stat.p95ResponseTime)}
                  </td>
                  {windowWidth >= 1024 && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDuration(stat.p99ResponseTime)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .metric-card {
          @apply bg-white p-6 rounded-lg shadow;
        }
        
        .metric-card.success {
          @apply bg-green-50 border border-green-200;
        }
        
        .metric-card.error {
          @apply bg-red-50 border border-red-200;
        }

        .mobile-layout .metric-card {
          @apply text-center;
        }

        .slow-endpoint {
          @apply bg-red-50;
        }

        .updated {
          @apply animate-pulse;
        }
      `}</style>
    </div>
  );
}