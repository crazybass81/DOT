import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../providers/attendance_provider.dart';
import '../attendance/time_counter_widget.dart';

/// PLAN-1 요구사항: 현재 상태 카드 위젯
/// 대시보드에서 현재 근무 상태와 시간을 표시
class CurrentStatusCard extends ConsumerWidget {
  const CurrentStatusCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceState = ref.watch(attendanceProvider);

    // 상태에 따른 색상과 아이콘 설정
    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (attendanceState.currentStatus) {
      case 'WORKING':
        statusColor = NeoBrutalTheme.success;
        statusIcon = Icons.work_outline;
        statusText = '근무 중';
        break;
      case 'ON_BREAK':
        statusColor = NeoBrutalTheme.warning;
        statusIcon = Icons.coffee_outlined;
        statusText = '휴게 중';
        break;
      default:
        statusColor = NeoBrutalTheme.gray500;
        statusIcon = Icons.home_outlined;
        statusText = '미출근';
    }

    return Container(
      decoration: BoxDecoration(
        color: NeoBrutalTheme.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: NeoBrutalTheme.fg,
          width: 3,
        ),
        boxShadow: [
          BoxShadow(
            offset: const Offset(4, 4),
            color: NeoBrutalTheme.fg,
          ),
        ],
      ),
      child: Column(
        children: [
          // 헤더
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.1),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(9),
                topRight: Radius.circular(9),
              ),
              border: Border(
                bottom: BorderSide(
                  color: statusColor,
                  width: 3,
                ),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: statusColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    statusIcon,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '현재 상태',
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.fg.withOpacity(0.6),
                      ),
                    ),
                    Text(
                      statusText,
                      style: NeoBrutalTheme.heading.copyWith(
                        fontSize: 22,
                        color: statusColor,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                // 실시간 시각
                _LiveClock(),
              ],
            ),
          ),

          // 시간 카운터 (출근한 경우에만 표시)
          if (attendanceState.currentStatus != 'NOT_WORKING' &&
              attendanceState.checkInTime != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: TimeCounterWidget(
                checkInTime: attendanceState.checkInTime!,
                isOnBreak: attendanceState.currentStatus == 'ON_BREAK',
                initialWorkMinutes: attendanceState.workingMinutes,
                initialBreakMinutes: attendanceState.breakMinutes,
                onTimeUpdate: (workMinutes, breakMinutes) {
                  ref.read(attendanceProvider.notifier).updateTimeCounters(
                    workMinutes,
                    breakMinutes,
                  );
                },
              ),
            ),

          // 미출근 상태 안내
          if (attendanceState.currentStatus == 'NOT_WORKING')
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Icon(
                    Icons.info_outline,
                    size: 48,
                    color: NeoBrutalTheme.gray400,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '아직 출근하지 않으셨습니다',
                    style: NeoBrutalTheme.body.copyWith(
                      color: NeoBrutalTheme.gray600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'QR 코드를 스캔하거나 출근 버튼을 눌러주세요',
                    style: NeoBrutalTheme.caption.copyWith(
                      color: NeoBrutalTheme.gray500,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// 실시간 시계 위젯
class _LiveClock extends StatefulWidget {
  const _LiveClock();

  @override
  State<_LiveClock> createState() => _LiveClockState();
}

class _LiveClockState extends State<_LiveClock> {
  late Stream<DateTime> _clockStream;

  @override
  void initState() {
    super.initState();
    _clockStream = Stream.periodic(
      const Duration(seconds: 1),
      (_) => DateTime.now(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<DateTime>(
      stream: _clockStream,
      initialData: DateTime.now(),
      builder: (context, snapshot) {
        final now = snapshot.data ?? DateTime.now();
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: NeoBrutalTheme.fg,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}:${now.second.toString().padLeft(2, '0')}',
            style: NeoBrutalTheme.body.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontFamily: 'monospace',
            ),
          ),
        );
      },
    );
  }
}