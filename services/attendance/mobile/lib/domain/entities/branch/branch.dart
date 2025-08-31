import 'package:freezed_annotation/freezed_annotation.dart';

part 'branch.freezed.dart';

/// PLAN-1 요구사항: 지점 정보 엔티티
/// branches 테이블 구조를 Flutter 엔티티로 구현
@freezed
class Branch with _$Branch {
  const factory Branch({
    required String id,           // UUID
    required String name,          // 지점명 (예: 강남지점)
    required String qrCode,        // 고유 QR 코드
    required DateTime createdAt,  // 생성 시간
    String? address,              // 지점 주소 (선택)
    String? phoneNumber,          // 지점 전화번호 (선택)
    double? latitude,             // 위도 (위치 기반 체크용)
    double? longitude,            // 경도 (위치 기반 체크용)
    @Default(true) bool isActive, // 활성화 상태
  }) = _Branch;

  const Branch._();

  /// QR 코드가 유효한지 확인
  bool get hasValidQrCode => qrCode.isNotEmpty;

  /// 위치 정보가 있는지 확인
  bool get hasLocation => latitude != null && longitude != null;

  /// 지점 정보 요약 문자열
  String get summary => '$name (${qrCode.substring(0, 6)}...)';
}