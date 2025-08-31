import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:flutter/services.dart';

import '../../core/di/injection_container.dart';
import '../../core/services/attendance_service.dart';
import '../../domain/entities/attendance/attendance.dart';
import '../../domain/entities/attendance/attendance_queue.dart';

part 'attendance_provider.freezed.dart';

enum AttendanceMethod {
  manual,
  qr,
  location,
}

@freezed
class AttendanceState with _$AttendanceState {
  const factory AttendanceState({
    @Default(false) bool isLoading,
    @Default(false) bool isScanning,
    @Default(false) bool isVerifying,
    @Default(false) bool isMarkingAttendance,
    Attendance? todayAttendance,
    AttendanceVerificationResult? verificationResult,
    String? error,
    String? successMessage,
    @Default([]) List<AttendanceQueue> offlineQueue,
    DateTime? lastSyncTime,
    @Default(false) bool isSyncing,
    // PLAN-1: 근무 상태 관리
    @Default('NOT_WORKING') String currentStatus, // NOT_WORKING, WORKING, ON_BREAK
    @Default(0) int workingMinutes,
    @Default(0) int breakMinutes,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    DateTime? breakStartTime,
    @Default([]) List<Map<String, dynamic>> todayRecords,
  }) = _AttendanceState;
}

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final AttendanceService _attendanceService;
  bool _isInitialized = false;

  AttendanceNotifier(this._attendanceService) : super(const AttendanceState());

  /// Initialize attendance provider - must be called after creation
  Future<void> initialize() async {
    if (_isInitialized) return;
    
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      await _attendanceService.initialize();
      await _loadOfflineQueue();
      await _loadLastSyncTime();
      
      // Listen to queue changes
      _attendanceService.queueStream.listen((queue) {
        if (mounted) {
          state = state.copyWith(offlineQueue: queue);
        }
      });
      
      _isInitialized = true;
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Verify attendance requirements
  Future<void> verifyAttendanceRequirements({
    required AttendanceActionType actionType,
    String? qrCodeData,
    bool requireLocation = true,
  }) async {
    state = state.copyWith(isVerifying: true, error: null);

    try {
      final result = await _attendanceService.verifyAttendanceRequirements(
        actionType: actionType,
        qrCodeData: qrCodeData,
        requireLocation: requireLocation,
      );

      state = state.copyWith(
        isVerifying: false,
        verificationResult: result,
        error: result.isValid ? null : result.errorMessage,
      );
    } catch (e) {
      state = state.copyWith(
        isVerifying: false,
        error: e.toString(),
      );
    }
  }

  /// Mark attendance
  Future<bool> markAttendance({
    required AttendanceActionType actionType,
    required String method,
    String? qrCodeData,
    String? notes,
    bool requireBiometric = false,
  }) async {
    state = state.copyWith(isMarkingAttendance: true, error: null);

    try {
      bool success;
      if (requireBiometric) {
        success = await _attendanceService.markAttendanceWithBiometric(
          actionType: actionType,
          method: method,
          qrCodeData: qrCodeData,
          notes: notes,
        );
      } else {
        success = await _attendanceService.markAttendance(
          actionType: actionType,
          method: method,
          qrCodeData: qrCodeData,
          notes: notes,
        );
      }

      if (success) {
        // Haptic feedback
        await HapticFeedback.lightImpact();
        
        final successMsg = actionType == AttendanceActionType.checkIn
            ? 'Checked in successfully!'
            : 'Checked out successfully!';
        
        state = state.copyWith(
          isMarkingAttendance: false,
          successMessage: successMsg,
          verificationResult: null,
        );
        
        // Clear success message after 3 seconds
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted) {
            state = state.copyWith(successMessage: null);
          }
        });
        
        // Reload offline queue
        await _loadOfflineQueue();
      }

      return success;
    } catch (e) {
      // Haptic feedback for error
      await HapticFeedback.heavyImpact();
      
      state = state.copyWith(
        isMarkingAttendance: false,
        error: e.toString(),
      );
      return false;
    }
  }

  /// Start QR scanning
  void startScanning() {
    state = state.copyWith(
      isScanning: true,
      error: null,
      verificationResult: null,
    );
  }

  /// Stop QR scanning
  void stopScanning() {
    state = state.copyWith(isScanning: false);
  }

  /// Process scanned QR code
  Future<void> processScannedQrCode({
    required String qrData,
    required AttendanceActionType actionType,
  }) async {
    try {
      // Haptic feedback
      await HapticFeedback.selectionClick();
      
      // Stop scanning first
      stopScanning();
      
      // Verify the QR code and location
      await verifyAttendanceRequirements(
        actionType: actionType,
        qrCodeData: qrData,
        requireLocation: true,
      );
    } catch (e) {
      state = state.copyWith(
        isScanning: false,
        error: e.toString(),
      );
    }
  }

  /// Force sync offline queue
  Future<void> forceSyncOfflineQueue() async {
    state = state.copyWith(isSyncing: true);
    
    try {
      await _attendanceService.forceSyncNow();
      await _loadOfflineQueue();
      await _loadLastSyncTime();
      
      // Haptic feedback
      await HapticFeedback.lightImpact();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    } finally {
      state = state.copyWith(isSyncing: false);
    }
  }

  /// Clear offline queue
  Future<void> clearOfflineQueue() async {
    try {
      await _attendanceService.clearOfflineQueue();
      state = state.copyWith(offlineQueue: []);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Load offline queue
  Future<void> _loadOfflineQueue() async {
    try {
      final queue = await _attendanceService.getOfflineQueue();
      if (mounted) {
        state = state.copyWith(offlineQueue: queue);
      }
    } catch (e) {
      if (mounted) {
        state = state.copyWith(error: e.toString());
      }
    }
  }

  /// Load last sync time
  Future<void> _loadLastSyncTime() async {
    try {
      final lastSync = await _attendanceService.getLastSyncTime();
      if (mounted) {
        state = state.copyWith(lastSyncTime: lastSync);
      }
    } catch (e) {
      // Ignore error for last sync time
    }
  }

  /// Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }

  /// Clear success message
  void clearSuccessMessage() {
    state = state.copyWith(successMessage: null);
  }

  /// Clear verification result
  void clearVerificationResult() {
    state = state.copyWith(verificationResult: null);
  }

  @override
  void dispose() {
    _attendanceService.dispose();
    super.dispose();
  }
  
  // Quick actions
  Future<void> checkIn() async {
    await markAttendance(
      actionType: AttendanceActionType.checkIn,
      method: 'manual',
    );
  }
  
  Future<void> checkOut() async {
    await markAttendance(
      actionType: AttendanceActionType.checkOut,
      method: 'manual',
    );
  }
  
  // PLAN-1: 자동 출근 처리
  Future<void> autoCheckIn() async {
    if (state.currentStatus != 'NOT_WORKING') {
      return; // 이미 출근한 경우 무시
    }
    
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final now = DateTime.now();
      
      // 출근 처리
      state = state.copyWith(
        currentStatus: 'WORKING',
        checkInTime: now,
        workingMinutes: 0,
        breakMinutes: 0,
        isLoading: false,
        successMessage: '출근 처리되었습니다!',
      );
      
      // 출근 기록 추가
      final record = {
        'type': 'CHECK_IN',
        'time': now.toIso8601String(),
        'status': 'WORKING',
      };
      
      state = state.copyWith(
        todayRecords: [...state.todayRecords, record],
      );
      
      // 백엔드 동기화
      await markAttendance(
        actionType: AttendanceActionType.checkIn,
        method: 'auto',
      );
      
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: '자동 출근 처리 실패: $e',
      );
    }
  }
  
  // PLAN-1: 휴게 시작
  Future<void> startBreak() async {
    if (state.currentStatus != 'WORKING') {
      return; // 근무중이 아니면 무시
    }
    
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final now = DateTime.now();
      
      state = state.copyWith(
        currentStatus: 'ON_BREAK',
        breakStartTime: now,
        isLoading: false,
        successMessage: '휴게를 시작합니다',
      );
      
      // 휴게 기록 추가
      final record = {
        'type': 'BREAK_START',
        'time': now.toIso8601String(),
        'status': 'ON_BREAK',
      };
      
      state = state.copyWith(
        todayRecords: [...state.todayRecords, record],
      );
      
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: '휴게 시작 실패: $e',
      );
    }
  }
  
  // PLAN-1: 휴게 종료
  Future<void> endBreak() async {
    if (state.currentStatus != 'ON_BREAK') {
      return; // 휴게중이 아니면 무시
    }
    
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final now = DateTime.now();
      
      // 휴게 시간 계산
      if (state.breakStartTime != null) {
        final breakDuration = now.difference(state.breakStartTime!).inMinutes;
        state = state.copyWith(
          breakMinutes: state.breakMinutes + breakDuration,
        );
      }
      
      state = state.copyWith(
        currentStatus: 'WORKING',
        breakStartTime: null,
        isLoading: false,
        successMessage: '휴게를 종료하고 근무를 재개합니다',
      );
      
      // 휴게 종료 기록 추가
      final record = {
        'type': 'BREAK_END',
        'time': now.toIso8601String(),
        'status': 'WORKING',
      };
      
      state = state.copyWith(
        todayRecords: [...state.todayRecords, record],
      );
      
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: '휴게 종료 실패: $e',
      );
    }
  }
  
  // PLAN-1: 퇴근 처리
  Future<void> performCheckOut() async {
    if (state.currentStatus == 'NOT_WORKING') {
      return; // 출근하지 않은 경우 무시
    }
    
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      final now = DateTime.now();
      
      // 총 근무 시간 계산
      int totalWorkMinutes = 0;
      if (state.checkInTime != null) {
        totalWorkMinutes = now.difference(state.checkInTime!).inMinutes;
      }
      
      // 실제 근무 시간 = 총 근무 시간 - 휴게 시간
      final actualWorkMinutes = totalWorkMinutes - state.breakMinutes;
      
      state = state.copyWith(
        currentStatus: 'NOT_WORKING',
        checkOutTime: now,
        workingMinutes: actualWorkMinutes,
        isLoading: false,
        successMessage: '퇴근 처리되었습니다. 오늘도 수고하셨습니다!',
      );
      
      // 퇴근 기록 추가
      final record = {
        'type': 'CHECK_OUT',
        'time': now.toIso8601String(),
        'status': 'COMPLETED',
        'totalWorkMinutes': totalWorkMinutes,
        'totalBreakMinutes': state.breakMinutes,
        'actualWorkMinutes': actualWorkMinutes,
      };
      
      state = state.copyWith(
        todayRecords: [...state.todayRecords, record],
      );
      
      // 백엔드 동기화
      await markAttendance(
        actionType: AttendanceActionType.checkOut,
        method: 'manual',
      );
      
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: '퇴근 처리 실패: $e',
      );
    }
  }
  
  // 시간 업데이트 (TimeCounterWidget에서 호출)
  void updateTimeCounters(int workMinutes, int breakMinutes) {
    state = state.copyWith(
      workingMinutes: workMinutes,
      breakMinutes: breakMinutes,
    );
  }
  
  Future<void> refreshAttendance() async {
    await _loadOfflineQueue();
    await syncOfflineQueue();
  }
  
  Future<void> syncOfflineQueue() async {
    // Sync offline queue implementation
    await _loadOfflineQueue();
  }

  // PLAN-1: 근태 이력 조회
  Future<void> loadAttendanceHistory({
    required String filter,
    required DateTime date,
  }) async {
    state = state.copyWith(isLoading: true, error: null);
    
    try {
      // 선택된 필터와 날짜에 따라 데이터 로드
      List<Map<String, dynamic>> records = [];
      
      if (filter == 'daily') {
        // 일별 조회 - 특정 날짜의 기록
        records = await _loadDailyRecords(date);
      } else if (filter == 'weekly') {
        // 주별 조회 - 해당 주의 모든 기록
        records = await _loadWeeklyRecords(date);
      } else if (filter == 'monthly') {
        // 월별 조회 - 해당 월의 모든 기록
        records = await _loadMonthlyRecords(date);
      }
      
      state = state.copyWith(
        todayRecords: records,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load attendance history: ${e.toString()}',
      );
    }
  }

  Future<List<Map<String, dynamic>>> _loadDailyRecords(DateTime date) async {
    // 로컬 스토리지나 API에서 특정 날짜 데이터 로드
    // 현재는 더미 데이터 반환
    if (date.day == DateTime.now().day && 
        date.month == DateTime.now().month &&
        date.year == DateTime.now().year) {
      // 오늘 날짜인 경우 현재 상태 반환
      if (state.checkInTime != null) {
        return [{
          'checkIn': state.checkInTime,
          'checkOut': state.checkOutTime,
          'workMinutes': state.workingMinutes,
          'breakMinutes': state.breakMinutes,
        }];
      }
    }
    return [];
  }

  Future<List<Map<String, dynamic>>> _loadWeeklyRecords(DateTime date) async {
    // 주별 데이터 로드 로직
    List<Map<String, dynamic>> weekRecords = [];
    
    // 주의 시작일 계산 (월요일)
    final weekStart = date.subtract(Duration(days: date.weekday - 1));
    
    // 7일간의 데이터 생성 (더미)
    for (int i = 0; i < 7; i++) {
      final currentDate = weekStart.add(Duration(days: i));
      if (currentDate.isBefore(DateTime.now()) || 
          currentDate.day == DateTime.now().day) {
        // 과거 날짜나 오늘의 경우 더미 데이터 추가
        final records = await _loadDailyRecords(currentDate);
        weekRecords.addAll(records);
      }
    }
    
    return weekRecords;
  }

  Future<List<Map<String, dynamic>>> _loadMonthlyRecords(DateTime date) async {
    // 월별 데이터 로드 로직
    List<Map<String, dynamic>> monthRecords = [];
    
    // 해당 월의 모든 날짜에 대한 데이터 생성 (더미)
    final daysInMonth = DateTime(date.year, date.month + 1, 0).day;
    
    for (int day = 1; day <= daysInMonth; day++) {
      final currentDate = DateTime(date.year, date.month, day);
      if (currentDate.isBefore(DateTime.now()) || 
          currentDate.day == DateTime.now().day) {
        final records = await _loadDailyRecords(currentDate);
        monthRecords.addAll(records);
      }
    }
    
    return monthRecords;
  }
}

