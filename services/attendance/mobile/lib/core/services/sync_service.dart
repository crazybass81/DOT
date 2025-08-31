import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/entities/attendance/attendance_queue.dart';
import '../storage/local_storage_service.dart';

/// PLAN-1 요구사항: 5분 주기 자동 동기화 서비스
class SyncService {
  final LocalStorageService _localStorage;
  Timer? _syncTimer;
  bool _isSyncing = false;
  
  // PLAN-1: 5분(300초) 동기화 간격
  static const Duration syncInterval = Duration(minutes: 5);
  
  SyncService(this._localStorage);

  /// 동기화 서비스 시작
  void startAutoSync({
    required Function() onSync,
    Duration? customInterval,
  }) {
    stopAutoSync(); // 기존 타이머 정리
    
    final interval = customInterval ?? syncInterval;
    debugPrint('Starting auto-sync with interval: ${interval.inMinutes} minutes');
    
    // 즉시 한번 실행
    _performSync(onSync);
    
    // 주기적으로 실행
    _syncTimer = Timer.periodic(interval, (_) {
      _performSync(onSync);
    });
  }

  /// 동기화 실행
  Future<void> _performSync(Function() onSync) async {
    if (_isSyncing) {
      debugPrint('Sync already in progress, skipping...');
      return;
    }
    
    _isSyncing = true;
    debugPrint('Performing sync at ${DateTime.now()}');
    
    try {
      await onSync();
      await _updateLastSyncTime();
      debugPrint('Sync completed successfully');
    } catch (e) {
      debugPrint('Sync failed: $e');
    } finally {
      _isSyncing = false;
    }
  }

  /// 마지막 동기화 시간 업데이트
  Future<void> _updateLastSyncTime() async {
    await _localStorage.saveData(
      'last_sync_time',
      DateTime.now().toIso8601String(),
    );
  }

  /// 마지막 동기화 시간 조회
  Future<DateTime?> getLastSyncTime() async {
    final timeStr = await _localStorage.getData('last_sync_time');
    if (timeStr != null) {
      return DateTime.tryParse(timeStr);
    }
    return null;
  }

  /// 오프라인 큐 저장
  Future<void> saveOfflineQueue(List<AttendanceQueue> queue) async {
    final queueData = queue.map((item) => {
      'id': item.id,
      'userId': item.userId,
      'actionType': item.actionType.toString(),
      'timestamp': item.timestamp.toIso8601String(),
      'method': item.method,
      'latitude': item.latitude,
      'longitude': item.longitude,
      'locationName': item.locationName,
      'qrCodeData': item.qrCodeData,
      'notes': item.notes,
      'imageUrl': item.imageUrl,
      'status': item.status.toString(),
      'retryCount': item.retryCount ?? 0,
      'lastError': item.lastError,
    }).toList();
    
    await _localStorage.saveData('offline_queue', queueData);
  }

  /// 오프라인 큐 로드
  Future<List<AttendanceQueue>> loadOfflineQueue() async {
    final queueData = await _localStorage.getData('offline_queue');
    if (queueData == null) return [];
    
    try {
      final List<dynamic> items = queueData as List<dynamic>;
      return items.map((item) {
        return AttendanceQueue(
          id: item['id'],
          userId: item['userId'],
          actionType: _parseActionType(item['actionType']),
          timestamp: DateTime.parse(item['timestamp']),
          method: item['method'],
          latitude: item['latitude'],
          longitude: item['longitude'],
          locationName: item['locationName'],
          qrCodeData: item['qrCodeData'],
          notes: item['notes'],
          imageUrl: item['imageUrl'],
          status: _parseQueueStatus(item['status']),
          retryCount: item['retryCount'] ?? 0,
          lastError: item['lastError'],
        );
      }).toList();
    } catch (e) {
      debugPrint('Failed to load offline queue: $e');
      return [];
    }
  }

  /// 오프라인 큐 추가
  Future<void> addToOfflineQueue(AttendanceQueue item) async {
    final queue = await loadOfflineQueue();
    queue.add(item);
    await saveOfflineQueue(queue);
  }

  /// 오프라인 큐 제거
  Future<void> removeFromOfflineQueue(String id) async {
    final queue = await loadOfflineQueue();
    queue.removeWhere((item) => item.id == id);
    await saveOfflineQueue(queue);
  }

  /// 오프라인 큐 클리어
  Future<void> clearOfflineQueue() async {
    await _localStorage.removeData('offline_queue');
  }

  /// 동기화 필요 여부 확인
  Future<bool> needsSync() async {
    final queue = await loadOfflineQueue();
    return queue.isNotEmpty;
  }

  /// 동기화 통계 조회
  Future<Map<String, dynamic>> getSyncStats() async {
    final queue = await loadOfflineQueue();
    final lastSync = await getLastSyncTime();
    
    return {
      'pendingItems': queue.length,
      'failedItems': queue.where((item) => item.status == QueueStatus.failed).length,
      'lastSyncTime': lastSync?.toIso8601String(),
      'nextSyncTime': lastSync != null 
          ? lastSync.add(syncInterval).toIso8601String()
          : null,
    };
  }

  /// 동기화 서비스 중지
  void stopAutoSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
    debugPrint('Auto-sync stopped');
  }

  /// 즉시 동기화 실행
  Future<void> syncNow(Function() onSync) async {
    await _performSync(onSync);
  }

  void dispose() {
    stopAutoSync();
  }

  // Helper methods
  AttendanceActionType _parseActionType(String value) {
    switch (value) {
      case 'AttendanceActionType.checkIn':
        return AttendanceActionType.checkIn;
      case 'AttendanceActionType.checkOut':
        return AttendanceActionType.checkOut;
      case 'AttendanceActionType.breakStart':
        return AttendanceActionType.breakStart;
      case 'AttendanceActionType.breakEnd':
        return AttendanceActionType.breakEnd;
      default:
        return AttendanceActionType.checkIn;
    }
  }

  QueueStatus _parseQueueStatus(String value) {
    switch (value) {
      case 'QueueStatus.pending':
        return QueueStatus.pending;
      case 'QueueStatus.syncing':
        return QueueStatus.syncing;
      case 'QueueStatus.synced':
        return QueueStatus.synced;
      case 'QueueStatus.failed':
        return QueueStatus.failed;
      default:
        return QueueStatus.pending;
    }
  }
}