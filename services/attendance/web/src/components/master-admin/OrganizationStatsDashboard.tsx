/**
 * Phase 3.3.1.2: 조직별 통계 대시보드 통합 컴포넌트
 * 🟢 GREEN: 모든 통계 컴포넌트를 통합한 메인 대시보드
 */

'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { Calendar, Filter, Download, RefreshCw } from 'lucide-react';
import { OrganizationStatsOverview } from './OrganizationStatsOverview';
import { AttendanceRateChart } from './AttendanceRateChart';
import { ActivityHeatmap } from './ActivityHeatmap';
import { RealtimeMetrics } from './RealtimeMetrics';
import { ComparisonAnalysis } from './ComparisonAnalysis';

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Dashboard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary" className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-red-800 font-medium mb-2">대시보드 로딩 오류</h3>
          <p className="text-red-600 text-sm">데이터를 불러오는 중 문제가 발생했습니다.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Chart loading component
const ChartLoading = () => (
  <div data-testid="chart-loading" className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-100 rounded"></div>
  </div>
);

interface DateRange {
  start: string;
  end: string;
}

interface OrganizationStatsDashboardProps {
  data?: any;
  dateRange?: DateRange;
  lazy?: boolean;
}

export function OrganizationStatsDashboard({ 
  data: propData, 
  dateRange: propDateRange,
  lazy = false 
}: OrganizationStatsDashboardProps) {
  // State management
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>(
    propDateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    }
  );
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  // Mock data (in real app, this would come from API)
  const mockData = useMemo(() => ({
    overview: {
      totalEmployees: 1250,
      activeUsers: 850,
      averageAttendanceRate: 87.5,
      alertsToday: 12,
      currentlyPresent: 320,
      monthlyTrend: 5.2
    },
    attendanceData: [
      { month: 'Jan', rate: 85.2, target: 90 },
      { month: 'Feb', rate: 87.8, target: 90 },
      { month: 'Mar', rate: 84.5, target: 90 },
      { month: 'Apr', rate: 89.1, target: 90 },
      { month: 'May', rate: 91.3, target: 90 },
      { month: 'Jun', rate: 88.7, target: 90 }
    ],
    activityData: [
      { time: '09:00', mon: 85, tue: 92, wed: 78, thu: 88, fri: 95 },
      { time: '10:00', mon: 95, tue: 88, wed: 85, thu: 92, fri: 85 },
      { time: '14:00', mon: 70, tue: 65, wed: 80, thu: 75, fri: 68 },
      { time: '17:00', mon: 90, tue: 95, wed: 87, thu: 93, fri: 89 },
      { time: '18:00', mon: 45, tue: 50, wed: 55, thu: 48, fri: 52 }
    ],
    realtimeData: {
      currentPresent: 320,
      checkedInToday: 890,
      lateArrivals: 23,
      pendingAlerts: 5,
      lastUpdate: new Date().toISOString()
    },
    comparisonData: [
      { organization: 'Tech Corp', attendance: 92, employees: 150, efficiency: 88 },
      { organization: 'Design Studio', attendance: 87, employees: 45, efficiency: 91 },
      { organization: 'Marketing Inc', attendance: 85, employees: 80, efficiency: 85 },
      { organization: 'Sales Team', attendance: 89, employees: 120, efficiency: 87 }
    ]
  }), []);

  const dashboardData = propData || mockData;

  // Initialize WebSocket connection
  useEffect(() => {
    // Mock WebSocket connection
    const mockSocket = {
      on: (event: string, callback: Function) => {
        // Simulate real-time updates
        if (event === 'realtime-metrics') {
          const interval = setInterval(() => {
            callback({
              ...dashboardData.realtimeData,
              currentPresent: dashboardData.realtimeData.currentPresent + Math.floor(Math.random() * 10) - 5,
              lastUpdate: new Date().toISOString()
            });
          }, 5000);
          
          return () => clearInterval(interval);
        }
      },
      off: () => {},
      emit: () => {},
      disconnect: () => {}
    };

    setSocket(mockSocket);
    setLoading(false);

    return () => {
      mockSocket.disconnect();
    };
  }, [dashboardData.realtimeData]);

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleExport = () => {
    // Export functionality
    console.log('Exporting dashboard data...');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <ChartLoading />
        <ChartLoading />
        <ChartLoading />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div 
        data-testid="organization-stats-dashboard"
        className="grid-responsive space-y-6"
        role="main"
        aria-label="조직별 통계 대시보드"
        tabIndex={0}
      >
        {/* Dashboard Header */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">조직별 통계 대시보드</h1>
              <p className="text-gray-600 mt-1">실시간 조직 성과 및 출근 현황 분석</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Date Range Filter */}
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none"
                />
                <span className="text-gray-400">~</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="bg-transparent border-none text-sm focus:outline-none"
                />
              </div>
              
              {/* Action Buttons */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm">새로고침</span>
              </button>
              
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">내보내기</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Overview */}
        <div data-testid="stats-overview">
          <OrganizationStatsOverview 
            data={dashboardData.overview} 
            loading={false}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Attendance Rate Chart */}
          <div data-testid="attendance-chart">
            {lazy ? (
              <Suspense fallback={<ChartLoading />}>
                <AttendanceRateChart 
                  data={dashboardData.attendanceData}
                  showTarget
                  enableZoom
                  enableExport
                />
              </Suspense>
            ) : (
              <AttendanceRateChart 
                data={dashboardData.attendanceData}
                showTarget
                enableZoom
                enableExport
              />
            )}
          </div>

          {/* Activity Heatmap */}
          <div data-testid="activity-heatmap">
            {lazy ? (
              <Suspense fallback={<ChartLoading />}>
                <ActivityHeatmap data={dashboardData.activityData} />
              </Suspense>
            ) : (
              <ActivityHeatmap data={dashboardData.activityData} />
            )}
          </div>
        </div>

        {/* Real-time Metrics */}
        <div data-testid="realtime-metrics">
          <RealtimeMetrics 
            data={dashboardData.realtimeData}
            socket={socket}
          />
        </div>

        {/* Comparison Analysis */}
        <div data-testid="comparison-analysis">
          {lazy ? (
            <Suspense fallback={<ChartLoading />}>
              <ComparisonAnalysis 
                data={dashboardData.comparisonData}
                metric="attendance"
              />
            </Suspense>
          ) : (
            <ComparisonAnalysis 
              data={dashboardData.comparisonData}
              metric="attendance"
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}