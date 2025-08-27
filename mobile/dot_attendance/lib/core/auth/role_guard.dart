import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/entities/user/user_role.dart';
import '../../presentation/providers/auth_provider.dart';
import '../../presentation/pages/errors/forbidden_page.dart';

/// 역할 기반 접근 제어를 위한 Guard 위젯
class RoleGuard extends ConsumerWidget {
  final List<UserRole> allowedRoles;
  final Widget child;
  final Widget? fallback;
  final bool redirectToForbidden;

  const RoleGuard({
    super.key,
    required this.allowedRoles,
    required this.child,
    this.fallback,
    this.redirectToForbidden = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      data: (user) {
        if (user == null) {
          // 인증되지 않은 사용자
          if (redirectToForbidden) {
            return const ForbiddenPage(
              message: '로그인이 필요합니다',
            );
          }
          return fallback ?? const SizedBox.shrink();
        }

        // 역할 체크
        if (allowedRoles.contains(user.role)) {
          return child;
        }

        // 권한 없음
        if (redirectToForbidden) {
          return const ForbiddenPage(
            message: '이 페이지에 접근할 권한이 없습니다',
          );
        }
        return fallback ?? const SizedBox.shrink();
      },
      loading: () => const Center(
        child: CircularProgressIndicator(),
      ),
      error: (error, stack) => Center(
        child: Text('오류: $error'),
      ),
    );
  }
}

/// 특정 권한을 체크하는 유틸리티 클래스
class PermissionChecker {
  static bool canManageStores(UserRole role) {
    return [UserRole.superAdmin, UserRole.masterAdmin].contains(role);
  }

  static bool canManageEmployees(UserRole role) {
    return [UserRole.superAdmin, UserRole.masterAdmin, UserRole.admin]
        .contains(role);
  }

  static bool canManageSchedules(UserRole role) {
    return [UserRole.superAdmin, UserRole.masterAdmin, UserRole.admin]
        .contains(role);
  }

  static bool canApproveAttendance(UserRole role) {
    return [UserRole.superAdmin, UserRole.masterAdmin, UserRole.admin]
        .contains(role);
  }

  static bool canViewReports(UserRole role) {
    return [UserRole.superAdmin, UserRole.masterAdmin, UserRole.admin]
        .contains(role);
  }

  static bool canManagePayroll(UserRole role) {
    return [UserRole.superAdmin, UserRole.masterAdmin].contains(role);
  }

  static bool canViewAllStores(UserRole role) {
    return role == UserRole.superAdmin;
  }

  static bool canManageSystemSettings(UserRole role) {
    return role == UserRole.superAdmin;
  }
}

/// 조건부 권한 위젯 - 권한에 따라 위젯을 표시하거나 숨김
class ConditionalRoleWidget extends ConsumerWidget {
  final List<UserRole> allowedRoles;
  final Widget child;
  final Widget? placeholder;

  const ConditionalRoleWidget({
    super.key,
    required this.allowedRoles,
    required this.child,
    this.placeholder,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.maybeWhen(
      data: (user) {
        if (user != null && allowedRoles.contains(user.role)) {
          return child;
        }
        return placeholder ?? const SizedBox.shrink();
      },
      orElse: () => placeholder ?? const SizedBox.shrink(),
    );
  }
}

/// 권한별 네비게이션 아이템 필터
class NavigationItemFilter {
  static List<NavigationItem> getItemsForRole(UserRole role) {
    final allItems = <NavigationItem>[
      // 모든 사용자
      const NavigationItem(
        icon: Icons.home_outlined,
        selectedIcon: Icons.home,
        label: '홈',
        route: '/home',
      ),
      const NavigationItem(
        icon: Icons.qr_code_scanner,
        selectedIcon: Icons.qr_code,
        label: 'QR',
        route: '/qr-scan',
      ),
      const NavigationItem(
        icon: Icons.calendar_today,
        selectedIcon: Icons.calendar_month,
        label: '스케줄',
        route: '/schedule',
      ),
      const NavigationItem(
        icon: Icons.person_outline,
        selectedIcon: Icons.person,
        label: '프로필',
        route: '/profile',
      ),
    ];

    // 관리자 이상
    if ([UserRole.admin, UserRole.masterAdmin, UserRole.superAdmin]
        .contains(role)) {
      allItems.insertAll(2, [
        const NavigationItem(
          icon: Icons.people_outline,
          selectedIcon: Icons.people,
          label: '직원',
          route: '/employees',
        ),
        const NavigationItem(
          icon: Icons.check_circle_outline,
          selectedIcon: Icons.check_circle,
          label: '승인',
          route: '/approvals',
        ),
      ]);
    }

    // 마스터 관리자 이상
    if ([UserRole.masterAdmin, UserRole.superAdmin].contains(role)) {
      allItems.insertAll(4, [
        const NavigationItem(
          icon: Icons.store_outlined,
          selectedIcon: Icons.store,
          label: '매장',
          route: '/stores',
        ),
        const NavigationItem(
          icon: Icons.payments_outlined,
          selectedIcon: Icons.payments,
          label: '급여',
          route: '/payroll',
        ),
      ]);
    }

    // 슈퍼 관리자
    if (role == UserRole.superAdmin) {
      allItems.add(
        const NavigationItem(
          icon: Icons.settings_outlined,
          selectedIcon: Icons.settings,
          label: '설정',
          route: '/system-settings',
        ),
      );
    }

    return allItems;
  }
}

/// 네비게이션 아이템 모델
class NavigationItem {
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final String route;

  const NavigationItem({
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.route,
  });
}