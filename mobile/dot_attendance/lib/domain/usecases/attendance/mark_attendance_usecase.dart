import 'package:dartz/dartz.dart';

import '../../core/errors/failures.dart';
import '../../core/usecases/usecase.dart';
import '../../domain/entities/attendance/attendance.dart';
import '../../domain/entities/attendance/attendance_queue.dart';
import '../../domain/repositories/attendance_repository.dart';

class MarkAttendanceUseCase implements UseCase<Attendance, MarkAttendanceParams> {
  final AttendanceRepository repository;

  MarkAttendanceUseCase(this.repository);

  @override
  Future<Either<Failure, Attendance>> call(MarkAttendanceParams params) async {
    return await repository.markAttendance(params);
  }
}

class MarkAttendanceParams {
  final AttendanceActionType actionType;
  final String method;
  final double? latitude;
  final double? longitude;
  final String? locationName;
  final String? qrCodeData;
  final String? notes;
  final String? imageUrl;
  final bool requireBiometric;

  MarkAttendanceParams({
    required this.actionType,
    required this.method,
    this.latitude,
    this.longitude,
    this.locationName,
    this.qrCodeData,
    this.notes,
    this.imageUrl,
    this.requireBiometric = false,
  });
}

class VerifyAttendanceLocationUseCase implements UseCase<AttendanceVerificationResult, VerifyLocationParams> {
  final AttendanceRepository repository;

  VerifyAttendanceLocationUseCase(this.repository);

  @override
  Future<Either<Failure, AttendanceVerificationResult>> call(VerifyLocationParams params) async {
    return await repository.verifyAttendanceLocation(params);
  }
}

class VerifyLocationParams {
  final double latitude;
  final double longitude;
  final String? qrCodeData;
  final AttendanceActionType actionType;

  VerifyLocationParams({
    required this.latitude,
    required this.longitude,
    this.qrCodeData,
    required this.actionType,
  });
}

class QueueOfflineAttendanceUseCase implements UseCase<void, QueueAttendanceParams> {
  final AttendanceRepository repository;

  QueueOfflineAttendanceUseCase(this.repository);

  @override
  Future<Either<Failure, void>> call(QueueAttendanceParams params) async {
    return await repository.queueOfflineAttendance(params);
  }
}

class QueueAttendanceParams {
  final AttendanceQueue attendanceQueue;

  QueueAttendanceParams({
    required this.attendanceQueue,
  });
}

class SyncOfflineAttendanceUseCase implements UseCase<List<AttendanceQueue>, NoParams> {
  final AttendanceRepository repository;

  SyncOfflineAttendanceUseCase(this.repository);

  @override
  Future<Either<Failure, List<AttendanceQueue>>> call(NoParams params) async {
    return await repository.syncOfflineAttendance();
  }
}
