import 'package:flutter_test/flutter_test.dart';
import 'package:dot_attendance/domain/entities/attendance/attendance.dart';

void main() {
  group('Attendance', () {
    late DateTime testDate;
    late DateTime checkInTime;
    late DateTime checkOutTime;

    setUp(() {
      testDate = DateTime(2024, 1, 15);
      checkInTime = DateTime(2024, 1, 15, 9, 0);
      checkOutTime = DateTime(2024, 1, 15, 17, 30);
    });

    group('Construction', () {
      test('should create attendance with required fields', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
        );

        expect(attendance.id, 'att-001');
        expect(attendance.userId, 'user-001');
        expect(attendance.date, testDate);
        expect(attendance.status, AttendanceStatus.absent);
        expect(attendance.isLateCheckIn, false);
        expect(attendance.isEarlyCheckOut, false);
      });

      test('should create complete attendance record', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
          checkInLocation: 'Office A',
          checkOutLocation: 'Office A',
          checkInLatitude: 37.5665,
          checkInLongitude: 126.9780,
          checkOutLatitude: 37.5665,
          checkOutLongitude: 126.9780,
          checkInMethod: 'qr',
          checkOutMethod: 'qr',
          checkInNotes: 'On time',
          checkOutNotes: 'Completed tasks',
          status: AttendanceStatus.present,
          isLateCheckIn: false,
          isEarlyCheckOut: false,
        );

        expect(attendance.isCheckedIn, true);
        expect(attendance.isCheckedOut, true);
        expect(attendance.isCompleted, true);
        expect(attendance.status, AttendanceStatus.present);
        expect(attendance.checkInMethod, 'qr');
        expect(attendance.checkOutMethod, 'qr');
      });
    });

    group('Status Checks', () {
      test('isCheckedIn should return true when checkInTime is set', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: checkInTime,
        );

        expect(attendance.isCheckedIn, true);
      });

      test('isCheckedIn should return false when checkInTime is null', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
        );

        expect(attendance.isCheckedIn, false);
      });

      test('isCheckedOut should return true when checkOutTime is set', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkOutTime: checkOutTime,
        );

        expect(attendance.isCheckedOut, true);
      });

      test('isCompleted should return true when both check-in and check-out are set', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
        );

        expect(attendance.isCompleted, true);
      });

      test('isCompleted should return false when only check-in is set', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: checkInTime,
        );

        expect(attendance.isCompleted, false);
      });
    });

    group('Working Hours Calculation', () {
      test('workingHours should calculate correctly', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: checkInTime,
          checkOutTime: checkOutTime,
        );

        final expectedDuration = checkOutTime.difference(checkInTime);
        expect(attendance.workingHours, expectedDuration);
        expect(attendance.workingHours?.inHours, 8);
        expect(attendance.workingHours?.inMinutes, 510);
      });

      test('workingHours should return null when check-in is missing', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkOutTime: checkOutTime,
        );

        expect(attendance.workingHours, null);
      });

      test('workingHours should return null when check-out is missing', () {
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: checkInTime,
        );

        expect(attendance.workingHours, null);
      });
    });

    group('Status Display Names', () {
      test('statusDisplayName should return correct strings', () {
        expect(Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.present,
        ).statusDisplayName, 'Present');

        expect(Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.absent,
        ).statusDisplayName, 'Absent');

        expect(Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.late,
        ).statusDisplayName, 'Late');

        expect(Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.halfDay,
        ).statusDisplayName, 'Half Day');

        expect(Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.leave,
        ).statusDisplayName, 'On Leave');

        expect(Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.holiday,
        ).statusDisplayName, 'Holiday');

        expect(Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.weekend,
        ).statusDisplayName, 'Weekend');
      });
    });

    group('Equality', () {
      test('should be equal when all properties match', () {
        final attendance1 = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: checkInTime,
          status: AttendanceStatus.present,
        );

        final attendance2 = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: checkInTime,
          status: AttendanceStatus.present,
        );

        expect(attendance1, attendance2);
      });

      test('should not be equal when properties differ', () {
        final attendance1 = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.present,
        );

        final attendance2 = Attendance(
          id: 'att-002',
          userId: 'user-001',
          date: testDate,
          status: AttendanceStatus.present,
        );

        expect(attendance1, isNot(attendance2));
      });
    });

    group('Edge Cases', () {
      test('should handle same check-in and check-out time', () {
        final sameTime = DateTime(2024, 1, 15, 9, 0);
        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: sameTime,
          checkOutTime: sameTime,
        );

        expect(attendance.workingHours?.inMinutes, 0);
        expect(attendance.isCompleted, true);
      });

      test('should handle negative working hours (check-out before check-in)', () {
        final laterCheckIn = DateTime(2024, 1, 15, 18, 0);
        final earlierCheckOut = DateTime(2024, 1, 15, 17, 0);

        final attendance = Attendance(
          id: 'att-001',
          userId: 'user-001',
          date: testDate,
          checkInTime: laterCheckIn,
          checkOutTime: earlierCheckOut,
        );

        expect(attendance.workingHours?.inMinutes, -60);
        expect(attendance.workingHours?.isNegative, true);
      });
    });
  });

  group('AttendanceStats', () {
    test('should create attendance stats correctly', () {
      final stats = AttendanceStats(
        totalWorkingDays: 22,
        presentDays: 20,
        absentDays: 2,
        lateDays: 3,
        halfDays: 1,
        leaveDays: 1,
        totalWorkingHours: const Duration(hours: 160),
        attendancePercentage: 90.9,
        periodStart: DateTime(2024, 1, 1),
        periodEnd: DateTime(2024, 1, 31),
      );

      expect(stats.totalWorkingDays, 22);
      expect(stats.presentDays, 20);
      expect(stats.absentDays, 2);
      expect(stats.attendancePercentage, 90.9);
      expect(stats.totalWorkingHours.inHours, 160);
    });

    test('should be equal when all properties match', () {
      final stats1 = AttendanceStats(
        totalWorkingDays: 22,
        presentDays: 20,
        absentDays: 2,
        lateDays: 3,
        halfDays: 1,
        leaveDays: 1,
        totalWorkingHours: const Duration(hours: 160),
        attendancePercentage: 90.9,
      );

      final stats2 = AttendanceStats(
        totalWorkingDays: 22,
        presentDays: 20,
        absentDays: 2,
        lateDays: 3,
        halfDays: 1,
        leaveDays: 1,
        totalWorkingHours: const Duration(hours: 160),
        attendancePercentage: 90.9,
      );

      expect(stats1, stats2);
    });
  });

  group('AttendanceLocation', () {
    test('should create attendance location correctly', () {
      final location = AttendanceLocation(
        id: 'loc-001',
        name: 'Main Office',
        address: '123 Business St, Seoul',
        latitude: 37.5665,
        longitude: 126.9780,
        radius: 100.0,
        isActive: true,
        description: 'Main office building',
        contactNumber: '+82-2-1234-5678',
      );

      expect(location.id, 'loc-001');
      expect(location.name, 'Main Office');
      expect(location.latitude, 37.5665);
      expect(location.longitude, 126.9780);
      expect(location.radius, 100.0);
      expect(location.isActive, true);
    });

    test('should have default isActive as true', () {
      final location = AttendanceLocation(
        id: 'loc-001',
        name: 'Main Office',
        address: '123 Business St, Seoul',
        latitude: 37.5665,
        longitude: 126.9780,
        radius: 100.0,
      );

      expect(location.isActive, true);
    });

    test('should be equal when all properties match', () {
      final location1 = AttendanceLocation(
        id: 'loc-001',
        name: 'Main Office',
        address: '123 Business St, Seoul',
        latitude: 37.5665,
        longitude: 126.9780,
        radius: 100.0,
      );

      final location2 = AttendanceLocation(
        id: 'loc-001',
        name: 'Main Office',
        address: '123 Business St, Seoul',
        latitude: 37.5665,
        longitude: 126.9780,
        radius: 100.0,
      );

      expect(location1, location2);
    });
  });
}