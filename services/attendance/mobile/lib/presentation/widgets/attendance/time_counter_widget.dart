import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/neo_brutal_theme.dart';

/// PLAN-1 요구사항: 실시간 시간 카운터 위젯
/// 근무시간과 휴게시간을 1분 단위로 카운팅
class TimeCounterWidget extends ConsumerStatefulWidget {
  final DateTime checkInTime;
  final bool isOnBreak;
  final int initialWorkMinutes;
  final int initialBreakMinutes;
  final Function(int workMinutes, int breakMinutes)? onTimeUpdate;

  const TimeCounterWidget({
    super.key,
    required this.checkInTime,
    this.isOnBreak = false,
    this.initialWorkMinutes = 0,
    this.initialBreakMinutes = 0,
    this.onTimeUpdate,
  });

  @override
  ConsumerState<TimeCounterWidget> createState() => _TimeCounterWidgetState();
}

class _TimeCounterWidgetState extends ConsumerState<TimeCounterWidget> {
  late Timer _timer;
  late int _workingMinutes;
  late int _breakMinutes;
  late bool _isOnBreak;
  DateTime? _breakStartTime;

  @override
  void initState() {
    super.initState();
    _workingMinutes = widget.initialWorkMinutes;
    _breakMinutes = widget.initialBreakMinutes;
    _isOnBreak = widget.isOnBreak;
    
    // PLAN-1: 1분마다 업데이트
    _startTimer();
  }

  void _startTimer() {
    // 매 60초마다 카운터 업데이트
    _timer = Timer.periodic(const Duration(seconds: 60), (timer) {
      setState(() {
        if (_isOnBreak) {
          // 휴게 시간 카운팅
          _breakMinutes++;
        } else {
          // 근무 시간 카운팅
          _workingMinutes++;
        }
      });
      
      // 콜백으로 시간 업데이트 전달
      widget.onTimeUpdate?.call(_workingMinutes, _breakMinutes);
      
      // PLAN-1: 5분마다 백엔드 동기화 (300초)
      if ((_workingMinutes + _breakMinutes) % 5 == 0) {
        _syncWithBackend();
      }
    });
  }

  void _syncWithBackend() {
    // TODO: 백엔드 동기화 구현
    debugPrint('Syncing time with backend: Work=$_workingMinutes, Break=$_breakMinutes');
  }

  void toggleBreak() {
    setState(() {
      _isOnBreak = !_isOnBreak;
      if (_isOnBreak) {
        _breakStartTime = DateTime.now();
      } else {
        _breakStartTime = null;
      }
    });
  }

  String _formatTime(int minutes) {
    final hours = minutes ~/ 60;
    final mins = minutes % 60;
    return '${hours.toString().padLeft(2, '0')}:${mins.toString().padLeft(2, '0')}';
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final actualWorkMinutes = _workingMinutes;
    final totalMinutes = _workingMinutes + _breakMinutes;
    
    return Container(
      padding: const EdgeInsets.all(20),
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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 헤더
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '근무 시간',
                style: NeoBrutalTheme.heading.copyWith(fontSize: 20),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: _isOnBreak ? NeoBrutalTheme.warning : NeoBrutalTheme.success,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: NeoBrutalTheme.fg,
                    width: 2,
                  ),
                ),
                child: Text(
                  _isOnBreak ? '휴게중' : '근무중',
                  style: NeoBrutalTheme.caption.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // 시간 카운터 표시
          Row(
            children: [
              Expanded(
                child: _TimeDisplay(
                  label: '총 근무',
                  time: _formatTime(totalMinutes),
                  icon: Icons.timer_outlined,
                  color: NeoBrutalTheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _TimeDisplay(
                  label: '실 근무',
                  time: _formatTime(actualWorkMinutes),
                  icon: Icons.work_outline,
                  color: NeoBrutalTheme.success,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _TimeDisplay(
                  label: '휴게',
                  time: _formatTime(_breakMinutes),
                  icon: Icons.coffee_outlined,
                  color: NeoBrutalTheme.warning,
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          
          // 출근 시간 표시
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: NeoBrutalTheme.bg2,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: NeoBrutalTheme.fg.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.login_rounded,
                  size: 20,
                  color: NeoBrutalTheme.fg.withOpacity(0.6),
                ),
                const SizedBox(width: 8),
                Text(
                  '출근: ${widget.checkInTime.hour.toString().padLeft(2, '0')}:${widget.checkInTime.minute.toString().padLeft(2, '0')}',
                  style: NeoBrutalTheme.body.copyWith(
                    color: NeoBrutalTheme.fg.withOpacity(0.8),
                  ),
                ),
                if (_isOnBreak && _breakStartTime != null) ...[
                  const SizedBox(width: 16),
                  Icon(
                    Icons.pause_circle_outline,
                    size: 20,
                    color: NeoBrutalTheme.warning,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${_breakStartTime!.hour.toString().padLeft(2, '0')}:${_breakStartTime!.minute.toString().padLeft(2, '0')}',
                    style: NeoBrutalTheme.caption.copyWith(
                      color: NeoBrutalTheme.warning,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 시간 표시 위젯
class _TimeDisplay extends StatelessWidget {
  final String label;
  final String time;
  final IconData icon;
  final Color color;

  const _TimeDisplay({
    required this.label,
    required this.time,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: color,
          width: 2,
        ),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(
            time,
            style: NeoBrutalTheme.heading.copyWith(
              fontSize: 18,
              color: color,
            ),
          ),
          Text(
            label,
            style: NeoBrutalTheme.caption.copyWith(
              color: color.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }
}