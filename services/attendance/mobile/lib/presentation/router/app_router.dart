import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../pages/auth/login_page.dart';
import '../pages/auth/master_admin_login_page.dart';
import '../pages/auth/forgot_password_page.dart';
import '../pages/auth/biometric_setup_page.dart';
import '../pages/dashboard/dashboard_page.dart';
import '../pages/admin/master_admin_dashboard_page.dart';
import '../pages/admin/qr_generator_page.dart';
import '../pages/admin/qr_display_page.dart';
import '../pages/attendance/attendance_page.dart';
import '../pages/attendance/qr_scanner_page.dart';
import '../pages/attendance/location_check_page.dart';
import '../pages/registration/employee_registration_page.dart';
import '../../domain/entities/attendance/qr_action_type.dart';
import '../pages/profile/profile_page.dart';
import '../pages/profile/edit_profile_page.dart';
import '../pages/settings/settings_page.dart';
import '../pages/settings/notification_settings_page.dart';
import '../pages/settings/security_settings_page.dart';
import '../pages/reports/reports_page.dart';
import '../pages/reports/monthly_report_page.dart';
import '../pages/reports/custom_report_page.dart';
import '../widgets/common/main_navigation.dart';
import '../providers/auth_provider.dart';
import '../../domain/entities/user/user_role.dart';
// import '../../features/test/database_test_screen.dart';

// Route names
class RouteNames {
  static const String splash = '/';
  static const String masterAdminLogin = '/master-admin-login';
  static const String masterAdminDashboard = '/admin/dashboard';
  static const String qrGenerator = '/admin/qr-generator';
  static const String qrDisplay = '/admin/qr-display';
  static const String login = '/login';
  static const String forgotPassword = '/forgot-password';
  static const String biometricSetup = '/biometric-setup';
  static const String qrLogin = '/qr-login'; // Deep link for QR code login
  static const String userRegistration = '/user-registration'; // For first-time users
  static const String employeeRegistration = '/employee-registration'; // Employee registration
  
