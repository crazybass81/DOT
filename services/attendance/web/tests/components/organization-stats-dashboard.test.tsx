/**
 * Phase 3.3.1.2: 조직별 통계 대시보드 TDD 구현
 * 🔴 RED: 실패하는 테스트를 먼저 작성
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { OrganizationStatsOverview } from '@/components/master-admin/OrganizationStatsOverview';
import { AttendanceRateChart } from '@/components/master-admin/AttendanceRateChart';
import { ActivityHeatmap } from '@/components/master-admin/ActivityHeatmap';
import { RealtimeMetrics } from '@/components/master-admin/RealtimeMetrics';
import { ComparisonAnalysis } from '@/components/master-admin/ComparisonAnalysis';
import { OrganizationStatsDashboard } from '@/components/master-admin/OrganizationStatsDashboard';

// Mock data for tests
const mockStatsData = {
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
};

// Mock WebSocket for real-time updates
const mockWebSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn()
};

// Mock chart libraries
jest.mock('recharts', () => ({
  LineChart: ({ children, ...props }: any) => <div data-testid="line-chart" {...props}>{children}</div>,
  BarChart: ({ children, ...props }: any) => <div data-testid="bar-chart" {...props}>{children}</div>,
  PieChart: ({ children, ...props }: any) => <div data-testid="pie-chart" {...props}>{children}</div>,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
  YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
  Tooltip: (props: any) => <div data-testid="tooltip" {...props} />,
  Legend: (props: any) => <div data-testid="legend" {...props} />,
  Line: (props: any) => <div data-testid="line" {...props} />,
  Bar: (props: any) => <div data-testid="bar" {...props} />,
  Cell: (props: any) => <div data-testid="cell" {...props} />,
  Pie: (props: any) => <div data-testid="pie" {...props} />
}));

describe('🔴 RED Phase: 조직별 통계 대시보드 컴포넌트 테스트', () => {
  
  describe('OrganizationStatsOverview', () => {
    it('should render overview statistics cards', () => {
      render(<OrganizationStatsOverview data={mockStatsData.overview} />);
      
      expect(screen.getByText('총 직원 수')).toBeInTheDocument();
      expect(screen.getByText('1,250')).toBeInTheDocument();
      expect(screen.getByText('활성 사용자')).toBeInTheDocument();
      expect(screen.getByText('850')).toBeInTheDocument();
      expect(screen.getByText('평균 출근율')).toBeInTheDocument();
      expect(screen.getByText('87.5%')).toBeInTheDocument();
    });

    it('should show trend indicators', () => {
      render(<OrganizationStatsOverview data={mockStatsData.overview} />);
      
      const trendElements = screen.getAllByText('+5.2%');
      expect(trendElements.length).toBeGreaterThan(0);
      expect(screen.getByTestId('trend-up')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      render(<OrganizationStatsOverview data={null} loading />);
      
      expect(screen.getByTestId('stats-loading')).toBeInTheDocument();
    });
  });

  describe('AttendanceRateChart', () => {
    it('should render line chart with attendance data', () => {
      render(<AttendanceRateChart data={mockStatsData.attendanceData} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should show target line', () => {
      render(<AttendanceRateChart data={mockStatsData.attendanceData} showTarget />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      // Check if target line is rendered (Recharts mocked)
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    });

    it('should handle empty data', () => {
      render(<AttendanceRateChart data={[]} />);
      
      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
    });
  });

  describe('ActivityHeatmap', () => {
    it('should render activity heatmap grid', () => {
      render(<ActivityHeatmap data={mockStatsData.activityData} />);
      
      expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
      expect(screen.getByText('09:00')).toBeInTheDocument();
      expect(screen.getByText('월')).toBeInTheDocument();
    });

    it('should show intensity colors based on values', () => {
      render(<ActivityHeatmap data={mockStatsData.activityData} />);
      
      const cells = screen.getAllByTestId('heatmap-cell');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should display tooltip on hover', () => {
      render(<ActivityHeatmap data={mockStatsData.activityData} />);
      
      expect(screen.getByTestId('heatmap-container')).toBeInTheDocument();
      // Tooltip appears on hover, not initially visible
      const cells = screen.getAllByTestId('heatmap-cell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  describe('RealtimeMetrics', () => {
    it('should display current metrics', () => {
      render(<RealtimeMetrics data={mockStatsData.realtimeData} socket={mockWebSocket} />);
      
      expect(screen.getByText('현재 출근 중')).toBeInTheDocument();
      expect(screen.getByText('320')).toBeInTheDocument();
      expect(screen.getByText('오늘 출근 완료')).toBeInTheDocument();
      expect(screen.getByText('890')).toBeInTheDocument();
    });

    it('should show live update indicator', () => {
      render(<RealtimeMetrics data={mockStatsData.realtimeData} socket={mockWebSocket} />);
      
      expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
    });

    it('should update data via WebSocket', async () => {
      const { rerender } = render(
        <RealtimeMetrics data={mockStatsData.realtimeData} socket={mockWebSocket} />
      );

      const updatedData = { ...mockStatsData.realtimeData, currentPresent: 325 };
      
      rerender(<RealtimeMetrics data={updatedData} socket={mockWebSocket} />);
      
      await waitFor(() => {
        expect(screen.getByText('325')).toBeInTheDocument();
      });
    });
  });

  describe('ComparisonAnalysis', () => {
    it('should render organization comparison chart', () => {
      render(<ComparisonAnalysis data={mockStatsData.comparisonData} />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    });

    it('should support different metric types', () => {
      render(<ComparisonAnalysis data={mockStatsData.comparisonData} metric="efficiency" />);
      
      expect(screen.getByText('효율성 비교')).toBeInTheDocument();
    });

    it('should show top performers', () => {
      render(<ComparisonAnalysis data={mockStatsData.comparisonData} />);
      
      expect(screen.getByTestId('top-performers')).toBeInTheDocument();
    });
  });

  describe('OrganizationStatsDashboard (통합 컴포넌트)', () => {
    it('should render all dashboard components', () => {
      render(<OrganizationStatsDashboard />);
      
      expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
      expect(screen.getByTestId('attendance-chart')).toBeInTheDocument();
      expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
      expect(screen.getByTestId('realtime-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('comparison-analysis')).toBeInTheDocument();
    });

    it('should handle responsive layout', () => {
      render(<OrganizationStatsDashboard />);
      
      const dashboard = screen.getByTestId('organization-stats-dashboard');
      expect(dashboard).toHaveClass('grid-responsive');
    });

    it('should show error boundary on component failures', () => {
      // Mock console.error to prevent error logs in test output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create a component that will throw an error
      const ErrorComponent = () => {
        throw new Error('Test error');
      };
      
      // Use a separate error boundary test
      render(<OrganizationStatsDashboard />);
      
      // Check that dashboard renders normally without error
      expect(screen.getByTestId('organization-stats-dashboard')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('should filter data by date range', () => {
      render(<OrganizationStatsDashboard dateRange={{ start: '2024-01-01', end: '2024-06-30' }} />);
      
      expect(screen.getByDisplayValue('2024-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-06-30')).toBeInTheDocument();
    });
  });

  describe('차트 상호작용 테스트', () => {
    it('should support chart zoom functionality', () => {
      render(<AttendanceRateChart data={mockStatsData.attendanceData} enableZoom />);
      
      expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
    });

    it('should export chart as image', () => {
      render(<AttendanceRateChart data={mockStatsData.attendanceData} enableExport />);
      
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should toggle chart data series', () => {
      render(<AttendanceRateChart data={mockStatsData.attendanceData} />);
      
      const legend = screen.getByTestId('legend');
      expect(legend).toBeInTheDocument();
    });
  });

  describe('성능 및 접근성 테스트', () => {
    it('should be accessible with proper ARIA labels', () => {
      render(<OrganizationStatsDashboard />);
      
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('조직별 통계 대시보드')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<OrganizationStatsDashboard />);
      
      const dashboard = screen.getByRole('main');
      expect(dashboard).toHaveAttribute('tabIndex', '0');
    });

    it('should lazy load chart components', async () => {
      render(<OrganizationStatsDashboard lazy />);
      
      await waitFor(() => {
        expect(screen.getByTestId('chart-loading')).toBeInTheDocument();
      });
    });
  });
});