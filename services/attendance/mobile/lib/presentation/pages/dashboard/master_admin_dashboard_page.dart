import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../../domain/entities/user/user_role.dart';
import '../../widgets/common/neo_brutal_card.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/dashboard/_dashboard_stubs.dart';
import '../../providers/auth_provider.dart';
import '../../providers/employee_provider.dart';
import '../../providers/_missing_providers.dart';

/// MASTER ADMIN 역할 대시보드
/// 다중 매장 관리자가 사용하는 대시보드로 매장별 성과, 급여 관리, 직원 현황 등을 제공
class MasterAdminDashboardPage extends ConsumerStatefulWidget {
  const MasterAdminDashboardPage({super.key});

  @override
  ConsumerState<MasterAdminDashboardPage> createState() => _MasterAdminDashboardPageState();
}

class _MasterAdminDashboardPageState extends ConsumerState<MasterAdminDashboardPage>
    with TickerProviderStateMixin {
  final GlobalKey<RefreshIndicatorState> _refreshKey = GlobalKey<RefreshIndicatorState>();
  late TabController _tabController;
  int _selectedTab = 0;
  String _selectedPeriod = 'month'; // week, month, quarter, year

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _selectedTab = _tabController.index;
      });
    });
    
    // 초기 데이터 로드
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshData();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _refreshData() async {
    await Future.wait([
      ref.refresh(multiStoreOverviewProvider.future),
      ref.refresh(totalEmployeesProvider.future),
      ref.refresh(attendanceRatesProvider.future),
      ref.refresh(monthlyPayrollProvider.future),
      ref.refresh(storeComparisonProvider.future),
      ref.refresh(franchisePerformanceProvider.future),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final storeOverview = ref.watch(multiStoreOverviewProvider);
    final totalEmployees = ref.watch(totalEmployeesProvider);
    final attendanceRates = ref.watch(attendanceRatesProvider);
    final payrollSummary = ref.watch(monthlyPayrollProvider);
    final storeComparison = ref.watch(storeComparisonProvider);
    final franchisePerformance = ref.watch(franchisePerformanceProvider);

    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: Text(
          '마스터 대시보드',
          style: NeoBrutalTheme.title,
        ),
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        elevation: 0,
        centerTitle: true,
        actions: [
          // 기간 선택 드롭다운
          _buildPeriodSelector(),
          const SizedBox(width: NeoBrutalTheme.space2),
          // 내보내기 버튼
          IconButton(
            onPressed: _exportData,
            icon: const Icon(Icons.download_outlined),
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: NeoBrutalTheme.space4,
            ),
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: NeoBrutalTheme.muted,
                borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
                border: Border.all(
                  color: NeoBrutalTheme.line,
                  width: NeoBrutalTheme.borderThin,
                ),
              ),
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                indicator: BoxDecoration(
                  color: NeoBrutalTheme.hi,
                  borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton - 2),
                  border: Border.all(
                    color: NeoBrutalTheme.line,
                    width: NeoBrutalTheme.borderThin,
                  ),
                ),
                labelColor: NeoBrutalTheme.hiInk,
                unselectedLabelColor: NeoBrutalTheme.fg.withOpacity(0.6),
                labelStyle: NeoBrutalTheme.body.copyWith(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                ),
                unselectedLabelStyle: NeoBrutalTheme.body.copyWith(
                  fontSize: 14,
                ),
                tabs: const [
                  Tab(text: '개요'),
                  Tab(text: '매장 비교'),
                  Tab(text: '급여'),
                  Tab(text: '성과'),
                ],
              ),
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(
            storeOverview,
            totalEmployees,
            attendanceRates,
            payrollSummary,
          ),
          _buildStoreComparisonTab(storeComparison),
          _buildPayrollTab(payrollSummary),
          _buildPerformanceTab(franchisePerformance),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    return PopupMenuButton<String>(
      initialValue: _selectedPeriod,
      onSelected: (String value) {
        setState(() {
          _selectedPeriod = value;
        });
        _refreshData();
      },
      itemBuilder: (BuildContext context) => <PopupMenuEntry<String>>[
        const PopupMenuItem<String>(
          value: 'week',
          child: Text('주간'),
        ),
        const PopupMenuItem<String>(
          value: 'month',
          child: Text('월간'),
        ),
        const PopupMenuItem<String>(
          value: 'quarter',
          child: Text('분기'),
        ),
        const PopupMenuItem<String>(
          value: 'year',
          child: Text('연간'),
        ),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: NeoBrutalTheme.space3,
          vertical: NeoBrutalTheme.space2,
        ),
        decoration: BoxDecoration(
          color: NeoBrutalTheme.muted,
          borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
          border: Border.all(
            color: NeoBrutalTheme.line,
            width: NeoBrutalTheme.borderThin,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _getPeriodDisplayName(_selectedPeriod),
              style: NeoBrutalTheme.caption.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(
              Icons.keyboard_arrow_down,
              size: 16,
            ),
          ],
        ),
      ),
    );
  }

  String _getPeriodDisplayName(String period) {
    switch (period) {
      case 'week':
        return '주간';
      case 'month':
        return '월간';
      case 'quarter':
        return '분기';
      case 'year':
        return '연간';
      default:
        return '월간';
    }
  }

  void _exportData() {
    // 데이터 내보내기 기능
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('데이터 내보내기'),
        content: const Text('Excel 파일로 내보내기하시겠습니까?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('취소'),
          ),
          NeoBrutalButton(
            text: '내보내기',
            onPressed: () {
              Navigator.of(context).pop();
              // TODO: 실제 내보내기 로직 구현
            },
          ),
        ],
      ),
    );
  }

  Widget _buildOverviewTab(
    AsyncValue storeOverview,
    AsyncValue totalEmployees,
    AsyncValue attendanceRates,
    AsyncValue payrollSummary,
  ) {
    return RefreshIndicator(
      key: _refreshKey,
      onRefresh: _refreshData,
      color: NeoBrutalTheme.hi,
      backgroundColor: NeoBrutalTheme.bg,
      strokeWidth: 3.0,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(NeoBrutalTheme.space4),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 개요 메트릭스
            _buildOverviewMetricsSection(
              storeOverview,
              totalEmployees,
              attendanceRates,
            ),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 다중 매장 현황 카드
            _buildMultiStoreOverviewSection(storeOverview),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 월간 급여 요약
            _buildPayrollSummarySection(payrollSummary),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 빠른 작업
            _buildMasterQuickActionsSection(),
            
            // 하단 여백
            const SizedBox(height: NeoBrutalTheme.space8),
          ],
        ),
      ),
    );
  }

  Widget _buildOverviewMetricsSection(
    AsyncValue storeOverview,
    AsyncValue totalEmployees,
    AsyncValue attendanceRates,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '전체 현황',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        MasterAdminMetrics(
          storeOverview: storeOverview,
          totalEmployees: totalEmployees,
          attendanceRates: attendanceRates,
        ),
      ],
    );
  }

  Widget _buildMultiStoreOverviewSection(AsyncValue storeOverview) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '매장별 현황',
              style: NeoBrutalTheme.heading,
            ),
            TextButton(
              onPressed: () {
                _tabController.animateTo(1); // 매장 비교 탭으로 이동
              },
              child: Text(
                '자세히 보기',
                style: NeoBrutalTheme.caption.copyWith(
                  color: NeoBrutalTheme.fg.withOpacity(0.7),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        MultiStoreOverviewCard(
          storeData: storeOverview,
          isCompactView: true,
        ),
      ],
    );
  }

  Widget _buildPayrollSummarySection(AsyncValue payrollSummary) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '월간 급여 요약',
              style: NeoBrutalTheme.heading,
            ),
            TextButton(
              onPressed: () {
                _tabController.animateTo(2); // 급여 탭으로 이동
              },
              child: Text(
                '전체 보기',
                style: NeoBrutalTheme.caption.copyWith(
                  color: NeoBrutalTheme.fg.withOpacity(0.7),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        PayrollSummaryCard(
          payrollData: payrollSummary,
          showDetailButton: true,
        ),
      ],
    );
  }

  Widget _buildMasterQuickActionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '빠른 작업',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        GridView.count(
          crossAxisCount: 2,
          childAspectRatio: 2.5,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: NeoBrutalTheme.space3,
          crossAxisSpacing: NeoBrutalTheme.space3,
          children: [
            NeoBrutalCard(
              onTap: () {
                // 새 매장 추가
              },
              padding: const EdgeInsets.all(NeoBrutalTheme.space3),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.add_business,
                    color: NeoBrutalTheme.fg,
                    size: 20,
                  ),
                  const SizedBox(width: NeoBrutalTheme.space2),
                  Flexible(
                    child: Text(
                      '매장 추가',
                      style: NeoBrutalTheme.body.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            NeoBrutalCard(
              onTap: () {
                // 급여 처리
              },
              padding: const EdgeInsets.all(NeoBrutalTheme.space3),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.payments,
                    color: NeoBrutalTheme.fg,
                    size: 20,
                  ),
                  const SizedBox(width: NeoBrutalTheme.space2),
                  Flexible(
                    child: Text(
                      '급여 처리',
                      style: NeoBrutalTheme.body.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            NeoBrutalCard(
              onTap: () {
                // 매장 성과 분석
              },
              padding: const EdgeInsets.all(NeoBrutalTheme.space3),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.analytics,
                    color: NeoBrutalTheme.fg,
                    size: 20,
                  ),
                  const SizedBox(width: NeoBrutalTheme.space2),
                  Flexible(
                    child: Text(
                      '성과 분석',
                      style: NeoBrutalTheme.body.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            NeoBrutalCard(
              onTap: () {
                // 직원 관리
              },
              padding: const EdgeInsets.all(NeoBrutalTheme.space3),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.people,
                    color: NeoBrutalTheme.fg,
                    size: 20,
                  ),
                  const SizedBox(width: NeoBrutalTheme.space2),
                  Flexible(
                    child: Text(
                      '직원 관리',
                      style: NeoBrutalTheme.body.copyWith(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStoreComparisonTab(AsyncValue storeComparison) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '매장별 성과 비교',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          StoreComparisonChart(
            comparisonData: storeComparison,
            period: _selectedPeriod,
          ),
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 매장별 상세 정보
          Text(
            '매장 상세 정보',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          _buildStoreDetailsList(storeComparison),
        ],
      ),
    );
  }

  Widget _buildPayrollTab(AsyncValue payrollSummary) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '급여 관리',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          PayrollSummaryCard(
            payrollData: payrollSummary,
            showDetailButton: false,
            showBreakdown: true,
          ),
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 급여 액션 버튼들
          Row(
            children: [
              Expanded(
                child: NeoBrutalButton(
                  text: '급여 계산',
                  onPressed: () {
                    // 급여 계산 페이지
                  },
                ),
              ),
              const SizedBox(width: NeoBrutalTheme.space3),
              Expanded(
                child: NeoBrutalButton(
                  text: '급여 명세서',
                  onPressed: () {
                    // 급여 명세서 생성
                  },
                  variant: NeoBrutalButtonVariant.secondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Row(
            children: [
              Expanded(
                child: NeoBrutalButton(
                  text: '급여 이체',
                  onPressed: () {
                    // 급여 이체 처리
                  },
                  variant: NeoBrutalButtonVariant.outline,
                ),
              ),
              const SizedBox(width: NeoBrutalTheme.space3),
              Expanded(
                child: NeoBrutalButton(
                  text: '세금 신고',
                  onPressed: () {
                    // 세금 신고 처리
                  },
                  variant: NeoBrutalButtonVariant.outline,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceTab(AsyncValue franchisePerformance) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '성과 대시보드',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          FranchisePerformanceCard(
            performanceData: franchisePerformance,
            period: _selectedPeriod,
          ),
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 성과 지표들
          _buildPerformanceMetrics(franchisePerformance),
        ],
      ),
    );
  }

  Widget _buildStoreDetailsList(AsyncValue storeComparison) {
    return storeComparison.when(
      data: (stores) {
        if (stores.isEmpty) {
          return NeoBrutalCard(
            padding: const EdgeInsets.all(NeoBrutalTheme.space6),
            child: Column(
              children: [
                Icon(
                  Icons.store_outlined,
                  size: 48,
                  color: NeoBrutalTheme.fg.withOpacity(0.5),
                ),
                const SizedBox(height: NeoBrutalTheme.space3),
                Text(
                  '등록된 매장이 없습니다',
                  style: NeoBrutalTheme.body,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }
        
        return ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: stores.length,
          separatorBuilder: (context, index) =>
              const SizedBox(height: NeoBrutalTheme.space3),
          itemBuilder: (context, index) {
            final store = stores[index];
            return _buildStoreDetailItem(store);
          },
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(),
      ),
      error: (error, stack) => _buildErrorWidget(error.toString()),
    );
  }

  Widget _buildStoreDetailItem(dynamic store) {
    return NeoBrutalCard(
      onTap: () {
        // 매장 상세 페이지로 이동
      },
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  store.name ?? '매장명 없음',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: store.isActive ? NeoBrutalTheme.success : NeoBrutalTheme.error,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '직원 수: ${store.employeeCount ?? 0}명',
                      style: NeoBrutalTheme.caption,
                    ),
                    Text(
                      '출근률: ${store.attendanceRate ?? 0}%',
                      style: NeoBrutalTheme.caption,
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '매출: ${_formatCurrency(store.revenue ?? 0)}',
                      style: NeoBrutalTheme.caption,
                    ),
                    Text(
                      '비용: ${_formatCurrency(store.cost ?? 0)}',
                      style: NeoBrutalTheme.caption,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPerformanceMetrics(AsyncValue franchisePerformance) {
    return franchisePerformance.when(
      data: (performance) {
        return GridView.count(
          crossAxisCount: 2,
          childAspectRatio: 1.5,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: NeoBrutalTheme.space3,
          crossAxisSpacing: NeoBrutalTheme.space3,
          children: [
            _buildMetricCard(
              '총 매출',
              _formatCurrency(performance['totalRevenue'] ?? 0),
              Icons.attach_money,
              NeoBrutalTheme.success,
            ),
            _buildMetricCard(
              '순이익',
              _formatCurrency(performance['netProfit'] ?? 0),
              Icons.trending_up,
              NeoBrutalTheme.info,
            ),
            _buildMetricCard(
              '직원 만족도',
              '${performance['employeeSatisfaction'] ?? 0}%',
              Icons.sentiment_satisfied,
              NeoBrutalTheme.pastelMint,
            ),
            _buildMetricCard(
              '고객 만족도',
              '${performance.customerSatisfaction ?? 0}%',
              Icons.star,
              NeoBrutalTheme.pastelPink,
            ),
          ],
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(),
      ),
      error: (error, stack) => _buildErrorWidget(error.toString()),
    );
  }

  Widget _buildMetricCard(
    String title,
    String value,
    IconData icon,
    Color accentColor,
  ) {
    return NeoBrutalCard(
      backgroundColor: accentColor.withOpacity(0.1),
      borderColor: accentColor,
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color: accentColor,
            size: 32,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            value,
            style: NeoBrutalTheme.heading.copyWith(
              color: accentColor,
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            title,
            style: NeoBrutalTheme.caption,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorWidget(String message) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          Icon(
            Icons.error_outline,
            size: 48,
            color: NeoBrutalTheme.error,
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '데이터를 불러올 수 없습니다',
            style: NeoBrutalTheme.body,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            message,
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.fg.withOpacity(0.7),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          NeoBrutalButton(
            text: '다시 시도',
            onPressed: _refreshData,
          ),
        ],
      ),
    );
  }

  String _formatCurrency(num amount) {
    if (amount >= 100000000) {
      return '${(amount / 100000000).toStringAsFixed(1)}억';
    } else if (amount >= 10000) {
      return '${(amount / 10000).toStringAsFixed(1)}만';
    } else {
      return '${amount.toStringAsFixed(0)}원';
    }
  }
}
