// 출근 오프라인 동기화 서비스
// AttendanceProvider에서 분리된 동기화 전용 서비스

import 'dart:async';
import 'dart:convert';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/entities/attendance/attendance_queue.dart';

part 'attendance_sync_service.freezed.dart';

/// 동기화 상태
@freezed
class SyncState with _$SyncState {
  const factory SyncState({
    @Default(false) bool isSyncing,
    @Default([]) List<AttendanceQueue> offlineQueue,
    DateTime? lastSyncTime,
    String? errorMessage,
    @Default(0) int syncAttempts,
    @Default(0) int successfulSyncs,
    @Default(0) int failedSyncs,
  }) = _SyncState;
}

/// 출근 오프라인 동기화 서비스
class AttendanceSyncService extends StateNotifier<SyncState> {
  static const String _queueKey = 'attendance_offline_queue';
  static const String _lastSyncKey = 'attendance_last_sync';
  
  Timer? _periodicSyncTimer;
  StreamController<List<AttendanceQueue>>? _queueStreamController;
  
  AttendanceSyncService() : super(const SyncState()) {
    _initializeService();
  }
  
  /// 서비스 초기화
  Future<void> _initializeService() async {
    await _loadOfflineQueue();
    await _loadLastSyncTime();
    _startPeriodicSync();
  }
  
  /// 큐 스트림 생성
  Stream<List<AttendanceQueue>> get queueStream {
    _queueStreamController ??= StreamController<List<AttendanceQueue>>.broadcast();
    return _queueStreamController!.stream;
  }
  
  /// 오프라인 큐에 항목 추가
  Future<void> addToQueue(AttendanceQueue item) async {
    final updatedQueue = [...state.offlineQueue, item];
    
    state = state.copyWith(offlineQueue: updatedQueue);
    
    await _saveOfflineQueue();
    _queueStreamController?.add(updatedQueue);
    
    // 즉시 동기화 시도
    _attemptSync();
  }
  
  /// 오프라인 큐에서 항목 제거
  Future<void> removeFromQueue(String itemId) async {
    final updatedQueue = state.offlineQueue
        .where((item) => item.id != itemId)
        .toList();
    
    state = state.copyWith(offlineQueue: updatedQueue);
    
    await _saveOfflineQueue();
    _queueStreamController?.add(updatedQueue);
  }
  
  /// 큐 항목 상태 업데이트
  Future<void> updateQueueItemStatus(
    String itemId, 
    QueueItemStatus status,
    {String? errorMessage}
  ) async {
    final updatedQueue = state.offlineQueue.map((item) {
      if (item.id == itemId) {
        return item.copyWith(
          status: status,
          lastAttempt: DateTime.now(),
          errorMessage: errorMessage,
          retryCount: status == QueueItemStatus.failed 
              ? item.retryCount + 1 
              : item.retryCount,
        );
      }
      return item;
    }).toList();
    
    state = state.copyWith(offlineQueue: updatedQueue);
    await _saveOfflineQueue();
    _queueStreamController?.add(updatedQueue);
  }
  
  /// 주기적 동기화 시작
  void _startPeriodicSync() {
    _periodicSyncTimer?.cancel();
    _periodicSyncTimer = Timer.periodic(
      const Duration(minutes: 5), // 5분마다 동기화 시도
      (_) => _attemptSync(),
    );
  }
  
  /// 동기화 시도
  Future<void> _attemptSync() async {
    if (state.isSyncing || state.offlineQueue.isEmpty) {
      return;
    }
    
    state = state.copyWith(
      isSyncing: true,
      errorMessage: null,
      syncAttempts: state.syncAttempts + 1,
    );
    
    try {
      int successCount = 0;
      int failCount = 0;
      
      // 대기 중인 항목들만 동기화
      final pendingItems = state.offlineQueue
          .where((item) => item.status == QueueItemStatus.pending)
          .toList();
      
      for (final item in pendingItems) {
        try {
          await _syncQueueItem(item);
          await removeFromQueue(item.id);
          successCount++;
        } catch (e) {
          await updateQueueItemStatus(
            item.id,
            QueueItemStatus.failed,
            errorMessage: e.toString(),
          );
          failCount++;
        }
      }
      
      // 성공한 경우 햅틱 피드백
      if (successCount > 0) {
        await HapticFeedback.lightImpact();
      }
      
      state = state.copyWith(
        isSyncing: false,
        lastSyncTime: DateTime.now(),
        successfulSyncs: state.successfulSyncs + successCount,
        failedSyncs: state.failedSyncs + failCount,
      );
      
      await _saveLastSyncTime();
      
    } catch (e) {
      state = state.copyWith(
        isSyncing: false,
        errorMessage: '동기화 중 오류: $e',
      );
    }
  }
  
