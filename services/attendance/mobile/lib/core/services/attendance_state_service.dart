// 출근 상태 관리 서비스
// AttendanceProvider에서 분리된 상태 관리 전용 서비스

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'attendance_state_service.freezed.dart';

/// 출근 상태 열거형
enum WorkStatus {
  notWorking,
  working, 
  onBreak,
}

/// 출근 액션 타입
enum AttendanceActionType {
  checkIn,
  checkOut,
  breakStart,
  breakEnd,
  autoCheckIn,
}

/// 출근 상태 정보
@freezed
class AttendanceStateInfo with _$AttendanceStateInfo {
  const factory AttendanceStateInfo({
    @Default(WorkStatus.notWorking) WorkStatus currentStatus,
    @Default(0) int workingMinutes,
    @Default(0) int breakMinutes,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    DateTime? breakStartTime,
    @Default([]) List<Map<String, dynamic>> todayRecords,
  }) = _AttendanceStateInfo;
  
  const AttendanceStateInfo._();
  
  /// 총 근무 시간 계산 (분)
  int get totalWorkMinutes {
    if (checkInTime == null) return 0;
    final endTime = checkOutTime ?? DateTime.now();
    return endTime.difference(checkInTime!).inMinutes;
  }
  
  /// 실제 근무 시간 = 총 근무 시간 - 휴게 시간
  int get actualWorkMinutes {
    return totalWorkMinutes - breakMinutes;
  }
  
  /// 현재 근무 중인지 확인
  bool get isWorking {
    return currentStatus == WorkStatus.working || 
           currentStatus == WorkStatus.onBreak;
  }
  
  /// 휴게 중인지 확인
  bool get isOnBreak {
    return currentStatus == WorkStatus.onBreak;
  }
  
  /// 오늘 출근했는지 확인  
  bool get hasCheckedInToday {
    return checkInTime != null;
  }
  
  /// 오늘 퇴근했는지 확인
  bool get hasCheckedOutToday {
    return checkOutTime != null;
  }
}

/// 출근 상태 관리 서비스
class AttendanceStateService extends StateNotifier<AttendanceStateInfo> {
  AttendanceStateService() : super(const AttendanceStateInfo());
  
  /// 상태 초기화 (새로운 날 시작시)
  void initializeNewDay() {
    state = const AttendanceStateInfo();
  }
  
  /// 출근 처리
  void performCheckIn() {
    if (state.currentStatus != WorkStatus.notWorking) {
      throw StateError('이미 출근한 상태입니다');
    }
    
    final now = DateTime.now();
    final record = _createRecord('CHECK_IN', now, 'WORKING');
    
    state = state.copyWith(
      currentStatus: WorkStatus.working,
      checkInTime: now,
      workingMinutes: 0,
      breakMinutes: 0,
      todayRecords: [...state.todayRecords, record],
    );
  }
  
  /// 휴게 시작
  void startBreak() {
    if (state.currentStatus != WorkStatus.working) {
      throw StateError('근무 중일 때만 휴게를 시작할 수 있습니다');
    }
    
    final now = DateTime.now();
    final record = _createRecord('BREAK_START', now, 'ON_BREAK');
    
    state = state.copyWith(
      currentStatus: WorkStatus.onBreak,
      breakStartTime: now,
      todayRecords: [...state.todayRecords, record],
    );
  }
  
  /// 휴게 종료
  void endBreak() {
    if (state.currentStatus != WorkStatus.onBreak) {
      throw StateError('휴게 중일 때만 휴게를 종료할 수 있습니다');
    }
    
    final now = DateTime.now();
    
    // 휴게 시간 계산
    int breakDuration = 0;
    if (state.breakStartTime != null) {
      breakDuration = now.difference(state.breakStartTime!).inMinutes;
    }
    
    final record = _createRecord('BREAK_END', now, 'WORKING');
    
    state = state.copyWith(
      currentStatus: WorkStatus.working,
      breakStartTime: null,
      breakMinutes: state.breakMinutes + breakDuration,
      todayRecords: [...state.todayRecords, record],
    );
  }
  