// Providers
final attendanceServiceProvider = Provider<AttendanceService>((ref) {
  return getIt<AttendanceService>();
});

final attendanceProvider = StateNotifierProvider<AttendanceNotifier, AttendanceState>((ref) {
  return AttendanceNotifier(ref.read(attendanceServiceProvider));
});

/// Provider for initializing attendance service
final attendanceInitializationProvider = FutureProvider<void>((ref) async {
  final notifier = ref.read(attendanceProvider.notifier);
  await notifier.initialize();
});

// Helper providers
final isAttendanceLoadingProvider = Provider<bool>((ref) {
  final state = ref.watch(attendanceProvider);
  return state.isLoading || state.isVerifying || state.isMarkingAttendance;
});

final isScanningProvider = Provider<bool>((ref) {
  return ref.watch(attendanceProvider).isScanning;
});

final attendanceErrorProvider = Provider<String?>((ref) {
  return ref.watch(attendanceProvider).error;
});

final attendanceSuccessProvider = Provider<String?>((ref) {
  return ref.watch(attendanceProvider).successMessage;
});

final offlineQueueProvider = Provider<List<AttendanceQueue>>((ref) {
  return ref.watch(attendanceProvider).offlineQueue;
});

final hasOfflineQueueProvider = Provider<bool>((ref) {
  return ref.watch(offlineQueueProvider).isNotEmpty;
});