  static const String main = '/main';
  static const String dashboard = '/main/dashboard';
  static const String attendance = '/main/attendance';
  static const String qrScanner = '/main/attendance/qr-scanner';
  static const String locationCheck = '/main/attendance/location-check';
  static const String profile = '/main/profile';
  static const String editProfile = '/main/profile/edit';
  static const String settings = '/main/settings';
  static const String notificationSettings = '/main/settings/notifications';
  static const String securitySettings = '/main/settings/security';
  static const String reports = '/main/reports';
  static const String monthlyReport = '/main/reports/monthly';
  static const String customReport = '/main/reports/custom';
  static const String databaseTest = '/main/database-test';
}

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);
  
  return GoRouter(
    initialLocation: RouteNames.masterAdminLogin,
    debugLogDiagnostics: true,
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoading = authState.isLoading;
      
      // Handle QR deep link
      if (state.matchedLocation.startsWith(RouteNames.qrLogin)) {
        // Extract token from query params
        final token = state.uri.queryParameters['token'];
        if (token != null) {
          // Process QR login token
          // This will be handled by the QR login page
          return null;
        }
      }
      
      // If not authenticated, always go to master admin login
      if (!isAuthenticated) {
        if (state.matchedLocation != RouteNames.masterAdminLogin) {
          return RouteNames.masterAdminLogin;
        }
        return null;
      }
      
      // If authenticated and on login page, check user role
      if (isAuthenticated && state.matchedLocation == RouteNames.masterAdminLogin) {
        final userRole = authState.user?.role;
        
        // Route based on user role
        if (userRole == UserRole.masterAdmin || userRole == UserRole.admin || userRole == UserRole.superAdmin) {
          return RouteNames.masterAdminDashboard;
        } else {
          // Regular users go to the main dashboard
          return RouteNames.dashboard;
        }
      }
      
      return null;
    },
    routes: [
      // Splash route
      GoRoute(
        path: RouteNames.splash,
        builder: (context, state) => const SplashPage(),
      ),
      
      // Auth routes
      GoRoute(
        path: RouteNames.masterAdminLogin,
        builder: (context, state) => const MasterAdminLoginPage(),
      ),
      GoRoute(
        path: RouteNames.login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: RouteNames.forgotPassword,
        builder: (context, state) => const ForgotPasswordPage(),
      ),
      GoRoute(
        path: RouteNames.biometricSetup,
        builder: (context, state) => const BiometricSetupPage(),
      ),
      GoRoute(
        path: RouteNames.employeeRegistration,
        builder: (context, state) {
          final token = state.uri.queryParameters['token'];
          final locationId = state.uri.queryParameters['location'];
          return EmployeeRegistrationPage(
            qrToken: token,
            locationId: locationId,
          );
        },
      ),
      
      // Master Admin Dashboard
      GoRoute(
        path: RouteNames.masterAdminDashboard,
        builder: (context, state) => const MasterAdminDashboardPage(),
      ),
      
      // QR Code Generator
      GoRoute(
        path: RouteNames.qrGenerator,
        builder: (context, state) => const QrGeneratorPage(),
      ),
      
      // QR Code Display
      GoRoute(
        path: RouteNames.qrDisplay,
        builder: (context, state) {
          final locationId = state.uri.queryParameters['locationId'] ?? 'main_office';
          final locationName = state.uri.queryParameters['locationName'] ?? '본사';
              
          return QrDisplayPage(
            locationId: locationId,
            locationName: locationName,
          );
        },
      ),
      
      // Main app with bottom navigation
      ShellRoute(
        builder: (context, state, child) {
          return MainNavigation(child: child);
        },
        routes: [
          GoRoute(
            path: RouteNames.dashboard,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: DashboardPage(),
            ),
          ),
          GoRoute(
            path: RouteNames.attendance,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: AttendancePage(),
            ),
            routes: [
              GoRoute(
                path: 'qr-scanner',
                builder: (context, state) => const QrScannerPage(
                  actionType: QrActionType.login,
                ),
              ),
              GoRoute(
                path: 'location-check',
                builder: (context, state) => const LocationCheckPage(),
              ),
            ],
          ),
          GoRoute(
            path: RouteNames.profile,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ProfilePage(),
            ),
            routes: [
              GoRoute(
                path: 'edit',
                builder: (context, state) => const EditProfilePage(),
              ),
            ],
          ),
          GoRoute(
            path: RouteNames.settings,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: SettingsPage(),
            ),
            routes: [
              GoRoute(
                path: 'notifications',
                builder: (context, state) => const NotificationSettingsPage(),
              ),
              GoRoute(
                path: 'security',
                builder: (context, state) => const SecuritySettingsPage(),
              ),
            ],
          ),
          GoRoute(
            path: RouteNames.reports,
            pageBuilder: (context, state) => const NoTransitionPage(
              child: ReportsPage(),
            ),
            routes: [
              GoRoute(
                path: 'monthly',
                builder: (context, state) {
                  final month = state.uri.queryParameters['month'];
                  final year = state.uri.queryParameters['year'];
                  return MonthlyReportPage(
                    month: month != null ? int.tryParse(month) : null,
                    year: year != null ? int.tryParse(year) : null,
                  );
                },
              ),
              GoRoute(
                path: 'custom',
                builder: (context, state) => const CustomReportPage(),
              ),
            ],
          ),
          // Database test removed
          // GoRoute(
          //   path: RouteNames.databaseTest,
          //   pageBuilder: (context, state) => const NoTransitionPage(
          //     child: DatabaseTestScreen(),
          //   ),
          // ),
        ],
      ),
    ],
    errorBuilder: (context, state) => ErrorPage(error: state.error),
  );
});

bool _isAuthRoute(String location) {
  const authRoutes = [
    RouteNames.masterAdminLogin,
    RouteNames.login,
    RouteNames.forgotPassword,
    RouteNames.biometricSetup,
    RouteNames.splash,
    RouteNames.qrLogin,
    RouteNames.userRegistration,
  ];
  return authRoutes.any((route) => location.startsWith(route));
}

// Splash Page
class SplashPage extends ConsumerStatefulWidget {
  const SplashPage({super.key});

  @override
  ConsumerState<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends ConsumerState<SplashPage> {
  @override
  void initState() {
    super.initState();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // Initialize app dependencies, check auth status, etc.
    await Future.delayed(const Duration(seconds: 2));
    
    // Check authentication status
    await ref.read(authProvider.notifier).checkAuthStatus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // App logo
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(
                Icons.access_time_rounded,
                size: 60,
                color: Color(0xFF2E7D32),
              ),
            ),
            const SizedBox(height: 32),
            Text(
              'DOT Attendance',
              style: Theme.of(context).textTheme.displaySmall?.copyWith(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
            ),
          ],
        ),
      ),
    );
  }
}

// Error Page
class ErrorPage extends StatelessWidget {
  final Exception? error;
  
  const ErrorPage({super.key, this.error});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Error'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red,
              ),
              const SizedBox(height: 16),
              Text(
                'Something went wrong',
                style: Theme.of(context).textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                error?.toString() ?? 'Unknown error occurred',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () => context.go(RouteNames.dashboard),
                child: const Text('Go to Dashboard'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}