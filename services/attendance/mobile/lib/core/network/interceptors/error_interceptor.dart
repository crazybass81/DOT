import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../constants/app_constants.dart';
import '../../errors/exceptions.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    debugPrint('DioError: ${err.toString()}');
    
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        throw TimeoutException(
          message: ErrorMessages.timeoutError,
          statusCode: err.response?.statusCode,
        );
        
      case DioExceptionType.badResponse:
        _handleResponseError(err);
        break;
        
      case DioExceptionType.cancel:
        throw RequestCancelledException(
          message: 'Request was cancelled',
          statusCode: err.response?.statusCode,
        );
        
      case DioExceptionType.connectionError:
      case DioExceptionType.unknown:
        if (err.message?.contains('SocketException') == true ||
            err.message?.contains('HandshakeException') == true) {
          throw NetworkException(
            message: ErrorMessages.networkError,
            statusCode: err.response?.statusCode,
          );
        }
        throw UnknownException(
          message: ErrorMessages.unknownError,
          statusCode: err.response?.statusCode,
        );
        
      default:
        throw UnknownException(
          message: ErrorMessages.unknownError,
          statusCode: err.response?.statusCode,
        );
    }
  }

  void _handleResponseError(DioException err) {
    final statusCode = err.response?.statusCode;
    final data = err.response?.data;
    
    String message = ErrorMessages.serverError;
    
    // Try to extract error message from response
    if (data is Map<String, dynamic>) {
      message = _extractErrorMessage(data);
    }

    switch (statusCode) {
      case 400:
        throw BadRequestException(
          message: message.isEmpty ? 'Bad request' : message,
          statusCode: statusCode,
        );
        
      case 401:
        throw UnauthorizedException(
          message: ErrorMessages.unauthorizedError,
          statusCode: statusCode,
        );
        
      case 403:
        throw ForbiddenException(
          message: 'Access forbidden',
          statusCode: statusCode,
        );
        
      case 404:
        throw NotFoundException(
          message: 'Resource not found',
          statusCode: statusCode,
        );
        
      case 422:
        throw ValidationException(
          message: message.isEmpty ? ErrorMessages.validationError : message,
          statusCode: statusCode,
          errors: _extractValidationErrors(data),
        );
        
      case 429:
        throw RateLimitException(
          message: 'Too many requests. Please try again later.',
          statusCode: statusCode,
        );
        
      case 500:
      case 502:
      case 503:
      case 504:
        throw ServerException(
          message: ErrorMessages.serverError,
          statusCode: statusCode,
        );
        
      default:
        throw UnknownException(
          message: message.isEmpty ? ErrorMessages.unknownError : message,
          statusCode: statusCode,
        );
    }
  }

  String _extractErrorMessage(Map<String, dynamic> data) {
    // Common error message fields
    const messageFields = [
      'message',
      'error',
      'detail',
      'error_description',
    ];
    
    for (final field in messageFields) {
      final value = data[field];
      if (value is String && value.isNotEmpty) {
        return value;
      }
    }
    
    // Check for nested error structures
    if (data['errors'] is Map) {
      final errors = data['errors'] as Map<String, dynamic>;
      final firstError = errors.values.first;
      if (firstError is String) {
        return firstError;
      }
      if (firstError is List && firstError.isNotEmpty) {
        return firstError.first.toString();
      }
    }
    
    return '';
  }

  Map<String, List<String>>? _extractValidationErrors(dynamic data) {
    if (data is! Map<String, dynamic>) return null;
    
    final errorsData = data['errors'];
    if (errorsData is! Map<String, dynamic>) return null;
    
    final Map<String, List<String>> validationErrors = {};
    
    errorsData.forEach((field, messages) {
      if (messages is List) {
        validationErrors[field] = messages
            .map((message) => message.toString())
            .toList();
      } else if (messages is String) {
        validationErrors[field] = [messages];
      }
    });
    
    return validationErrors.isEmpty ? null : validationErrors;
  }
}