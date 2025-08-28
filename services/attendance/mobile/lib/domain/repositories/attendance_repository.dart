import 'package:dartz/dartz.dart';
import '../../core/errors/failures.dart';
import '../entities/attendance/attendance.dart';

abstract class AttendanceRepository {
  Future<Either<Failure, Attendance>> checkIn(double latitude, double longitude);
  Future<Either<Failure, Attendance>> checkOut(double latitude, double longitude);
  Future<Either<Failure, List<Attendance>>> getAttendanceHistory(DateTime from, DateTime to);
  Future<Either<Failure, Attendance?>> getAttendanceStatus();
}