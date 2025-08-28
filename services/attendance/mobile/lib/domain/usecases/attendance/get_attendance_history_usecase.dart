import 'package:dartz/dartz.dart';
import '../../../core/errors/failures.dart';
import '../../entities/attendance/attendance.dart';
import '../../repositories/attendance_repository.dart';

class GetAttendanceHistoryUseCase {
  final AttendanceRepository repository;

  GetAttendanceHistoryUseCase(this.repository);

  Future<Either<Failure, List<Attendance>>> call(DateTime from, DateTime to) {
    return repository.getAttendanceHistory(from, to);
  }
}