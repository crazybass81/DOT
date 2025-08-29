import 'package:equatable/equatable.dart';
import 'package:freezed_annotation/freezed_annotation.dart';
import 'user_role.dart';
import '../business/business_profile.dart';

part 'user.freezed.dart';

@freezed
class User extends Equatable with _$User {
  const factory User({
    required String id,
    required String email,
    required String firstName,
    required String lastName,
    @Default(UserRole.user) UserRole role,
    String? phoneNumber,
    String? avatarUrl,
    String? employeeId,
    String? department,
    String? designation,
    String? workLocation,
    DateTime? joiningDate,
    @Default(true) bool isActive,
    @Default(false) bool isBiometricEnabled,
    BusinessProfile? businessProfile,     // 사업자 프로필 정보 (admin/masterAdmin만)
    String? organizationId,               // 소속 조직 ID (호환성 유지)
    String? organizationName,             // 소속 조직명 (호환성 유지)
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _User;

  const User._();

  String get fullName => '$firstName $lastName';

  String get initials {
    final firstInitial = firstName.isNotEmpty ? firstName[0].toUpperCase() : '';
    final lastInitial = lastName.isNotEmpty ? lastName[0].toUpperCase() : '';
    return '$firstInitial$lastInitial';
  }

  String get displayName {
    if (firstName.isNotEmpty && lastName.isNotEmpty) {
      return fullName;
    } else if (firstName.isNotEmpty) {
      return firstName;
    } else if (lastName.isNotEmpty) {
      return lastName;
    } else {
      return email;
    }
  }

  String get name => displayName;

  /// 사업자 여부 확인 (admin 이상 권한이면서 사업자 프로필 존재)
  bool get isBusinessOwner => 
      role.level >= UserRole.admin.level && businessProfile != null;

  /// 사업자명 반환 (사업자 프로필이 있으면 사업자명, 없으면 조직명)
  String? get businessName => 
      businessProfile?.businessInfo.businessName ?? organizationName;

  /// 대표자 여부 확인
  bool get isRepresentative => 
      businessProfile?.representative.name.isNotEmpty ?? false;

  /// 사업자 인증 상태
  String? get businessVerificationStatus => 
      businessProfile?.completionStatus;

  @override
  List<Object?> get props => [
        id,
        email,
        firstName,
        lastName,
        role,
        phoneNumber,
        avatarUrl,
        employeeId,
        department,
        designation,
        workLocation,
        joiningDate,
        isActive,
        isBiometricEnabled,
        businessProfile,
        organizationId,
        organizationName,
        createdAt,
        updatedAt,
      ];
}