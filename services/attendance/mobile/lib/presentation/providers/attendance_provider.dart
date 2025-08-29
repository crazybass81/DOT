import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:flutter/services.dart';

import '../../core/di/injection_container.dart';
import '../../core/services/attendance_service.dart';
import '../../domain/entities/attendance/attendance.dart';
import '../../domain/entities/attendance/attendance_queue.dart';

part 'attendance_provider.freezed.dart';

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