final verificationResultProvider = Provider<AttendanceVerificationResult?>((ref) {
  return ref.watch(attendanceProvider).verificationResult;
});

final lastSyncTimeProvider = Provider<DateTime?>((ref) {
  return ref.watch(attendanceProvider).lastSyncTime;
});

final isSyncingProvider = Provider<bool>((ref) {
  return ref.watch(attendanceProvider).isSyncing;
});

// Additional providers for dashboard
final todayAttendanceProvider = FutureProvider<Attendance?>((ref) async {
  // TODO: Implement actual service call
  await Future.delayed(const Duration(seconds: 1));
  return Attendance(
    id: '1',
    userId: 'user_1',
    date: DateTime.now(),
    checkInTime: DateTime.now().subtract(const Duration(hours: 8)),
    totalWorkingHours: const Duration(hours: 8),
  );
});

final weeklyHoursProvider = FutureProvider<List<WeeklyHours>>((ref) async {
  // TODO: Implement actual service call
  await Future.delayed(const Duration(milliseconds: 500));
  return List.generate(7, (index) => WeeklyHours(
    day: index,
    hours: index < 5 ? 8.0 + (index * 0.5) : 0.0,
    date: DateTime.now().subtract(Duration(days: 6 - index)),
  ));
});

final realTimeAttendanceProvider = FutureProvider<List<Attendance>>((ref) async {
  // TODO: Implement actual service call for admin
  await Future.delayed(const Duration(milliseconds: 800));
  return List.generate(10, (index) => Attendance(
    id: 'att_$index',
    userId: 'user_$index',
    date: DateTime.now().subtract(Duration(days: index % 7)),
    checkInTime: index % 2 == 0 ? DateTime.now().subtract(Duration(hours: index)) : null,
  ));
});

