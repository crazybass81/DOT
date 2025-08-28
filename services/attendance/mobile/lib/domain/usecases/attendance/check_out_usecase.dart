import 'package:dartz/dartz.dart';
import '../../../core/errors/failures.dart';
import '../../entities/attendance/attendance.dart';
import '../../repositories/attendance_repository.dart';

class CheckOutUseCase {
  final AttendanceRepository repository;

  CheckOutUseCase(this.repository);

  Future<Either<Failure, Attendance>> call(double latitude, double longitude) {
    return repository.checkOut(latitude, longitude);
  }
}