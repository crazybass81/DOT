import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'attendance_queue.freezed.dart';

/// Offline attendance queue entity for syncing when network returns
@freezed
class AttendanceQueue extends Equatable with _$AttendanceQueue {
  const factory AttendanceQueue({
    required String id,
    required String userId,
    required DateTime timestamp,
    required AttendanceActionType actionType,
    required String method, // qr, gps, manual
    double? latitude,
    double? longitude,
    String? locationName,
    String? qrCodeData,
    String? notes,
    String? imageUrl,
    @Default(QueueStatus.pending) QueueStatus status,
    DateTime? createdAt,
    int? retryCount,
    String? lastError,
  }) = _AttendanceQueue;

  const AttendanceQueue._();

  @override
  List<Object?> get props => [
        id,
        userId,
        timestamp,
        actionType,
        method,
        latitude,
        longitude,
        locationName,
        qrCodeData,
        notes,
        imageUrl,
        status,
        createdAt,
        retryCount,
        lastError,
      ];
}

enum AttendanceActionType {
  checkIn,
  checkOut,
}

enum QueueStatus {
  pending,
  syncing,
  synced,
  failed,
}

@freezed
class AttendanceVerificationResult extends Equatable with _$AttendanceVerificationResult {
  const factory AttendanceVerificationResult({
    required bool isValid,
    required bool isWithinLocation,
    required bool isWithinTimeWindow,
    String? errorMessage,
    String? locationName,
    double? distance,
    Map<String, dynamic>? qrData,
  }) = _AttendanceVerificationResult;

  const AttendanceVerificationResult._();

  @override
  List<Object?> get props => [
        isValid,
        isWithinLocation,
        isWithinTimeWindow,
        errorMessage,
        locationName,
        distance,
        qrData,
      ];
}
