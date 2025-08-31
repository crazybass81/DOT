import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';
import '../../providers/attendance_provider.dart';
import '../common/neo_brutal_button.dart';

/// PLAN-1 요구사항: 휴게 시작/종료 컨트롤 위젯
class BreakControlWidget extends ConsumerWidget {
  const BreakControlWidget({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final attendanceState = ref.watch(attendanceProvider);
    final isOnBreak = attendanceState.currentStatus == 'ON_BREAK';
    final isWorking = attendanceState.currentStatus == 'WORKING';
    
    if (attendanceState.currentStatus == 'NOT_WORKING') {
      return const SizedBox.shrink(); // 출근 전에는 표시하지 않음
    }

    return Container(
      padding: const EdgeInsets.all(16),
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
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 헤더
          Row(
            children: [
              Icon(
                isOnBreak ? Icons.coffee : Icons.work_outline,
                color: isOnBreak ? NeoBrutalTheme.warning : NeoBrutalTheme.success,
                size: 24,
              ),
              const SizedBox(width: 12),
              Text(
                isOnBreak ? '휴게 중' : '근무 중',
                style: NeoBrutalTheme.heading.copyWith(fontSize: 18),
              ),
              const Spacer(),
              if (isOnBreak && attendanceState.breakStartTime != null)
                _BreakTimer(startTime: attendanceState.breakStartTime!),
            ],
          ),
          const SizedBox(height: 16),
          
          // 휴게 버튼
          if (isWorking)
            NeoBrutalButton(
              onPressed: attendanceState.isLoading
                  ? null
                  : () async {
                      await HapticFeedback.mediumImpact();
                      await ref.read(attendanceProvider.notifier).startBreak();
                    },
              text: '휴게 시작',
              backgroundColor: NeoBrutalTheme.warning,
              isLoading: attendanceState.isLoading,
            ),
          
          if (isOnBreak) ...[
            NeoBrutalButton(
              onPressed: attendanceState.isLoading
                  ? null
                  : () async {
                      await HapticFeedback.mediumImpact();
                      await ref.read(attendanceProvider.notifier).endBreak();
                    },
              text: '휴게 종료',
              backgroundColor: NeoBrutalTheme.success,
              isLoading: attendanceState.isLoading,
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: NeoBrutalTheme.warning.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: NeoBrutalTheme.warning,
                  width: 2,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: NeoBrutalTheme.warning,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '휴게 시간은 근무 시간에서 제외됩니다',
                      style: NeoBrutalTheme.caption.copyWith(
                        color: NeoBrutalTheme.fg,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          
          // 휴게 시간 요약
          if (attendanceState.breakMinutes > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: NeoBrutalTheme.gray100,
                borderRadius: BorderRadius.circular(6),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '오늘 총 휴게: ',
                    style: NeoBrutalTheme.caption,
                  ),
                  Text(
                    _formatMinutes(attendanceState.breakMinutes),
                    style: NeoBrutalTheme.caption.copyWith(
                      fontWeight: FontWeight.bold,
                      color: NeoBrutalTheme.warning,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatMinutes(int minutes) {
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    if (hours > 0) {
      return '$hours시간 $mins분';
    }
    return '$mins분';
  }
}

/// 휴게 시간 타이머 위젯
class _BreakTimer extends StatefulWidget {
  final DateTime startTime;

  const _BreakTimer({required this.startTime});

  @override
  State<_BreakTimer> createState() => _BreakTimerState();
}

class _BreakTimerState extends State<_BreakTimer> {
  late Stream<int> _timerStream;

  @override
  void initState() {
    super.initState();
    // 1초마다 업데이트
    _timerStream = Stream.periodic(const Duration(seconds: 1), (count) {
      return DateTime.now().difference(widget.startTime).inSeconds;
    });
  }

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<int>(
      stream: _timerStream,
      initialData: 0,
      builder: (context, snapshot) {
        final seconds = snapshot.data ?? 0;
        final minutes = seconds ~/ 60;
        final secs = seconds % 60;
        
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: NeoBrutalTheme.warning.withOpacity(0.2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: NeoBrutalTheme.warning,
              width: 1,
            ),
          ),
          child: Text(
            '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}',
            style: NeoBrutalTheme.caption.copyWith(
              fontWeight: FontWeight.bold,
              color: NeoBrutalTheme.warning,
            ),
          ),
        );
      },
    );
  }
}