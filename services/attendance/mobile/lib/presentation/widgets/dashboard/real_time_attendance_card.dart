import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';

/// 실시간 직원 출근 현황을 보여주는 위젯
/// 애니메이션과 실시간 업데이트 기능 포함
class RealTimeAttendanceCard extends ConsumerStatefulWidget {
  final AsyncValue attendanceData;

  const RealTimeAttendanceCard({
    super.key,
    required this.attendanceData,
  });

  @override
  ConsumerState<RealTimeAttendanceCard> createState() => _RealTimeAttendanceCardState();
}

class _RealTimeAttendanceCardState extends ConsumerState<RealTimeAttendanceCard>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  Timer? _refreshTimer;
  String _lastUpdateTime = '';

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
    
    _updateLastRefreshTime();
    
    // 30초마다 업데이트 시간 갱신
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _updateLastRefreshTime();
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _updateLastRefreshTime() {
    if (mounted) {
      setState(() {
        final now = DateTime.now();
        _lastUpdateTime = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.attendanceData.when(
      data: (data) => _buildAttendanceCard(data),
      loading: () => _buildLoadingCard(),
      error: (error, stack) => _buildErrorCard(error.toString()),
    ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.2, end: 0);
  }

  Widget _buildAttendanceCard(dynamic data) {
    final attendanceList = data as List<dynamic>? ?? [];
    final presentCount = attendanceList.where((emp) => emp['status'] == '출근').length;
    final lateCount = attendanceList.where((emp) => emp['status'] == '지각').length;
    final breakCount = attendanceList.where((emp) => emp['status'] == '휴게').length;
    final remoteCount = attendanceList.where((emp) => emp['status'] == '외근').length;

    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 헤더 - 실시간 인디케이터
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '실시간 직원 현황',
                style: NeoBrutalTheme.heading,
              ),
              Row(
                children: [
                  Text(
                    '마지막 업데이트: $_lastUpdateTime',
                    style: NeoBrutalTheme.micro.copyWith(
                      color: NeoBrutalTheme.fg.withOpacity(0.6),
                    ),
                  ),
                  const SizedBox(width: NeoBrutalTheme.space2),
                  AnimatedBuilder(
                    animation: _pulseController,
                    builder: (context, child) {
                      return Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: NeoBrutalTheme.success.withOpacity(
                            0.5 + (_pulseController.value * 0.5),
                          ),
                          shape: BoxShape.circle,
                        ),
                      );
                    },
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
            ],
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // 상태별 요약 - 2x2 그리드로 변경
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 2,
            mainAxisSpacing: NeoBrutalTheme.space2,
            crossAxisSpacing: NeoBrutalTheme.space2,
            children: [
              _buildStatusCard('출근', presentCount, NeoBrutalTheme.success, Icons.work),
              _buildStatusCard('휴게', breakCount, NeoBrutalTheme.warning, Icons.coffee),
              _buildStatusCard('지각', lateCount, NeoBrutalTheme.error, Icons.schedule),
              _buildStatusCard('외근', remoteCount, NeoBrutalTheme.info, Icons.location_on),
            ],
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // 총 직원 수 표시
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: NeoBrutalTheme.space3,
              vertical: NeoBrutalTheme.space2,
            ),
            decoration: BoxDecoration(
              color: NeoBrutalTheme.muted,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: NeoBrutalTheme.line,
                width: NeoBrutalTheme.borderThin,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '총 직원',
                  style: NeoBrutalTheme.body.copyWith(fontWeight: FontWeight.w700),
                ),
                Text(
                  '${attendanceList.length}명',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                    color: NeoBrutalTheme.hi,
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          const Divider(color: NeoBrutalTheme.line),
          
          const SizedBox(height: NeoBrutalTheme.space3),
          
          // 최근 활동 섹션
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '최근 활동',
                style: NeoBrutalTheme.body.copyWith(fontWeight: FontWeight.w700),
              ),
              TextButton(
                onPressed: () {
                  // 전체 직원 현황 페이지로 이동
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
          
          const SizedBox(height: NeoBrutalTheme.space2),
          
          // 직원 리스트 - 최근 5명만 표시
          SizedBox(
            height: 180,
            child: attendanceList.isEmpty 
                ? _buildEmptyState()
                : AnimationLimiter(
                    child: ListView.builder(
                      itemCount: (attendanceList.length).clamp(0, 5),
                      itemBuilder: (context, index) {
                        final employee = attendanceList[index];
                        return AnimationConfiguration.staggeredList(
                          position: index,
                          duration: const Duration(milliseconds: 375),
                          child: SlideAnimation(
                            verticalOffset: 50.0,
                            child: FadeInAnimation(
                              child: _buildEmployeeItem(employee, index),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(String label, int count, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.05),
        borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusCard),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: NeoBrutalTheme.borderThin,
        ),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            color: color,
            size: 20,
          ),
          const SizedBox(width: NeoBrutalTheme.space2),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  count.toString(),
                  style: NeoBrutalTheme.heading.copyWith(
                    color: color,
                    fontSize: 20,
                  ),
                ),
                Text(
                  label,
                  style: NeoBrutalTheme.caption.copyWith(
                    color: color,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().scale(delay: (label.hashCode % 4 * 100).ms);
  }

  Widget _buildEmployeeItem(Map<String, dynamic> employee, int index) {
    Color statusColor = _getStatusColor(employee['status']);
    IconData statusIcon = _getStatusIcon(employee['status']);

    return Container(
      margin: const EdgeInsets.only(bottom: NeoBrutalTheme.space2),
      padding: const EdgeInsets.all(NeoBrutalTheme.space3),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: statusColor.withOpacity(0.2),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // 프로필 아바타
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: statusColor.withOpacity(0.3),
                width: 2,
              ),
            ),
            child: Icon(
              statusIcon,
              size: 20,
              color: statusColor,
            ),
          ),
          
          const SizedBox(width: NeoBrutalTheme.space3),
          
          // 직원 정보
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  employee['name'] ?? '이름 없음',
                  style: NeoBrutalTheme.body.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  employee['department'] ?? '부서 없음',
                  style: NeoBrutalTheme.caption.copyWith(
                    color: NeoBrutalTheme.fg.withOpacity(0.6),
                  ),
                ),
              ],
            ),
          ),
          
          // 상태 및 시간
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: statusColor,
                    width: 1,
                  ),
                ),
                child: Text(
                  employee['status'] ?? '상태 없음',
                  style: NeoBrutalTheme.micro.copyWith(
                    color: statusColor,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              if (employee['checkInTime'] != null)
                Text(
                  _formatTime(employee['checkInTime']),
                  style: NeoBrutalTheme.micro.copyWith(
                    color: NeoBrutalTheme.fg.withOpacity(0.5),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.people_outline,
            size: 48,
            color: NeoBrutalTheme.fg.withOpacity(0.3),
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            '출근한 직원이 없습니다',
            style: NeoBrutalTheme.body.copyWith(
              color: NeoBrutalTheme.fg.withOpacity(0.6),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingCard() {
    return NeoBrutalCard(
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          const CircularProgressIndicator(
            color: NeoBrutalTheme.hi,
            strokeWidth: 3,
          ).animate().rotate(duration: 2000.ms),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '실시간 데이터를 불러오는 중...',
            style: NeoBrutalTheme.body,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorCard(String error) {
    return NeoBrutalCard(
      borderColor: NeoBrutalTheme.error,
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        children: [
          Icon(
            Icons.wifi_off_rounded,
            color: NeoBrutalTheme.error,
            size: 48,
          ).animate().shake(),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '실시간 데이터를 불러올 수 없습니다',
            style: NeoBrutalTheme.body,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            '네트워크 연결을 확인해주세요',
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.fg.withOpacity(0.7),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case '출근':
        return NeoBrutalTheme.success;
      case '휴게':
        return NeoBrutalTheme.warning;
      case '지각':
        return NeoBrutalTheme.error;
      case '외근':
        return NeoBrutalTheme.info;
      default:
        return NeoBrutalTheme.fg.withOpacity(0.5);
    }
  }

  IconData _getStatusIcon(String? status) {
    switch (status) {
      case '출근':
        return Icons.work;
      case '휴게':
        return Icons.coffee;
      case '지각':
        return Icons.schedule;
      case '외근':
        return Icons.location_on;
      default:
        return Icons.person;
    }
  }

  String _formatTime(dynamic time) {
    if (time == null) return '';
    
    DateTime dateTime;
    if (time is DateTime) {
      dateTime = time;
    } else {
      return '';
    }
    
    return '${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
