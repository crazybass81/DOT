import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:dot_attendance/domain/entities/user/user_role.dart';

void main() {
  group('UserRole', () {
    group('fromCode', () {
      test('should return correct role for valid codes', () {
        expect(UserRole.fromCode('USER'), UserRole.user);
        expect(UserRole.fromCode('ADMIN'), UserRole.admin);
        expect(UserRole.fromCode('MASTER_ADMIN'), UserRole.masterAdmin);
        expect(UserRole.fromCode('SUPER_ADMIN'), UserRole.superAdmin);
      });

      test('should return user role for invalid codes', () {
        expect(UserRole.fromCode('INVALID'), UserRole.user);
        expect(UserRole.fromCode(''), UserRole.user);
      });
    });

    group('Authority Comparison', () {
      test('hasHigherOrEqualAuthority should work correctly', () {
        // Super admin has authority over all
        expect(UserRole.superAdmin.hasHigherOrEqualAuthority(UserRole.superAdmin), true);
        expect(UserRole.superAdmin.hasHigherOrEqualAuthority(UserRole.masterAdmin), true);
        expect(UserRole.superAdmin.hasHigherOrEqualAuthority(UserRole.admin), true);
        expect(UserRole.superAdmin.hasHigherOrEqualAuthority(UserRole.user), true);

        // Master admin
        expect(UserRole.masterAdmin.hasHigherOrEqualAuthority(UserRole.superAdmin), false);
        expect(UserRole.masterAdmin.hasHigherOrEqualAuthority(UserRole.masterAdmin), true);
        expect(UserRole.masterAdmin.hasHigherOrEqualAuthority(UserRole.admin), true);
        expect(UserRole.masterAdmin.hasHigherOrEqualAuthority(UserRole.user), true);

        // Admin
        expect(UserRole.admin.hasHigherOrEqualAuthority(UserRole.superAdmin), false);
        expect(UserRole.admin.hasHigherOrEqualAuthority(UserRole.masterAdmin), false);
        expect(UserRole.admin.hasHigherOrEqualAuthority(UserRole.admin), true);
        expect(UserRole.admin.hasHigherOrEqualAuthority(UserRole.user), true);

        // User
        expect(UserRole.user.hasHigherOrEqualAuthority(UserRole.superAdmin), false);
        expect(UserRole.user.hasHigherOrEqualAuthority(UserRole.masterAdmin), false);
        expect(UserRole.user.hasHigherOrEqualAuthority(UserRole.admin), false);
        expect(UserRole.user.hasHigherOrEqualAuthority(UserRole.user), true);
      });
    });

    group('Permission Checks', () {
      test('canManageStores should work correctly', () {
        expect(UserRole.superAdmin.canManageStores, true);
        expect(UserRole.masterAdmin.canManageStores, true);
        expect(UserRole.admin.canManageStores, false);
        expect(UserRole.user.canManageStores, false);
      });

      test('canManageEmployees should work correctly', () {
        expect(UserRole.superAdmin.canManageEmployees, true);
        expect(UserRole.masterAdmin.canManageEmployees, true);
        expect(UserRole.admin.canManageEmployees, true);
        expect(UserRole.user.canManageEmployees, false);
      });

      test('canApproveAttendance should work correctly', () {
        expect(UserRole.superAdmin.canApproveAttendance, true);
        expect(UserRole.masterAdmin.canApproveAttendance, true);
        expect(UserRole.admin.canApproveAttendance, true);
        expect(UserRole.user.canApproveAttendance, false);
      });

      test('canViewReports should work correctly', () {
        expect(UserRole.superAdmin.canViewReports, true);
        expect(UserRole.masterAdmin.canViewReports, true);
        expect(UserRole.admin.canViewReports, true);
        expect(UserRole.user.canViewReports, false);
      });

      test('canManagePayroll should work correctly', () {
        expect(UserRole.superAdmin.canManagePayroll, true);
        expect(UserRole.masterAdmin.canManagePayroll, true);
        expect(UserRole.admin.canManagePayroll, false);
        expect(UserRole.user.canManagePayroll, false);
      });

      test('canAccessSystemSettings should work correctly', () {
        expect(UserRole.superAdmin.canAccessSystemSettings, true);
        expect(UserRole.masterAdmin.canAccessSystemSettings, false);
        expect(UserRole.admin.canAccessSystemSettings, false);
        expect(UserRole.user.canAccessSystemSettings, false);
      });

      test('canViewAllStores should work correctly', () {
        expect(UserRole.superAdmin.canViewAllStores, true);
        expect(UserRole.masterAdmin.canViewAllStores, false);
        expect(UserRole.admin.canViewAllStores, false);
        expect(UserRole.user.canViewAllStores, false);
      });
    });

    group('Visual Properties', () {
      test('should have different colors for each role', () {
        expect(UserRole.superAdmin.color, const Color(0xFFCCFF00));
        expect(UserRole.masterAdmin.color, const Color(0xFFA78BFA));
        expect(UserRole.admin.color, const Color(0xFF60A5FA));
        expect(UserRole.user.color, const Color(0xFF6EE7B7));
      });

      test('should have different icons for each role', () {
        expect(UserRole.superAdmin.icon, Icons.admin_panel_settings);
        expect(UserRole.masterAdmin.icon, Icons.supervised_user_circle);
        expect(UserRole.admin.icon, Icons.manage_accounts);
        expect(UserRole.user.icon, Icons.person);
      });

      test('badge properties should be correct', () {
        final superAdminBadge = UserRole.superAdmin.badgeProperties;
        expect(superAdminBadge['text'], '슈퍼 관리자');
        expect(superAdminBadge['icon'], Icons.admin_panel_settings);
        expect(superAdminBadge['textColor'], const Color(0xFFCCFF00));

        final userBadge = UserRole.user.badgeProperties;
        expect(userBadge['text'], '직원');
        expect(userBadge['icon'], Icons.person);
        expect(userBadge['textColor'], const Color(0xFF6EE7B7));
      });
    });

    group('Level System', () {
      test('should have correct levels', () {
        expect(UserRole.user.level, 1);
        expect(UserRole.admin.level, 2);
        expect(UserRole.masterAdmin.level, 3);
        expect(UserRole.superAdmin.level, 4);
      });
    });

    group('Display Names', () {
      test('should have correct display names', () {
        expect(UserRole.user.displayName, '직원');
        expect(UserRole.admin.displayName, '관리자');
        expect(UserRole.masterAdmin.displayName, '마스터 관리자');
        expect(UserRole.superAdmin.displayName, '슈퍼 관리자');
      });

      test('should have correct codes', () {
        expect(UserRole.user.code, 'USER');
        expect(UserRole.admin.code, 'ADMIN');
        expect(UserRole.masterAdmin.code, 'MASTER_ADMIN');
        expect(UserRole.superAdmin.code, 'SUPER_ADMIN');
      });
    });
  });
}