import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';

import '../constants/app_constants.dart';
import '../errors/exceptions.dart';
import '../storage/local_storage_service.dart';
import 'biometric_service.dart';
import 'location_service.dart';
import 'notification_service.dart';
import 'qr_service.dart';
import '../../domain/entities/attendance/attendance.dart';
import '../../domain/entities/attendance/attendance_queue.dart';

class AttendanceService {
  final LocationService _locationService;
  final QrService _qrService;
  final BiometricService _biometricService;
  final NotificationService _notificationService;
  final LocalStorageService _localStorageService;

  static const String _offlineQueueKey = 'offline_attendance_queue';
  static const String _lastSyncKey = 'last_sync_timestamp';
  
  Timer? _syncTimer;
  StreamController<List<AttendanceQueue>>? _queueController;

  AttendanceService(
    this._locationService,
    this._qrService,
    this._biometricService,
    this._notificationService,
    this._localStorageService,
  );

  /// Initialize service and start auto-sync
  Future<void> initialize() async {
    try {
      await _locationService.initialize();
      _startAutoSync();
    } catch (e) {
      debugPrint('Failed to initialize attendance service: $e');
    }
  }

  /// Verify attendance location and requirements
  Future<AttendanceVerificationResult> verifyAttendanceRequirements({
    required AttendanceActionType actionType,
    String? qrCodeData,
    bool requireLocation = true,
  }) async {
    try {
      // Get current location
      Position? currentPosition;
      if (requireLocation) {
        try {
          currentPosition = await _locationService.getCurrentLocation();
        } catch (e) {
          return AttendanceVerificationResult(
            isValid: false,
            isWithinLocation: false,
            isWithinTimeWindow: false,
            errorMessage: 'Unable to get your location. Please enable location services.',
          );
        }
      }

      // Verify QR code if provided
      Map<String, dynamic>? qrData;
      if (qrCodeData != null) {
        if (!_qrService.validateQrCode(qrCodeData)) {
          return AttendanceVerificationResult(
            isValid: false,
            isWithinLocation: false,
            isWithinTimeWindow: false,
            errorMessage: 'Invalid QR code format',
          );
        }

        qrData = _qrService.parseQrCode(qrCodeData);
        if (qrData == null) {
          return AttendanceVerificationResult(
            isValid: false,
            isWithinLocation: false,
            isWithinTimeWindow: false,
            errorMessage: 'Unable to parse QR code data',
          );
        }

        // Check QR code expiry
        if (_qrService.isQrCodeExpired(qrData)) {
          return AttendanceVerificationResult(
            isValid: false,
            isWithinLocation: false,
            isWithinTimeWindow: false,
            errorMessage: 'QR code has expired. Please scan a new code.',
          );
        }
      }

      // Check location if required
      bool isWithinLocation = true;
      double? distance;
      String? locationName;
      
      if (requireLocation && currentPosition != null) {
        // This would typically check against predefined work locations
        // For demo, we'll assume location is valid if GPS is available
        final address = await _locationService.getAddressFromCoordinates(
          currentPosition.latitude,
          currentPosition.longitude,
        );
        locationName = address;
        distance = 0.0; // Would calculate actual distance to work location
        
        // In a real implementation, you would check against configured work locations
        // isWithinLocation = distance <= AppConstants.attendanceRadius;
      }

      // Check time window (e.g., not too early or too late)
      bool isWithinTimeWindow = _isWithinWorkingHours();

      return AttendanceVerificationResult(
        isValid: isWithinLocation && isWithinTimeWindow,
        isWithinLocation: isWithinLocation,
        isWithinTimeWindow: isWithinTimeWindow,
        locationName: locationName,
        distance: distance,
        qrData: qrData,
      );
    } catch (e) {
      debugPrint('Attendance verification failed: $e');
      return AttendanceVerificationResult(
        isValid: false,
        isWithinLocation: false,
        isWithinTimeWindow: false,
        errorMessage: 'Verification failed: ${e.toString()}',
      );
    }
  }

  /// Mark attendance with biometric verification
  Future<bool> markAttendanceWithBiometric({
    required AttendanceActionType actionType,
    required String method,
    String? qrCodeData,
    String? notes,
  }) async {
    try {
      // Verify biometric first
      final biometricReason = actionType == AttendanceActionType.checkIn
          ? 'Verify your identity to check in'
          : 'Verify your identity to check out';
      
      final isAuthenticated = await _biometricService.authenticateWithBiometrics(
        reason: biometricReason,
        biometricOnly: false,
      );

      if (!isAuthenticated) {
        throw const BiometricException(
          message: 'Biometric authentication failed',
        );
      }

      // Proceed with attendance marking
      return await markAttendance(
        actionType: actionType,
        method: method,
        qrCodeData: qrCodeData,
        notes: notes,
      );
    } catch (e) {
      debugPrint('Biometric attendance failed: $e');
      throw AttendanceException(
        message: 'Biometric verification failed: ${e.toString()}',
      );
    }
  }

