import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'representative.freezed.dart';

/// 사업자 대표자 정보 엔터티
@freezed
class Representative extends Equatable with _$Representative {
  const factory Representative({
    required String id,
    required String name,                    // 대표자명 (예: 임태균)
    required String phoneNumber,             // 연락처 (예: 01093177090)
    String? email,                          // 이메일
    String? address,                        // 주소
    String? residentRegistrationNumber,     // 주민등록번호 (암호화된 형태)
    @Default(false) bool isPhoneVerified,   // 전화번호 인증 여부
    DateTime? phoneVerifiedAt,              // 전화번호 인증 일시
    @Default(false) bool isIdentityVerified, // 신분 인증 여부
    DateTime? identityVerifiedAt,           // 신분 인증 일시
    String? identityDocument,               // 신분증 사본 URL
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _Representative;

  const Representative._();

  /// 전화번호 포매팅 (010-0000-0000)
  String get formattedPhoneNumber {
    final number = phoneNumber.replaceAll(RegExp(r'[^0-9]'), '');
    if (number.length == 11 && number.startsWith('010')) {
      return '${number.substring(0, 3)}-${number.substring(3, 7)}-${number.substring(7)}';
    } else if (number.length == 10) {
      return '${number.substring(0, 3)}-${number.substring(3, 6)}-${number.substring(6)}';
    }
    return phoneNumber;
  }

  /// 전화번호 유효성 검증
  bool get isPhoneNumberValid {
    final number = phoneNumber.replaceAll(RegExp(r'[^0-9]'), '');
    
    // 휴대폰 번호 (010, 011, 016, 017, 018, 019)
    if (number.length == 11 && RegExp(r'^01[016789]').hasMatch(number)) {
      return true;
    }
    
    // 일반 전화번호 (02, 031-051, 053-064)
    if (number.length >= 9 && number.length <= 11) {
      return RegExp(r'^0(2|3[1-3]|4[1-4]|5[1-5]|6[1-4])').hasMatch(number);
    }
    
    return false;
  }

  /// 마스킹된 전화번호 (010-****-0000)
  String get maskedPhoneNumber {
    final formatted = formattedPhoneNumber;
    if (formatted.contains('-')) {
      final parts = formatted.split('-');
      if (parts.length == 3) {
        return '${parts[0]}-****-${parts[2]}';
      }
    }
    return '***-****-****';
  }

  /// 인증 상태 요약
  String get verificationStatus {
    if (isPhoneVerified && isIdentityVerified) {
      return '완전 인증';
    } else if (isPhoneVerified) {
      return '전화번호 인증';
    } else if (isIdentityVerified) {
      return '신분 인증';
    } else {
      return '미인증';
    }
  }

  /// 인증 완료 여부
  bool get isFullyVerified => isPhoneVerified && isIdentityVerified;

  @override
  List<Object?> get props => [
        id,
        name,
        phoneNumber,
        email,
        address,
        residentRegistrationNumber,
        isPhoneVerified,
        phoneVerifiedAt,
        isIdentityVerified,
        identityVerifiedAt,
        identityDocument,
        createdAt,
        updatedAt,
      ];
}