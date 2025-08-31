import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'business_location.freezed.dart';

/// 사업장 위치/지점 정보 엔터티
@freezed
class BusinessLocation extends Equatable with _$BusinessLocation {
  const factory BusinessLocation({
    required String id,
    required String businessInfoId,          // 연결된 사업자 정보 ID
    required String name,                    // 지점명 (예: 강남지점, 홍대지점)
    required String address,                 // 주소
    String? detailAddress,                  // 상세주소
    String? postalCode,                     // 우편번호
    double? latitude,                       // 위도
    double? longitude,                      // 경도
    String? phoneNumber,                    // 지점 전화번호
    String? managerUserId,                  // 지점 관리자 사용자 ID
    String? managerName,                    // 지점 관리자 이름
    @Default(0) int employeeCount,          // 직원 수
    @Default(true) bool isActive,           // 활성 상태
    @Default(false) bool isHeadOffice,      // 본사 여부
    String? businessHours,                  // 운영시간 (JSON 또는 문자열)
    String? description,                    // 지점 설명
    List<String>? facilityFeatures,        // 시설 특징 (예: ['주차가능', 'WiFi', '24시간'])
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _BusinessLocation;

  const BusinessLocation._();

  /// 전체 주소 반환
  String get fullAddress {
    final buffer = StringBuffer(address);
    if (detailAddress != null && detailAddress!.isNotEmpty) {
      buffer.write(' $detailAddress');
    }
    if (postalCode != null && postalCode!.isNotEmpty) {
      buffer.write(' ($postalCode)');
    }
    return buffer.toString();
  }

  /// 지점 유형 표시명
  String get locationTypeDisplay {
    if (isHeadOffice) {
      return '본사';
    } else {
      return '지점';
    }
  }

  /// 좌표 설정 여부
  bool get hasCoordinates => latitude != null && longitude != null;

  /// 관리자 설정 여부
  bool get hasManager => managerUserId != null && managerName != null;

  /// 지점 상태 표시명
  String get statusDisplay {
    if (!isActive) {
      return '비활성';
    } else if (employeeCount == 0) {
      return '직원 없음';
    } else {
      return '운영중';
    }
  }

  /// 직원 수 표시명
  String get employeeCountDisplay {
    if (employeeCount == 0) {
      return '직원 없음';
    } else if (employeeCount == 1) {
      return '직원 1명';
    } else {
      return '직원 ${employeeCount}명';
    }
  }

  /// 시설 특징 문자열
  String get facilitiesString {
    if (facilityFeatures == null || facilityFeatures!.isEmpty) {
      return '정보 없음';
    }
    return facilityFeatures!.join(', ');
  }

  /// 지점 정보 요약
  Map<String, dynamic> get summary => {
        'name': name,
        'type': locationTypeDisplay,
        'address': fullAddress,
        'status': statusDisplay,
        'employeeCount': employeeCount,
        'hasManager': hasManager,
        'managerName': managerName,
        'isActive': isActive,
      };

  @override
  List<Object?> get props => [
        id,
        businessInfoId,
        name,
        address,
        detailAddress,
        postalCode,
        latitude,
        longitude,
        phoneNumber,
        managerUserId,
        managerName,
        employeeCount,
        isActive,
        isHeadOffice,
        businessHours,
        description,
        facilityFeatures,
        createdAt,
        updatedAt,
      ];
}