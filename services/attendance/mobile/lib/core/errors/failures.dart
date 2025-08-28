import 'package:equatable/equatable.dart';

/// Base failure class for error handling in the domain layer
abstract class Failure extends Equatable {
  final String message;
  final int? statusCode;

  const Failure({
    required this.message,
    this.statusCode,
  });

  @override
  List<Object?> get props => [message, statusCode];
}

/// Network related failures
class NetworkFailure extends Failure {
  const NetworkFailure({
    required super.message,
    super.statusCode,
  });
}

class TimeoutFailure extends Failure {
  const TimeoutFailure({
    required super.message,
    super.statusCode,
  });
}

/// Server related failures
class ServerFailure extends Failure {
  const ServerFailure({
    required super.message,
    super.statusCode,
  });
}

/// Authentication failures
class AuthenticationFailure extends Failure {
  const AuthenticationFailure({
    required super.message,
    super.statusCode,
  });
}

class UnauthorizedFailure extends Failure {
  const UnauthorizedFailure({
    required super.message,
    super.statusCode,
  });
}

class BiometricFailure extends Failure {
  const BiometricFailure({
    required super.message,
    super.statusCode,
  });
}

/// Validation failures
class ValidationFailure extends Failure {
  final Map<String, List<String>>? errors;

  const ValidationFailure({
    required super.message,
    super.statusCode,
    this.errors,
  });

  @override
  List<Object?> get props => [message, statusCode, errors];
}

/// Storage failures
class StorageFailure extends Failure {
  const StorageFailure({
    required super.message,
    super.statusCode,
  });
}

class CacheFailure extends Failure {
  const CacheFailure({
    required super.message,
    super.statusCode,
  });
}

/// Location failures
class LocationFailure extends Failure {
  const LocationFailure({
    required super.message,
    super.statusCode,
  });
}

class LocationPermissionFailure extends Failure {
  const LocationPermissionFailure({
    required super.message,
    super.statusCode,
  });
}

/// Camera failures
class CameraFailure extends Failure {
  const CameraFailure({
    required super.message,
    super.statusCode,
  });
}

class CameraPermissionFailure extends Failure {
  const CameraPermissionFailure({
    required super.message,
    super.statusCode,
  });
}

/// QR Code failures
class QrCodeFailure extends Failure {
  const QrCodeFailure({
    required super.message,
    super.statusCode,
  });
}

class InvalidQrCodeFailure extends Failure {
  const InvalidQrCodeFailure({
    required super.message,
    super.statusCode,
  });
}

/// Attendance failures
class AttendanceFailure extends Failure {
  const AttendanceFailure({
    required super.message,
    super.statusCode,
  });
}

class OutsideWorkLocationFailure extends Failure {
  const OutsideWorkLocationFailure({
    required super.message,
    super.statusCode,
  });
}

class AttendanceAlreadyMarkedFailure extends Failure {
  const AttendanceAlreadyMarkedFailure({
    required super.message,
    super.statusCode,
  });
}

/// Notification failures
class NotificationFailure extends Failure {
  const NotificationFailure({
    required super.message,
    super.statusCode,
  });
}

class NotificationPermissionFailure extends Failure {
  const NotificationPermissionFailure({
    required super.message,
    super.statusCode,
  });
}

/// Unknown failures
class UnknownFailure extends Failure {
  const UnknownFailure({
    required super.message,
    super.statusCode,
  });
}