  /// 개별 큐 항목 동기화
  Future<void> _syncQueueItem(AttendanceQueue item) async {
    // 항목 상태를 동기화 중으로 업데이트
    await updateQueueItemStatus(item.id, QueueItemStatus.syncing);
    
    // 실제 API 호출 (여기서는 모의 구현)
    await Future.delayed(const Duration(seconds: 1));
    
    // API 호출 시뮬레이션 (실제로는 HTTP 요청)
    final success = await _callAttendanceApi(item);
    
    if (!success) {
      throw Exception('API 호출 실패');
    }
  }
  
  /// 출근 API 호출 (모의 구현)
  Future<bool> _callAttendanceApi(AttendanceQueue item) async {
    // 실제 구현에서는 HTTP 클라이언트 사용
    // 여기서는 90% 성공률로 시뮬레이션
    await Future.delayed(const Duration(milliseconds: 500));
    return DateTime.now().millisecond % 10 != 0;
  }
  
  /// 수동 동기화 강제 실행
  Future<void> forceSyncNow() async {
    await _attemptSync();
  }
  
  /// 오프라인 큐 전체 초기화
  Future<void> clearOfflineQueue() async {
    state = state.copyWith(offlineQueue: []);
    await _saveOfflineQueue();
    _queueStreamController?.add([]);
  }
  
  /// 오프라인 큐 로드
  Future<void> _loadOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = prefs.getString(_queueKey);
      
      if (queueJson != null) {
        final List<dynamic> queueList = jsonDecode(queueJson);
        final queue = queueList
            .map((item) => AttendanceQueue.fromJson(item))
            .toList();
        
        state = state.copyWith(offlineQueue: queue);
        _queueStreamController?.add(queue);
      }
    } catch (e) {
      print('오프라인 큐 로드 실패: $e');
    }
  }
  
  /// 오프라인 큐 저장
  Future<void> _saveOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = jsonEncode(
        state.offlineQueue.map((item) => item.toJson()).toList()
      );
      await prefs.setString(_queueKey, queueJson);
    } catch (e) {
      print('오프라인 큐 저장 실패: $e');
    }
  }
  
  /// 마지막 동기화 시간 로드
  Future<void> _loadLastSyncTime() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastSyncString = prefs.getString(_lastSyncKey);
      
      if (lastSyncString != null) {
        final lastSync = DateTime.parse(lastSyncString);
        state = state.copyWith(lastSyncTime: lastSync);
      }
    } catch (e) {
      print('마지막 동기화 시간 로드 실패: $e');
    }
  }
  
  /// 마지막 동기화 시간 저장
  Future<void> _saveLastSyncTime() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (state.lastSyncTime != null) {
        await prefs.setString(_lastSyncKey, state.lastSyncTime!.toIso8601String());
      }
    } catch (e) {
      print('마지막 동기화 시간 저장 실패: $e');
    }
  }
  
  /// 동기화 통계 초기화
  void resetSyncStats() {
    state = state.copyWith(
      syncAttempts: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
    );
  }
  
  /// 에러 메시지 초기화
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
  
  /// 서비스 종료
  @override
  void dispose() {
    _periodicSyncTimer?.cancel();
    _queueStreamController?.close();
    super.dispose();
  }
}

/// 큐 항목 상태 열거형 (호환성을 위해 별도 정의)
enum QueueItemStatus {
  pending,
  syncing,
  completed,
  failed,
}

/// Provider 정의
final attendanceSyncServiceProvider = 
    StateNotifierProvider<AttendanceSyncService, SyncState>((ref) {
  return AttendanceSyncService();
});

/// 편의를 위한 계산된 프로바이더들
final isSyncingProvider = Provider<bool>((ref) {
  return ref.watch(attendanceSyncServiceProvider).isSyncing;
});

final offlineQueueProvider = Provider<List<AttendanceQueue>>((ref) {
  return ref.watch(attendanceSyncServiceProvider).offlineQueue;
});

final hasOfflineQueueProvider = Provider<bool>((ref) {
  return ref.watch(offlineQueueProvider).isNotEmpty;
});

final lastSyncTimeProvider = Provider<DateTime?>((ref) {
  return ref.watch(attendanceSyncServiceProvider).lastSyncTime;
});

final syncStatsProvider = Provider<Map<String, int>>((ref) {
  final state = ref.watch(attendanceSyncServiceProvider);
  return {
    'attempts': state.syncAttempts,
    'successful': state.successfulSyncs,
    'failed': state.failedSyncs,
  };
});

final syncErrorProvider = Provider<String?>((ref) {
  return ref.watch(attendanceSyncServiceProvider).errorMessage;
});