  /// Mark attendance (online or queue offline)
  Future<bool> markAttendance({
    required AttendanceActionType actionType,
    required String method,
    String? qrCodeData,
    String? notes,
  }) async {
    try {
      // Get current location
      Position? currentPosition;
      try {
        currentPosition = await _locationService.getCurrentLocation();
      } catch (e) {
        debugPrint('Location unavailable, proceeding without: $e');
      }

      // Create attendance queue entry
      final queueEntry = AttendanceQueue(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        userId: 'current_user_id', // Get from auth state
        timestamp: DateTime.now(),
        actionType: actionType,
        method: method,
        latitude: currentPosition?.latitude,
        longitude: currentPosition?.longitude,
        locationName: currentPosition != null
            ? await _locationService.getAddressFromCoordinates(
                currentPosition.latitude,
                currentPosition.longitude,
              )
            : null,
        qrCodeData: qrCodeData,
        notes: notes,
        createdAt: DateTime.now(),
        retryCount: 0,
      );

      // Try to sync immediately if online, otherwise queue
      final success = await _syncAttendanceEntry(queueEntry);
      
      if (!success) {
        // Queue for later sync
        await _queueOfflineAttendance(queueEntry);
        
        // Show notification
        await NotificationService.showNotification(
          title: 'Attendance Queued',
          body: 'Your attendance will be synced when connection is restored.',
        );
      } else {
        // Success feedback
        await _showSuccessFeedback(actionType);
      }

      return true;
    } catch (e) {
      debugPrint('Mark attendance failed: $e');
      throw AttendanceException(
        message: 'Failed to mark attendance: ${e.toString()}',
      );
    }
  }

  /// Queue attendance for offline sync
  Future<void> _queueOfflineAttendance(AttendanceQueue entry) async {
    try {
      final existingQueue = await getOfflineQueue();
      existingQueue.add(entry);
      
      final queueJson = existingQueue.map((e) => {
        'id': e.id,
        'userId': e.userId,
        'timestamp': e.timestamp.toIso8601String(),
        'actionType': e.actionType.toString(),
        'method': e.method,
        'latitude': e.latitude,
        'longitude': e.longitude,
        'locationName': e.locationName,
        'qrCodeData': e.qrCodeData,
        'notes': e.notes,
        'status': e.status.toString(),
        'createdAt': e.createdAt?.toIso8601String(),
        'retryCount': e.retryCount,
        'lastError': e.lastError,
      }).toList();

      await _localStorageService.setString(
        _offlineQueueKey,
        json.encode(queueJson),
      );

      // Notify listeners
      _queueController?.add(existingQueue);
    } catch (e) {
      debugPrint('Failed to queue offline attendance: $e');
      throw StorageException(
        message: 'Failed to save attendance offline: ${e.toString()}',
      );
    }
  }

  /// Get offline attendance queue
  Future<List<AttendanceQueue>> getOfflineQueue() async {
    try {
      final queueString = await _localStorageService.getString(_offlineQueueKey);
      if (queueString == null) return [];

      final queueJson = json.decode(queueString) as List;
      return queueJson.map((item) {
        final data = item as Map<String, dynamic>;
        return AttendanceQueue(
          id: data['id'] as String,
          userId: data['userId'] as String,
          timestamp: DateTime.parse(data['timestamp'] as String),
          actionType: AttendanceActionType.values.firstWhere(
            (e) => e.toString() == data['actionType'],
          ),
          method: data['method'] as String,
          latitude: data['latitude'] as double?,
          longitude: data['longitude'] as double?,
          locationName: data['locationName'] as String?,
          qrCodeData: data['qrCodeData'] as String?,
          notes: data['notes'] as String?,
          status: QueueStatus.values.firstWhere(
            (e) => e.toString() == data['status'],
            orElse: () => QueueStatus.pending,
          ),
          createdAt: data['createdAt'] != null
              ? DateTime.parse(data['createdAt'] as String)
              : null,
          retryCount: data['retryCount'] as int? ?? 0,
          lastError: data['lastError'] as String?,
        );
      }).toList();
    } catch (e) {
      debugPrint('Failed to get offline queue: $e');
      return [];
    }
  }