final attendanceOverviewProvider = FutureProvider<AttendanceOverview>((ref) async {
  // TODO: Implement actual service call
  await Future.delayed(const Duration(milliseconds: 600));
  return AttendanceOverview(
    totalEmployees: 50,
    presentEmployees: 42,
    absentEmployees: 5,
    lateEmployees: 3,
    attendanceRate: 84.0,
    dailyData: List.generate(7, (index) => DailyAttendance(
      date: DateTime.now().subtract(Duration(days: 6 - index)),
      presentCount: 40 + index,
      totalCount: 50,
      rate: (40 + index) / 50 * 100,
    )),
  );
});

final attendanceRatesProvider = FutureProvider<AttendanceRates>((ref) async {
  await Future.delayed(const Duration(milliseconds: 400));
  return AttendanceRates(
    todayRate: 85.5,
    weeklyRate: 87.2,
    monthlyRate: 89.1,
  );
});

// Data models for dashboard
class WeeklyHours {
  final int day;
  final double hours;
  final DateTime date;

  WeeklyHours({
    required this.day,
    required this.hours,
    required this.date,
  });
}

class AttendanceOverview {
  final int totalEmployees;
  final int presentEmployees;
  final int absentEmployees;
  final int lateEmployees;
  final double attendanceRate;
  final List<DailyAttendance> dailyData;

  AttendanceOverview({
    required this.totalEmployees,
    required this.presentEmployees,
    required this.absentEmployees,
    required this.lateEmployees,
    required this.attendanceRate,
    required this.dailyData,
  });

  factory AttendanceOverview.empty() {
    return AttendanceOverview(
      totalEmployees: 0,
      presentEmployees: 0,
      absentEmployees: 0,
      lateEmployees: 0,
      attendanceRate: 0.0,
      dailyData: [],
    );
  }
}

class DailyAttendance {
  final DateTime date;
  final int presentCount;
  final int totalCount;
  final double rate;

  DailyAttendance({
    required this.date,
    required this.presentCount,
    required this.totalCount,
    required this.rate,
  });
}

class AttendanceRates {
  final double todayRate;
  final double weeklyRate;
  final double monthlyRate;

  AttendanceRates({
    required this.todayRate,
    required this.weeklyRate,
    required this.monthlyRate,
  });
}
