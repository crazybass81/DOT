import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'business_info.dart';
import 'representative.dart';
import 'business_location.dart';

part 'business_profile.freezed.dart';

/// 통합 사업자 프로필 엔터티
@freezed
class BusinessProfile extends Equatable with _$BusinessProfile {
  const factory BusinessProfile({
    required String id,
    required String userId,                    // 연결된 사용자 ID
    required BusinessInfo businessInfo,        // 사업자 정보
    required Representative representative,     // 대표자 정보
    @Default([]) List<BusinessLocation> locations, // 사업장 목록
    
    // 미래 확장을 위한 플레이스홀더 필드들
    @Default(false) bool isPhoneVerificationEnabled,     // 전화번호 인증 활성화
    @Default(false) bool isBusinessNumberValidationEnabled, // 사업자번호 검증 활성화
    @Default(false) bool isDocumentUploadEnabled,        // 서류 업로드 활성화
    
    // 인증 상태 추적
    @Default(false) bool isProfileComplete,              // 프로필 완성 여부
    @Default(0) int verificationScore,                   // 인증 점수 (0-100)
    List<String>? pendingVerifications,                  // 대기중인 인증 목록
    List<String>? completedVerifications,                // 완료된 인증 목록
    
    // 메타 정보
    DateTime? createdAt,
    DateTime? updatedAt,
    String? notes,                                       // 관리자 메모
  }) = _BusinessProfile;

  const BusinessProfile._();

  /// 본사 지점 조회
  BusinessLocation? get headOffice {
    try {
      return locations.firstWhere((location) => location.isHeadOffice);
    } catch (e) {
      return null;
    }
  }

  /// 활성 지점 목록
  List<BusinessLocation> get activeLocations {
    return locations.where((location) => location.isActive).toList();
  }

  /// 총 직원 수
  int get totalEmployeeCount {
    return locations.fold(0, (sum, location) => sum + location.employeeCount);
  }

  /// 사업자등록번호 인증 여부
  bool get isBusinessRegistrationVerified {
    return businessInfo.isVerified;
  }

  /// 대표자 완전 인증 여부
  bool get isRepresentativeFullyVerified {
    return representative.isFullyVerified;
  }

  /// 전체 인증 상태 점수 계산
  int get calculatedVerificationScore {
    var score = 0;
    
    // 기본 정보 완성도 (30점)
    if (businessInfo.businessName.isNotEmpty) score += 5;
    if (businessInfo.businessRegistrationNumber.isNotEmpty) score += 10;
    if (businessInfo.businessAddress.isNotEmpty) score += 5;
    if (representative.name.isNotEmpty) score += 5;
    if (representative.phoneNumber.isNotEmpty) score += 5;
    
    // 인증 완료 (50점)
    if (isBusinessRegistrationVerified) score += 25;
    if (isRepresentativeFullyVerified) score += 25;
    
    // 사업장 정보 (20점)
    if (locations.isNotEmpty) score += 10;
    if (headOffice != null) score += 5;
    if (totalEmployeeCount > 0) score += 5;
    
    return score;
  }

  /// 프로필 완성도 상태
  String get completionStatus {
    final score = calculatedVerificationScore;
    if (score >= 90) return '완료';
    if (score >= 70) return '거의 완료';
    if (score >= 50) return '진행중';
    if (score >= 30) return '시작됨';
    return '미완성';
  }

  /// 다음 단계 인증 항목
  List<String> get nextVerificationSteps {
    final steps = <String>[];
    
    if (!isBusinessRegistrationVerified) {
      steps.add('사업자등록번호 인증');
    }
    
    if (!representative.isPhoneVerified) {
      steps.add('대표자 전화번호 인증');
    }
    
    if (!representative.isIdentityVerified) {
      steps.add('대표자 신분 인증');
    }
    
    if (locations.isEmpty) {
      steps.add('사업장 정보 등록');
    }
    
    if (headOffice == null && locations.isNotEmpty) {
      steps.add('본사 지정');
    }
    
    return steps;
  }

  /// 사업자 프로필 요약 정보
  Map<String, dynamic> get profileSummary => {
        'businessName': businessInfo.businessName,
        'registrationNumber': businessInfo.formattedRegistrationNumber,
        'representativeName': representative.name,
        'representativePhone': representative.formattedPhoneNumber,
        'locationCount': locations.length,
        'totalEmployees': totalEmployeeCount,
        'verificationScore': calculatedVerificationScore,
        'completionStatus': completionStatus,
        'isFullyVerified': calculatedVerificationScore >= 90,
      };

  @override
  List<Object?> get props => [
        id,
        userId,
        businessInfo,
        representative,
        locations,
        isPhoneVerificationEnabled,
        isBusinessNumberValidationEnabled,
        isDocumentUploadEnabled,
        isProfileComplete,
        verificationScore,
        pendingVerifications,
        completedVerifications,
        createdAt,
        updatedAt,
        notes,
      ];
}