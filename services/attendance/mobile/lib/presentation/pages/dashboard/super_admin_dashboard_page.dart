import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../../core/services/export_service.dart';
import '../../../domain/entities/user/user_role.dart';
import '../../widgets/common/neo_brutal_card.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/dashboard/_dashboard_stubs.dart';
import '../../providers/auth_provider.dart';
import '../../providers/_missing_providers.dart';

/// SUPER ADMIN 역할 대시보드
/// 시스템 최고 관리자가 사용하는 대시보드로 전체 시스템 통계, 프랜차이즈 현황, 매출 분석 등을 제공
class SuperAdminDashboardPage extends ConsumerStatefulWidget {
  const SuperAdminDashboardPage({super.key});

  @override
  ConsumerState<SuperAdminDashboardPage> createState() => _SuperAdminDashboardPageState();
}

class _SuperAdminDashboardPageState extends ConsumerState<SuperAdminDashboardPage>
    with TickerProviderStateMixin {
  final GlobalKey<RefreshIndicatorState> _refreshKey = GlobalKey<RefreshIndicatorState>();
  late TabController _tabController;
  late TabController _timeRangeController;
  int _selectedTab = 0;
  int _selectedTimeRange = 1; // 0: day, 1: week, 2: month, 3: year
  bool _isRealTimeMode = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _timeRangeController = TabController(length: 4, vsync: this);
    
    _tabController.addListener(() {
      setState(() {
        _selectedTab = _tabController.index;
      });
    });
    
    _timeRangeController.addListener(() {
      setState(() {
        _selectedTimeRange = _timeRangeController.index;
      });
      _refreshData();
    });
    
    // 초기 데이터 로드
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshData();
      if (_isRealTimeMode) {
        _startRealTimeUpdates();
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _timeRangeController.dispose();
    super.dispose();
  }

  void _startRealTimeUpdates() {
    // 30초마다 데이터 업데이트
    Stream.periodic(const Duration(seconds: 30)).listen((_) {
      if (_isRealTimeMode && mounted) {
        _refreshData();
      }
    });
  }

  Future<void> _refreshData() async {
    await Future.wait([
      ref.refresh(systemWideStatsProvider.future),
      ref.refresh(allFranchisesOverviewProvider.future),
      ref.refresh(revenueAnalysisProvider.future),
      ref.refresh(systemHealthProvider.future),
      ref.refresh(globalMetricsProvider.future),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final systemStats = ref.watch(systemWideStatsProvider);
    final franchiseOverview = ref.watch(allFranchisesOverviewProvider);
    final revenueAnalysis = ref.watch(revenueAnalysisProvider);
    final systemHealth = ref.watch(systemHealthProvider);
    final globalMetrics = ref.watch(globalMetricsProvider);

    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: Row(
          children: [
            Text(
              '시스템 대시보드',
              style: NeoBrutalTheme.title,
            ),
            const SizedBox(width: NeoBrutalTheme.space2),
            // 실시간 상태 표시
            if (_isRealTimeMode)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 6,
                  vertical: 2,
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
                      'LIVE',
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
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        elevation: 0,
        centerTitle: false,
        actions: [
          // 실시간 모드 토글
          Switch(
            value: _isRealTimeMode,
            onChanged: (value) {
              setState(() {
                _isRealTimeMode = value;
              });
              if (value) {
                _startRealTimeUpdates();
              }
            },
            activeColor: NeoBrutalTheme.hi,
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
          // 내보내기 버튼
          IconButton(
            onPressed: _exportSystemData,
            icon: const Icon(Icons.download_outlined),
          ),
          // 시스템 설정
          IconButton(
            onPressed: () {
              // 시스템 설정 페이지
            },
            icon: const Icon(Icons.settings_outlined),
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(100),
          child: Column(
            children: [
              // 메인 탭
              Padding(
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
                      fontSize: 13,
                    ),
                    unselectedLabelStyle: NeoBrutalTheme.body.copyWith(
                      fontSize: 13,
                    ),
                    tabs: const [
                      Tab(text: '개요'),
                      Tab(text: '프랜차이즈'),
                      Tab(text: '매출'),
                      Tab(text: '시스템'),
                      Tab(text: '맵'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: NeoBrutalTheme.space2),
              // 시간 범위 탭
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: NeoBrutalTheme.space4,
                ),
                child: Container(
                  height: 36,
                  decoration: BoxDecoration(
                    color: NeoBrutalTheme.bg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: NeoBrutalTheme.line,
                      width: NeoBrutalTheme.borderThin,
                    ),
                  ),
                  child: TabBar(
                    controller: _timeRangeController,
                    indicator: BoxDecoration(
                      color: NeoBrutalTheme.muted,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    labelColor: NeoBrutalTheme.fg,
                    unselectedLabelColor: NeoBrutalTheme.fg.withOpacity(0.5),
                    labelStyle: NeoBrutalTheme.caption.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                    unselectedLabelStyle: NeoBrutalTheme.caption.copyWith(
                      fontSize: 12,
                    ),
                    tabs: const [
                      Tab(text: '일간'),
                      Tab(text: '주간'),
                      Tab(text: '월간'),
                      Tab(text: '연간'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildOverviewTab(
            systemStats,
            franchiseOverview,
            revenueAnalysis,
            systemHealth,
            globalMetrics,
          ),
          _buildFranchiseTab(franchiseOverview),
          _buildRevenueTab(revenueAnalysis),
          _buildSystemTab(systemHealth),
          _buildMapTab(franchiseOverview),
        ],
      ),
    );
  }

  void _exportSystemData() {
    showDialog(
      context: context,
      builder: (context) => _ExportDialog(
        onExport: (format, selectedData) async {
          try {
            final systemStats = await ref.read(systemWideStatsProvider.future);
            final franchiseData = await ref.read(allFranchisesOverviewProvider.future);
            final revenueData = await ref.read(revenueAnalysisProvider.future);
            final healthData = await ref.read(systemHealthProvider.future);

            await ExportService.exportSystemDashboard(
              systemStats: selectedData['systemStats'] ? systemStats : {},
              franchiseData: selectedData['franchiseData'] ? franchiseData : [],
              revenueData: selectedData['revenueData'] ? revenueData : {},
              healthData: selectedData['healthData'] ? healthData : {},
              context: context,
              format: format,
            );

            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('${format.toUpperCase()} 파일이 성공적으로 생성되었습니다'),
                  backgroundColor: NeoBrutalTheme.success,
                  duration: const Duration(seconds: 3),
                ),
              );
            }
          } catch (e) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('내보내기 실패: $e'),
                  backgroundColor: NeoBrutalTheme.error,
                  duration: const Duration(seconds: 3),
                ),
              );
            }
          }
        },
      ),
    );
  }

  Widget _buildOverviewTab(
    AsyncValue systemStats,
    AsyncValue franchiseOverview,
    AsyncValue revenueAnalysis,
    AsyncValue systemHealth,
    AsyncValue globalMetrics,
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
            // 시스템 전체 통계
            _buildSystemWideStatsSection(systemStats),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 글로벌 메트릭스 그리드
            _buildGlobalMetricsSection(globalMetrics),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 빠른 시스템 관리
            _buildSystemQuickActionsSection(),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 매출 개요
            _buildRevenueOverviewSection(revenueAnalysis),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 시스템 상태
            _buildSystemHealthSection(systemHealth),
            
            // 하단 여백
            const SizedBox(height: NeoBrutalTheme.space8),
          ],
        ),
      ),
    );
  }

  Widget _buildSystemWideStatsSection(AsyncValue systemStats) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '시스템 전체 통계',
              style: NeoBrutalTheme.heading,
            ),
            Text(
              _getTimeRangeText(),
              style: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.fg.withOpacity(0.6),
              ),
            ),
          ],
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        SystemWideStatsCard(
          statsData: systemStats,
          timeRange: _getSelectedTimeRange(),
        ),
      ],
    );
  }

  Widget _buildGlobalMetricsSection(AsyncValue globalMetrics) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '주요 성과 지표',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        GlobalMetricsGrid(
          metricsData: globalMetrics,
          timeRange: _getSelectedTimeRange(),
        ),
      ],
    );
  }

  Widget _buildSystemQuickActionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '시스템 관리',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        GridView.count(
          crossAxisCount: 2,
          childAspectRatio: 2.2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: NeoBrutalTheme.space3,
          crossAxisSpacing: NeoBrutalTheme.space3,
          children: [
            _buildQuickActionCard(
              '새 프랜차이즈',
              Icons.add_business,
              NeoBrutalTheme.hi,
              () {
                // 새 프랜차이즈 추가
              },
            ),
            _buildQuickActionCard(
              '시스템 백업',
              Icons.backup,
              NeoBrutalTheme.info,
              () {
                // 시스템 백업
              },
            ),
            _buildQuickActionCard(
              '사용자 관리',
              Icons.admin_panel_settings,
              NeoBrutalTheme.pastelLilac,
              () {
                // 사용자 관리 페이지
              },
            ),
            _buildQuickActionCard(
              '버전 관리',
              Icons.system_update,
              NeoBrutalTheme.pastelSky,
              () {
                // 버전 관리 페이지
              },
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActionCard(
    String title,
    IconData icon,
    Color accentColor,
    VoidCallback onTap,
  ) {
    return NeoBrutalCard(
      onTap: onTap,
      backgroundColor: accentColor.withOpacity(0.1),
      borderColor: accentColor,
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            icon,
            color: accentColor,
            size: 24,
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
          Flexible(
            child: Text(
              title,
              style: NeoBrutalTheme.body.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 14,
                color: accentColor,
              ),
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueOverviewSection(AsyncValue revenueAnalysis) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '매출 개요',
              style: NeoBrutalTheme.heading,
            ),
            TextButton(
              onPressed: () {
                _tabController.animateTo(2); // 매출 탭으로 이동
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
        RevenueAnalysisChart(
          revenueData: revenueAnalysis,
          timeRange: _getSelectedTimeRange(),
          isCompactView: true,
        ),
      ],
    );
  }

  Widget _buildSystemHealthSection(AsyncValue systemHealth) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '시스템 상태',
              style: NeoBrutalTheme.heading,
            ),
            TextButton(
              onPressed: () {
                _tabController.animateTo(3); // 시스템 탭으로 이동
              },
              child: Text(
                '상세 보기',
                style: NeoBrutalTheme.caption.copyWith(
                  color: NeoBrutalTheme.fg.withOpacity(0.7),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        SystemHealthCard(
          healthData: systemHealth,
          isCompactView: true,
        ),
      ],
    );
  }

  Widget _buildFranchiseTab(AsyncValue franchiseOverview) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '모든 프랜차이즈 현황',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          FranchiseOverviewCard(
            franchiseData: franchiseOverview,
            timeRange: _getSelectedTimeRange(),
            showDetailedStats: true,
          ),
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 프랜차이즈 리스트
          _buildFranchiseList(franchiseOverview),
        ],
      ),
    );
  }

  Widget _buildRevenueTab(AsyncValue revenueAnalysis) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '매출 분석 대시보드',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          RevenueAnalysisChart(
            revenueData: revenueAnalysis,
            timeRange: _getSelectedTimeRange(),
            isCompactView: false,
          ),
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 매출 액션 버튼들
          _buildRevenueActions(),
        ],
      ),
    );
  }

  Widget _buildSystemTab(AsyncValue systemHealth) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '시스템 상태 모니터링',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          SystemHealthCard(
            healthData: systemHealth,
            isCompactView: false,
          ),
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 시스템 관리 액션들
          _buildSystemActions(),
        ],
      ),
    );
  }

  Widget _buildMapTab(AsyncValue franchiseOverview) {
    return Column(
      children: [
        Expanded(
          child: FranchiseMapView(
            franchiseData: franchiseOverview,
            timeRange: _getSelectedTimeRange(),
          ),
        ),
        // 맵 컨트롤들
        Container(
          padding: const EdgeInsets.all(NeoBrutalTheme.space4),
          decoration: const BoxDecoration(
            color: NeoBrutalTheme.bg,
            border: Border(
              top: BorderSide(
                color: NeoBrutalTheme.line,
                width: NeoBrutalTheme.borderThin,
              ),
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildMapControlButton(
                '전체 보기',
                Icons.public,
                () {
                  // 전체 맵 보기
                },
              ),
              _buildMapControlButton(
                '지역별',
                Icons.location_on,
                () {
                  // 지역별 필터
                },
              ),
              _buildMapControlButton(
                '성과별',
                Icons.trending_up,
                () {
                  // 성과별 정렬
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildMapControlButton(
    String title,
    IconData icon,
    VoidCallback onTap,
  ) {
    return NeoBrutalCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(
        horizontal: NeoBrutalTheme.space3,
        vertical: NeoBrutalTheme.space2,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: NeoBrutalTheme.fg,
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
          Text(
            title,
            style: NeoBrutalTheme.caption.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFranchiseList(AsyncValue franchiseOverview) {
    return franchiseOverview.when(
      data: (franchises) {
        if (franchises.isEmpty) {
          return NeoBrutalCard(
            padding: const EdgeInsets.all(NeoBrutalTheme.space6),
            child: Column(
              children: [
                Icon(
                  Icons.business_outlined,
                  size: 48,
                  color: NeoBrutalTheme.fg.withOpacity(0.5),
                ),
                const SizedBox(height: NeoBrutalTheme.space3),
                Text(
                  '등록된 프랜차이즈가 없습니다',
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
          itemCount: franchises.length,
          separatorBuilder: (context, index) =>
              const SizedBox(height: NeoBrutalTheme.space3),
          itemBuilder: (context, index) {
            final franchise = franchises[index];
            return _buildFranchiseItem(franchise);
          },
        );
      },
      loading: () => const Center(
        child: CircularProgressIndicator(),
      ),
      error: (error, stack) => _buildErrorWidget(error.toString()),
    );
  }

  Widget _buildFranchiseItem(dynamic franchise) {
    return NeoBrutalCard(
      onTap: () {
        // 프랜차이즈 상세 페이지
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
                  franchise.name ?? '프랜차이즈명 없음',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    decoration: BoxDecoration(
                      color: franchise.isActive 
                          ? NeoBrutalTheme.success 
                          : NeoBrutalTheme.error,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: NeoBrutalTheme.space2),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: NeoBrutalTheme.space2,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: _getPerformanceColor(franchise.performance)
                          .withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: _getPerformanceColor(franchise.performance),
                        width: 1,
                      ),
                    ),
                    child: Text(
                      _getPerformanceText(franchise.performance),
                      style: NeoBrutalTheme.micro.copyWith(
                        color: _getPerformanceColor(franchise.performance),
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Row(
            children: [
              Expanded(
                child: _buildFranchiseMetric(
                  '매장 수',
                  '${franchise.storeCount ?? 0}개',
                ),
              ),
              Expanded(
                child: _buildFranchiseMetric(
                  '직원 수',
                  '${franchise.employeeCount ?? 0}명',
                ),
              ),
              Expanded(
                child: _buildFranchiseMetric(
                  '월 매출',
                  _formatCurrency(franchise.monthlyRevenue ?? 0),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFranchiseMetric(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: NeoBrutalTheme.caption.copyWith(
            color: NeoBrutalTheme.fg.withOpacity(0.6),
          ),
        ),
        Text(
          value,
          style: NeoBrutalTheme.caption.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }

  Widget _buildRevenueActions() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: NeoBrutalButton(
                text: '매출 리포트 생성',
                onPressed: () {
                  // 매출 리포트 생성
                },
              ),
            ),
            const SizedBox(width: NeoBrutalTheme.space3),
            Expanded(
              child: NeoBrutalButton(
                text: '예측 분석',
                onPressed: () {
                  // 매출 예측 분석
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
                text: '비용 분석',
                onPressed: () {
                  // 비용 분석
                },
                variant: NeoBrutalButtonVariant.outline,
              ),
            ),
            const SizedBox(width: NeoBrutalTheme.space3),
            Expanded(
              child: NeoBrutalButton(
                text: 'ROI 계산',
                onPressed: () {
                  // ROI 계산
                },
                variant: NeoBrutalButtonVariant.outline,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSystemActions() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: NeoBrutalButton(
                text: '시스템 백업',
                onPressed: () {
                  // 시스템 백업
                },
              ),
            ),
            const SizedBox(width: NeoBrutalTheme.space3),
            Expanded(
              child: NeoBrutalButton(
                text: '로그 분석',
                onPressed: () {
                  // 로그 분석
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
                text: '성능 대시보드',
                onPressed: () {
                  // 성능 대시보드
                },
                variant: NeoBrutalButtonVariant.outline,
              ),
            ),
            const SizedBox(width: NeoBrutalTheme.space3),
            Expanded(
              child: NeoBrutalButton(
                text: '경고 설정',
                onPressed: () {
                  // 경고 설정
                },
                variant: NeoBrutalButtonVariant.outline,
              ),
            ),
          ],
        ),
      ],
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

  String _getTimeRangeText() {
    switch (_selectedTimeRange) {
      case 0:
        return '일간';
      case 1:
        return '주간';
      case 2:
        return '월간';
      case 3:
        return '연간';
      default:
        return '주간';
    }
  }

  String _getSelectedTimeRange() {
    switch (_selectedTimeRange) {
      case 0:
        return 'day';
      case 1:
        return 'week';
      case 2:
        return 'month';
      case 3:
        return 'year';
      default:
        return 'week';
    }
  }

  Color _getPerformanceColor(String? performance) {
    switch (performance) {
      case 'excellent':
        return NeoBrutalTheme.success;
      case 'good':
        return NeoBrutalTheme.info;
      case 'average':
        return NeoBrutalTheme.warning;
      case 'poor':
        return NeoBrutalTheme.error;
      default:
        return NeoBrutalTheme.fg.withOpacity(0.5);
    }
  }

  String _getPerformanceText(String? performance) {
    switch (performance) {
      case 'excellent':
        return '우수';
      case 'good':
        return '양호';
      case 'average':
        return '보통';
      case 'poor':
        return '부진';
      default:
        return '데이터 없음';
    }
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

/// 내보내기 다이얼로그
class _ExportDialog extends StatefulWidget {
  final Function(String format, Map<String, bool> selectedData) onExport;

  const _ExportDialog({required this.onExport});

  @override
  _ExportDialogState createState() => _ExportDialogState();
}

class _ExportDialogState extends State<_ExportDialog> {
  String _selectedFormat = 'pdf';
  final Map<String, bool> _selectedData = {
    'systemStats': true,
    'franchiseData': true,
    'revenueData': false,
    'healthData': true,
  };

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      backgroundColor: NeoBrutalTheme.bg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
        side: const BorderSide(
          color: NeoBrutalTheme.line,
          width: NeoBrutalTheme.borderThick,
        ),
      ),
      title: Text(
        '시스템 데이터 내보내기',
        style: NeoBrutalTheme.title,
      ),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 파일 형식 선택
            Text(
              '파일 형식:',
              style: NeoBrutalTheme.body.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: NeoBrutalTheme.space2),
            Row(
              children: [
                Expanded(
                  child: RadioListTile<String>(
                    title: Row(
                      children: [
                        const Icon(Icons.picture_as_pdf, color: NeoBrutalTheme.error),
                        const SizedBox(width: 8),
                        Text('PDF', style: NeoBrutalTheme.body),
                      ],
                    ),
                    value: 'pdf',
                    groupValue: _selectedFormat,
                    onChanged: (value) => setState(() => _selectedFormat = value!),
                    activeColor: NeoBrutalTheme.hi,
                  ),
                ),
                Expanded(
                  child: RadioListTile<String>(
                    title: Row(
                      children: [
                        const Icon(Icons.table_chart, color: NeoBrutalTheme.success),
                        const SizedBox(width: 8),
                        Text('Excel', style: NeoBrutalTheme.body),
                      ],
                    ),
                    value: 'excel',
                    groupValue: _selectedFormat,
                    onChanged: (value) => setState(() => _selectedFormat = value!),
                    activeColor: NeoBrutalTheme.hi,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: NeoBrutalTheme.space4),
            const Divider(color: NeoBrutalTheme.line),
            const SizedBox(height: NeoBrutalTheme.space3),
            
            // 데이터 선택
            Text(
              '포함할 데이터:',
              style: NeoBrutalTheme.body.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: NeoBrutalTheme.space2),
            
            _buildDataCheckbox(
              'systemStats',
              '시스템 통계',
              Icons.dashboard,
              NeoBrutalTheme.hi,
            ),
            _buildDataCheckbox(
              'franchiseData',
              '프랜차이즈 데이터',
              Icons.business,
              NeoBrutalTheme.pastelSky,
            ),
            _buildDataCheckbox(
              'revenueData',
              '매출 데이터',
              Icons.attach_money,
              NeoBrutalTheme.pastelPink,
            ),
            _buildDataCheckbox(
              'healthData',
              '시스템 상태',
              Icons.monitor_heart,
              NeoBrutalTheme.success,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(
            '취소',
            style: NeoBrutalTheme.body.copyWith(
              color: NeoBrutalTheme.fg.withOpacity(0.7),
            ),
          ),
        ),
        NeoBrutalButton(
          text: '내보내기',
          onPressed: _selectedData.values.any((selected) => selected)
              ? () {
                  Navigator.of(context).pop();
                  widget.onExport(_selectedFormat, _selectedData);
                }
              : null,
        ),
      ],
    );
  }

  Widget _buildDataCheckbox(
    String key,
    String title,
    IconData icon,
    Color color,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: NeoBrutalTheme.space2),
      child: CheckboxListTile(
        title: Row(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(width: NeoBrutalTheme.space2),
            Text(
              title,
              style: NeoBrutalTheme.body,
            ),
          ],
        ),
        value: _selectedData[key],
        onChanged: (value) => setState(() => _selectedData[key] = value!),
        activeColor: NeoBrutalTheme.hi,
        controlAffinity: ListTileControlAffinity.trailing,
        contentPadding: EdgeInsets.zero,
      ),
    );
  }
}
