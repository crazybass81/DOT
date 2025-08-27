import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';
import 'dart:math';
import '../config/firebase_config.dart';

/// Interceptor that handles automatic retries with exponential backoff
class RetryInterceptor extends Interceptor {
  static const int defaultMaxRetries = 3;
  static const Duration defaultBaseDelay = Duration(milliseconds: 500);
  static const Duration defaultMaxDelay = Duration(seconds: 30);
  static const double defaultMultiplier = 2.0;
  static const double defaultJitterFactor = 0.1;

  final int maxRetries;
  final Duration baseDelay;
  final Duration maxDelay;
  final double multiplier;
  final double jitterFactor;
  final List<int> retryableStatusCodes;
  final List<DioExceptionType> retryableExceptionTypes;
  final bool Function(DioException)? shouldRetry;

  RetryInterceptor({
    this.maxRetries = defaultMaxRetries,
    this.baseDelay = defaultBaseDelay,
    this.maxDelay = defaultMaxDelay,
    this.multiplier = defaultMultiplier,
    this.jitterFactor = defaultJitterFactor,
    this.retryableStatusCodes = const [408, 429, 500, 502, 503, 504],
    this.retryableExceptionTypes = const [
      DioExceptionType.connectionTimeout,
      DioExceptionType.sendTimeout,
      DioExceptionType.receiveTimeout,
      DioExceptionType.connectionError,
    ],
    this.shouldRetry,
  });

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final requestOptions = err.requestOptions;
    final retryAttempts = _getRetryAttempts(requestOptions);

    if (retryAttempts >= maxRetries) {
      // Max retries reached, pass the error through
      await _logRetryFailure(err, retryAttempts);
      handler.next(err);
      return;
    }

    if (!_shouldRetryRequest(err)) {
      // Not a retryable error, pass through immediately
      handler.next(err);
      return;
    }

    // Calculate delay with exponential backoff and jitter
    final delay = _calculateDelay(retryAttempts);
    
    await _logRetryAttempt(err, retryAttempts + 1, delay);

    // Wait for the calculated delay
    await Future.delayed(delay);

    // Increment retry counter
    _setRetryAttempts(requestOptions, retryAttempts + 1);