  /// 퇴근 처리
  void performCheckOut() {
    if (state.currentStatus == WorkStatus.notWorking) {
      throw StateError('출근하지 않은 상태에서는 퇴근할 수 없습니다');
    }
    
    final now = DateTime.now();
    
    // 휴게 중이었다면 휴게 시간 추가 계산
    int finalBreakMinutes = state.breakMinutes;
    if (state.currentStatus == WorkStatus.onBreak && state.breakStartTime != null) {
      finalBreakMinutes += now.difference(state.breakStartTime!).inMinutes;
    }
    
    final totalWork = state.totalWorkMinutes;
    final actualWork = totalWork - finalBreakMinutes;
    
    final record = _createRecord('CHECK_OUT', now, 'COMPLETED', additionalData: {
      'totalWorkMinutes': totalWork,
      'totalBreakMinutes': finalBreakMinutes,
      'actualWorkMinutes': actualWork,
    });
    
    state = state.copyWith(
      currentStatus: WorkStatus.notWorking,
      checkOutTime: now,
      workingMinutes: actualWork,
      breakMinutes: finalBreakMinutes,
      breakStartTime: null,
      todayRecords: [...state.todayRecords, record],
    );
  }
  
  /// 시간 카운터 업데이트 (외부에서 호출)
  void updateTimeCounters(int workMinutes, int breakMinutes) {
    state = state.copyWith(
      workingMinutes: workMinutes,
      breakMinutes: breakMinutes,
    );
  }
  
  /// 기존 상태 복원 (앱 재시작시)
  void restoreState({
    required WorkStatus status,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    DateTime? breakStartTime,
    int workingMinutes = 0,
    int breakMinutes = 0,
    List<Map<String, dynamic>> todayRecords = const [],
  }) {
    state = state.copyWith(
      currentStatus: status,
      checkInTime: checkInTime,
      checkOutTime: checkOutTime,
      breakStartTime: breakStartTime,
      workingMinutes: workingMinutes,
      breakMinutes: breakMinutes,
      todayRecords: todayRecords,
    );
  }
  
  /// 상태를 로컬 스토리지에 저장하기 위한 맵 변환
  Map<String, dynamic> toStorageMap() {
    return {
      'currentStatus': state.currentStatus.name,
      'workingMinutes': state.workingMinutes,
      'breakMinutes': state.breakMinutes,
      'checkInTime': state.checkInTime?.toIso8601String(),
      'checkOutTime': state.checkOutTime?.toIso8601String(),
      'breakStartTime': state.breakStartTime?.toIso8601String(),
      'todayRecords': state.todayRecords,
    };
  }
  
  /// 로컬 스토리지에서 상태 복원
  void fromStorageMap(Map<String, dynamic> map) {
    final statusName = map['currentStatus'] as String? ?? 'notWorking';
    final status = WorkStatus.values.firstWhere(
      (s) => s.name == statusName,
      orElse: () => WorkStatus.notWorking,
    );
    
    state = state.copyWith(
      currentStatus: status,
      workingMinutes: map['workingMinutes'] as int? ?? 0,
      breakMinutes: map['breakMinutes'] as int? ?? 0,
      checkInTime: map['checkInTime'] != null 
          ? DateTime.parse(map['checkInTime']) 
          : null,
      checkOutTime: map['checkOutTime'] != null 
          ? DateTime.parse(map['checkOutTime'])
          : null,
      breakStartTime: map['breakStartTime'] != null
          ? DateTime.parse(map['breakStartTime'])
          : null,
      todayRecords: List<Map<String, dynamic>>.from(
        map['todayRecords'] ?? []
      ),
    );
  }
  
  /// 기록 생성 헬퍼
  Map<String, dynamic> _createRecord(
    String type, 
    DateTime time, 
    String status, {
    Map<String, dynamic>? additionalData
  }) {
    final record = <String, dynamic>{
      'type': type,
      'time': time.toIso8601String(),
      'status': status,
    };
    
    if (additionalData != null) {
      record.addAll(additionalData);
    }
    
    return record;
  }
}

/// Provider 정의
final attendanceStateServiceProvider = 
    StateNotifierProvider<AttendanceStateService, AttendanceStateInfo>((ref) {
  return AttendanceStateService();
});

/// 편의를 위한 계산된 프로바이더들
final currentWorkStatusProvider = Provider<WorkStatus>((ref) {
  return ref.watch(attendanceStateServiceProvider).currentStatus;
});

final isWorkingProvider = Provider<bool>((ref) {
  return ref.watch(attendanceStateServiceProvider).isWorking;
});

final isOnBreakProvider = Provider<bool>((ref) {
  return ref.watch(attendanceStateServiceProvider).isOnBreak;
});

final actualWorkMinutesProvider = Provider<int>((ref) {
  return ref.watch(attendanceStateServiceProvider).actualWorkMinutes;
});

final totalWorkMinutesProvider = Provider<int>((ref) {
  return ref.watch(attendanceStateServiceProvider).totalWorkMinutes;
});

final todayRecordsProvider = Provider<List<Map<String, dynamic>>>((ref) {
  return ref.watch(attendanceStateServiceProvider).todayRecords;
});