/// 사용자 역할 열거형
enum UserRole {
  superAdmin('SUPER_ADMIN', '슈퍼 관리자', 4),
  masterAdmin('MASTER_ADMIN', '마스터 관리자', 3),
  admin('ADMIN', '관리자', 2),
  user('USER', '직원', 1);

  final String code;
  final String displayName;
  final int level;

  const UserRole(this.code, this.displayName, this.level);

  /// 코드에서 UserRole로 변환
  static UserRole fromCode(String code) {
    return UserRole.values.firstWhere(
      (role) => role.code == code,
      orElse: () => UserRole.user,
    );
  }

  /// 권한 레벨 비교
  bool hasHigherOrEqualAuthority(UserRole other) {
    return level >= other.level;
  }

  /// 특정 권한 체크
  bool get canManageStores =>
      this == UserRole.superAdmin || this == UserRole.masterAdmin;

  bool get canManageEmployees => level >= UserRole.admin.level;

  bool get canApproveAttendance => level >= UserRole.admin.level;

  bool get canViewReports => level >= UserRole.admin.level;

  bool get canManagePayroll =>
      this == UserRole.superAdmin || this == UserRole.masterAdmin;

  bool get canAccessSystemSettings => this == UserRole.superAdmin;

  bool get canViewAllStores => this == UserRole.superAdmin;

  /// 역할별 색상
  Color get color {
    switch (this) {
      case UserRole.superAdmin:
        return const Color(0xFFCCFF00); // 형광 옐로
      case UserRole.masterAdmin:
        return const Color(0xFFA78BFA); // 파스텔 라일락
      case UserRole.admin:
        return const Color(0xFF60A5FA); // 파스텔 스카이
      case UserRole.user:
        return const Color(0xFF6EE7B7); // 파스텔 민트
    }
  }

  /// 역할별 아이콘
  IconData get icon {
    switch (this) {
      case UserRole.superAdmin:
        return Icons.admin_panel_settings;
      case UserRole.masterAdmin:
        return Icons.supervised_user_circle;
      case UserRole.admin:
        return Icons.manage_accounts;
      case UserRole.user:
        return Icons.person;
    }
  }
}

/// 권한 확장 메서드
extension UserRoleExtensions on UserRole {
  /// 역할 배지 위젯 생성을 위한 속성
  Map<String, dynamic> get badgeProperties => {
        'text': displayName,
        'backgroundColor': color.withOpacity(0.1),
        'textColor': color,
        'borderColor': color,
        'icon': icon,
      };
}

// Flutter material import for Color and IconData
import 'package:flutter/material.dart';