  /// Sync single attendance entry
  Future<bool> _syncAttendanceEntry(AttendanceQueue entry) async {
    try {
      // This would make actual API call to sync attendance
      // For demo, we'll simulate network call
      await Future.delayed(const Duration(seconds: 1));
      
      // Simulate success/failure based on network availability
      // In real implementation, you'd make actual HTTP request
      return true;
    } catch (e) {
      debugPrint('Failed to sync attendance entry: $e');
      return false;
    }
  }

  /// Start automatic sync timer
  void _startAutoSync() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      _syncOfflineQueue();
    });
  }

  /// Sync offline attendance queue
  Future<void> _syncOfflineQueue() async {
    try {
      final queue = await getOfflineQueue();
      if (queue.isEmpty) return;

      final pendingItems = queue.where((item) => 
        item.status == QueueStatus.pending || 
        item.status == QueueStatus.failed
      ).toList();

      for (final item in pendingItems) {
        final success = await _syncAttendanceEntry(item);
        if (success) {
          // Update status to synced
          final updatedQueue = queue.map((queueItem) {
            if (queueItem.id == item.id) {
              return queueItem.copyWith(status: QueueStatus.synced);
            }
            return queueItem;
          }).toList();
          
          // Save updated queue
          await _saveQueue(updatedQueue);
        } else {
          // Update retry count and error status
          final updatedQueue = queue.map((queueItem) {
            if (queueItem.id == item.id) {
              return queueItem.copyWith(
                status: QueueStatus.failed,
                retryCount: (queueItem.retryCount ?? 0) + 1,
                lastError: 'Sync failed at ${DateTime.now()}',
              );
            }
            return queueItem;
          }).toList();
          
          await _saveQueue(updatedQueue);
        }
      }

      // Clean up old synced items (older than 7 days)
      final cleanQueue = queue.where((item) {
        if (item.status == QueueStatus.synced) {
          final daysSinceSync = DateTime.now().difference(
            item.createdAt ?? item.timestamp
          ).inDays;
          return daysSinceSync < 7;
        }
        return true;
      }).toList();

      await _saveQueue(cleanQueue);
      
      // Update last sync timestamp
      await _localStorageService.setString(
        _lastSyncKey,
        DateTime.now().toIso8601String(),
      );
    } catch (e) {
      debugPrint('Failed to sync offline queue: $e');
    }
  }

  /// Save queue to storage
  Future<void> _saveQueue(List<AttendanceQueue> queue) async {
    final queueJson = queue.map((e) => {
      'id': e.id,
      'userId': e.userId,
      'timestamp': e.timestamp.toIso8601String(),
      'actionType': e.actionType.toString(),
      'method': e.method,
      'latitude': e.latitude,
      'longitude': e.longitude,
      'locationName': e.locationName,
      'qrCodeData': e.qrCodeData,
      'notes': e.notes,
      'status': e.status.toString(),
      'createdAt': e.createdAt?.toIso8601String(),
      'retryCount': e.retryCount,
      'lastError': e.lastError,
    }).toList();

    await _localStorageService.setString(
      _offlineQueueKey,
      json.encode(queueJson),
    );

    _queueController?.add(queue);
  }

  /// Get queue stream for listening to changes
  Stream<List<AttendanceQueue>> get queueStream {
    _queueController ??= StreamController<List<AttendanceQueue>>.broadcast();
    return _queueController!.stream;
  }

  /// Show success feedback
  Future<void> _showSuccessFeedback(AttendanceActionType actionType) async {
    try {
      // Haptic feedback
      await HapticFeedback.lightImpact();
      
      // Show notification
      final title = actionType == AttendanceActionType.checkIn
          ? 'Checked In Successfully'
          : 'Checked Out Successfully';
      
      await NotificationService.showNotification(
        title: title,
        body: 'Your attendance has been recorded.',
      );
    } catch (e) {
      debugPrint('Failed to show success feedback: $e');
    }
  }

  /// Check if current time is within working hours
  bool _isWithinWorkingHours() {
    final now = DateTime.now();
    final hour = now.hour;
    
    // Basic working hours check (6 AM to 10 PM)
    // In real app, this would be configurable per user/organization
    return hour >= 6 && hour <= 22;
  }

  /// Force sync now
  Future<void> forceSyncNow() async {
    await _syncOfflineQueue();
  }

  /// Clear offline queue
  Future<void> clearOfflineQueue() async {
    await _localStorageService.remove(_offlineQueueKey);
    _queueController?.add([]);
  }

  /// Get last sync time
  Future<DateTime?> getLastSyncTime() async {
    final lastSyncString = await _localStorageService.getString(_lastSyncKey);
    if (lastSyncString != null) {
      return DateTime.parse(lastSyncString);
    }
    return null;
  }

  /// Dispose resources
  void dispose() {
    _syncTimer?.cancel();
    _queueController?.close();
    _locationService.dispose();
  }
}
