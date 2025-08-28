import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../common/neo_brutal_card.dart';
import '../common/neo_brutal_button.dart';

/// 오늘 출근 상태를 보여주는 카드 위젯
class AttendanceStatusCard extends ConsumerWidget {
  final AsyncValue todayAttendance;
  final bool isHighlighted;

  const AttendanceStatusCard({
    super.key,
    required this.todayAttendance,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return todayAttendance.when(
      data: (attendance) => _buildAttendanceCard(context, attendance),
      loading: () => _buildLoadingCard(),
      error: (error, stack) => _buildErrorCard(error.toString()),
    );
  }

  Widget _buildAttendanceCard(BuildContext context, dynamic attendance) {
    final isCheckedIn = attendance?.isCheckedIn ?? false;
    final checkInTime = attendance?.checkInTime;
    final checkOutTime = attendance?.checkOutTime;
    final workDuration = attendance?.workDuration ?? Duration.zero;
    
    Color accentColor = NeoBrutalTheme.hi;
    String statusText = '출근 전';
    String actionText = '출근하기';
    IconData statusIcon = Icons.access_time;
    
    if (isCheckedIn && checkOutTime == null) {
      accentColor = NeoBrutalTheme.success;
      statusText = '근무 중';
      actionText = '퇴근하기';
      statusIcon = Icons.work;
    } else if (checkOutTime != null) {
      accentColor = NeoBrutalTheme.info;
      statusText = '퇴근 완료';
      actionText = '완료';
      statusIcon = Icons.check_circle;
    }

    return NeoBrutalCard(
      backgroundColor: isHighlighted ? accentColor.withOpacity(0.1) : NeoBrutalTheme.bg,
      borderColor: accentColor,
      borderWidth: isHighlighted ? NeoBrutalTheme.borderThick : NeoBrutalTheme.borderThin,
      boxShadow: isHighlighted ? NeoBrutalTheme.shadowElev3 : NeoBrutalTheme.shadowElev2,
      padding: const EdgeInsets.all(NeoBrutalTheme.space6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(NeoBrutalTheme.space2),
                decoration: BoxDecoration(
                  color: accentColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: accentColor,
                    width: NeoBrutalTheme.borderThin,
                  ),
                ),
                child: Icon(
                  statusIcon,
                  color: accentColor,
                  size: 24,
                ),
              ),
              const SizedBox(width: NeoBrutalTheme.space3),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      statusText,
                      style: NeoBrutalTheme.heading.copyWith(
                        color: accentColor,
                      ),
                    ),
                    if (checkInTime != null)
                      Text(
                        '출근: ${_formatTime(checkInTime)}',
                        style: NeoBrutalTheme.caption,
                      ),
                  ],
                ),
              ),
            ],
          ),
          
          const SizedBox(height: NeoBrutalTheme.space4),
          
          // 근무 시간 정보
          if (isCheckedIn) ..[
            Container(
              padding: const EdgeInsets.all(NeoBrutalTheme.space3),
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
                    '근무 시간',
                    style: NeoBrutalTheme.body,
                  ),
                  Text(
                    _formatDuration(workDuration),
                    style: NeoBrutalTheme.body.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: NeoBrutalTheme.space4),
          ],
          
          // 액션 버튼
          if (checkOutTime == null)
            SizedBox(
              width: double.infinity,
              child: NeoBrutalButton(
                text: actionText,
                onPressed: () {
                  _handleAttendanceAction(context, isCheckedIn);
                },
                backgroundColor: accentColor,
              ),
            )
          else
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                vertical: NeoBrutalTheme.space3,
              ),
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(NeoBrutalTheme.radiusButton),
                border: Border.all(
                  color: accentColor,
                  width: NeoBrutalTheme.borderThin,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.check_circle,
                    color: accentColor,
                    size: 20,
                  ),
                  const SizedBox(width: NeoBrutalTheme.space2),
                  Text(
                    '오늘 근무 완료',
                    style: NeoBrutalTheme.body.copyWith(
                      fontWeight: FontWeight.w700,
                      color: accentColor,
                    ),
                  ),
                ],
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
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: NeoBrutalTheme.muted,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
              ),
            ),
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '출근 정보를 불러오는 중...',
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
            Icons.error_outline,
            color: NeoBrutalTheme.error,
            size: 48,
          ),
          const SizedBox(height: NeoBrutalTheme.space3),
          Text(
            '출근 정보를 불러올 수 없습니다',
            style: NeoBrutalTheme.body,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: NeoBrutalTheme.space2),
          Text(
            error,
            style: NeoBrutalTheme.caption.copyWith(
              color: NeoBrutalTheme.fg.withOpacity(0.7),
            ),
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  void _handleAttendanceAction(BuildContext context, bool isCheckedIn) {
    if (isCheckedIn) {
      // 퇴근 처리
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('퇴근 확인'),
          content: const Text('퇴근 처리하시겠습니까?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('취소'),
            ),
            NeoBrutalButton(
              text: '퇴근',
              onPressed: () {
                Navigator.of(context).pop();
                // TODO: 퇴근 처리 로직
              },
            ),
          ],
        ),
      );
    } else {
      // 출근 처리
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('출근 확인'),
          content: const Text('출근 처리하시겠습니까?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('취소'),
            ),
            NeoBrutalButton(
              text: '출근',
              onPressed: () {
                Navigator.of(context).pop();
                // TODO: 출근 처리 로직
              },
            ),
          ],
        ),
      );
    }
  }

  String _formatTime(DateTime? dateTime) {
    if (dateTime == null) return '--:--';
    final hour = dateTime.hour.toString().padLeft(2, '0');
    final minute = dateTime.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    return '${hours}시간 ${minutes}분';
  }
}
