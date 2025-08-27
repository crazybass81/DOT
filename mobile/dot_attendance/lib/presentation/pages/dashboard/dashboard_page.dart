import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../domain/entities/user/user_role.dart';
import '../../../core/auth/role_guard.dart';
import '../../providers/auth_provider.dart';
import 'user_dashboard_page.dart';
import 'admin_dashboard_page.dart';
import 'master_admin_dashboard_page.dart';
import 'super_admin_dashboard_page.dart';

/// 역할 기반 대시보드 라우터
/// 사용자의 역할에 따라 적절한 대시보드를 보여줌
class DashboardPage extends ConsumerWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authStateProvider);

    return authState.when(
      data: (user) {
        if (user == null) {
          return const Scaffold(
            body: Center(
              child: Text('로그인이 필요합니다'),
            ),
          );
        }

        // 역할에 따른 대시보드 반환
        switch (user.role) {
          case UserRole.user:
            return const UserDashboardPage();
          case UserRole.admin:
            return const AdminDashboardPage();
          case UserRole.masterAdmin:
            return const MasterAdminDashboardPage();
          case UserRole.superAdmin:
            return const SuperAdminDashboardPage();
          default:
            return const UserDashboardPage();
        }
      },
      loading: () => const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      ),
      error: (error, stack) => Scaffold(
        body: Center(
          child: Text('오류가 발생했습니다: $error'),
        ),
      ),
    );
  }
}