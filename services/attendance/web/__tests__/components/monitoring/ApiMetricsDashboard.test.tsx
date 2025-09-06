/**
 * ApiMetricsDashboard Component Tests - TDD Phase 1 (RED)
 * 대시보드 컴포넌트 테스트 - 실시간 API 메트릭 시각화
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApiMetricsDashboard } from '../../../src/components/monitoring/ApiMetricsDashboard';
import { 
  ApiPerformanceMetrics, 
  PerformanceAlert, 
  ApiEndpointStats 
} from '../../../src/types/performance-metrics';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Line Chart Mock
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Bar Chart Mock
    </div>
  ),
  Doughnut: ({ data, options }: any) => (
    <div data-testid="doughnut-chart" data-chart-data={JSON.stringify(data)} data-chart-options={JSON.stringify(options)}>
      Doughnut Chart Mock
    </div>
  ),
}));

// Mock useApiMetrics hook
const mockUseApiMetrics = {
  metrics: null as ApiPerformanceMetrics | null,
  isLoading: false,
  error: null as string | null,
  connectionStatus: 'connected' as const,
  lastUpdated: new Date(),
  activeAlerts: [] as PerformanceAlert[],
  refresh: jest.fn(),
};

jest.mock('../../../src/hooks/useApiMetrics', () => ({
  useApiMetrics: () => mockUseApiMetrics,
}));

// Mock date formatting
jest.mock('../../../src/lib/utils', () => ({
  formatDateTime: (date: Date) => date.toISOString(),
  formatDuration: (ms: number) => `${ms}ms`,
  formatPercentage: (rate: number) => `${(rate * 100).toFixed(1)}%`,
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

describe('ApiMetricsDashboard', () => {
  let mockMetrics: ApiPerformanceMetrics;
  let mockAlerts: PerformanceAlert[];

  beforeEach(() => {
    // Setup comprehensive mock data
    mockMetrics = {
      overview: {
        totalRequests: 15000,
        activeRequests: 12,
        requestsPerSecond: 85,
        avgResponseTime: 245,
        successRate: 0.964,
        errorRate: 0.036,
      },
      endpointStats: [
        {
          endpoint: '/api/users',
          method: 'GET',
          totalRequests: 5000,
          successRequests: 4850,
          failureRequests: 150,
          avgResponseTime: 180,
          medianResponseTime: 150,
          p95ResponseTime: 320,
          p99ResponseTime: 450,
          minResponseTime: 45,
          maxResponseTime: 800,
          requestsPerMinute: 45,
          successRate: 0.97,
          lastUpdated: new Date(),
        },
        {
          endpoint: '/api/posts',
          method: 'POST',
          totalRequests: 3000,
          successRequests: 2900,
          failureRequests: 100,
          avgResponseTime: 350,
          medianResponseTime: 300,
          p95ResponseTime: 600,
          p99ResponseTime: 850,
          minResponseTime: 120,
          maxResponseTime: 1200,
          requestsPerMinute: 25,
          successRate: 0.967,
          lastUpdated: new Date(),
        },
      ],
      statusCodeDistribution: {
        '200': 12500,
        '201': 2000,
        '400': 300,
        '404': 150,
        '500': 50,
      },
      timeSeries: {
        requests: [
          { timestamp: new Date('2023-01-01T10:00:00Z'), value: 100 },
          { timestamp: new Date('2023-01-01T10:01:00Z'), value: 120 },
          { timestamp: new Date('2023-01-01T10:02:00Z'), value: 110 },
          { timestamp: new Date('2023-01-01T10:03:00Z'), value: 130 },
          { timestamp: new Date('2023-01-01T10:04:00Z'), value: 85 },
        ],
        responseTime: [
          { timestamp: new Date('2023-01-01T10:00:00Z'), value: 200 },
          { timestamp: new Date('2023-01-01T10:01:00Z'), value: 250 },
          { timestamp: new Date('2023-01-01T10:02:00Z'), value: 230 },
          { timestamp: new Date('2023-01-01T10:03:00Z'), value: 280 },
          { timestamp: new Date('2023-01-01T10:04:00Z'), value: 245 },
        ],
        errorRate: [
          { timestamp: new Date('2023-01-01T10:00:00Z'), value: 0.02 },
          { timestamp: new Date('2023-01-01T10:01:00Z'), value: 0.03 },
          { timestamp: new Date('2023-01-01T10:02:00Z'), value: 0.025 },
          { timestamp: new Date('2023-01-01T10:03:00Z'), value: 0.045 },
          { timestamp: new Date('2023-01-01T10:04:00Z'), value: 0.036 },
        ],
      },
      recentErrors: [
        {
          requestId: 'err-001',
          method: 'POST',
          endpoint: '/api/users',
          statusCode: 500,
          responseTime: 1200,
          timestamp: new Date('2023-01-01T10:03:30Z'),
          errorMessage: 'Database connection timeout',
        },
      ],
      slowestRequests: [
        {
          requestId: 'slow-001',
          method: 'GET',
          endpoint: '/api/reports',
          statusCode: 200,
          responseTime: 2500,
          timestamp: new Date('2023-01-01T10:02:15Z'),
        },
      ],
    };

    mockAlerts = [
      {
        id: 'alert-001',
        type: 'high_response_time',
        severity: 'medium',
        message: 'Average response time exceeded 1000ms',
        endpoint: '/api/reports',
        metricValue: 1200,
        threshold: 1000,
        timestamp: new Date('2023-01-01T10:03:00Z'),
        status: 'active',
      },
      {
        id: 'alert-002',
        type: 'high_error_rate',
        severity: 'high',
        message: 'Error rate exceeded 5%',
        metricValue: 0.08,
        threshold: 0.05,
        timestamp: new Date('2023-01-01T10:04:30Z'),
        status: 'active',
      },
    ];

    // Reset mocks
    jest.clearAllMocks();
    mockUseApiMetrics.refresh.mockResolvedValue();
  });

  describe('Loading and Error States', () => {
    test('should display loading state', () => {
      mockUseApiMetrics.isLoading = true;
      mockUseApiMetrics.metrics = null;

      render(<ApiMetricsDashboard />);

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading metrics/i)).toBeInTheDocument();
    });

    test('should display error state', () => {
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = 'Failed to load metrics';
      mockUseApiMetrics.metrics = null;

      render(<ApiMetricsDashboard />);

      expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
      expect(screen.getByText(/failed to load metrics/i)).toBeInTheDocument();
      
      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();
    });

    test('should handle retry button click', async () => {
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = 'Network error';
      mockUseApiMetrics.metrics = null;

      render(<ApiMetricsDashboard />);

      const retryButton = screen.getByText(/retry/i);
      fireEvent.click(retryButton);

      expect(mockUseApiMetrics.refresh).toHaveBeenCalled();
    });

    test('should display empty state when no metrics', () => {
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = null;
      mockUseApiMetrics.metrics = null;

      render(<ApiMetricsDashboard />);

      expect(screen.getByTestId('dashboard-empty')).toBeInTheDocument();
      expect(screen.getByText(/no metrics available/i)).toBeInTheDocument();
    });
  });

  describe('Overview Metrics Display', () => {
    beforeEach(() => {
      mockUseApiMetrics.metrics = mockMetrics;
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = null;
    });

    test('should display overview statistics', () => {
      render(<ApiMetricsDashboard />);

      expect(screen.getByText('15,000')).toBeInTheDocument(); // Total requests
      expect(screen.getByText('12')).toBeInTheDocument(); // Active requests
      expect(screen.getByText('85')).toBeInTheDocument(); // RPS
      expect(screen.getByText('245ms')).toBeInTheDocument(); // Avg response time
      expect(screen.getByText('96.4%')).toBeInTheDocument(); // Success rate
      expect(screen.getByText('3.6%')).toBeInTheDocument(); // Error rate
    });

    test('should display metric cards with proper styling', () => {
      render(<ApiMetricsDashboard />);

      const totalRequestsCard = screen.getByTestId('metric-total-requests');
      const responseTimeCard = screen.getByTestId('metric-avg-response-time');
      const successRateCard = screen.getByTestId('metric-success-rate');
      const errorRateCard = screen.getByTestId('metric-error-rate');

      expect(totalRequestsCard).toHaveClass('metric-card');
      expect(responseTimeCard).toHaveClass('metric-card');
      expect(successRateCard).toHaveClass('metric-card', 'success');
      expect(errorRateCard).toHaveClass('metric-card', 'error');
    });

    test('should show connection status indicator', () => {
      render(<ApiMetricsDashboard />);

      const connectionStatus = screen.getByTestId('connection-status');
      expect(connectionStatus).toBeInTheDocument();
      expect(connectionStatus).toHaveClass('connected');
      expect(screen.getByText(/connected/i)).toBeInTheDocument();
    });

    test('should display last updated timestamp', () => {
      render(<ApiMetricsDashboard />);

      expect(screen.getByTestId('last-updated')).toBeInTheDocument();
      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });
  });

  describe('Charts and Visualizations', () => {
    beforeEach(() => {
      mockUseApiMetrics.metrics = mockMetrics;
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = null;
    });

    test('should render time series charts', () => {
      render(<ApiMetricsDashboard />);

      const requestsChart = screen.getByTestId('requests-chart');
      const responseTimeChart = screen.getByTestId('response-time-chart');
      const errorRateChart = screen.getByTestId('error-rate-chart');

      expect(requestsChart).toBeInTheDocument();
      expect(responseTimeChart).toBeInTheDocument();
      expect(errorRateChart).toBeInTheDocument();
    });

    test('should render status code distribution chart', () => {
      render(<ApiMetricsDashboard />);

      const statusCodeChart = screen.getByTestId('status-code-chart');
      expect(statusCodeChart).toBeInTheDocument();

      // Check chart data
      const chartData = JSON.parse(statusCodeChart.getAttribute('data-chart-data') || '{}');
      expect(chartData.labels).toEqual(['200', '201', '400', '404', '500']);
      expect(chartData.datasets[0].data).toEqual([12500, 2000, 300, 150, 50]);
    });

    test('should render endpoint performance chart', () => {
      render(<ApiMetricsDashboard />);

      const endpointChart = screen.getByTestId('endpoint-performance-chart');
      expect(endpointChart).toBeInTheDocument();

      // Check chart includes endpoint data
      const chartData = JSON.parse(endpointChart.getAttribute('data-chart-data') || '{}');
      expect(chartData.labels).toContain('/api/users');
      expect(chartData.labels).toContain('/api/posts');
    });

    test('should handle chart interactions', () => {
      render(<ApiMetricsDashboard />);

      const chartTabs = screen.getByTestId('chart-tabs');
      expect(chartTabs).toBeInTheDocument();

      const requestsTab = screen.getByText('Requests');
      const responseTimeTab = screen.getByText('Response Time');
      const errorRateTab = screen.getByText('Error Rate');

      expect(requestsTab).toBeInTheDocument();
      expect(responseTimeTab).toBeInTheDocument();
      expect(errorRateTab).toBeInTheDocument();

      // Test tab switching
      fireEvent.click(responseTimeTab);
      expect(responseTimeTab).toHaveClass('active');
    });
  });

  describe('Endpoint Statistics Table', () => {
    beforeEach(() => {
      mockUseApiMetrics.metrics = mockMetrics;
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = null;
    });

    test('should display endpoint statistics table', () => {
      render(<ApiMetricsDashboard />);

      const endpointTable = screen.getByTestId('endpoint-stats-table');
      expect(endpointTable).toBeInTheDocument();

      // Check table headers
      expect(screen.getByText('Endpoint')).toBeInTheDocument();
      expect(screen.getByText('Method')).toBeInTheDocument();
      expect(screen.getByText('Requests')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Avg Response')).toBeInTheDocument();
      expect(screen.getByText('P95')).toBeInTheDocument();
      expect(screen.getByText('P99')).toBeInTheDocument();
    });

    test('should display endpoint data correctly', () => {
      render(<ApiMetricsDashboard />);

      expect(screen.getByText('/api/users')).toBeInTheDocument();
      expect(screen.getByText('/api/posts')).toBeInTheDocument();
      expect(screen.getByText('5,000')).toBeInTheDocument();
      expect(screen.getByText('3,000')).toBeInTheDocument();
      expect(screen.getByText('97.0%')).toBeInTheDocument();
      expect(screen.getByText('96.7%')).toBeInTheDocument();
    });

    test('should support table sorting', () => {
      render(<ApiMetricsDashboard />);

      const responseTimeHeader = screen.getByText('Avg Response');
      fireEvent.click(responseTimeHeader);

      // Should sort by response time
      const tableRows = screen.getAllByTestId(/endpoint-row-/);
      expect(tableRows[0]).toHaveTextContent('/api/users'); // Lower response time first
    });

    test('should support table filtering', () => {
      render(<ApiMetricsDashboard />);

      const filterInput = screen.getByTestId('endpoint-filter');
      fireEvent.change(filterInput, { target: { value: 'users' } });

      expect(screen.getByText('/api/users')).toBeInTheDocument();
      expect(screen.queryByText('/api/posts')).not.toBeInTheDocument();
    });

    test('should highlight slow endpoints', () => {
      render(<ApiMetricsDashboard />);

      const slowEndpointRow = screen.getByTestId('endpoint-row-/api/posts');
      expect(slowEndpointRow).toHaveClass('slow-endpoint'); // 350ms > threshold
    });
  });

  describe('Alerts Display', () => {
    beforeEach(() => {
      mockUseApiMetrics.metrics = mockMetrics;
      mockUseApiMetrics.activeAlerts = mockAlerts;
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = null;
    });

    test('should display active alerts', () => {
      render(<ApiMetricsDashboard />);

      const alertsSection = screen.getByTestId('alerts-section');
      expect(alertsSection).toBeInTheDocument();

      expect(screen.getByText(/high response time/i)).toBeInTheDocument();
      expect(screen.getByText(/high error rate/i)).toBeInTheDocument();
    });

    test('should show alert severity indicators', () => {
      render(<ApiMetricsDashboard />);

      const mediumAlert = screen.getByTestId('alert-alert-001');
      const highAlert = screen.getByTestId('alert-alert-002');

      expect(mediumAlert).toHaveClass('alert-medium');
      expect(highAlert).toHaveClass('alert-high');
    });

    test('should display alert details', () => {
      render(<ApiMetricsDashboard />);

      expect(screen.getByText('1200')).toBeInTheDocument(); // Metric value
      expect(screen.getByText('1000')).toBeInTheDocument(); // Threshold
      expect(screen.getByText('/api/reports')).toBeInTheDocument(); // Endpoint
    });

    test('should handle alert dismissal', () => {
      render(<ApiMetricsDashboard />);

      const dismissButton = screen.getByTestId('dismiss-alert-alert-001');
      fireEvent.click(dismissButton);

      // Should call dismiss function (mock implementation)
      expect(dismissButton).toHaveBeenCalled;
    });

    test('should show no alerts message when empty', () => {
      mockUseApiMetrics.activeAlerts = [];

      render(<ApiMetricsDashboard />);

      expect(screen.getByText(/no active alerts/i)).toBeInTheDocument();
      expect(screen.getByTestId('no-alerts-message')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      mockUseApiMetrics.metrics = mockMetrics;
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = null;
    });

    test('should show real-time indicator when connected', () => {
      mockUseApiMetrics.connectionStatus = 'connected';

      render(<ApiMetricsDashboard />);

      const realtimeIndicator = screen.getByTestId('realtime-indicator');
      expect(realtimeIndicator).toBeInTheDocument();
      expect(realtimeIndicator).toHaveClass('connected');
    });

    test('should show disconnected state', () => {
      mockUseApiMetrics.connectionStatus = 'disconnected';

      render(<ApiMetricsDashboard />);

      const realtimeIndicator = screen.getByTestId('realtime-indicator');
      expect(realtimeIndicator).toHaveClass('disconnected');
      expect(screen.getByText(/disconnected/i)).toBeInTheDocument();
    });

    test('should animate metric updates', async () => {
      const { rerender } = render(<ApiMetricsDashboard />);

      const totalRequestsCard = screen.getByTestId('metric-total-requests');
      expect(totalRequestsCard).toHaveTextContent('15,000');

      // Update metrics
      const updatedMetrics = {
        ...mockMetrics,
        overview: {
          ...mockMetrics.overview,
          totalRequests: 15100,
        },
      };
      mockUseApiMetrics.metrics = updatedMetrics;

      rerender(<ApiMetricsDashboard />);

      await waitFor(() => {
        expect(totalRequestsCard).toHaveTextContent('15,100');
        expect(totalRequestsCard).toHaveClass('updated');
      });
    });

    test('should auto-refresh when enabled', async () => {
      render(<ApiMetricsDashboard refreshInterval={100} />);

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      expect(mockUseApiMetrics.refresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Export and Actions', () => {
    beforeEach(() => {
      mockUseApiMetrics.metrics = mockMetrics;
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = null;
    });

    test('should provide export functionality', () => {
      render(<ApiMetricsDashboard />);

      const exportButton = screen.getByTestId('export-button');
      expect(exportButton).toBeInTheDocument();

      fireEvent.click(exportButton);

      const exportMenu = screen.getByTestId('export-menu');
      expect(exportMenu).toBeInTheDocument();

      expect(screen.getByText('Export as JSON')).toBeInTheDocument();
      expect(screen.getByText('Export as CSV')).toBeInTheDocument();
      expect(screen.getByText('Export Charts')).toBeInTheDocument();
    });

    test('should handle chart zoom and pan', () => {
      render(<ApiMetricsDashboard />);

      const chart = screen.getByTestId('requests-chart');
      
      // Mock chart interactions
      fireEvent.mouseDown(chart, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(chart, { clientX: 150, clientY: 100 });
      fireEvent.mouseUp(chart);

      // Chart should handle pan interaction
      expect(chart).toHaveAttribute('data-chart-options');
    });

    test('should provide manual refresh button', () => {
      render(<ApiMetricsDashboard />);

      const refreshButton = screen.getByTestId('refresh-button');
      expect(refreshButton).toBeInTheDocument();

      fireEvent.click(refreshButton);

      expect(mockUseApiMetrics.refresh).toHaveBeenCalled();
    });

    test('should show refresh loading state', async () => {
      mockUseApiMetrics.refresh.mockImplementation(() => {
        mockUseApiMetrics.isLoading = true;
        return Promise.resolve();
      });

      render(<ApiMetricsDashboard />);

      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      expect(refreshButton).toHaveClass('loading');
    });
  });

  describe('Responsive Design', () => {
    test('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      mockUseApiMetrics.metrics = mockMetrics;
      render(<ApiMetricsDashboard />);

      const dashboard = screen.getByTestId('api-metrics-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    test('should handle tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });
      Object.defineProperty(window, 'innerHeight', { value: 1024 });

      mockUseApiMetrics.metrics = mockMetrics;
      render(<ApiMetricsDashboard />);

      const dashboard = screen.getByTestId('api-metrics-dashboard');
      expect(dashboard).toHaveClass('tablet-layout');
    });

    test('should show/hide details based on screen size', () => {
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      mockUseApiMetrics.metrics = mockMetrics;
      render(<ApiMetricsDashboard />);

      // Some detailed metrics should be hidden on mobile
      expect(screen.queryByText('P99')).not.toBeInTheDocument();
      expect(screen.getByText('P95')).toBeInTheDocument(); // But P95 should remain
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseApiMetrics.metrics = mockMetrics;
      mockUseApiMetrics.isLoading = false;
      mockUseApiMetrics.error = null;
    });

    test('should have proper ARIA labels', () => {
      render(<ApiMetricsDashboard />);

      expect(screen.getByLabelText('API Performance Dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Endpoint statistics table')).toBeInTheDocument();
      expect(screen.getByLabelText('Active alerts')).toBeInTheDocument();
    });

    test('should be keyboard navigable', () => {
      render(<ApiMetricsDashboard />);

      const refreshButton = screen.getByTestId('refresh-button');
      const exportButton = screen.getByTestId('export-button');

      // Should be focusable
      expect(refreshButton).toHaveAttribute('tabIndex', '0');
      expect(exportButton).toHaveAttribute('tabIndex', '0');

      // Test keyboard navigation
      refreshButton.focus();
      fireEvent.keyDown(refreshButton, { key: 'Enter' });
      expect(mockUseApiMetrics.refresh).toHaveBeenCalled();
    });

    test('should announce live updates to screen readers', async () => {
      const { rerender } = render(<ApiMetricsDashboard />);

      const liveRegion = screen.getByLabelText('Live metrics updates');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');

      // Update metrics
      const updatedMetrics = {
        ...mockMetrics,
        overview: {
          ...mockMetrics.overview,
          totalRequests: 15200,
        },
      };
      mockUseApiMetrics.metrics = updatedMetrics;

      rerender(<ApiMetricsDashboard />);

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/updated/i);
      });
    });

    test('should provide chart descriptions for screen readers', () => {
      render(<ApiMetricsDashboard />);

      const requestsChart = screen.getByTestId('requests-chart');
      expect(requestsChart).toHaveAttribute('aria-describedby');

      const chartDescription = screen.getByTestId('requests-chart-description');
      expect(chartDescription).toHaveTextContent(/requests over time/i);
    });
  });
});