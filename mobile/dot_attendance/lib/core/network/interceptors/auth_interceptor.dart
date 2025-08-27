import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

import '../../constants/app_constants.dart';
import '../../storage/secure_storage_service.dart';

class AuthInterceptor extends Interceptor {
  final SecureStorageService _secureStorage;

  AuthInterceptor(this._secureStorage);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    try {
      // Skip authentication for certain endpoints
      if (_shouldSkipAuth(options.path)) {
        return handler.next(options);
      }

      // Get access token
      final accessToken = await _secureStorage.getAccessToken();
      
      if (accessToken != null && accessToken.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $accessToken';
      }

      return handler.next(options);
    } catch (e) {
      debugPrint('AuthInterceptor error: $e');
      return handler.next(options);
    }
  }

  @override
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    // Handle token refresh on 401 errors
    if (err.response?.statusCode == 401) {
      try {
        final refreshed = await _refreshToken();
        if (refreshed) {
          // Retry the original request
          final retryRequest = await _retry(err.requestOptions);
          return handler.resolve(retryRequest);
        }
      } catch (e) {
        debugPrint('Token refresh failed: $e');
        // Clear stored tokens on refresh failure
        await _clearTokens();
      }
    }
    
    return handler.next(err);
  }

  bool _shouldSkipAuth(String path) {
    final unauthenticatedPaths = [
      ApiEndpoints.login,
      ApiEndpoints.resetPassword,
      '/auth/register', // If registration is implemented
    ];
    
    return unauthenticatedPaths.any((unauthPath) => path.contains(unauthPath));
  }

  Future<bool> _refreshToken() async {
    try {
      final refreshToken = await _secureStorage.getRefreshToken();
      
      if (refreshToken == null || refreshToken.isEmpty) {
        return false;
      }

      final dio = Dio();
      dio.options.baseUrl = AppConstants.baseUrl;
      
      final response = await dio.post(
        ApiEndpoints.refreshToken,
        data: {'refresh_token': refreshToken},
      );

      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        final newAccessToken = data['access_token'] as String?;
        final newRefreshToken = data['refresh_token'] as String?;

        if (newAccessToken != null) {
          await _secureStorage.storeAccessToken(newAccessToken);
        }
        
        if (newRefreshToken != null) {
          await _secureStorage.storeRefreshToken(newRefreshToken);
        }

        return true;
      }
    } catch (e) {
      debugPrint('Token refresh error: $e');
    }

    return false;
  }

  Future<Response<dynamic>> _retry(RequestOptions requestOptions) async {
    // Get new access token
    final newAccessToken = await _secureStorage.getAccessToken();
    
    if (newAccessToken != null) {
      requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
    }

    // Create a new Dio instance to avoid interceptor loops
    final dio = Dio();
    dio.options.baseUrl = AppConstants.baseUrl;
    
    return dio.request<dynamic>(
      requestOptions.path,
      data: requestOptions.data,
      queryParameters: requestOptions.queryParameters,
      options: Options(
        method: requestOptions.method,
        headers: requestOptions.headers,
        responseType: requestOptions.responseType,
        contentType: requestOptions.contentType,
        validateStatus: requestOptions.validateStatus,
        receiveTimeout: requestOptions.receiveTimeout,
        sendTimeout: requestOptions.sendTimeout,
      ),
    );
  }

  Future<void> _clearTokens() async {
    await _secureStorage.deleteAccessToken();
    await _secureStorage.deleteRefreshToken();
  }
}