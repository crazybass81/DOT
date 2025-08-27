import 'package:flutter_test/flutter_test.dart';
import 'package:dot_attendance/core/auth/role_guard.dart';
import 'package:dot_attendance/domain/entities/user/user_role.dart';

void main() {
  group('PermissionChecker', () {
    group('canManageStores', () {
      test('should allow super admin and master admin', () {
        expect(PermissionChecker.canManageStores(UserRole.superAdmin), true);
        expect(PermissionChecker.canManageStores(UserRole.masterAdmin), true);
      });

      test('should not allow admin and user', () {
        expect(PermissionChecker.canManageStores(UserRole.admin), false);
        expect(PermissionChecker.canManageStores(UserRole.user), false);
      });
    });

    group('canManageEmployees', () {
      test('should allow admin level and above', () {
        expect(PermissionChecker.canManageEmployees(UserRole.superAdmin), true);
        expect(PermissionChecker.canManageEmployees(UserRole.masterAdmin), true);
        expect(PermissionChecker.canManageEmployees(UserRole.admin), true);
      });

      test('should not allow user', () {
        expect(PermissionChecker.canManageEmployees(UserRole.user), false);
      });
    });

    group('canManageSchedules', () {
      test('should allow admin level and above', () {
        expect(PermissionChecker.canManageSchedules(UserRole.superAdmin), true);
        expect(PermissionChecker.canManageSchedules(UserRole.masterAdmin), true);
        expect(PermissionChecker.canManageSchedules(UserRole.admin), true);
      });

      test('should not allow user', () {
        expect(PermissionChecker.canManageSchedules(UserRole.user), false);
      });
    });

    group('canApproveAttendance', () {
      test('should allow admin level and above', () {
        expect(PermissionChecker.canApproveAttendance(UserRole.superAdmin), true);
        expect(PermissionChecker.canApproveAttendance(UserRole.masterAdmin), true);
        expect(PermissionChecker.canApproveAttendance(UserRole.admin), true);
      });

      test('should not allow user', () {
        expect(PermissionChecker.canApproveAttendance(UserRole.user), false);
      });
    });

    group('canViewReports', () {
      test('should allow admin level and above', () {
        expect(PermissionChecker.canViewReports(UserRole.superAdmin), true);
        expect(PermissionChecker.canViewReports(UserRole.masterAdmin), true);
        expect(PermissionChecker.canViewReports(UserRole.admin), true);
      });

      test('should not allow user', () {
        expect(PermissionChecker.canViewReports(UserRole.user), false);
      });
    });

    group('canManagePayroll', () {
      test('should allow super admin and master admin', () {
        expect(PermissionChecker.canManagePayroll(UserRole.superAdmin), true);
        expect(PermissionChecker.canManagePayroll(UserRole.masterAdmin), true);
      });

      test('should not allow admin and user', () {
        expect(PermissionChecker.canManagePayroll(UserRole.admin), false);
        expect(PermissionChecker.canManagePayroll(UserRole.user), false);
      });
    });

    group('canViewAllStores', () {
      test('should allow only super admin', () {
        expect(PermissionChecker.canViewAllStores(UserRole.superAdmin), true);
      });

      test('should not allow other roles', () {
        expect(PermissionChecker.canViewAllStores(UserRole.masterAdmin), false);
        expect(PermissionChecker.canViewAllStores(UserRole.admin), false);
        expect(PermissionChecker.canViewAllStores(UserRole.user), false);
      });
    });

    group('canManageSystemSettings', () {
      test('should allow only super admin', () {
        expect(PermissionChecker.canManageSystemSettings(UserRole.superAdmin), true);
      });

      test('should not allow other roles', () {
        expect(PermissionChecker.canManageSystemSettings(UserRole.masterAdmin), false);
        expect(PermissionChecker.canManageSystemSettings(UserRole.admin), false);
        expect(PermissionChecker.canManageSystemSettings(UserRole.user), false);
      });
    });
  });

  group('NavigationItemFilter', () {
    group('getItemsForRole', () {
      test('should return basic navigation items for user role', () {
        final items = NavigationItemFilter.getItemsForRole(UserRole.user);
        
        expect(items.length, 4);
        expect(items.map((item) => item.route), contains('/home'));
        expect(items.map((item) => item.route), contains('/qr-scan'));
        expect(items.map((item) => item.route), contains('/schedule'));
        expect(items.map((item) => item.route), contains('/profile'));
        
        // Should not contain admin items
        expect(items.map((item) => item.route), isNot(contains('/employees')));
        expect(items.map((item) => item.route), isNot(contains('/approvals')));
      });

      test('should include management items for admin role', () {
        final items = NavigationItemFilter.getItemsForRole(UserRole.admin);
        
        expect(items.length, 6);
        expect(items.map((item) => item.route), contains('/home'));
        expect(items.map((item) => item.route), contains('/qr-scan'));
        expect(items.map((item) => item.route), contains('/employees'));
        expect(items.map((item) => item.route), contains('/approvals'));
        expect(items.map((item) => item.route), contains('/schedule'));
        expect(items.map((item) => item.route), contains('/profile'));
        
        // Should not contain master admin items
        expect(items.map((item) => item.route), isNot(contains('/stores')));
        expect(items.map((item) => item.route), isNot(contains('/payroll')));
      });

      test('should include additional items for master admin role', () {
        final items = NavigationItemFilter.getItemsForRole(UserRole.masterAdmin);
        
        expect(items.length, 8);
        expect(items.map((item) => item.route), contains('/home'));
        expect(items.map((item) => item.route), contains('/qr-scan'));
        expect(items.map((item) => item.route), contains('/employees'));
        expect(items.map((item) => item.route), contains('/approvals'));
        expect(items.map((item) => item.route), contains('/stores'));
        expect(items.map((item) => item.route), contains('/payroll'));
        expect(items.map((item) => item.route), contains('/schedule'));
        expect(items.map((item) => item.route), contains('/profile'));
        
        // Should not contain super admin items
        expect(items.map((item) => item.route), isNot(contains('/system-settings')));
      });

      test('should include all items for super admin role', () {
        final items = NavigationItemFilter.getItemsForRole(UserRole.superAdmin);
        
        expect(items.length, 9);
        expect(items.map((item) => item.route), contains('/home'));
        expect(items.map((item) => item.route), contains('/qr-scan'));
        expect(items.map((item) => item.route), contains('/employees'));
        expect(items.map((item) => item.route), contains('/approvals'));
        expect(items.map((item) => item.route), contains('/stores'));
        expect(items.map((item) => item.route), contains('/payroll'));
        expect(items.map((item) => item.route), contains('/schedule'));
        expect(items.map((item) => item.route), contains('/profile'));
        expect(items.map((item) => item.route), contains('/system-settings'));
      });

      test('should have correct navigation item structure', () {
        final items = NavigationItemFilter.getItemsForRole(UserRole.user);
        final homeItem = items.firstWhere((item) => item.route == '/home');
        
        expect(homeItem.label, '홈');
        expect(homeItem.icon, isNotNull);
        expect(homeItem.selectedIcon, isNotNull);
        expect(homeItem.route, '/home');
      });

      test('should maintain correct order for all roles', () {
        final userItems = NavigationItemFilter.getItemsForRole(UserRole.user);
        final adminItems = NavigationItemFilter.getItemsForRole(UserRole.admin);
        final masterAdminItems = NavigationItemFilter.getItemsForRole(UserRole.masterAdmin);
        final superAdminItems = NavigationItemFilter.getItemsForRole(UserRole.superAdmin);
        
        // Basic items should always be in the same positions
        expect(userItems[0].route, '/home');
        expect(userItems[1].route, '/qr-scan');
        expect(userItems[2].route, '/schedule');
        expect(userItems[3].route, '/profile');
        
        // Admin items should be inserted correctly
        expect(adminItems[0].route, '/home');
        expect(adminItems[1].route, '/qr-scan');
        expect(adminItems[2].route, '/employees');
        expect(adminItems[3].route, '/approvals');
        expect(adminItems[4].route, '/schedule');
        expect(adminItems[5].route, '/profile');
      });
    });

    group('NavigationItem', () {
      test('should create navigation item correctly', () {
        const item = NavigationItem(
          icon: Icons.home_outlined,
          selectedIcon: Icons.home,
          label: '홈',
          route: '/home',
        );

        expect(item.icon, Icons.home_outlined);
        expect(item.selectedIcon, Icons.home);
        expect(item.label, '홈');
        expect(item.route, '/home');
      });
    });
  });

  group('Permission Consistency', () {
    test('UserRole methods should match PermissionChecker methods', () {
      // Test consistency between UserRole and PermissionChecker
      for (final role in UserRole.values) {
        expect(
          role.canManageStores,
          PermissionChecker.canManageStores(role),
          reason: 'canManageStores inconsistent for $role',
        );

        expect(
          role.canManageEmployees,
          PermissionChecker.canManageEmployees(role),
          reason: 'canManageEmployees inconsistent for $role',
        );

        expect(
          role.canApproveAttendance,
          PermissionChecker.canApproveAttendance(role),
          reason: 'canApproveAttendance inconsistent for $role',
        );

        expect(
          role.canViewReports,
          PermissionChecker.canViewReports(role),
          reason: 'canViewReports inconsistent for $role',
        );

        expect(
          role.canManagePayroll,
          PermissionChecker.canManagePayroll(role),
          reason: 'canManagePayroll inconsistent for $role',
        );

        expect(
          role.canViewAllStores,
          PermissionChecker.canViewAllStores(role),
          reason: 'canViewAllStores inconsistent for $role',
        );

        expect(
          role.canAccessSystemSettings,
          PermissionChecker.canManageSystemSettings(role),
          reason: 'canAccessSystemSettings inconsistent for $role',
        );
      }
    });
  });

  group('Edge Cases', () {
    test('should handle all user roles in navigation filter', () {
      // Ensure all roles return valid navigation items
      for (final role in UserRole.values) {
        final items = NavigationItemFilter.getItemsForRole(role);
        
        expect(items, isNotEmpty, reason: 'No navigation items for $role');
        expect(items.every((item) => item.route.isNotEmpty), true, reason: 'Empty route found for $role');
        expect(items.every((item) => item.label.isNotEmpty), true, reason: 'Empty label found for $role');
      }
    });

    test('should have unique routes for each role', () {
      for (final role in UserRole.values) {
        final items = NavigationItemFilter.getItemsForRole(role);
        final routes = items.map((item) => item.route).toList();
        final uniqueRoutes = routes.toSet();
        
        expect(routes.length, uniqueRoutes.length, reason: 'Duplicate routes found for $role');
      }
    });

    test('should include basic routes for all roles', () {
      final basicRoutes = ['/home', '/qr-scan', '/schedule', '/profile'];
      
      for (final role in UserRole.values) {
        final items = NavigationItemFilter.getItemsForRole(role);
        final routes = items.map((item) => item.route).toList();
        
        for (final basicRoute in basicRoutes) {
          expect(routes, contains(basicRoute), reason: 'Missing basic route $basicRoute for $role');
        }
      }
    });
  });
}