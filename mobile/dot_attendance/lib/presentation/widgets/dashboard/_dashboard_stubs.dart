import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:skeletons/skeletons.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';
import '../common/neo_brutal_button.dart';

/// Stub implementations for dashboard widgets
/// TODO: Implement full functionality for each widget

class AttendanceOverviewChart extends ConsumerWidget {
  final AsyncValue overviewData;
  final bool showDetailedStats;

  const AttendanceOverviewChart({
    super.key,
    required this.overviewData,
    this.showDetailedStats = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return overviewData.when(
      data: (data) => _buildChart(data),
      loading: () => _buildSkeleton(),
      error: (error, stack) => _buildError(),
    ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.2, end: 0);
  }

  Widget _buildChart(dynamic data) {
    final weeklyData = data['weeklyData'] as List<dynamic>? ?? [];
    final departmentStats = data['departmentStats'] as List<dynamic>? ?? [];

    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '출근 현황 분석',
                style: NeoBrutalTheme.heading,
              ),
              if (showDetailedStats)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: NeoBrutalTheme.space2,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: NeoBrutalTheme.success,
                      width: 1,
                    ),
                  ),
                  child: Text(
                    '실시간',
                    style: NeoBrutalTheme.micro.copyWith(
                      color: NeoBrutalTheme.success,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // Weekly trend chart
          SizedBox(
            height: 200,
            child: LineChart(
              LineChartData(
                gridData: FlGridData(
                  show: true,
                  drawVerticalLine: false,
                  horizontalInterval: 2,
                  getDrawingHorizontalLine: (value) {
                    return FlLine(
                      color: NeoBrutalTheme.line.withOpacity(0.1),
                      strokeWidth: 1,
                    );
                  },
                ),
                titlesData: FlTitlesData(
                  show: true,
                  rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  bottomTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      getTitlesWidget: (double value, TitleMeta meta) {
                        const style = TextStyle(
                          color: NeoBrutalTheme.fg,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        );
                        String text = '';
                        switch (value.toInt()) {
                          case 0:
                            text = '월';
                            break;
                          case 1:
                            text = '화';
                            break;
                          case 2:
                            text = '수';
                            break;
                          case 3:
                            text = '목';
                            break;
                          case 4:
                            text = '금';
                            break;
                          case 5:
                            text = '토';
                            break;
                          case 6:
                            text = '일';
                            break;
                        }
                        return SideTitleWidget(
                          axisSide: meta.axisSide,
                          child: Text(text, style: style),
                        );
                      },
                    ),
                  ),
                  leftTitles: AxisTitles(
                    sideTitles: SideTitles(
                      showTitles: true,
                      interval: 2,
                      getTitlesWidget: (double value, TitleMeta meta) {
                        return Text(
                          '${value.toInt()}h',
                          style: const TextStyle(
                            color: NeoBrutalTheme.fg,
                            fontSize: 10,
                          ),
                        );
                      },
                      reservedSize: 28,
                    ),
                  ),
                ),
                borderData: FlBorderData(
                  show: true,
                  border: const Border(
                    bottom: BorderSide(color: NeoBrutalTheme.line, width: 2),
                    left: BorderSide(color: NeoBrutalTheme.line, width: 2),
                  ),
                ),
                minX: 0,
                maxX: 6,
                minY: 0,
                maxY: 10,
                lineBarsData: [
                  LineChartBarData(
                    spots: weeklyData.asMap().entries.map((e) {
                      return FlSpot(
                        e.key.toDouble(),
                        (e.value['hours'] ?? 0.0) as double,
                      );
                    }).toList(),
                    isCurved: true,
                    gradient: const LinearGradient(
                      colors: [
                        NeoBrutalTheme.hi,
                        NeoBrutalTheme.pastelPink,
                      ],
                    ),
                    barWidth: 4,
                    isStrokeCapRound: true,
                    dotData: FlDotData(
                      show: true,
                      getDotPainter: (spot, percent, barData, index) {
                        return FlDotCirclePainter(
                          radius: 4,
                          color: NeoBrutalTheme.hi,
                          strokeWidth: 2,
                          strokeColor: NeoBrutalTheme.line,
                        );
                      },
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          NeoBrutalTheme.hi.withOpacity(0.3),
                          NeoBrutalTheme.hi.withOpacity(0.1),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          if (showDetailedStats) ..[
            const SizedBox(height: NeoBrutalTheme.space4),
            _buildDepartmentStats(departmentStats),
          ],
        ],
      ),
    );
  }

  Widget _buildDepartmentStats(List<dynamic> stats) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '부서별 출근율',
          style: NeoBrutalTheme.body.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: NeoBrutalTheme.space2),
        ...stats.map((stat) => Padding(
          padding: const EdgeInsets.only(bottom: NeoBrutalTheme.space2),
          child: Row(
            children: [
              Expanded(
                flex: 2,
                child: Text(
                  stat['dept'] ?? '',
                  style: NeoBrutalTheme.caption,
                ),
              ),
              Expanded(
                flex: 3,
                child: LinearProgressIndicator(
                  value: (stat['rate'] ?? 0.0) / 100.0,
                  backgroundColor: NeoBrutalTheme.muted,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    _getPerformanceColor(stat['rate'] ?? 0.0),
                  ),
                ),
              ),
              const SizedBox(width: NeoBrutalTheme.space2),
              Text(
                '${stat['rate']?.toStringAsFixed(1) ?? '0'}%',
                style: NeoBrutalTheme.caption.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        )).toList(),
      ],
    );
  }

  Color _getPerformanceColor(double rate) {
    if (rate >= 95) return NeoBrutalTheme.success;
    if (rate >= 85) return NeoBrutalTheme.hi;
    if (rate >= 70) return NeoBrutalTheme.warning;
    return NeoBrutalTheme.error;
  }

  Widget _buildSkeleton() {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonLine(
            style: SkeletonLineStyle(
              height: 20,
              width: 120,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          SkeletonLine(
            style: SkeletonLineStyle(
              height: 200,
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return NeoBrutalCard(
      borderColor: NeoBrutalTheme.error,
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        children: [
          Icon(
            Icons.error_outline,
            color: NeoBrutalTheme.error,
            size: 48,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            '데이터를 불러올 수 없습니다',
            style: NeoBrutalTheme.body,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class MultiStoreOverviewCard extends ConsumerWidget {
  final AsyncValue storeData;
  final bool isCompactView;

  const MultiStoreOverviewCard({
    super.key,
    required this.storeData,
    this.isCompactView = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('다중 매장 현황 - TODO: 구현 예정'),
    );
  }
}

class PayrollSummaryCard extends ConsumerWidget {
  final AsyncValue payrollData;
  final bool showDetailButton;
  final bool showBreakdown;

  const PayrollSummaryCard({
    super.key,
    required this.payrollData,
    this.showDetailButton = false,
    this.showBreakdown = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('급여 요약 - TODO: 구현 예정'),
    );
  }
}

class StoreComparisonChart extends ConsumerWidget {
  final AsyncValue comparisonData;
  final String period;

  const StoreComparisonChart({
    super.key,
    required this.comparisonData,
    required this.period,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('매장 비교 차트 - TODO: 구현 예정'),
    );
  }
}

class MasterAdminMetrics extends ConsumerWidget {
  final AsyncValue storeOverview;
  final AsyncValue totalEmployees;
  final AsyncValue attendanceRates;

  const MasterAdminMetrics({
    super.key,
    required this.storeOverview,
    required this.totalEmployees,
    required this.attendanceRates,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('마스터 관리자 메트릭스 - TODO: 구현 예정'),
    );
  }
}

class FranchisePerformanceCard extends ConsumerWidget {
  final AsyncValue performanceData;
  final String period;

  const FranchisePerformanceCard({
    super.key,
    required this.performanceData,
    required this.period,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('프랜차이즈 성과 - TODO: 구현 예정'),
    );
  }
}

// Super Admin Dashboard Widgets
class SystemWideStatsCard extends ConsumerWidget {
  final AsyncValue statsData;
  final String timeRange;

  const SystemWideStatsCard({
    super.key,
    required this.statsData,
    required this.timeRange,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return statsData.when(
      data: (data) => _buildStatsCard(data),
      loading: () => _buildSkeleton(),
      error: (error, stack) => _buildError(),
    ).animate().fadeIn(duration: 800.ms).slideX(begin: -0.2, end: 0);
  }

  Widget _buildStatsCard(dynamic data) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '시스템 전체 통계',
                style: NeoBrutalTheme.heading,
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: NeoBrutalTheme.space2,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: NeoBrutalTheme.success.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: NeoBrutalTheme.success,
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: NeoBrutalTheme.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      timeRange.toUpperCase(),
                      style: NeoBrutalTheme.micro.copyWith(
                        color: NeoBrutalTheme.success,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // Main metrics grid
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 1.8,
            mainAxisSpacing: NeoBrutalTheme.space3,
            crossAxisSpacing: NeoBrutalTheme.space3,
            children: [
              _buildMetricCard(
                '총 사용자',
                '${_formatNumber(data['totalUsers'] ?? 0)}명',
                Icons.people_outline,
                NeoBrutalTheme.hi,
                '+${data['activeUsers'] ?? 0}',
              ),
              _buildMetricCard(
                '프랜차이즈',
                '${data['totalFranchises'] ?? 0}개',
                Icons.business_outlined,
                NeoBrutalTheme.pastelSky,
                '${data['totalStores'] ?? 0} 매장',
              ),
              _buildMetricCard(
                '총 직원',
                '${_formatNumber(data['totalEmployees'] ?? 0)}명',
                Icons.badge_outlined,
                NeoBrutalTheme.pastelPink,
                '${((data['activeUsers'] ?? 0) / (data['totalUsers'] ?? 1) * 100).toStringAsFixed(1)}% 활성',
              ),
              _buildMetricCard(
                '시스템 가동률',
                '${data['systemUptime']?.toStringAsFixed(2) ?? '0'}%',
                Icons.server,
                NeoBrutalTheme.success,
                '${data['dataProcessed'] ?? '0'} 처리',
              ),
            ],
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // Real-time activity indicator
          Container(\n            padding: const EdgeInsets.all(NeoBrutalTheme.space3),\n            decoration: BoxDecoration(\n              gradient: LinearGradient(\n                begin: Alignment.topLeft,\n                end: Alignment.bottomRight,\n                colors: [\n                  NeoBrutalTheme.muted,\n                  NeoBrutalTheme.muted.withOpacity(0.5),\n                ],\n              ),\n              borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),\n              border: Border.all(\n                color: NeoBrutalTheme.line,\n                width: NeoBrutalTheme.borderThin,\n              ),\n            ),\n            child: Row(\n              children: [\n                Container(\n                  padding: const EdgeInsets.all(8),\n                  decoration: BoxDecoration(\n                    color: NeoBrutalTheme.success.withOpacity(0.1),\n                    borderRadius: BorderRadius.circular(8),\n                    border: Border.all(\n                      color: NeoBrutalTheme.success,\n                      width: 1,\n                    ),\n                  ),\n                  child: const Icon(\n                    Icons.trending_up,\n                    color: NeoBrutalTheme.success,\n                    size: 20,\n                  ),\n                ),\n                const SizedBox(width: NeoBrutalTheme.space3),\n                Expanded(\n                  child: Column(\n                    crossAxisAlignment: CrossAxisAlignment.start,\n                    children: [\n                      Text(\n                        '오늘 거래량',\n                        style: NeoBrutalTheme.caption,\n                      ),\n                      Text(\n                        '${_formatNumber(data['transactionsToday'] ?? 0)} 건',\n                        style: NeoBrutalTheme.body.copyWith(\n                          fontWeight: FontWeight.w700,\n                        ),\n                      ),\n                    ],\n                  ),\n                ),\n                Column(\n                  crossAxisAlignment: CrossAxisAlignment.end,\n                  children: [\n                    Text(\n                      '평균 응답시간',\n                      style: NeoBrutalTheme.caption,\n                    ),\n                    Text(\n                      '<125ms',\n                      style: NeoBrutalTheme.body.copyWith(\n                        fontWeight: FontWeight.w700,\n                        color: NeoBrutalTheme.success,\n                      ),\n                    ),\n                  ],\n                ),\n              ],\n            ),\n          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(
    String title,
    String value,
    IconData icon,
    Color accentColor,
    String? subtitle,
  ) {
    return Container(
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      decoration: BoxDecoration(
        color: accentColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
        border: Border.all(
          color: accentColor.withOpacity(0.3),
          width: NeoBrutalTheme.borderThin,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: NeoBrutalTheme.caption.copyWith(
                  color: NeoBrutalTheme.fg.withOpacity(0.7),
                ),
              ),
              Icon(
                icon,
                size: 16,
                color: accentColor,
              ),
            ],
          ),
          Text(
            value,
            style: NeoBrutalTheme.body.copyWith(
              fontWeight: FontWeight.w700,
              color: accentColor,
            ),
          ),
          if (subtitle != null)
            Text(
              subtitle,
              style: NeoBrutalTheme.micro.copyWith(
                color: NeoBrutalTheme.fg.withOpacity(0.5),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
        ],
      ),
    );
  }

  Widget _buildSkeleton() {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SkeletonLine(
            style: SkeletonLineStyle(
              height: 24,
              width: 150,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 1.8,
            mainAxisSpacing: NeoBrutalTheme.space3,
            crossAxisSpacing: NeoBrutalTheme.space3,
            children: List.generate(4, (index) => 
              SkeletonContainer.rounded(
                width: double.infinity,
                height: double.infinity,
                borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return NeoBrutalCard(
      borderColor: NeoBrutalTheme.error,
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        children: [
          Icon(
            Icons.error_outline,
            color: NeoBrutalTheme.error,
            size: 48,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            '시스템 통계를 불러올 수 없습니다',
            style: NeoBrutalTheme.body,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  String _formatNumber(int number) {
    if (number >= 1000000) {
      return '${(number / 1000000).toStringAsFixed(1)}M';
    } else if (number >= 1000) {
      return '${(number / 1000).toStringAsFixed(1)}K';
    }
    return number.toString();
  }
}

class FranchiseOverviewCard extends ConsumerWidget {
  final AsyncValue franchiseData;
  final String timeRange;
  final bool showDetailedStats;

  const FranchiseOverviewCard({
    super.key,
    required this.franchiseData,
    required this.timeRange,
    this.showDetailedStats = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('프랜차이즈 현황 - TODO: 구현 예정'),
    );
  }
}

class RevenueAnalysisChart extends ConsumerWidget {
  final AsyncValue revenueData;
  final String timeRange;
  final bool isCompactView;

  const RevenueAnalysisChart({
    super.key,
    required this.revenueData,
    required this.timeRange,
    this.isCompactView = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('매출 분석 차트 - TODO: 구현 예정'),
    );
  }
}

class SystemHealthCard extends ConsumerWidget {
  final AsyncValue healthData;
  final bool isCompactView;

  const SystemHealthCard({
    super.key,
    required this.healthData,
    this.isCompactView = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('시스템 상태 - TODO: 구현 예정'),
    );
  }
}

class GlobalMetricsGrid extends ConsumerWidget {
  final AsyncValue metricsData;
  final String timeRange;

  const GlobalMetricsGrid({
    super.key,
    required this.metricsData,
    required this.timeRange,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('글로벌 메트릭스 - TODO: 구현 예정'),
    );
  }
}

class FranchiseMapView extends ConsumerWidget {
  final AsyncValue franchiseData;
  final String timeRange;

  const FranchiseMapView({
    super.key,
    required this.franchiseData,
    required this.timeRange,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Text('프랜차이즈 맵 뷰 - TODO: 구현 예정'),
    );
  }
}
