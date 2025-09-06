// 출근 인증 및 검증 서비스
// AttendanceProvider에서 분리된 인증 전용 서비스

import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../../domain/entities/attendance/attendance.dart';
import 'attendance_state_service.dart';

part 'attendance_verification_service.freezed.dart';

/// 인증 방법 열거형
enum VerificationMethod {
  manual,
  qr,
  location,
  wifi,
  biometric,
}

/// 인증 결과 상태
@freezed
class VerificationState with _$VerificationState {
  const factory VerificationState({
    @Default(false) bool isVerifying,
    @Default(false) bool isScanning,
    AttendanceVerificationResult? result,
    String? errorMessage,
    String? qrData,
  }) = _VerificationState;
}

/// 출근 인증 결과
@freezed 
class AttendanceVerificationResult with _$AttendanceVerificationResult {
  const factory AttendanceVerificationResult({
    required bool isValid,
    required VerificationMethod method,
    String? errorMessage,
    String? warningMessage,
    double? distance, // GPS 인증시 거리
    Map<String, dynamic>? metadata,
  }) = _AttendanceVerificationResult;
}

/// 출근 인증 서비스
class AttendanceVerificationService extends StateNotifier<VerificationState> {
  AttendanceVerificationService() : super(const VerificationState());
  
  /// QR 스캔 시작
  void startQrScanning() {
    state = state.copyWith(
      isScanning: true,
      errorMessage: null,
      result: null,
    );
  }
  
  /// QR 스캔 중지
  void stopQrScanning() {
    state = state.copyWith(isScanning: false);
  }
  
  /// QR 코드 데이터 설정
  void setQrData(String token, String locationId) {
    final qrData = 'dotattendance://checkin?token=$token&location=$locationId&type=attendance';
    state = state.copyWith(qrData: qrData);
  }
  
  /// QR 코드 스캔 처리
  Future<void> processQrCode({
    required String qrData,
    required AttendanceActionType actionType,
  }) async {
    try {
      // 햅틱 피드백
      await HapticFeedback.selectionClick();
      
      // 스캔 중지
      stopQrScanning();
      
      // QR 코드 검증
      await verifyAttendanceRequirements(
        actionType: actionType,
        method: VerificationMethod.qr,
        qrCodeData: qrData,
      );
    } catch (e) {
      state = state.copyWith(
        isScanning: false,
        errorMessage: 'QR 코드 처리 중 오류: $e',
      );
    }
  }
  
  /// 출근 요구사항 검증
  Future<void> verifyAttendanceRequirements({
    required AttendanceActionType actionType,
    required VerificationMethod method,
    String? qrCodeData,
    bool requireLocation = true,
  }) async {
    state = state.copyWith(isVerifying: true, errorMessage: null);
    
    try {
      AttendanceVerificationResult result;
      
      switch (method) {
        case VerificationMethod.manual:
          result = await _verifyManual(actionType);
          break;
          
        case VerificationMethod.qr:
          if (qrCodeData == null) {
            throw ArgumentError('QR 코드 데이터가 필요합니다');
          }
          result = await _verifyQrCode(qrCodeData, actionType);
          break;
          
        case VerificationMethod.location:
          result = await _verifyLocation(actionType, requireLocation);
          break;
          
        case VerificationMethod.wifi:
          result = await _verifyWifi(actionType);
          break;
          
        case VerificationMethod.biometric:
          result = await _verifyBiometric(actionType);
          break;
      }
      
      state = state.copyWith(
        isVerifying: false,
        result: result,
        errorMessage: result.isValid ? null : result.errorMessage,
      );
      
    } catch (e) {
      state = state.copyWith(
        isVerifying: false,
        errorMessage: '인증 처리 중 오류: $e',
      );
    }
  }
  
  /// 수동 인증 (관리자 승인)
  Future<AttendanceVerificationResult> _verifyManual(
    AttendanceActionType actionType
  ) async {
    // 수동 인증은 항상 성공 (관리자가 직접 승인)
    return const AttendanceVerificationResult(
      isValid: true,
      method: VerificationMethod.manual,
      warningMessage: '수동 승인으로 처리됩니다',
    );
  }
  
  /// QR 코드 인증
  Future<AttendanceVerificationResult> _verifyQrCode(
    String qrData,
    AttendanceActionType actionType
  ) async {
    try {
      // QR 코드 파싱
      final uri = Uri.parse(qrData);
      
      if (uri.scheme != 'dotattendance' || uri.host != 'checkin') {
        return const AttendanceVerificationResult(
          isValid: false,
          method: VerificationMethod.qr,
          errorMessage: '유효하지 않은 QR 코드입니다',
        );
      }
      
      final token = uri.queryParameters['token'];
      final locationId = uri.queryParameters['location'];
      final type = uri.queryParameters['type'];
      
      if (token == null || locationId == null || type != 'attendance') {
        return const AttendanceVerificationResult(
          isValid: false,
          method: VerificationMethod.qr,
          errorMessage: 'QR 코드 정보가 올바르지 않습니다',
        );
      }
      
      // 토큰 유효성 검증 (실제로는 서버에서 확인해야 함)
      // 여기서는 간단한 형식 검증만 수행
      if (token.length < 10) {
        return const AttendanceVerificationResult(
          isValid: false,
          method: VerificationMethod.qr,
          errorMessage: '유효하지 않은 인증 토큰입니다',
        );
      }
      
      return AttendanceVerificationResult(
        isValid: true,
        method: VerificationMethod.qr,
        metadata: {
          'token': token,
          'locationId': locationId,
          'qrData': qrData,
        },
      );
      
    } catch (e) {
      return AttendanceVerificationResult(
        isValid: false,
        method: VerificationMethod.qr,
        errorMessage: 'QR 코드 처리 중 오류: $e',
      );
    }
  }
  
