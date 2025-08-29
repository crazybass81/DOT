import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../widgets/common/neo_brutal_card.dart';
import '../../widgets/common/neo_brutal_button.dart';
import '../../widgets/dashboard/attendance_status_card.dart';
import '../../widgets/dashboard/weekly_chart_card.dart';
import '../../widgets/dashboard/announcement_card.dart';
import '../../widgets/dashboard/quick_action_buttons.dart';
import '../../providers/auth_provider.dart';
import '../../providers/attendance_provider.dart';
import '../../../core/services/app_initialization_service.dart';
import 'package:flutter/foundation.dart';
import '../../providers/announcement_provider.dart';

/// USER 역할 대시보드
/// 직원들이 사용하는 메인 화면으로 출근/퇴근, 휴게시간 관리 등의 기능을 제공
class UserDashboardPage extends ConsumerStatefulWidget {
  const UserDashboardPage({super.key});

  @override
  ConsumerState<UserDashboardPage> createState() => _UserDashboardPageState();
}

class _UserDashboardPageState extends ConsumerState<UserDashboardPage> {
  final GlobalKey<RefreshIndicatorState> _refreshKey = GlobalKey<RefreshIndicatorState>();

  @override
  void initState() {
    super.initState();
    // 초기 데이터 로드 및 출근 서비스 초기화
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initializeServices();
    });
  }

  /// Initialize services and load initial data
  Future<void> _initializeServices() async {
    try {
      // Ensure app is initialized first
      await ref.read(appInitializationProvider.future);
      
      // Then initialize attendance provider
      await ref.read(attendanceInitializationProvider.future);
      
      // Load other data
      await _refreshData();
    } catch (e) {
      debugPrint('Failed to initialize services: $e');
      // Continue with data refresh even if initialization fails
      await _refreshData();
    }
  }

  Future<void> _refreshData() async {
    await Future.wait([
      ref.refresh(todayAttendanceProvider.future),
      ref.refresh(weeklyHoursProvider.future),
      ref.refresh(recentAnnouncementsProvider.future),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider);
    final appReady = ref.watch(appReadyProvider);
    final todayAttendance = ref.watch(todayAttendanceProvider);
    final weeklyHours = ref.watch(weeklyHoursProvider);
    final announcements = ref.watch(recentAnnouncementsProvider);
    
    // Show loading indicator while app is initializing
    if (!appReady) {
      return Scaffold(
        backgroundColor: NeoBrutalTheme.bg,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(
                color: NeoBrutalTheme.hi,
                strokeWidth: 3.0,
              ),
              const SizedBox(height: 16),
              Text(
                'Initializing services...',
                style: NeoBrutalTheme.body,
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: NeoBrutalTheme.bg,
      appBar: AppBar(
        title: Text(
          'DOT 출근부',
          style: NeoBrutalTheme.title,
        ),
        backgroundColor: NeoBrutalTheme.bg,
        foregroundColor: NeoBrutalTheme.fg,
        elevation: 0,
        centerTitle: true,
        actions: [
          // 사용자 프로필 아이콘
          Padding(
            padding: const EdgeInsets.only(right: NeoBrutalTheme.space4),
            child: CircleAvatar(
              backgroundColor: NeoBrutalTheme.hi,
              radius: 18,
              child: Icon(
                Icons.person,
                color: NeoBrutalTheme.hiInk,
                size: 20,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
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
              // 인사말 및 날짜
              _buildGreetingSection(authState),
              const SizedBox(height: NeoBrutalTheme.space6),

              // 오늘 출근 상태 카드 (하이라이트)
              _buildAttendanceStatusSection(todayAttendance),
              const SizedBox(height: NeoBrutalTheme.space6),

              // 빠른 액션 버튼들
              _buildQuickActionsSection(),
              const SizedBox(height: NeoBrutalTheme.space6),

              // 주간 근무시간 차트
              _buildWeeklyHoursSection(weeklyHours),
              const SizedBox(height: NeoBrutalTheme.space6),

              // 최근 공지사항
              _buildAnnouncementsSection(announcements),
              
              // 하단 여백
              const SizedBox(height: NeoBrutalTheme.space8),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGreetingSection(AsyncValue authState) {
    return authState.when(
      data: (user) {
        if (user == null) return const SizedBox.shrink();
        
        final now = DateTime.now();
        final hour = now.hour;
        String greeting = '안녕하세요';
        
        if (hour < 12) {
          greeting = '좋은 아침입니다';
        } else if (hour < 18) {
          greeting = '좋은 오후입니다';
        } else {
          greeting = '좋은 저녁입니다';
        }
        
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '$greeting,',
              style: NeoBrutalTheme.body.copyWith(
                color: NeoBrutalTheme.fg.withOpacity(0.7),
              ),
            ),
            const SizedBox(height: NeoBrutalTheme.space2),
            Row(
              children: [
                Text(
                  '${user.name}님',
                  style: NeoBrutalTheme.heading,
                ),
                const SizedBox(width: NeoBrutalTheme.space2),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: NeoBrutalTheme.space2,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: user.role.color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(
                      color: user.role.color,
                      width: 1,
                    ),
                  ),
                  child: Text(
                    user.role.displayName,
                    style: NeoBrutalTheme.micro.copyWith(
                      color: user.role.color,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: NeoBrutalTheme.space2),
            Text(
              _formatDate(now),
              style: NeoBrutalTheme.caption.copyWith(
                color: NeoBrutalTheme.fg.withOpacity(0.6),
              ),
            ),
          ],
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  Widget _buildAttendanceStatusSection(AsyncValue todayAttendance) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '오늘 출근 현황',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        AttendanceStatusCard(
          todayAttendance: todayAttendance,
          isHighlighted: true,
        ),
      ],
    );
  }

  Widget _buildQuickActionsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '빠른 작업',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        const QuickActionButtons(),
      ],
    );
  }

  Widget _buildWeeklyHoursSection(AsyncValue weeklyHours) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '주간 근무시간',
          style: NeoBrutalTheme.heading,
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        WeeklyChartCard(
          weeklyHours: weeklyHours,
        ),
      ],
    );
  }

  Widget _buildAnnouncementsSection(AsyncValue announcements) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '공지사항',
              style: NeoBrutalTheme.heading,
            ),
            TextButton(
              onPressed: () {
                // 전체 공지사항 페이지로 이동
              },
              child: Text(
                '전체보기',
                style: NeoBrutalTheme.caption.copyWith(
                  color: NeoBrutalTheme.fg.withOpacity(0.7),
                  decoration: TextDecoration.underline,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: NeoBrutalTheme.space3),
        AnnouncementCard(
          announcements: announcements,
        ),
      ],
    );
  }

  String _formatDate(DateTime date) {
    final weekdays = ['월', '화', '수', '목', '금', '토', '일'];
    final weekday = weekdays[date.weekday - 1];
    return '${date.year}년 ${date.month}월 ${date.day}일 ($weekday)';
  }
}

/// 네트워킹 에러 위젯
class _NetworkErrorWidget extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const _NetworkErrorWidget({
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          Icon(
            Icons.wifi_off_rounded,
            size: 48,
            color: NeoBrutalTheme.fg.withOpacity(0.5),
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            message,
            style: NeoBrutalTheme.body,
            textAlign: TextAlign.center,
          ),
          if (onRetry != null) ...[
            const SizedBox(height: NeoBrutalTheme.space4),
            NeoBrutalButton(
              text: '다시 시도',
              onPressed: onRetry!,
            ),
          ],
        ],
      ),
    );
  }
}