    try {
      // Retry the request
      final response = await Dio().fetch(requestOptions);
      await _logRetrySuccess(err, retryAttempts + 1);
      handler.resolve(response);
    } catch (e) {
      // Retry failed, let the error propagate back to this interceptor
      if (e is DioException) {
        onError(e, handler);
      } else {
        handler.next(err);
      }
    }
  }

  /// Determines if a request should be retried based on the error
  bool _shouldRetryRequest(DioException error) {
    // Use custom retry logic if provided
    if (shouldRetry != null) {
      return shouldRetry!(error);
    }

    // Check if the exception type is retryable
    if (retryableExceptionTypes.contains(error.type)) {
      return true;
    }

    // Check if the status code is retryable
    if (error.response?.statusCode != null) {
      return retryableStatusCodes.contains(error.response!.statusCode);
    }

    return false;
  }

  /// Calculates the delay for the next retry attempt using exponential backoff with jitter
  Duration _calculateDelay(int attemptNumber) {
    // Base exponential backoff: baseDelay * (multiplier ^ attemptNumber)
    final exponentialDelay = baseDelay.inMilliseconds * pow(multiplier, attemptNumber);
    
    // Add jitter to avoid thundering herd problem
    final jitter = exponentialDelay * jitterFactor * (Random().nextDouble() - 0.5) * 2;
    
    final totalDelayMs = (exponentialDelay + jitter).round();
    
    // Cap the delay at maxDelay
    final cappedDelayMs = min(totalDelayMs, maxDelay.inMilliseconds);
    
    return Duration(milliseconds: max(0, cappedDelayMs));
  }

  /// Gets the current retry attempt count for a request
  int _getRetryAttempts(RequestOptions options) {
    return options.extra['retry_attempts'] ?? 0;
  }

  /// Sets the retry attempt count for a request
  void _setRetryAttempts(RequestOptions options, int attempts) {
    options.extra['retry_attempts'] = attempts;
  }

  /// Logs a retry attempt
  Future<void> _logRetryAttempt(
    DioException error,
    int attemptNumber,
    Duration delay,
  ) async {
    if (kDebugMode) {
      print(
        'RetryInterceptor: Attempt $attemptNumber/$maxRetries for ${error.requestOptions.method} ${error.requestOptions.path} '
        'failed with ${error.type}${error.response?.statusCode != null ? ' (${error.response!.statusCode})' : ''}. '
        'Retrying in ${delay.inMilliseconds}ms...'
      );
    }

    // Log to Firebase Analytics
    await FirebaseConfig.logEvent(
      name: 'network_retry_attempt',
      parameters: {
        'method': error.requestOptions.method,
        'path': error.requestOptions.path,
        'error_type': error.type.toString(),
        'status_code': error.response?.statusCode ?? -1,
        'attempt_number': attemptNumber,
        'max_attempts': maxRetries,
        'delay_ms': delay.inMilliseconds,
      },
    );
  }

  /// Logs a successful retry
  Future<void> _logRetrySuccess(
    DioException originalError,
    int attemptNumber,
  ) async {
    if (kDebugMode) {
      print(
        'RetryInterceptor: Request ${originalError.requestOptions.method} ${originalError.requestOptions.path} '
        'succeeded on attempt $attemptNumber/$maxRetries'
      );
    }

    await FirebaseConfig.logEvent(
      name: 'network_retry_success',
      parameters: {
        'method': originalError.requestOptions.method,
        'path': originalError.requestOptions.path,
        'attempt_number': attemptNumber,
        'max_attempts': maxRetries,
      },
    );
  }

  /// Logs when all retries have been exhausted
  Future<void> _logRetryFailure(
    DioException error,
    int totalAttempts,
  ) async {
    if (kDebugMode) {
      print(
        'RetryInterceptor: All $maxRetries retry attempts failed for ${error.requestOptions.method} ${error.requestOptions.path}. '
        'Final error: ${error.type}${error.response?.statusCode != null ? ' (${error.response!.statusCode})' : ''}'
      );
    }

    await FirebaseConfig.logEvent(
      name: 'network_retry_exhausted',
      parameters: {
        'method': error.requestOptions.method,
        'path': error.requestOptions.path,
        'error_type': error.type.toString(),
        'status_code': error.response?.statusCode ?? -1,
        'total_attempts': totalAttempts,
        'max_attempts': maxRetries,
      },
    );

    // Record non-fatal error to Crashlytics
    await FirebaseConfig.recordError(
      error,
      StackTrace.current,
      reason: 'Network retry exhausted after $totalAttempts attempts',
    );
  }
}

/// Extension methods for easier retry configuration
extension RetryOptionsExtension on RequestOptions {
  /// Disable retries for this specific request
  RequestOptions withoutRetries() {
    extra['disable_retries'] = true;
    return this;
  }

  /// Set custom retry configuration for this request
  RequestOptions withRetryConfig({
    int? maxRetries,
    Duration? baseDelay,
    Duration? maxDelay,
  }) {
    if (maxRetries != null) extra['max_retries'] = maxRetries;
    if (baseDelay != null) extra['base_delay'] = baseDelay.inMilliseconds;
    if (maxDelay != null) extra['max_delay'] = maxDelay.inMilliseconds;
    return this;
  }

  /// Check if retries are disabled for this request
  bool get retriesDisabled => extra['disable_retries'] == true;
}

/// Advanced retry interceptor with circuit breaker pattern
class AdvancedRetryInterceptor extends RetryInterceptor {
  final Map<String, CircuitBreakerState> _circuitBreakers = {};
  final Duration circuitBreakerTimeout;
  final int failureThreshold;

  AdvancedRetryInterceptor({
    super.maxRetries,
    super.baseDelay,
    super.maxDelay,
    super.multiplier,
    super.jitterFactor,
    super.retryableStatusCodes,
    super.retryableExceptionTypes,
    super.shouldRetry,
    this.circuitBreakerTimeout = const Duration(minutes: 1),
    this.failureThreshold = 5,
  });

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final endpoint = _getEndpointKey(err.requestOptions);
    final circuitBreaker = _getOrCreateCircuitBreaker(endpoint);

    // Check if circuit is open
    if (circuitBreaker.isOpen) {
      if (DateTime.now().difference(circuitBreaker.lastFailureTime!) < circuitBreakerTimeout) {
        // Circuit is open, fail fast
        await _logCircuitBreakerOpen(err, endpoint);
        handler.next(err);
        return;
      } else {
        // Circuit breaker timeout expired, move to half-open state
        circuitBreaker.state = CircuitBreakerStateType.halfOpen;
      }
    }

