import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'attendance.freezed.dart';

@freezed
class Attendance extends Equatable with _$Attendance {
  const factory Attendance({
    required String id,
    required String userId,
    required DateTime date,
    DateTime? checkInTime,
    DateTime? checkOutTime,
    String? checkInLocation,
    String? checkOutLocation,
    double? checkInLatitude,
    double? checkInLongitude,
    double? checkOutLatitude,
    double? checkOutLongitude,
    String? checkInMethod, // manual, qr, location
    String? checkOutMethod,
    String? checkInNotes,
    String? checkOutNotes,
    String? checkInImageUrl,
    String? checkOutImageUrl,
    @Default(AttendanceStatus.absent) AttendanceStatus status,
    Duration? totalWorkingHours,
    Duration? breakDuration,
    @Default(false) bool isLateCheckIn,
    @Default(false) bool isEarlyCheckOut,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Attendance;

  const Attendance._();

  bool get isCheckedIn => checkInTime != null;
  bool get isCheckedOut => checkOutTime != null;
  bool get isCompleted => isCheckedIn && isCheckedOut;

  Duration? get workingHours {
    if (checkInTime != null && checkOutTime != null) {
      return checkOutTime!.difference(checkInTime!);
    }
    return null;
  }

  String get statusDisplayName {
    switch (status) {
      case AttendanceStatus.present:
        return 'Present';
      case AttendanceStatus.absent:
        return 'Absent';
      case AttendanceStatus.late:
        return 'Late';
      case AttendanceStatus.halfDay:
        return 'Half Day';
      case AttendanceStatus.leave:
        return 'On Leave';
      case AttendanceStatus.holiday:
        return 'Holiday';
      case AttendanceStatus.weekend:
        return 'Weekend';
    }
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        date,
        checkInTime,
        checkOutTime,
        checkInLocation,
        checkOutLocation,
        checkInLatitude,
        checkInLongitude,
        checkOutLatitude,
        checkOutLongitude,
        checkInMethod,
        checkOutMethod,
        checkInNotes,
        checkOutNotes,
        checkInImageUrl,
        checkOutImageUrl,
        status,
        totalWorkingHours,
        breakDuration,
        isLateCheckIn,
        isEarlyCheckOut,
        createdAt,
        updatedAt,
      ];
}

enum AttendanceStatus {
  present,
  absent,
  late,
  halfDay,
  leave,
  holiday,
  weekend,
}

@freezed
class AttendanceStats extends Equatable with _$AttendanceStats {
  const factory AttendanceStats({
    required int totalWorkingDays,
    required int presentDays,
    required int absentDays,
    required int lateDays,
    required int halfDays,
    required int leaveDays,
    required Duration totalWorkingHours,
    required double attendancePercentage,
    DateTime? periodStart,
    DateTime? periodEnd,
  }) = _AttendanceStats;

  const AttendanceStats._();

  @override
  List<Object?> get props => [
        totalWorkingDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        leaveDays,
        totalWorkingHours,
        attendancePercentage,
        periodStart,
        periodEnd,
      ];
}

@freezed
class AttendanceLocation extends Equatable with _$AttendanceLocation {
  const factory AttendanceLocation({
    required String id,
    required String name,
    required String address,
    required double latitude,
    required double longitude,
    required double radius,
    @Default(true) bool isActive,
    String? description,
    String? contactNumber,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _AttendanceLocation;

  const AttendanceLocation._();

  @override
  List<Object?> get props => [
        id,
        name,
        address,
        latitude,
        longitude,
        radius,
        isActive,
        description,
        contactNumber,
        createdAt,
        updatedAt,
      ];
}