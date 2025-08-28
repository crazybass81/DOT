import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../widgets/common/neo_brutal_card.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/dashboard/real_time_attendance_card.dart';
import '../../widgets/dashboard/pending_approvals_card.dart';
import '../../widgets/dashboard/today_schedule_card.dart';
import '../../widgets/dashboard/admin_quick_actions.dart';
import '../../widgets/dashboard/employee_count_card.dart';
import '../../widgets/dashboard/_dashboard_stubs.dart';
import '../../providers/auth_provider.dart';
import '../../providers/employee_provider.dart';
import '../../providers/attendance_provider.dart';
import '../../providers/approval_provider.dart';
import '../../providers/schedule_provider.dart';

/// ADMIN 역할 대시보드
/// 매장 관리자가 사용하는 대시보드로 직원 관리, 승인, 스케줄 관리 등의 기능을 제공
class AdminDashboardPage extends ConsumerStatefulWidget {
  const AdminDashboardPage({super.key});

  @override
  ConsumerState<AdminDashboardPage> createState() => _AdminDashboardPageState();
}

class _AdminDashboardPageState extends ConsumerState<AdminDashboardPage>
    with TickerProviderStateMixin {
  final GlobalKey<RefreshIndicatorState> _refreshKey = GlobalKey<RefreshIndicatorState>();
  late TabController _tabController;
  int _selectedTab = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
      ref.refresh(realTimeAttendanceProvider.future),
      ref.refresh(pendingApprovalsProvider.future),
      ref.refresh(todayScheduleProvider.future),
      ref.refresh(employeeCountProvider.future),
      ref.refresh(attendanceOverviewProvider.future),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final realTimeAttendance = ref.watch(realTimeAttendanceProvider);
    final pendingApprovals = ref.watch(pendingApprovalsProvider);
    final todaySchedule = ref.watch(todayScheduleProvider);
    final employeeCount = ref.watch(employeeCountProvider);
    final attendanceOverview = ref.watch(attendanceOverviewProvider);

    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: Text(
          '관리자 대시보드',
          style: NeoBrutalTheme.title,
        ),
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        elevation: 0,
        centerTitle: true,
        actions: [
          // 알림 아이콘
          _buildNotificationIcon(),
          const SizedBox(width: NeoBrutalTheme.space2),
          // 설정 아이콘
          IconButton(
            onPressed: () {
              // 설정 페이지로 이동
            },
            icon: const Icon(Icons.settings_outlined),
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
                  Tab(text: '대시보드'),
                  Tab(text: '승인'),
                  Tab(text: '리포트'),
                ],
              ),
            ),
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDashboardTab(
            realTimeAttendance,
            pendingApprovals,
            todaySchedule,
            employeeCount,
            attendanceOverview,
          ),
          _buildApprovalsTab(pendingApprovals),
          _buildReportsTab(attendanceOverview),
        ],
      ),
    );
  }

  Widget _buildNotificationIcon() {
    return Consumer(builder: (context, ref, child) {
      final pendingCount = ref.watch(pendingApprovalsProvider).maybeWhen(
        data: (approvals) => approvals.length,
        orElse: () => 0,
      );

      return Stack(
        children: [
          IconButton(
            onPressed: () {
              // 알림 센터로 이동
            },
            icon: const Icon(Icons.notifications_outlined),
          ),
          if (pendingCount > 0)
            Positioned(
              right: 8,
              top: 8,
              child: Container(
                padding: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: NeoBrutalTheme.error,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: NeoBrutalTheme.bg,
                    width: 2,
                  ),
                ),
                constraints: const BoxConstraints(
                  minWidth: 16,
                  minHeight: 16,
                ),
                child: Text(
                  pendingCount > 99 ? '99+' : pendingCount.toString(),
                  style: NeoBrutalTheme.micro.copyWith(
                    color: NeoBrutalTheme.bg,
                    fontWeight: FontWeight.w700,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
        ],
      );
    });
  }

  Widget _buildDashboardTab(
    AsyncValue realTimeAttendance,
    AsyncValue pendingApprovals,
    AsyncValue todaySchedule,
    AsyncValue employeeCount,
    AsyncValue attendanceOverview,
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
            // 오늘의 요약
            _buildTodaySummarySection(employeeCount, pendingApprovals),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 실시간 직원 출근 현황
            _buildRealTimeAttendanceSection(realTimeAttendance),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 빠른 관리 작업
            _buildQuickManagementSection(),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 오늘 스케줄 개요
            _buildTodayScheduleSection(todaySchedule),
            const SizedBox(height: NeoBrutalTheme.space6),

            // 출근 현황 차트
            _buildAttendanceOverviewSection(attendanceOverview),
            
            // 하단 여백
            const SizedBox(height: NeoBrutalTheme.space8),
          ],
        ),
      ),
    );
  }

  Widget _buildTodaySummarySection(
    AsyncValue employeeCount,
    AsyncValue pendingApprovals,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '오늘의 요약',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        Row(
          children: [
            Expanded(
              child: EmployeeCountCard(
                employeeCount: employeeCount,
              ),
            ),
            const SizedBox(width: NeoBrutalTheme.space3),
            Expanded(
              child: PendingApprovalsCard(
                pendingApprovals: pendingApprovals,
                onTap: () {
                  _tabController.animateTo(1); // 승인 탭으로 이동
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRealTimeAttendanceSection(AsyncValue realTimeAttendance) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '실시간 직원 현황',
              style: NeoBrutalTheme.heading,
            ),
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: NeoBrutalTheme.success,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        RealTimeAttendanceCard(
          attendanceData: realTimeAttendance,
        ),
      ],
    );
  }

  Widget _buildQuickManagementSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '빠른 관리',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        const AdminQuickActions(),
      ],
    );
  }

  Widget _buildTodayScheduleSection(AsyncValue todaySchedule) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '오늘 스케줄',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        TodayScheduleCard(
          scheduleData: todaySchedule,
        ),
      ],
    );
  }

  Widget _buildAttendanceOverviewSection(AsyncValue attendanceOverview) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '출근 현황 분석',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        AttendanceOverviewChart(
          overviewData: attendanceOverview,
        ),
      ],
    );
  }

  Widget _buildApprovalsTab(AsyncValue pendingApprovals) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '대기 중인 승인 요청',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          pendingApprovals.when(
            data: (approvals) {
              if (approvals.isEmpty) {
                return NeoBrutalCard(
                  padding: const EdgeInsets.all(NeoBrutalTheme.space6),
                  child: Column(
                    children: [
                      Icon(
                        Icons.check_circle_outline,
                        size: 48,
                        color: NeoBrutalTheme.success,
                      ),
                      const SizedBox(height: NeoBrutalTheme.space3),
                      Text(
                        '모든 요청이 처리되었습니다!',
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
                itemCount: approvals.length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: NeoBrutalTheme.space3),
                itemBuilder: (context, index) {
                  final approval = approvals[index];
                  return _buildApprovalItem(approval);
                },
              );
            },
            loading: () => const Center(
              child: CircularProgressIndicator(),
            ),
            error: (error, stack) => _buildErrorWidget(error.toString()),
          ),
        ],
      ),
    );
  }

  Widget _buildReportsTab(AsyncValue attendanceOverview) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '출근 리포트',
            style: NeoBrutalTheme.heading,
          ),
          const SizedBox(height: NeoBrutalTheme.space4),
          AttendanceOverviewChart(
            overviewData: attendanceOverview,
            showDetailedStats: true,
          ),
          const SizedBox(height: NeoBrutalTheme.space6),
          
          // 리포트 액션 버튼들
          Row(
            children: [
              Expanded(
                child: NeoBrutalButton(
                  text: '주간 리포트',
                  onPressed: () {
                    // 주간 리포트 생성
                  },
                ),
              ),
              const SizedBox(width: NeoBrutalTheme.space3),
              Expanded(
                child: NeoBrutalButton(
                  text: '월간 리포트',
                  onPressed: () {
                    // 월간 리포트 생성
                  },
                  variant: NeoBrutalButtonVariant.secondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildApprovalItem(dynamic approval) {
    return NeoBrutalCard(
      onTap: () {
        // 상세 페이지로 이동
      },
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  approval.employeeName ?? '직원명 없음',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: NeoBrutalTheme.space2,
                  vertical: 2,
                ),
                decoration: BoxDecoration(
                  color: NeoBrutalTheme.warning.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(
                    color: NeoBrutalTheme.warning,
                    width: 1,
                  ),
                ),
                child: Text(
                  '대기 중',
                  style: NeoBrutalTheme.micro.copyWith(
                    color: NeoBrutalTheme.warning,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            approval.type ?? '유형 없음',
            style: NeoBrutalTheme.caption,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            approval.reason ?? '이유 없음',
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.fg.withOpacity(0.7),
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
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
}
