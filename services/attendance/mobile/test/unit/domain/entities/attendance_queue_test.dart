import 'package:flutter_test/flutter_test.dart';
import 'package:dot_attendance/domain/entities/attendance/attendance_queue.dart';

void main() {
  group('AttendanceQueue', () {
    late DateTime testTimestamp;

    setUp(() {
      testTimestamp = DateTime(2024, 1, 15, 9, 0);
    });

    group('Construction', () {
      test('should create attendance queue with required fields', () {
        final queue = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'qr',
        );

        expect(queue.id, 'queue-001');
        expect(queue.userId, 'user-001');
        expect(queue.timestamp, testTimestamp);
        expect(queue.actionType, AttendanceActionType.checkIn);
        expect(queue.method, 'qr');
        expect(queue.status, QueueStatus.pending);
      });

      test('should create complete attendance queue record', () {
        final queue = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkOut,
          method: 'gps',
          latitude: 37.5665,
          longitude: 126.9780,
          locationName: 'Main Office',
          qrCodeData: 'DOT_QR|1705282800000|office-main',
          notes: 'Normal checkout',
          imageUrl: 'https://example.com/image.jpg',
          status: QueueStatus.syncing,
          createdAt: testTimestamp,
          retryCount: 1,
          lastError: 'Network timeout',
        );

        expect(queue.latitude, 37.5665);
        expect(queue.longitude, 126.9780);
        expect(queue.locationName, 'Main Office');
        expect(queue.qrCodeData, 'DOT_QR|1705282800000|office-main');
        expect(queue.notes, 'Normal checkout');
        expect(queue.imageUrl, 'https://example.com/image.jpg');
        expect(queue.status, QueueStatus.syncing);
        expect(queue.retryCount, 1);
        expect(queue.lastError, 'Network timeout');
      });
    });

    group('Action Types', () {
      test('should handle checkIn action type', () {
        final queue = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'qr',
        );

        expect(queue.actionType, AttendanceActionType.checkIn);
      });

      test('should handle checkOut action type', () {
        final queue = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkOut,
          method: 'gps',
        );

        expect(queue.actionType, AttendanceActionType.checkOut);
      });
    });

    group('Queue Status', () {
      test('should default to pending status', () {
        final queue = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'manual',
        );

        expect(queue.status, QueueStatus.pending);
      });

      test('should handle all queue statuses', () {
        final statuses = [
          QueueStatus.pending,
          QueueStatus.syncing,
          QueueStatus.synced,
          QueueStatus.failed,
        ];

        for (final status in statuses) {
          final queue = AttendanceQueue(
            id: 'queue-001',
            userId: 'user-001',
            timestamp: testTimestamp,
            actionType: AttendanceActionType.checkIn,
            method: 'qr',
            status: status,
          );

          expect(queue.status, status);
        }
      });
    });

    group('Method Types', () {
      test('should handle different attendance methods', () {
        final methods = ['qr', 'gps', 'manual'];

        for (final method in methods) {
          final queue = AttendanceQueue(
            id: 'queue-001',
            userId: 'user-001',
            timestamp: testTimestamp,
            actionType: AttendanceActionType.checkIn,
            method: method,
          );

          expect(queue.method, method);
        }
      });
    });

    group('Location Data', () {
      test('should handle GPS location data', () {
        final queue = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'gps',
          latitude: 37.5665,
          longitude: 126.9780,
          locationName: 'Seoul Office',
        );

        expect(queue.latitude, 37.5665);
        expect(queue.longitude, 126.9780);
        expect(queue.locationName, 'Seoul Office');
      });

      test('should handle QR code data', () {
        final qrData = 'DOT_QR|1705282800000|office-main|extra-data';
        final queue = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'qr',
          qrCodeData: qrData,
        );

        expect(queue.qrCodeData, qrData);
      });
    });

    group('Error Handling', () {
      test('should track retry count and last error', () {
        final queue = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'qr',
          status: QueueStatus.failed,
          retryCount: 3,
          lastError: 'Server unreachable',
        );

        expect(queue.status, QueueStatus.failed);
        expect(queue.retryCount, 3);
        expect(queue.lastError, 'Server unreachable');
      });
    });

    group('Equality', () {
      test('should be equal when all properties match', () {
        final queue1 = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'qr',
          status: QueueStatus.pending,
        );

        final queue2 = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'qr',
          status: QueueStatus.pending,
        );

        expect(queue1, queue2);
      });

      test('should not be equal when properties differ', () {
        final queue1 = AttendanceQueue(
          id: 'queue-001',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'qr',
        );

        final queue2 = AttendanceQueue(
          id: 'queue-002',
          userId: 'user-001',
          timestamp: testTimestamp,
          actionType: AttendanceActionType.checkIn,
          method: 'qr',
        );

        expect(queue1, isNot(queue2));
      });
    });
  });

  group('AttendanceVerificationResult', () {
    test('should create verification result with all fields', () {
      final result = AttendanceVerificationResult(
        isValid: true,
        isWithinLocation: true,
        isWithinTimeWindow: true,
        errorMessage: null,
        locationName: 'Main Office',
        distance: 25.5,
        qrData: {
          'type': 'checkin',
          'timestamp': 1705282800000,
          'location_id': 'office-main',
        },
      );

      expect(result.isValid, true);
      expect(result.isWithinLocation, true);
      expect(result.isWithinTimeWindow, true);
      expect(result.locationName, 'Main Office');
      expect(result.distance, 25.5);
      expect(result.qrData?['type'], 'checkin');
      expect(result.qrData?['timestamp'], 1705282800000);
    });

    test('should create failed verification result', () {
      final result = AttendanceVerificationResult(
        isValid: false,
        isWithinLocation: false,
        isWithinTimeWindow: true,
        errorMessage: 'You are too far from the office location',
        locationName: 'Main Office',
        distance: 150.0,
      );

      expect(result.isValid, false);
      expect(result.isWithinLocation, false);
      expect(result.errorMessage, 'You are too far from the office location');
      expect(result.distance, 150.0);
    });

    test('should create time window validation failure', () {
      final result = AttendanceVerificationResult(
        isValid: false,
        isWithinLocation: true,
        isWithinTimeWindow: false,
        errorMessage: 'Check-in time is outside allowed hours',
        locationName: 'Main Office',
        distance: 25.0,
      );

      expect(result.isValid, false);
      expect(result.isWithinTimeWindow, false);
      expect(result.errorMessage, 'Check-in time is outside allowed hours');
    });

    test('should handle QR code verification with parsed data', () {
      final qrData = {
        'type': 'checkout',
        'timestamp': 1705311600000,
        'location_id': 'office-branch-a',
        'extra_data': 'verified',
      };

      final result = AttendanceVerificationResult(
        isValid: true,
        isWithinLocation: true,
        isWithinTimeWindow: true,
        locationName: 'Branch A Office',
        qrData: qrData,
      );

      expect(result.qrData?['type'], 'checkout');
      expect(result.qrData?['location_id'], 'office-branch-a');
      expect(result.qrData?['extra_data'], 'verified');
    });

    group('Equality', () {
      test('should be equal when all properties match', () {
        final result1 = AttendanceVerificationResult(
          isValid: true,
          isWithinLocation: true,
          isWithinTimeWindow: true,
          locationName: 'Main Office',
          distance: 25.0,
        );

        final result2 = AttendanceVerificationResult(
          isValid: true,
          isWithinLocation: true,
          isWithinTimeWindow: true,
          locationName: 'Main Office',
          distance: 25.0,
        );

        expect(result1, result2);
      });

      test('should not be equal when properties differ', () {
        final result1 = AttendanceVerificationResult(
          isValid: true,
          isWithinLocation: true,
          isWithinTimeWindow: true,
        );

        final result2 = AttendanceVerificationResult(
          isValid: false,
          isWithinLocation: true,
          isWithinTimeWindow: true,
        );

        expect(result1, isNot(result2));
      });
    });

    group('Edge Cases', () {
      test('should handle minimal verification result', () {
        final result = AttendanceVerificationResult(
          isValid: true,
          isWithinLocation: true,
          isWithinTimeWindow: true,
        );

        expect(result.isValid, true);
        expect(result.errorMessage, null);
        expect(result.locationName, null);
        expect(result.distance, null);
        expect(result.qrData, null);
      });

      test('should handle zero distance', () {
        final result = AttendanceVerificationResult(
          isValid: true,
          isWithinLocation: true,
          isWithinTimeWindow: true,
          distance: 0.0,
        );

        expect(result.distance, 0.0);
        expect(result.isWithinLocation, true);
      });

      test('should handle empty QR data', () {
        final result = AttendanceVerificationResult(
          isValid: false,
          isWithinLocation: true,
          isWithinTimeWindow: true,
          qrData: {},
        );

        expect(result.qrData, {});
        expect(result.qrData?.isEmpty, true);
      });
    });
  });
}