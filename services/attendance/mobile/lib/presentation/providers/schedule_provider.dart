import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 오늘 스케줄 프로바이더
final todayScheduleProvider = FutureProvider<List<ScheduleItem>>((ref) async {
  // TODO: 실제 서비스 호출 구현
  await Future.delayed(const Duration(milliseconds: 600));
  
  return [
    ScheduleItem(
      id: '1',
      employeeName: '김직원',
      shift: '오전 근무',
      startTime: DateTime.now().copyWith(hour: 9, minute: 0),
      endTime: DateTime.now().copyWith(hour: 18, minute: 0),
      status: 'present',
    ),
    ScheduleItem(
      id: '2',
      employeeName: '이사원',
      shift: '오후 근무',
      startTime: DateTime.now().copyWith(hour: 14, minute: 0),
      endTime: DateTime.now().copyWith(hour: 22, minute: 0),
      status: 'scheduled',
    ),
    ScheduleItem(
      id: '3',
      employeeName: '박대리',
      shift: '풀타임',
      startTime: DateTime.now().copyWith(hour: 10, minute: 0),
      endTime: DateTime.now().copyWith(hour: 19, minute: 0),
      status: 'present',
    ),
  ];
});

/// 스케줄 아이템 모델
class ScheduleItem {
  final String id;
  final String employeeName;
  final String shift;
  final DateTime startTime;
  final DateTime endTime;
  final String status; // scheduled, present, absent, late

  ScheduleItem({
    required this.id,
    required this.employeeName,
    required this.shift,
    required this.startTime,
    required this.endTime,
    required this.status,
  });
}
