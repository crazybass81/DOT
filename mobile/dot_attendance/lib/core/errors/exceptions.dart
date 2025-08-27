/// Base exception class for all application exceptions
abstract class AppException implements Exception {
  final String message;
  final int? statusCode;

  const AppException({
    required this.message,
    this.statusCode,
  });

  @override
  String toString() => message;
}

/// Network related exceptions
class NetworkException extends AppException {
  const NetworkException({
    required super.message,
    super.statusCode,
  });
}

class TimeoutException extends AppException {
  const TimeoutException({
    required super.message,
    super.statusCode,
  });
}

class RequestCancelledException extends AppException {
  const RequestCancelledException({
    required super.message,
    super.statusCode,
  });
}

/// HTTP status code exceptions
class BadRequestException extends AppException {
  const BadRequestException({
    required super.message,
    super.statusCode,
  });
}

class UnauthorizedException extends AppException {
  const UnauthorizedException({
    required super.message,
    super.statusCode,
  });
}

class ForbiddenException extends AppException {
  const ForbiddenException({
    required super.message,
    super.statusCode,
  });
}

class NotFoundException extends AppException {
  const NotFoundException({
    required super.message,
    super.statusCode,
  });
}

class ValidationException extends AppException {
  final Map<String, List<String>>? errors;

  const ValidationException({
    required super.message,
    super.statusCode,
    this.errors,
  });
}

class RateLimitException extends AppException {
  const RateLimitException({
    required super.message,
    super.statusCode,
  });
}

class ServerException extends AppException {
  const ServerException({
    required super.message,
    super.statusCode,
  });
}

class UnknownException extends AppException {
  const UnknownException({
    required super.message,
    super.statusCode,
  });
}

/// Storage exceptions
class StorageException extends AppException {
  const StorageException({
    required super.message,
    super.statusCode,
  });
}

class CacheException extends AppException {
  const CacheException({
    required super.message,
    super.statusCode,
  });
}

/// Authentication exceptions
class AuthenticationException extends AppException {
  const AuthenticationException({
    required super.message,
    super.statusCode,
  });
}

class BiometricException extends AppException {
  const BiometricException({
    required super.message,
    super.statusCode,
  });
}

/// Location exceptions
class LocationException extends AppException {
  const LocationException({
    required super.message,
    super.statusCode,
  });
}

class LocationPermissionException extends AppException {
  const LocationPermissionException({
    required super.message,
    super.statusCode,
  });
}

/// Camera exceptions
class CameraException extends AppException {
  const CameraException({
    required super.message,
    super.statusCode,
  });
}

class CameraPermissionException extends AppException {
  const CameraPermissionException({
    required super.message,
    super.statusCode,
  });
}

/// QR Code exceptions
class QrCodeException extends AppException {
  const QrCodeException({
    required super.message,
    super.statusCode,
  });
}

class InvalidQrCodeException extends AppException {
  const InvalidQrCodeException({
    required super.message,
    super.statusCode,
  });
}

/// Attendance exceptions
class AttendanceException extends AppException {
  const AttendanceException({
    required super.message,
    super.statusCode,
  });
}

class OutsideWorkLocationException extends AppException {
  const OutsideWorkLocationException({
    required super.message,
    super.statusCode,
  });
}

class AttendanceAlreadyMarkedException extends AppException {
  const AttendanceAlreadyMarkedException({
    required super.message,
    super.statusCode,
  });
}

/// Notification exceptions
class NotificationException extends AppException {
  const NotificationException({
    required super.message,
    super.statusCode,
  });
}

class NotificationPermissionException extends AppException {
  const NotificationPermissionException({
    required super.message,
    super.statusCode,
  });
}