    // If retries are disabled for this request, skip retry logic
    if (err.requestOptions.retriesDisabled) {
      _recordFailure(circuitBreaker);
      handler.next(err);
      return;
    }

    // Proceed with regular retry logic
    super.onError(err, handler);
  }

  /// Gets or creates a circuit breaker for an endpoint
  CircuitBreakerState _getOrCreateCircuitBreaker(String endpoint) {
    return _circuitBreakers.putIfAbsent(
      endpoint,
      () => CircuitBreakerState(),
    );
  }

  /// Generates a unique key for an endpoint
  String _getEndpointKey(RequestOptions options) {
    return '${options.method}_${options.baseUrl}${options.path}';
  }

  /// Records a failure for the circuit breaker
  void _recordFailure(CircuitBreakerState breaker) {
    breaker.failureCount++;
    breaker.lastFailureTime = DateTime.now();

    if (breaker.failureCount >= failureThreshold) {
      breaker.state = CircuitBreakerStateType.open;
    }
  }

  /// Records a success for the circuit breaker
  void _recordSuccess(CircuitBreakerState breaker) {
    breaker.failureCount = 0;
    breaker.state = CircuitBreakerStateType.closed;
    breaker.lastFailureTime = null;
  }

  /// Logs when circuit breaker is open
  Future<void> _logCircuitBreakerOpen(DioException error, String endpoint) async {
    if (kDebugMode) {
      print('Circuit breaker is OPEN for $endpoint. Failing fast.');
    }

    await FirebaseConfig.logEvent(
      name: 'circuit_breaker_open',
      parameters: {
        'endpoint': endpoint,
        'failure_count': _circuitBreakers[endpoint]?.failureCount ?? 0,
      },
    );
  }
}

/// Circuit breaker state management
class CircuitBreakerState {
  CircuitBreakerStateType state = CircuitBreakerStateType.closed;
  int failureCount = 0;
  DateTime? lastFailureTime;

  bool get isOpen => state == CircuitBreakerStateType.open;
  bool get isHalfOpen => state == CircuitBreakerStateType.halfOpen;
  bool get isClosed => state == CircuitBreakerStateType.closed;
}

enum CircuitBreakerStateType {
  closed,
  open,
  halfOpen,
}

/// Retry policy builder for different scenarios
class RetryPolicyBuilder {
  /// Policy for critical operations (authentication, payments)
  static RetryInterceptor critical() {
    return RetryInterceptor(
      maxRetries: 5,
      baseDelay: const Duration(seconds: 1),
      maxDelay: const Duration(minutes: 1),
      multiplier: 2.0,
      retryableStatusCodes: [408, 429, 500, 502, 503, 504],
    );
  }

  /// Policy for regular API calls
  static RetryInterceptor standard() {
    return RetryInterceptor(
      maxRetries: 3,
      baseDelay: const Duration(milliseconds: 500),
      maxDelay: const Duration(seconds: 30),
      multiplier: 2.0,
    );
  }

  /// Policy for non-critical operations (analytics, logging)
  static RetryInterceptor lenient() {
    return RetryInterceptor(
      maxRetries: 2,
      baseDelay: const Duration(milliseconds: 300),
      maxDelay: const Duration(seconds: 10),
      multiplier: 1.5,
    );
  }

  /// Policy that only retries on network errors
  static RetryInterceptor networkOnly() {
    return RetryInterceptor(
      maxRetries: 3,
      baseDelay: const Duration(milliseconds: 500),
      retryableStatusCodes: [], // No HTTP status codes
      retryableExceptionTypes: [
        DioExceptionType.connectionTimeout,
        DioExceptionType.sendTimeout,
        DioExceptionType.receiveTimeout,
        DioExceptionType.connectionError,
      ],
    );
  }

  /// Custom policy with circuit breaker
  static AdvancedRetryInterceptor withCircuitBreaker({
    int maxRetries = 3,
    Duration circuitBreakerTimeout = const Duration(minutes: 1),
    int failureThreshold = 5,
  }) {
    return AdvancedRetryInterceptor(
      maxRetries: maxRetries,
      circuitBreakerTimeout: circuitBreakerTimeout,
      failureThreshold: failureThreshold,
    );
  }
}