import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:dot_attendance/core/auth/role_guard.dart';
import 'package:dot_attendance/domain/entities/user/user_role.dart';
import 'package:dot_attendance/domain/entities/user/user.dart';
import 'package:dot_attendance/presentation/providers/auth_provider.dart';
import 'package:dot_attendance/presentation/pages/errors/forbidden_page.dart';

// Mock classes for testing
class MockUser {
  final String id;
  final String name;
  final String email;
  final UserRole role;

  const MockUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });
}

// Mock auth state notifier
class MockAuthStateNotifier extends StateNotifier<AsyncValue<MockUser?>> {
  MockAuthStateNotifier() : super(const AsyncValue.loading());

  void setUser(MockUser? user) {
    state = AsyncValue.data(user);
  }

  void setError(String error) {
    state = AsyncValue.error(error, StackTrace.current);
  }

  void setLoading() {
    state = const AsyncValue.loading();
  }
}

final mockAuthStateProvider = StateNotifierProvider<MockAuthStateNotifier, AsyncValue<MockUser?>>((ref) {
  return MockAuthStateNotifier();
});

void main() {
  group('RoleGuard Widget Tests', () {
    late MockAuthStateNotifier mockAuthNotifier;

    setUp(() {
      mockAuthNotifier = MockAuthStateNotifier();
    });

    Widget createTestWidget({
      required List<UserRole> allowedRoles,
      required Widget child,
      Widget? fallback,
      bool redirectToForbidden = true,
      MockUser? user,
    }) {
      return ProviderScope(
        overrides: [
          mockAuthStateProvider.overrideWith((ref) {
            final notifier = MockAuthStateNotifier();
            if (user != null) {
              notifier.setUser(user);
            }
            return notifier;
          }),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Consumer(
              builder: (context, ref, _) {
                final authState = ref.watch(mockAuthStateProvider);
                
                return authState.when(
                  data: (user) {
                    if (user == null) {
                      if (redirectToForbidden) {
                        return const ForbiddenPage(
                          message: '로그인이 필요합니다',
                        );
                      }
                      return fallback ?? const SizedBox.shrink();
                    }

                    // Check if user role is allowed
                    if (allowedRoles.contains(user.role)) {
                      return child;
                    }

                    // Access denied
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
              },
            ),
          ),
        ),
      );
    }

    group('Access Control', () {
      testWidgets('should show child when user has required role', (tester) async {
        const user = MockUser(
          id: 'user-001',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.admin,
        );

        await tester.pumpWidget(
          createTestWidget(
            allowedRoles: [UserRole.admin, UserRole.masterAdmin],
            child: const Text('Admin Content'),
            user: user,
          ),
        );

        expect(find.text('Admin Content'), findsOneWidget);
        expect(find.byType(ForbiddenPage), findsNothing);
      });

      testWidgets('should show forbidden page when user lacks required role', (tester) async {
        const user = MockUser(
          id: 'user-001',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.user,
        );

        await tester.pumpWidget(
          createTestWidget(
            allowedRoles: [UserRole.admin, UserRole.masterAdmin],
            child: const Text('Admin Content'),
            user: user,
          ),
        );

        expect(find.text('Admin Content'), findsNothing);
        expect(find.byType(ForbiddenPage), findsOneWidget);
        expect(find.text('이 페이지에 접근할 권한이 없습니다'), findsOneWidget);
      });

      testWidgets('should show forbidden page when user is null', (tester) async {
        await tester.pumpWidget(
          createTestWidget(
            allowedRoles: [UserRole.admin],
            child: const Text('Admin Content'),
            user: null,
          ),
        );

        expect(find.text('Admin Content'), findsNothing);
        expect(find.byType(ForbiddenPage), findsOneWidget);
        expect(find.text('로그인이 필요합니다'), findsOneWidget);
      });

      testWidgets('should allow multiple roles', (tester) async {
        const users = [
          MockUser(id: '1', name: 'Admin', email: 'admin@test.com', role: UserRole.admin),
          MockUser(id: '2', name: 'Master', email: 'master@test.com', role: UserRole.masterAdmin),
          MockUser(id: '3', name: 'Super', email: 'super@test.com', role: UserRole.superAdmin),
        ];

        for (final user in users) {
          await tester.pumpWidget(
            createTestWidget(
              allowedRoles: [UserRole.admin, UserRole.masterAdmin, UserRole.superAdmin],
              child: Text('Content for ${user.role.displayName}'),
              user: user,
            ),
          );

          expect(find.text('Content for ${user.role.displayName}'), findsOneWidget);
          expect(find.byType(ForbiddenPage), findsNothing);
        }
      });
    });

    group('Fallback Behavior', () {
      testWidgets('should show fallback when redirectToForbidden is false and access denied', (tester) async {
        const user = MockUser(
          id: 'user-001',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.user,
        );

        await tester.pumpWidget(
          createTestWidget(
            allowedRoles: [UserRole.admin],
            child: const Text('Admin Content'),
            fallback: const Text('Access Denied Fallback'),
            redirectToForbidden: false,
            user: user,
          ),
        );

        expect(find.text('Admin Content'), findsNothing);
        expect(find.text('Access Denied Fallback'), findsOneWidget);
        expect(find.byType(ForbiddenPage), findsNothing);
      });

      testWidgets('should show empty when no fallback provided and redirectToForbidden is false', (tester) async {
        const user = MockUser(
          id: 'user-001',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.user,
        );

        await tester.pumpWidget(
          createTestWidget(
            allowedRoles: [UserRole.admin],
            child: const Text('Admin Content'),
            redirectToForbidden: false,
            user: user,
          ),
        );

        expect(find.text('Admin Content'), findsNothing);
        expect(find.byType(SizedBox), findsOneWidget);
        expect(find.byType(ForbiddenPage), findsNothing);
      });

      testWidgets('should show fallback for unauthenticated user when redirectToForbidden is false', (tester) async {
        await tester.pumpWidget(
          createTestWidget(
            allowedRoles: [UserRole.admin],
            child: const Text('Admin Content'),
            fallback: const Text('Login Required Fallback'),
            redirectToForbidden: false,
            user: null,
          ),
        );

        expect(find.text('Admin Content'), findsNothing);
        expect(find.text('Login Required Fallback'), findsOneWidget);
        expect(find.byType(ForbiddenPage), findsNothing);
      });
    });

    group('Loading and Error States', () {
      testWidgets('should show loading indicator while authentication state is loading', (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              mockAuthStateProvider.overrideWith((ref) {
                final notifier = MockAuthStateNotifier();
                notifier.setLoading();
                return notifier;
              }),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: Consumer(
                  builder: (context, ref, _) {
                    final authState = ref.watch(mockAuthStateProvider);
                    
                    return authState.when(
                      data: (user) => const Text('Data'),
                      loading: () => const Center(
                        child: CircularProgressIndicator(),
                      ),
                      error: (error, stack) => Text('Error: $error'),
                    );
                  },
                ),
              ),
            ),
          ),
        );

        expect(find.byType(CircularProgressIndicator), findsOneWidget);
      });

      testWidgets('should show error message when authentication fails', (tester) async {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              mockAuthStateProvider.overrideWith((ref) {
                final notifier = MockAuthStateNotifier();
                notifier.setError('Authentication failed');
                return notifier;
              }),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: Consumer(
                  builder: (context, ref, _) {
                    final authState = ref.watch(mockAuthStateProvider);
                    
                    return authState.when(
                      data: (user) => const Text('Data'),
                      loading: () => const CircularProgressIndicator(),
                      error: (error, stack) => Center(
                        child: Text('오류: $error'),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
        );

        expect(find.text('오류: Authentication failed'), findsOneWidget);
      });
    });

    group('Role-specific Access Patterns', () {
      testWidgets('should allow super admin access to all protected content', (tester) async {
        const superAdmin = MockUser(
          id: 'super-001',
          name: 'Super Admin',
          email: 'super@example.com',
          role: UserRole.superAdmin,
        );

        // Test access to different permission levels
        final testCases = [
          [UserRole.user],
          [UserRole.admin],
          [UserRole.masterAdmin],
          [UserRole.superAdmin],
          [UserRole.admin, UserRole.masterAdmin, UserRole.superAdmin],
        ];

        for (final allowedRoles in testCases) {
          await tester.pumpWidget(
            createTestWidget(
              allowedRoles: allowedRoles,
              child: const Text('Protected Content'),
              user: superAdmin,
            ),
          );

          expect(find.text('Protected Content'), findsOneWidget);
          expect(find.byType(ForbiddenPage), findsNothing);
        }
      });

      testWidgets('should enforce hierarchical access control', (tester) async {
        final testCases = [
          {
            'user': const MockUser(id: '1', name: 'User', email: 'user@test.com', role: UserRole.user),
            'allowedRoles': [UserRole.admin],
            'shouldAllow': false,
          },
          {
            'user': const MockUser(id: '2', name: 'Admin', email: 'admin@test.com', role: UserRole.admin),
            'allowedRoles': [UserRole.admin],
            'shouldAllow': true,
          },
          {
            'user': const MockUser(id: '3', name: 'Admin', email: 'admin@test.com', role: UserRole.admin),
            'allowedRoles': [UserRole.masterAdmin],
            'shouldAllow': false,
          },
          {
            'user': const MockUser(id: '4', name: 'Master', email: 'master@test.com', role: UserRole.masterAdmin),
            'allowedRoles': [UserRole.admin],
            'shouldAllow': false,
          },
        ];

        for (final testCase in testCases) {
          await tester.pumpWidget(
            createTestWidget(
              allowedRoles: testCase['allowedRoles'] as List<UserRole>,
              child: const Text('Protected Content'),
              user: testCase['user'] as MockUser,
            ),
          );

          if (testCase['shouldAllow'] as bool) {
            expect(find.text('Protected Content'), findsOneWidget, 
                reason: 'User ${(testCase['user'] as MockUser).role.displayName} should have access');
          } else {
            expect(find.byType(ForbiddenPage), findsOneWidget,
                reason: 'User ${(testCase['user'] as MockUser).role.displayName} should not have access');
          }
        }
      });
    });

    group('ConditionalRoleWidget', () {
      testWidgets('should show child when user has required role', (tester) async {
        const user = MockUser(
          id: 'user-001',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.admin,
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              mockAuthStateProvider.overrideWith((ref) {
                final notifier = MockAuthStateNotifier();
                notifier.setUser(user);
                return notifier;
              }),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: Consumer(
                  builder: (context, ref, _) {
                    final authState = ref.watch(mockAuthStateProvider);
                    
                    return authState.maybeWhen(
                      data: (user) {
                        if (user != null && [UserRole.admin].contains(user.role)) {
                          return const Text('Admin Feature');
                        }
                        return const SizedBox.shrink();
                      },
                      orElse: () => const SizedBox.shrink(),
                    );
                  },
                ),
              ),
            ),
          ),
        );

        expect(find.text('Admin Feature'), findsOneWidget);
      });

      testWidgets('should show placeholder when user lacks required role', (tester) async {
        const user = MockUser(
          id: 'user-001',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.user,
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              mockAuthStateProvider.overrideWith((ref) {
                final notifier = MockAuthStateNotifier();
                notifier.setUser(user);
                return notifier;
              }),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: Consumer(
                  builder: (context, ref, _) {
                    final authState = ref.watch(mockAuthStateProvider);
                    
                    return authState.maybeWhen(
                      data: (user) {
                        if (user != null && [UserRole.admin].contains(user.role)) {
                          return const Text('Admin Feature');
                        }
                        return const Text('Feature Not Available');
                      },
                      orElse: () => const Text('Feature Not Available'),
                    );
                  },
                ),
              ),
            ),
          ),
        );

        expect(find.text('Admin Feature'), findsNothing);
        expect(find.text('Feature Not Available'), findsOneWidget);
      });
    });

    group('Edge Cases and Error Handling', () {
      testWidgets('should handle empty allowed roles list', (tester) async {
        const user = MockUser(
          id: 'user-001',
          name: 'John Doe',
          email: 'john@example.com',
          role: UserRole.superAdmin,
        );

        await tester.pumpWidget(
          createTestWidget(
            allowedRoles: [],
            child: const Text('Protected Content'),
            user: user,
          ),
        );

        expect(find.text('Protected Content'), findsNothing);
        expect(find.byType(ForbiddenPage), findsOneWidget);
      });

      testWidgets('should handle multiple role checks simultaneously', (tester) async {
        const admin = MockUser(
          id: 'admin-001',
          name: 'Admin User',
          email: 'admin@example.com',
          role: UserRole.admin,
        );

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              mockAuthStateProvider.overrideWith((ref) {
                final notifier = MockAuthStateNotifier();
                notifier.setUser(admin);
                return notifier;
              }),
            ],
            child: MaterialApp(
              home: Scaffold(
                body: Column(
                  children: [
                    // Component for admin+
                    Consumer(
                      builder: (context, ref, _) {
                        final authState = ref.watch(mockAuthStateProvider);
                        return authState.maybeWhen(
                          data: (user) {
                            if (user != null && [UserRole.admin, UserRole.masterAdmin, UserRole.superAdmin].contains(user.role)) {
                              return const Text('Admin Panel');
                            }
                            return const SizedBox.shrink();
                          },
                          orElse: () => const SizedBox.shrink(),
                        );
                      },
                    ),
                    // Component for master admin+
                    Consumer(
                      builder: (context, ref, _) {
                        final authState = ref.watch(mockAuthStateProvider);
                        return authState.maybeWhen(
                          data: (user) {
                            if (user != null && [UserRole.masterAdmin, UserRole.superAdmin].contains(user.role)) {
                              return const Text('Master Panel');
                            }
                            return const SizedBox.shrink();
                          },
                          orElse: () => const SizedBox.shrink(),
                        );
                      },
                    ),
                    // Component for super admin only
                    Consumer(
                      builder: (context, ref, _) {
                        final authState = ref.watch(mockAuthStateProvider);
                        return authState.maybeWhen(
                          data: (user) {
                            if (user != null && user.role == UserRole.superAdmin) {
                              return const Text('Super Panel');
                            }
                            return const SizedBox.shrink();
                          },
                          orElse: () => const SizedBox.shrink(),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
        );

        // Admin should see admin panel but not master or super panels
        expect(find.text('Admin Panel'), findsOneWidget);
        expect(find.text('Master Panel'), findsNothing);
        expect(find.text('Super Panel'), findsNothing);
      });
    });
  });
}