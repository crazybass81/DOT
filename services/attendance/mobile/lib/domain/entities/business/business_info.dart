import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'business_info.freezed.dart';

/// 사업자 정보 엔터티
@freezed
class BusinessInfo extends Equatable with _$BusinessInfo {
  const factory BusinessInfo({
    required String id,
    required String businessRegistrationNumber, // 사업자등록번호
    required String businessName,              // 상호명
    required String businessType,              // 업종
    required String businessAddress,           // 사업장 소재지
    String? businessPhone,                     // 사업장 전화번호
    String? businessEmail,                     // 사업장 이메일
    String? representativeName,                // 대표자명
    String? representativeAddress,             // 대표자 주소
    DateTime? establishedDate,                 // 개업일자
    @Default(false) bool isVerified,          // 사업자등록번호 인증 여부
    DateTime? verifiedAt,                     // 인증 일시
    String? verificationDocument,             // 인증서류 URL
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _BusinessInfo;

  const BusinessInfo._();

  /// 사업자등록번호 포매팅 (000-00-00000)
  String get formattedRegistrationNumber {
    final number = businessRegistrationNumber.replaceAll(RegExp(r'[^0-9]'), '');
    if (number.length == 10) {
      return '${number.substring(0, 3)}-${number.substring(3, 5)}-${number.substring(5)}';
    }
    return businessRegistrationNumber;
  }

  /// 사업자등록번호 유효성 검증
  bool get isRegistrationNumberValid {
    final number = businessRegistrationNumber.replaceAll(RegExp(r'[^0-9]'), '');
    
    // 길이 체크
    if (number.length != 10) return false;
    
    // 체크썸 알고리즘 (간소화된 버전)
    const checkWeights = [1, 3, 7, 1, 3, 7, 1, 3, 5, 1];
    var sum = 0;
    
    for (int i = 0; i < 9; i++) {
      sum += int.parse(number[i]) * checkWeights[i];
    }
    
    sum += (int.parse(number[8]) * 5) ~/ 10;
    final checkDigit = (10 - (sum % 10)) % 10;
    
    return checkDigit == int.parse(number[9]);
  }

  @override
  List<Object?> get props => [
        id,
        businessRegistrationNumber,
        businessName,
        businessType,
        businessAddress,
        businessPhone,
        businessEmail,
        representativeName,
        representativeAddress,
        establishedDate,
        isVerified,
        verifiedAt,
        verificationDocument,
        createdAt,
        updatedAt,
      ];
}