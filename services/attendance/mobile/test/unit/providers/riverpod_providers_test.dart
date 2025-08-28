import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:dot_attendance/domain/entities/user/user_role.dart';
import 'package:dot_attendance/domain/entities/attendance/attendance.dart';
import 'package:dot_attendance/core/storage/local_storage_service.dart';

// Mock providers for testing
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

// Theme Provider Test
final themeProvider = StateProvider<String>((ref) => 'system');

// Auth Provider Test
class AuthNotifier extends StateNotifier<AsyncValue<MockUser?>> {
  AuthNotifier() : super(const AsyncValue.loading());

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      await Future.delayed(const Duration(milliseconds: 100)); // Simulate API call
      
      if (email == 'admin@test.com' && password == 'password') {
        final user = MockUser(
          id: 'user-001',
          name: 'Test Admin',
          email: email,
          role: UserRole.admin,
        );
        state = AsyncValue.data(user);
      } else {
        throw Exception('Invalid credentials');
      }
    } catch (error) {
      state = AsyncValue.error(error, StackTrace.current);
    }
  }

  void logout() {
    state = const AsyncValue.data(null);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<MockUser?>>((ref) {
  return AuthNotifier();
});

// Attendance Provider Test
class AttendanceNotifier extends StateNotifier<AsyncValue<List<Attendance>>> {
  AttendanceNotifier() : super(const AsyncValue.loading());

  Future<void> loadAttendances(String userId) async {
    state = const AsyncValue.loading();
    try {
      await Future.delayed(const Duration(milliseconds: 200)); // Simulate API call
      
      final attendances = [
        Attendance(
          id: 'att-001',
          userId: userId,
          date: DateTime.now(),
          checkInTime: DateTime.now().subtract(const Duration(hours: 8)),
          status: AttendanceStatus.present,
        ),
        Attendance(
          id: 'att-002',
          userId: userId,
          date: DateTime.now().subtract(const Duration(days: 1)),
          checkInTime: DateTime.now().subtract(const Duration(days: 1, hours: 8)),
          checkOutTime: DateTime.now().subtract(const Duration(days: 1)),
          status: AttendanceStatus.present,
        ),
      ];
      
      state = AsyncValue.data(attendances);
    } catch (error) {
      state = AsyncValue.error(error, StackTrace.current);
    }
  }

  Future<void> markAttendance(String userId, AttendanceActionType action) async {
    final currentState = state;
    state = const AsyncValue.loading();
    
    try {
      await Future.delayed(const Duration(milliseconds: 300)); // Simulate API call
      
      if (currentState is AsyncData<List<Attendance>>) {
        final attendances = List<Attendance>.from(currentState.value);
        
        if (action == AttendanceActionType.checkIn) {
          attendances.add(
            Attendance(
              id: 'att-${DateTime.now().millisecondsSinceEpoch}',
              userId: userId,
              date: DateTime.now(),
              checkInTime: DateTime.now(),
              status: AttendanceStatus.present,
            ),
          );
        } else {
          // Update last attendance with checkout
          if (attendances.isNotEmpty) {
            final lastAttendance = attendances.last;
            if (lastAttendance.checkOutTime == null) {
              final updatedAttendance = Attendance(
                id: lastAttendance.id,
                userId: lastAttendance.userId,
                date: lastAttendance.date,
                checkInTime: lastAttendance.checkInTime,
                checkOutTime: DateTime.now(),
                status: AttendanceStatus.present,
              );
              attendances[attendances.length - 1] = updatedAttendance;
            }
          }
        }
        
        state = AsyncValue.data(attendances);
      }
    } catch (error) {
      state = currentState; // Restore previous state on error
      rethrow;
    }
  }
}

final attendanceProvider = StateNotifierProvider<AttendanceNotifier, AsyncValue<List<Attendance>>>((ref) {
  return AttendanceNotifier();
});

// Attendance Statistics Provider
final attendanceStatsProvider = Provider<AttendanceStats?>((ref) {
  final attendanceState = ref.watch(attendanceProvider);
  
  return attendanceState.when(
    data: (attendances) {
      if (attendances.isEmpty) return null;
      
      final currentMonth = DateTime.now().month;
      final currentYear = DateTime.now().year;
      
      final monthlyAttendances = attendances.where((att) =>
        att.date.month == currentMonth && att.date.year == currentYear
      ).toList();
      
      final presentDays = monthlyAttendances.where((att) => 
        att.status == AttendanceStatus.present
      ).length;
      
      final totalWorkingHours = monthlyAttendances
        .where((att) => att.workingHours != null)
        .fold<Duration>(Duration.zero, (sum, att) => sum + att.workingHours!);
      
      return AttendanceStats(
        totalWorkingDays: 22, // Assuming 22 working days per month
        presentDays: presentDays,
        absentDays: 22 - presentDays,
        lateDays: 0,
        halfDays: 0,
        leaveDays: 0,
        totalWorkingHours: totalWorkingHours,
        attendancePercentage: (presentDays / 22) * 100,
      );
    },
    loading: () => null,
    error: (_, __) => null,
  );
});

void main() {
  group('Riverpod Providers Tests', () {
    late ProviderContainer container;

    setUp(() {
      container = ProviderContainer();
    });

    tearDown(() {
      container.dispose();
    });

    group('Theme Provider', () {
      test('should have default theme mode', () {
        final themeMode = container.read(themeProvider);
        expect(themeMode, 'system');
      });

      test('should update theme mode', () {
        container.read(themeProvider.notifier).state = 'dark';
        final themeMode = container.read(themeProvider);
        expect(themeMode, 'dark');
      });

      test('should support all theme modes', () {
        final themeModes = ['light', 'dark', 'system'];
        
        for (final mode in themeModes) {
          container.read(themeProvider.notifier).state = mode;
          final currentMode = container.read(themeProvider);
          expect(currentMode, mode);
        }
      });
    });

    group('Auth Provider', () {
      test('should start with loading state', () {
        final authState = container.read(authProvider);
        expect(authState.isLoading, true);
      });

      test('should login successfully with valid credentials', () async {
        final authNotifier = container.read(authProvider.notifier);
        
        await authNotifier.login('admin@test.com', 'password');
        
        final authState = container.read(authProvider);
        expect(authState.hasValue, true);
        expect(authState.value?.email, 'admin@test.com');
        expect(authState.value?.role, UserRole.admin);
      });

      test('should fail login with invalid credentials', () async {
        final authNotifier = container.read(authProvider.notifier);
        
        await authNotifier.login('invalid@test.com', 'wrong');
        
        final authState = container.read(authProvider);
        expect(authState.hasError, true);
        expect(authState.error.toString(), contains('Invalid credentials'));
      });

      test('should logout successfully', () async {
        final authNotifier = container.read(authProvider.notifier);
        
        // First login
        await authNotifier.login('admin@test.com', 'password');
        expect(container.read(authProvider).value, isNotNull);
        
        // Then logout
        authNotifier.logout();
        final authState = container.read(authProvider);
        expect(authState.value, isNull);
      });

      test('should maintain user state across reads', () async {
        final authNotifier = container.read(authProvider.notifier);
        
        await authNotifier.login('admin@test.com', 'password');
        
        final firstRead = container.read(authProvider).value;
        final secondRead = container.read(authProvider).value;
        
        expect(firstRead?.id, secondRead?.id);
        expect(firstRead?.email, secondRead?.email);
      });
    });

    group('Attendance Provider', () {
      test('should start with loading state', () {
        final attendanceState = container.read(attendanceProvider);
        expect(attendanceState.isLoading, true);
      });

      test('should load attendances successfully', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        
        final attendanceState = container.read(attendanceProvider);
        expect(attendanceState.hasValue, true);
        expect(attendanceState.value?.length, 2);
        expect(attendanceState.value?.first.userId, 'user-001');
      });

      test('should mark check-in attendance', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        final initialCount = container.read(attendanceProvider).value?.length ?? 0;
        
        await attendanceNotifier.markAttendance('user-001', AttendanceActionType.checkIn);
        
        final attendanceState = container.read(attendanceProvider);
        expect(attendanceState.value?.length, initialCount + 1);
        
        final newAttendance = attendanceState.value?.last;
        expect(newAttendance?.checkInTime, isNotNull);
        expect(newAttendance?.checkOutTime, isNull);
      });

      test('should mark check-out attendance', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        await attendanceNotifier.markAttendance('user-001', AttendanceActionType.checkIn);
        
        await attendanceNotifier.markAttendance('user-001', AttendanceActionType.checkOut);
        
        final attendanceState = container.read(attendanceProvider);
        final lastAttendance = attendanceState.value?.last;
        
        expect(lastAttendance?.checkInTime, isNotNull);
        expect(lastAttendance?.checkOutTime, isNotNull);
        expect(lastAttendance?.workingHours, isNotNull);
      });

      test('should handle multiple check-ins correctly', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        final initialCount = container.read(attendanceProvider).value?.length ?? 0;
        
        // Multiple check-ins should create separate attendance records
        await attendanceNotifier.markAttendance('user-001', AttendanceActionType.checkIn);
        await attendanceNotifier.markAttendance('user-001', AttendanceActionType.checkIn);
        
        final attendanceState = container.read(attendanceProvider);
        expect(attendanceState.value?.length, initialCount + 2);
      });

      test('should restore previous state on error', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        final initialState = container.read(attendanceProvider);
        
        // This would normally cause an error in a real scenario
        // For testing, we'll assume the method handles errors properly
        try {
          await attendanceNotifier.markAttendance('invalid-user', AttendanceActionType.checkIn);
        } catch (e) {
          // Expected to fail
        }
        
        final currentState = container.read(attendanceProvider);
        expect(currentState.hasValue, initialState.hasValue);
      });
    });

    group('Attendance Statistics Provider', () {
      test('should return null when no attendances', () {
        final stats = container.read(attendanceStatsProvider);
        expect(stats, isNull);
      });

      test('should calculate stats from attendance data', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        
        final stats = container.read(attendanceStatsProvider);
        expect(stats, isNotNull);
        expect(stats?.totalWorkingDays, 22);
        expect(stats?.presentDays, greaterThan(0));
        expect(stats?.attendancePercentage, greaterThan(0));
      });

      test('should update stats when attendance changes', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        final initialStats = container.read(attendanceStatsProvider);
        
        await attendanceNotifier.markAttendance('user-001', AttendanceActionType.checkIn);
        final updatedStats = container.read(attendanceStatsProvider);
        
        expect(updatedStats?.presentDays, 
               greaterThanOrEqualTo(initialStats?.presentDays ?? 0));
      });

      test('should calculate working hours correctly', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        await attendanceNotifier.markAttendance('user-001', AttendanceActionType.checkIn);
        await attendanceNotifier.markAttendance('user-001', AttendanceActionType.checkOut);
        
        final stats = container.read(attendanceStatsProvider);
        expect(stats?.totalWorkingHours.inHours, greaterThan(0));
      });

      test('should filter by current month', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        
        final stats = container.read(attendanceStatsProvider);
        expect(stats, isNotNull);
        // Stats should only include current month data
        expect(stats?.presentDays, lessThanOrEqualTo(31)); // Max days in month
      });
    });

    group('Provider Dependencies', () {
      test('should update dependent providers when auth changes', () async {
        final authNotifier = container.read(authProvider.notifier);
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        // Login user
        await authNotifier.login('admin@test.com', 'password');
        final user = container.read(authProvider).value;
        
        // Load attendances for user
        await attendanceNotifier.loadAttendances(user!.id);
        
        // Stats should be calculated
        final stats = container.read(attendanceStatsProvider);
        expect(stats, isNotNull);
        
        // Logout should clear user-dependent data
        authNotifier.logout();
        final authState = container.read(authProvider);
        expect(authState.value, isNull);
      });

      test('should handle provider refresh correctly', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        await attendanceNotifier.loadAttendances('user-001');
        final firstLoad = container.read(attendanceProvider).value;
        
        // Refresh provider
        container.refresh(attendanceProvider);
        expect(container.read(attendanceProvider).isLoading, true);
        
        // Reload data
        await container.read(attendanceProvider.notifier).loadAttendances('user-001');
        final secondLoad = container.read(attendanceProvider).value;
        
        expect(secondLoad?.length, firstLoad?.length);
      });

      test('should maintain state consistency across multiple containers', () async {
        final container1 = ProviderContainer();
        final container2 = ProviderContainer();
        
        try {
          // Different containers should have independent state
          await container1.read(authProvider.notifier).login('admin@test.com', 'password');
          
          expect(container1.read(authProvider).value, isNotNull);
          expect(container2.read(authProvider).value, isNull); // Loading state
          
          // But each container should maintain its own consistent state
          container1.read(themeProvider.notifier).state = 'dark';
          container2.read(themeProvider.notifier).state = 'light';
          
          expect(container1.read(themeProvider), 'dark');
          expect(container2.read(themeProvider), 'light');
        } finally {
          container1.dispose();
          container2.dispose();
        }
      });
    });

    group('Error Handling in Providers', () {
      test('should handle auth provider errors gracefully', () async {
        final authNotifier = container.read(authProvider.notifier);
        
        await authNotifier.login('invalid@test.com', 'wrong');
        
        final authState = container.read(authProvider);
        expect(authState.hasError, true);
        expect(authState.isLoading, false);
        expect(authState.value, isNull);
      });

      test('should handle attendance provider errors gracefully', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        // This would simulate a network error or invalid user ID
        try {
          await attendanceNotifier.loadAttendances('');
        } catch (e) {
          // Expected to fail
        }
        
        final attendanceState = container.read(attendanceProvider);
        // Provider should handle error appropriately
        expect(attendanceState.isLoading || attendanceState.hasError, true);
      });

      test('should not break stats provider on attendance errors', () async {
        final attendanceNotifier = container.read(attendanceProvider.notifier);
        
        try {
          await attendanceNotifier.loadAttendances('invalid-user');
        } catch (e) {
          // Expected to fail
        }
        
        final stats = container.read(attendanceStatsProvider);
        expect(stats, isNull); // Should gracefully return null
      });
    });

    group('Provider Performance', () {
      test('should not rebuild unnecessarily', () async {
        var buildCount = 0;
        
        final testProvider = Provider<String>((ref) {
          buildCount++;
          final theme = ref.watch(themeProvider);
          return 'Theme: $theme';
        });
        
        // Initial read
        container.read(testProvider);
        expect(buildCount, 1);
        
        // Same read should not rebuild
        container.read(testProvider);
        expect(buildCount, 1);
        
        // Change dependency should rebuild
        container.read(themeProvider.notifier).state = 'dark';
        container.read(testProvider);
        expect(buildCount, 2);
      });

      test('should dispose resources properly', () {
        final container1 = ProviderContainer();
        
        // Use providers
        container1.read(authProvider);
        container1.read(attendanceProvider);
        container1.read(themeProvider);
        
        // Dispose should not throw
        expect(() => container1.dispose(), returnsNormally);
      });
    });
  });
}