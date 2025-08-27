import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:dot_attendance/main.dart';
import 'package:dot_attendance/domain/entities/user/user_role.dart';
import 'package:dot_attendance/domain/entities/attendance/attendance.dart';
import 'package:dot_attendance/domain/entities/attendance/attendance_queue.dart';
import 'package:dot_attendance/core/services/qr_service.dart';
import 'package:dot_attendance/core/services/location_service.dart';
import 'package:dot_attendance/core/storage/local_storage_service.dart';

@GenerateMocks([QrService, LocationService, LocalStorageService])
import 'attendance_flow_test.mocks.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Attendance Flow Integration Tests', () {
    late MockQrService mockQrService;
    late MockLocationService mockLocationService;
    late MockLocalStorageService mockStorageService;

    setUp(() {
      mockQrService = MockQrService();
      mockLocationService = MockLocationService();
      mockStorageService = MockLocalStorageService();
    });

    group('QR Code Attendance Flow', () {
      testWidgets('should complete QR check-in flow successfully', (tester) async {
        // Mock successful QR scan
        when(mockQrService.validateQrCode(any)).thenReturn(true);
        when(mockQrService.parseQrCode(any)).thenReturn({
          'type': 'checkin',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
          'location_id': 'office-main',
        });
        when(mockQrService.isQrCodeExpired(any)).thenReturn(false);

        // Mock location permission and current location
        when(mockLocationService.hasLocationPermission()).thenAnswer((_) async => true);
        when(mockLocationService.getCurrentPosition()).thenAnswer((_) async => MockPosition());

        // Mock storage operations
        when(mockStorageService.getUserData()).thenReturn({
          'id': 'user-001',
          'name': 'John Doe',
          'email': 'john@example.com',
          'role': 'USER',
        });

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // 1. Navigate to QR scanner
        await tester.tap(find.text('QR 스캔'));
        await tester.pumpAndSettle();

        // 2. Simulate QR code scan
        await tester.tap(find.text('스캔 시뮬레이션'));
        await tester.pumpAndSettle();

        // 3. Verify attendance confirmation dialog
        expect(find.text('출근 체크인'), findsOneWidget);
        expect(find.text('확인'), findsOneWidget);

        // 4. Confirm attendance
        await tester.tap(find.text('확인'));
        await tester.pumpAndSettle();

        // 5. Verify success message
        expect(find.text('출근이 성공적으로 기록되었습니다'), findsOneWidget);

        // 6. Verify attendance is recorded in queue (offline mode)
        verify(mockStorageService.cacheAttendanceData(any, any)).called(1);
      });

      testWidgets('should handle QR check-out flow with GPS verification', (tester) async {
        // Mock user already checked in
        when(mockStorageService.getUserData()).thenReturn({
          'id': 'user-001',
          'name': 'John Doe',
          'email': 'john@example.com',
          'role': 'USER',
        });

        when(mockStorageService.getCachedAttendanceData('today')).thenReturn({
          'checkInTime': DateTime.now().subtract(const Duration(hours: 8)).toIso8601String(),
          'status': 'checked_in',
        });

        // Mock QR checkout scan
        when(mockQrService.validateQrCode(any)).thenReturn(true);
        when(mockQrService.parseQrCode(any)).thenReturn({
          'type': 'checkout',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
          'location_id': 'office-main',
        });

        // Mock GPS verification
        when(mockLocationService.getCurrentPosition()).thenAnswer((_) async => MockPosition(
          latitude: 37.5665, // Seoul office coordinates
          longitude: 126.9780,
        ));
        when(mockLocationService.isWithinRadius(any, any, any)).thenReturn(true);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Navigate to QR scanner
        await tester.tap(find.text('QR 스캔'));
        await tester.pumpAndSettle();

        // Simulate checkout QR scan
        await tester.tap(find.text('스캔 시뮬레이션'));
        await tester.pumpAndSettle();

        // Should show GPS verification step
        expect(find.text('위치 확인 중...'), findsOneWidget);
        await tester.pumpAndSettle(const Duration(seconds: 2));

        // Verify checkout confirmation
        expect(find.text('퇴근 체크아웃'), findsOneWidget);

        // Confirm checkout
        await tester.tap(find.text('확인'));
        await tester.pumpAndSettle();

        // Verify success and working hours calculation
        expect(find.text('퇴근이 성공적으로 기록되었습니다'), findsOneWidget);
        expect(find.text('근무시간: 8시간'), findsOneWidget);
      });

      testWidgets('should handle expired QR code', (tester) async {
        // Mock expired QR code
        when(mockQrService.validateQrCode(any)).thenReturn(true);
        when(mockQrService.parseQrCode(any)).thenReturn({
          'type': 'checkin',
          'timestamp': DateTime.now().subtract(const Duration(hours: 2)).millisecondsSinceEpoch,
          'location_id': 'office-main',
        });
        when(mockQrService.isQrCodeExpired(any)).thenReturn(true);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Navigate to QR scanner
        await tester.tap(find.text('QR 스캔'));
        await tester.pumpAndSettle();

        // Simulate expired QR scan
        await tester.tap(find.text('스캔 시뮬레이션'));
        await tester.pumpAndSettle();

        // Should show error message
        expect(find.text('QR 코드가 만료되었습니다'), findsOneWidget);
        expect(find.text('다시 시도'), findsOneWidget);

        // Tap retry button
        await tester.tap(find.text('다시 시도'));
        await tester.pumpAndSettle();

        // Should return to scanner
        expect(find.text('QR 코드를 스캔하세요'), findsOneWidget);
      });
    });

    group('GPS-based Attendance Flow', () {
      testWidgets('should complete GPS check-in when within office radius', (tester) async {
        // Mock location services
        when(mockLocationService.hasLocationPermission()).thenAnswer((_) async => true);
        when(mockLocationService.getCurrentPosition()).thenAnswer((_) async => MockPosition(
          latitude: 37.5665, // Within office radius
          longitude: 126.9780,
        ));
        when(mockLocationService.isWithinRadius(any, any, any)).thenReturn(true);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Navigate to GPS attendance
        await tester.tap(find.text('위치 출근'));
        await tester.pumpAndSettle();

        // Should show location checking
        expect(find.text('현재 위치 확인 중...'), findsOneWidget);
        await tester.pumpAndSettle(const Duration(seconds: 2));

        // Should show office location confirmation
        expect(find.text('서울 본사'), findsOneWidget);
        expect(find.text('사무실 내부 (25m)'), findsOneWidget);

        // Confirm GPS attendance
        await tester.tap(find.text('출근 기록'));
        await tester.pumpAndSettle();

        // Verify success
        expect(find.text('GPS 출근이 성공적으로 기록되었습니다'), findsOneWidget);
      });

      testWidgets('should reject GPS check-in when outside office radius', (tester) async {
        // Mock location outside office
        when(mockLocationService.hasLocationPermission()).thenAnswer((_) async => true);
        when(mockLocationService.getCurrentPosition()).thenAnswer((_) async => MockPosition(
          latitude: 37.4979, // Outside office radius (Gangnam)
          longitude: 127.0276,
        ));
        when(mockLocationService.isWithinRadius(any, any, any)).thenReturn(false);
        when(mockLocationService.calculateDistance(any, any, any, any)).thenReturn(15000.0); // 15km away

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Navigate to GPS attendance
        await tester.tap(find.text('위치 출근'));
        await tester.pumpAndSettle();

        // Wait for location check
        await tester.pumpAndSettle(const Duration(seconds: 2));

        // Should show distance warning
        expect(find.text('사무실에서 너무 멀리 떨어져 있습니다'), findsOneWidget);
        expect(find.text('거리: 15.0km'), findsOneWidget);

        // Should disable attendance button
        final attendanceButton = find.text('출근 기록');
        expect(tester.widget<ElevatedButton>(attendanceButton).enabled, false);
      });
    });

    group('Offline Mode and Sync', () {
      testWidgets('should queue attendance when offline and sync when online', (tester) async {
        // Mock offline state
        when(mockStorageService.getString('network_status')).thenReturn('offline');

        // Mock successful attendance data
        when(mockQrService.validateQrCode(any)).thenReturn(true);
        when(mockQrService.parseQrCode(any)).thenReturn({
          'type': 'checkin',
          'timestamp': DateTime.now().millisecondsSinceEpoch,
          'location_id': 'office-main',
        });

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Perform offline attendance
        await tester.tap(find.text('QR 스캔'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('스캔 시뮬레이션'));
        await tester.pumpAndSettle();

        await tester.tap(find.text('확인'));
        await tester.pumpAndSettle();

        // Should show offline indicator
        expect(find.text('오프라인 모드'), findsOneWidget);
        expect(find.text('연결되면 자동 동기화됩니다'), findsOneWidget);

        // Verify data is stored locally
        verify(mockStorageService.cacheAttendanceData(any, any)).called(1);

        // Simulate network coming back online
        when(mockStorageService.getString('network_status')).thenReturn('online');

        // Trigger sync by navigating back to home
        await tester.tap(find.text('홈'));
        await tester.pumpAndSettle();

        // Should show syncing indicator
        expect(find.text('동기화 중...'), findsOneWidget);
        await tester.pumpAndSettle(const Duration(seconds: 3));

        // Should show sync complete
        expect(find.text('동기화 완료'), findsOneWidget);
      });

      testWidgets('should handle sync failures gracefully', (tester) async {
        // Mock sync failure
        when(mockStorageService.getString('sync_status')).thenReturn('failed');
        when(mockStorageService.getStringList('failed_syncs')).thenReturn(['queue-001', 'queue-002']);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Should show sync failure indicator in home
        expect(find.text('동기화 실패'), findsOneWidget);
        expect(find.text('2개 항목'), findsOneWidget);

        // Tap on sync failure indicator
        await tester.tap(find.text('동기화 실패'));
        await tester.pumpAndSettle();

        // Should show retry sync dialog
        expect(find.text('동기화를 다시 시도하시겠습니까?'), findsOneWidget);

        // Retry sync
        await tester.tap(find.text('재시도'));
        await tester.pumpAndSettle();

        // Should show syncing again
        expect(find.text('동기화 중...'), findsOneWidget);
      });
    });

    group('Role-based Dashboard Access', () {
      testWidgets('should show role-appropriate dashboard for different user types', (tester) async {
        final testCases = [
          {
            'role': 'USER',
            'expectedFeatures': ['내 출근 현황', '금월 근무시간', '최근 출근 기록'],
            'hiddenFeatures': ['직원 관리', '승인 대기', '시스템 설정'],
          },
          {
            'role': 'ADMIN',
            'expectedFeatures': ['내 출근 현황', '직원 관리', '승인 대기', '근무 현황'],
            'hiddenFeatures': ['매장 관리', '급여 관리', '시스템 설정'],
          },
          {
            'role': 'MASTER_ADMIN',
            'expectedFeatures': ['직원 관리', '매장 관리', '급여 관리', '전체 현황'],
            'hiddenFeatures': ['시스템 설정'],
          },
          {
            'role': 'SUPER_ADMIN',
            'expectedFeatures': ['시스템 설정', '전체 매장', '사용자 관리', '시스템 로그'],
            'hiddenFeatures': [],
          },
        ];

        for (final testCase in testCases) {
          // Mock user with specific role
          when(mockStorageService.getUserData()).thenReturn({
            'id': 'user-001',
            'name': 'Test User',
            'email': 'test@example.com',
            'role': testCase['role'],
          });

          await tester.pumpWidget(
            ProviderScope(
              child: MaterialApp(
                home: MockAttendanceApp(),
              ),
            ),
          );

          await tester.pumpAndSettle();

          // Check expected features are visible
          for (final feature in testCase['expectedFeatures'] as List<String>) {
            expect(find.text(feature), findsOneWidget, 
                reason: '${testCase['role']} should see $feature');
          }

          // Check hidden features are not visible
          for (final feature in testCase['hiddenFeatures'] as List<String>) {
            expect(find.text(feature), findsNothing, 
                reason: '${testCase['role']} should not see $feature');
          }
        }
      });

      testWidgets('should handle permission escalation correctly', (tester) async {
        // Start as regular user
        when(mockStorageService.getUserData()).thenReturn({
          'id': 'user-001',
          'name': 'John Doe',
          'email': 'john@example.com',
          'role': 'USER',
        });

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Verify user sees basic dashboard
        expect(find.text('직원 관리'), findsNothing);

        // Simulate role upgrade (e.g., through settings sync)
        when(mockStorageService.getUserData()).thenReturn({
          'id': 'user-001',
          'name': 'John Doe',
          'email': 'john@example.com',
          'role': 'ADMIN',
        });

        // Trigger refresh by navigating away and back
        await tester.tap(find.text('프로필'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('홈'));
        await tester.pumpAndSettle();

        // Should now see admin features
        expect(find.text('직원 관리'), findsOneWidget);
        expect(find.text('승인 대기'), findsOneWidget);
      });
    });

    group('Error Handling and Edge Cases', () {
      testWidgets('should handle camera permission denial gracefully', (tester) async {
        // Mock camera permission denied
        when(mockQrService.initializeScanner(any)).thenThrow(
          const CameraPermissionException(message: 'Camera permission denied')
        );

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Navigate to QR scanner
        await tester.tap(find.text('QR 스캔'));
        await tester.pumpAndSettle();

        // Should show permission error
        expect(find.text('카메라 권한이 필요합니다'), findsOneWidget);
        expect(find.text('설정으로 이동'), findsOneWidget);

        // Tap settings button
        await tester.tap(find.text('설정으로 이동'));
        await tester.pumpAndSettle();

        // Should show permission guide
        expect(find.text('카메라 권한을 활성화해주세요'), findsOneWidget);
      });

      testWidgets('should handle GPS permission denial', (tester) async {
        // Mock GPS permission denied
        when(mockLocationService.hasLocationPermission()).thenAnswer((_) async => false);
        when(mockLocationService.requestLocationPermission()).thenAnswer((_) async => false);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Navigate to GPS attendance
        await tester.tap(find.text('위치 출근'));
        await tester.pumpAndSettle();

        // Should show location permission error
        expect(find.text('위치 권한이 필요합니다'), findsOneWidget);

        // Try to request permission
        await tester.tap(find.text('권한 요청'));
        await tester.pumpAndSettle();

        // Should show manual attendance option
        expect(find.text('수동 출근하기'), findsOneWidget);
      });

      testWidgets('should handle invalid QR codes', (tester) async {
        // Mock invalid QR code
        when(mockQrService.validateQrCode(any)).thenReturn(false);

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: MockAttendanceApp(),
            ),
          ),
        );

        await tester.pumpAndSettle();

        // Navigate to QR scanner
        await tester.tap(find.text('QR 스캔'));
        await tester.pumpAndSettle();

        // Simulate invalid QR scan
        await tester.tap(find.text('스캔 시뮬레이션'));
        await tester.pumpAndSettle();

        // Should show error message
        expect(find.text('유효하지 않은 QR 코드입니다'), findsOneWidget);
        expect(find.text('다시 스캔하세요'), findsOneWidget);
      });
    });
  });
}

// Mock classes for integration testing
class MockAttendanceApp extends StatelessWidget {
  const MockAttendanceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('DOT 출근')),
      body: const Column(
        children: [
          ListTile(
            title: Text('QR 스캔'),
            leading: Icon(Icons.qr_code_scanner),
          ),
          ListTile(
            title: Text('위치 출근'),
            leading: Icon(Icons.location_on),
          ),
          ListTile(
            title: Text('홈'),
            leading: Icon(Icons.home),
          ),
          ListTile(
            title: Text('프로필'),
            leading: Icon(Icons.person),
          ),
        ],
      ),
    );
  }
}

class MockPosition {
  final double latitude;
  final double longitude;

  MockPosition({
    this.latitude = 37.5665,
    this.longitude = 126.9780,
  });
}

class CameraPermissionException implements Exception {
  final String message;
  const CameraPermissionException({required this.message});

  @override
  String toString() => 'CameraPermissionException: $message';
}