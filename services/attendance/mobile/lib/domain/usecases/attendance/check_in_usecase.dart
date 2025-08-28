import 'package:dartz/dartz.dart';
import '../../../core/errors/failures.dart';
import '../../entities/attendance/attendance.dart';
import '../../repositories/attendance_repository.dart';

class CheckInUseCase {
  final AttendanceRepository repository;

  CheckInUseCase(this.repository);

  Future<Either<Failure, Attendance>> call(double latitude, double longitude) {
    return repository.checkIn(latitude, longitude);
  }
}