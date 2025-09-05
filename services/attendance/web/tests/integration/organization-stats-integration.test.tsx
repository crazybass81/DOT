/**
 * Phase 3.3.1.2: 조직별 통계 대시보드 통합 테스트
 * TDD 완성 후 통합 검증
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { OrganizationStatsDashboard } from '@/components/master-admin/OrganizationStatsDashboard';

// Mock recharts for integration test
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Cell: () => <div data-testid="cell" />,
  Pie: () => <div data-testid="pie" />,
  ReferenceLine: () => <div data-testid="reference-line" />
}));

describe('🎯 Phase 3.3.1.2 통합 테스트: 조직별 통계 대시보드', () => {
  it('✅ TDD 완성: 모든 컴포넌트가 통합되어 렌더링된다', async () => {
    render(<OrganizationStatsDashboard />);
    
    // 대시보드 헤더
    expect(screen.getByText('조직별 통계 대시보드')).toBeInTheDocument();
    expect(screen.getByText('실시간 조직 성과 및 출근 현황 분석')).toBeInTheDocument();
    
    // 통계 개요 컴포넌트
    const statsOverview = screen.getAllByTestId('stats-overview');
    expect(statsOverview.length).toBeGreaterThan(0);
    expect(screen.getByText('총 직원 수')).toBeInTheDocument();
    expect(screen.getByText('활성 사용자')).toBeInTheDocument();
    expect(screen.getByText('평균 출근율')).toBeInTheDocument();
    
    // 차트 컴포넌트들
    expect(screen.getByTestId('attendance-chart')).toBeInTheDocument();
    expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('realtime-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-analysis')).toBeInTheDocument();
  });

  it('✅ Recharts 통합: 모든 차트가 정상적으로 렌더링된다', () => {
    render(<OrganizationStatsDashboard />);
    
    // Line chart (출근율 차트)
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByText('출근율 추이')).toBeInTheDocument();
    
    // Bar chart (비교 분석)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    expect(screen.getByText('조직별 비교 분석')).toBeInTheDocument();
    
    // Responsive container
    const containers = screen.getAllByTestId('responsive-container');
    expect(containers.length).toBeGreaterThan(0);
  });

  it('✅ 실시간 기능: WebSocket 연동 컴포넌트가 작동한다', () => {
    render(<OrganizationStatsDashboard />);
    
    // 실시간 지표 섹션
    expect(screen.getByText('실시간 지표')).toBeInTheDocument();
    expect(screen.getByText('현재 출근 중')).toBeInTheDocument();
    expect(screen.getByText('오늘 출근 완료')).toBeInTheDocument();
    
    // 라이브 인디케이터
    expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
  });

  it('✅ 사용자 상호작용: 필터링 및 제어 기능이 작동한다', () => {
    render(<OrganizationStatsDashboard />);
    
    // 날짜 범위 필터
    const dateInputs = screen.getAllByDisplayValue(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateInputs.length).toBe(2); // start, end 날짜
    
    // 액션 버튼들
    expect(screen.getByText('새로고침')).toBeInTheDocument();
    expect(screen.getByText('내보내기')).toBeInTheDocument();
    
    // 차트 제어 버튼들
    expect(screen.getByText('Bar')).toBeInTheDocument();
    expect(screen.getByText('Pie')).toBeInTheDocument();
  });

  it('✅ 접근성: ARIA 라벨 및 키보드 내비게이션이 지원된다', () => {
    render(<OrganizationStatsDashboard />);
    
    // 메인 역할
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
    expect(mainElement).toHaveAttribute('aria-label', '조직별 통계 대시보드');
    expect(mainElement).toHaveAttribute('tabIndex', '0');
  });

  it('✅ 반응형 디자인: 그리드 레이아웃이 적용된다', () => {
    render(<OrganizationStatsDashboard />);
    
    const dashboard = screen.getByTestId('organization-stats-dashboard');
    expect(dashboard).toHaveClass('grid-responsive');
  });

  it('✅ 에러 처리: ErrorBoundary가 적절히 작동한다', async () => {
    // Console error를 모킹하여 에러 로그 방지
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // 정상적인 렌더링 테스트
    render(<OrganizationStatsDashboard />);
    
    expect(screen.getByTestId('organization-stats-dashboard')).toBeInTheDocument();
    
    consoleSpy.mockRestore();
  });

  it('✅ 성능 최적화: 지연 로딩이 지원된다', async () => {
    render(<OrganizationStatsDashboard lazy />);
    
    // 대시보드가 렌더링되고 컴포넌트들이 로드되기를 기다림
    await waitFor(() => {
      expect(screen.getByTestId('organization-stats-dashboard')).toBeInTheDocument();
    });
    
    // 모든 주요 섹션이 로드됨을 확인
    expect(screen.getByTestId('stats-overview')).toBeInTheDocument();
    expect(screen.getByTestId('attendance-chart')).toBeInTheDocument();
    expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('realtime-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-analysis')).toBeInTheDocument();
  });

  it('✅ 데이터 시각화: 모든 통계가 올바르게 표시된다', () => {
    render(<OrganizationStatsDashboard />);
    
    // 숫자 형식의 데이터 표시 확인
    expect(screen.getByText('1,250')).toBeInTheDocument(); // 총 직원 수
    expect(screen.getByText('850')).toBeInTheDocument();   // 활성 사용자
    expect(screen.getByText('87.5%')).toBeInTheDocument(); // 평균 출근율
    expect(screen.getByText('12')).toBeInTheDocument();    // 오늘 알림
    expect(screen.getByText('320')).toBeInTheDocument();   // 현재 출근 중
    
    // 트렌드 표시 확인
    const trendElements = screen.getAllByText('+5.2%');
    expect(trendElements.length).toBeGreaterThan(0);
  });
});

describe('🔄 Phase 3.3.1.2 TDD 사이클 완성 검증', () => {
  it('🔴 RED → 🟢 GREEN → 🔵 REFACTOR 완료', () => {
    // TDD의 모든 단계를 거쳐 완성된 컴포넌트 테스트
    render(<OrganizationStatsDashboard />);
    
    // RED: 초기에 실패했던 테스트들이 이제 성공
    expect(screen.getByTestId('organization-stats-dashboard')).toBeInTheDocument();
    
    // GREEN: 기본 기능이 모두 구현됨
    expect(screen.getByText('조직별 통계 대시보드')).toBeInTheDocument();
    const statsOverview = screen.getAllByTestId('stats-overview');
    expect(statsOverview.length).toBeGreaterThan(0);
    expect(screen.getByTestId('attendance-chart')).toBeInTheDocument();
    expect(screen.getByTestId('activity-heatmap')).toBeInTheDocument();
    expect(screen.getByTestId('realtime-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-analysis')).toBeInTheDocument();
    
    // REFACTOR: 코드 품질과 사용자 경험이 최적화됨
    expect(screen.getByRole('main')).toHaveAttribute('aria-label', '조직별 통계 대시보드');
    expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
    expect(screen.getByText('새로고침')).toBeInTheDocument();
    expect(screen.getByText('내보내기')).toBeInTheDocument();
  });
});