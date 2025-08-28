import 'package:dartz/dartz.dart';
import '../../../core/errors/failures.dart';
import '../../entities/attendance/attendance.dart';
import '../../repositories/attendance_repository.dart';

class GetAttendanceStatusUseCase {
  final AttendanceRepository repository;

  GetAttendanceStatusUseCase(this.repository);

  Future<Either<Failure, Attendance?>> call() {
    return repository.getAttendanceStatus();
  }
}