  /// GPS 위치 인증
  Future<AttendanceVerificationResult> _verifyLocation(
    AttendanceActionType actionType,
    bool requireLocation
  ) async {
    if (!requireLocation) {
      return const AttendanceVerificationResult(
        isValid: true,
        method: VerificationMethod.location,
        warningMessage: '위치 검증을 건너뛰었습니다',
      );
    }
    
    try {
      // 실제 구현에서는 위치 서비스를 사용
      // 여기서는 더미 구현
      await Future.delayed(const Duration(seconds: 1));
      
      // 모의 위치 데이터
      const userLat = 37.5665;
      const userLng = 126.9780;
      const officeLat = 37.5663;
      const officeLng = 126.9779;
      
      // 거리 계산 (하버사인 공식 사용 - 여기서는 간단히 계산)
      final distance = _calculateDistance(userLat, userLng, officeLat, officeLng);
      
      const allowedRadius = 100.0; // 100미터
      
      if (distance > allowedRadius) {
        return AttendanceVerificationResult(
          isValid: false,
          method: VerificationMethod.location,
          distance: distance,
          errorMessage: '사무실에서 너무 멀리 떨어져 있습니다 (${distance.toInt()}m)',
        );
      }
      
      return AttendanceVerificationResult(
        isValid: true,
        method: VerificationMethod.location,
        distance: distance,
        metadata: {
          'userLatitude': userLat,
          'userLongitude': userLng,
          'officeLatitude': officeLat,
          'officeLongitude': officeLng,
        },
      );
      
    } catch (e) {
      return AttendanceVerificationResult(
        isValid: false,
        method: VerificationMethod.location,
        errorMessage: '위치 확인 중 오류: $e',
      );
    }
  }
  
  /// WiFi 인증
  Future<AttendanceVerificationResult> _verifyWifi(
    AttendanceActionType actionType
  ) async {
    try {
      // 실제 구현에서는 WiFi 정보를 확인
      await Future.delayed(const Duration(milliseconds: 500));
      
      // 모의 WiFi 검증
      const connectedSsid = 'Office-WiFi';
      const allowedSsids = ['Office-WiFi', 'Company-Guest'];
      
      if (!allowedSsids.contains(connectedSsid)) {
        return const AttendanceVerificationResult(
          isValid: false,
          method: VerificationMethod.wifi,
          errorMessage: '허용된 WiFi 네트워크에 연결되지 않았습니다',
        );
      }
      
      return AttendanceVerificationResult(
        isValid: true,
        method: VerificationMethod.wifi,
        metadata: {'ssid': connectedSsid},
      );
      
    } catch (e) {
      return AttendanceVerificationResult(
        isValid: false,
        method: VerificationMethod.wifi,
        errorMessage: 'WiFi 확인 중 오류: $e',
      );
    }
  }
  
  /// 생체 인증 
  Future<AttendanceVerificationResult> _verifyBiometric(
    AttendanceActionType actionType
  ) async {
    try {
      // 생체 인증 시도
      await HapticFeedback.lightImpact();
      
      // 실제 구현에서는 local_auth 패키지 사용
      await Future.delayed(const Duration(seconds: 2));
      
      // 모의 생체 인증 (80% 성공률)
      final isAuthenticated = DateTime.now().millisecond % 5 != 0;
      
      if (!isAuthenticated) {
        return const AttendanceVerificationResult(
          isValid: false,
          method: VerificationMethod.biometric,
          errorMessage: '생체 인증에 실패했습니다',
        );
      }
      
      return const AttendanceVerificationResult(
        isValid: true,
        method: VerificationMethod.biometric,
        metadata: {'biometricType': 'fingerprint'},
      );
      
    } catch (e) {
      return AttendanceVerificationResult(
        isValid: false,
        method: VerificationMethod.biometric,
        errorMessage: '생체 인증 중 오류: $e',
      );
    }
  }
  
  /// 두 지점 간 거리 계산 (미터)
  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadius = 6371000; // 지구 반지름 (미터)
    
    final double dLat = _degreesToRadians(lat2 - lat1);
    final double dLon = _degreesToRadians(lon2 - lon1);
    
    final double a = 
        (dLat / 2).sin() * (dLat / 2).sin() +
        lat1 * (3.14159 / 180).cos() * lat2 * (3.14159 / 180).cos() *
        (dLon / 2).sin() * (dLon / 2).sin();
    
    final double c = 2 * a.sqrt().asin();
    
    return earthRadius * c;
  }
  
  double _degreesToRadians(double degrees) {
    return degrees * (3.14159 / 180);
  }
  
  /// 인증 결과 초기화
  void clearVerificationResult() {
    state = state.copyWith(result: null, errorMessage: null);
  }
  
  /// 에러 메시지 초기화
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

/// Provider 정의
final attendanceVerificationServiceProvider = 
    StateNotifierProvider<AttendanceVerificationService, VerificationState>((ref) {
  return AttendanceVerificationService();
});

/// 편의를 위한 계산된 프로바이더들
final isVerifyingProvider = Provider<bool>((ref) {
  return ref.watch(attendanceVerificationServiceProvider).isVerifying;
});

final isScanningProvider = Provider<bool>((ref) {
  return ref.watch(attendanceVerificationServiceProvider).isScanning;
});

final verificationResultProvider = Provider<AttendanceVerificationResult?>((ref) {
  return ref.watch(attendanceVerificationServiceProvider).result;
});

final verificationErrorProvider = Provider<String?>((ref) {
  return ref.watch(attendanceVerificationServiceProvider).errorMessage;
});