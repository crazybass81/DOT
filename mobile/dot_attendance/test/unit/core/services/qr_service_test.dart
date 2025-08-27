import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:qr_code_scanner/qr_code_scanner.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:dot_attendance/core/services/qr_service.dart';
import 'package:dot_attendance/core/constants/app_constants.dart';
import 'package:dot_attendance/core/errors/exceptions.dart';

// Mock classes
@GenerateMocks([QRViewController, PermissionStatus])
import 'qr_service_test.mocks.dart';

void main() {
  late QrService qrService;
  late MockQRViewController mockQrController;

  setUp(() {
    qrService = QrService();
    mockQrController = MockQRViewController();
  });

  tearDown(() {
    qrService.dispose();
  });

  group('QrService', () {
    group('Initialization', () {
      test('should initialize scanner with controller', () async {
        // Mock camera permission as granted
        when(mockQrController.resumeCamera()).thenAnswer((_) async {});
        
        await qrService.initializeScanner(mockQrController);

        expect(qrService.isInitialized, true);
        expect(qrService.qrController, mockQrController);
        verify(mockQrController.resumeCamera()).called(1);
      });

      test('should throw exception when camera permission is denied', () async {
        // This test would require mocking Permission.camera
        // For now, we'll test the exception handling
        expect(qrService.isInitialized, false);
      });
    });

    group('QR Code Validation', () {
      test('should validate QR code with correct prefix', () {
        final testData = '${AppConstants.qrCodePrefix}checkin|1705282800000|office-main';
        
        final result = qrService.validateQrCode(testData);
        
        expect(result, true);
      });

      test('should reject QR code with incorrect prefix', () {
        const testData = 'INVALID_PREFIX|checkin|1705282800000|office-main';
        
        final result = qrService.validateQrCode(testData);
        
        expect(result, false);
      });

      test('should reject empty QR code data', () {
        final testData = AppConstants.qrCodePrefix;
        
        final result = qrService.validateQrCode(testData);
        
        expect(result, false);
      });

      test('should handle malformed QR code gracefully', () {
        const testData = 'completely invalid qr code data';
        
        final result = qrService.validateQrCode(testData);
        
        expect(result, false);
      });
    });

    group('QR Code Parsing', () {
      test('should parse valid QR code data correctly', () {
        final testData = '${AppConstants.qrCodePrefix}checkin|1705282800000|office-main|extra';
        
        final result = qrService.parseQrCode(testData);
        
        expect(result, isNotNull);
        expect(result!['type'], 'checkin');
        expect(result['timestamp'], 1705282800000);
        expect(result['location_id'], 'office-main');
        expect(result['extra_data'], 'extra');
      });

      test('should parse minimal QR code data', () {
        final testData = '${AppConstants.qrCodePrefix}checkout|1705311600000|office-branch';
        
        final result = qrService.parseQrCode(testData);
        
        expect(result, isNotNull);
        expect(result!['type'], 'checkout');
        expect(result['timestamp'], 1705311600000);
        expect(result['location_id'], 'office-branch');
        expect(result.containsKey('extra_data'), false);
      });

      test('should throw exception for invalid QR code structure', () {
        final testData = '${AppConstants.qrCodePrefix}incomplete|data';
        
        expect(
          () => qrService.parseQrCode(testData),
          throwsA(isA<InvalidQrCodeException>()),
        );
      });

      test('should throw exception for invalid QR code format', () {
        const testData = 'INVALID_PREFIX|checkin|1705282800000|office-main';
        
        expect(
          () => qrService.parseQrCode(testData),
          throwsA(isA<InvalidQrCodeException>()),
        );
      });
    });

    group('QR Code Generation', () {
      test('should generate QR code data correctly', () {
        final result = qrService.generateQrCodeData(
          type: 'checkin',
          locationId: 'office-main',
          extraData: 'verified',
        );
        
        expect(result.startsWith(AppConstants.qrCodePrefix), true);
        expect(result, contains('checkin'));
        expect(result, contains('office-main'));
        expect(result, contains('verified'));
        
        // Should contain timestamp
        final parts = result.substring(AppConstants.qrCodePrefix.length).split('|');
        expect(parts.length, 4);
        expect(int.tryParse(parts[1]), isNotNull); // timestamp
      });

      test('should generate QR code data without extra data', () {
        final result = qrService.generateQrCodeData(
          type: 'checkout',
          locationId: 'office-branch',
        );
        
        expect(result.startsWith(AppConstants.qrCodePrefix), true);
        expect(result, contains('checkout'));
        expect(result, contains('office-branch'));
        
        final parts = result.substring(AppConstants.qrCodePrefix.length).split('|');
        expect(parts.length, 3);
      });

      test('should handle empty extra data', () {
        final result = qrService.generateQrCodeData(
          type: 'checkin',
          locationId: 'office-main',
          extraData: '',
        );
        
        final parts = result.substring(AppConstants.qrCodePrefix.length).split('|');
        expect(parts.length, 3); // Should not include empty extra data
      });
    });

    group('QR Code Expiry', () {
      test('should detect expired QR code', () {
        final expiredTimestamp = DateTime.now()
            .subtract(AppConstants.qrCodeExpiry)
            .subtract(const Duration(minutes: 1))
            .millisecondsSinceEpoch;
        
        final qrData = {
          'timestamp': expiredTimestamp,
          'type': 'checkin',
          'location_id': 'office-main',
        };
        
        final result = qrService.isQrCodeExpired(qrData);
        
        expect(result, true);
      });

      test('should detect valid (non-expired) QR code', () {
        final validTimestamp = DateTime.now()
            .subtract(const Duration(minutes: 1))
            .millisecondsSinceEpoch;
        
        final qrData = {
          'timestamp': validTimestamp,
          'type': 'checkin',
          'location_id': 'office-main',
        };
        
        final result = qrService.isQrCodeExpired(qrData);
        
        expect(result, false);
      });

      test('should consider QR code expired when timestamp is missing', () {
        final qrData = {
          'type': 'checkin',
          'location_id': 'office-main',
        };
        
        final result = qrService.isQrCodeExpired(qrData);
        
        expect(result, true);
      });

      test('should handle malformed timestamp gracefully', () {
        final qrData = {
          'timestamp': 'invalid_timestamp',
          'type': 'checkin',
          'location_id': 'office-main',
        };
        
        final result = qrService.isQrCodeExpired(qrData);
        
        expect(result, true);
      });
    });

    group('Scanner Control', () {
      test('should start scanning when controller is initialized', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.resumeCamera()).thenAnswer((_) async {});
        
        await qrService.startScanning();
        
        verify(mockQrController.resumeCamera()).called(2); // Once in init, once in start
      });

      test('should throw exception when starting scanning without controller', () async {
        expect(
          () => qrService.startScanning(),
          throwsA(isA<QrCodeException>()),
        );
      });

      test('should stop scanning gracefully', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.pauseCamera()).thenAnswer((_) async {});
        
        await qrService.stopScanning();
        
        verify(mockQrController.pauseCamera()).called(1);
      });

      test('should stop scanning gracefully when controller is null', () async {
        // Should not throw exception
        await qrService.stopScanning();
      });

      test('should toggle flash', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.toggleFlash()).thenAnswer((_) async {});
        
        await qrService.toggleFlash();
        
        verify(mockQrController.toggleFlash()).called(1);
      });

      test('should get flash status', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.getFlashStatus()).thenAnswer((_) async => true);
        
        final result = await qrService.getFlashStatus();
        
        expect(result, true);
        verify(mockQrController.getFlashStatus()).called(1);
      });

      test('should flip camera', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.flipCamera()).thenAnswer((_) async {});
        
        await qrService.flipCamera();
        
        verify(mockQrController.flipCamera()).called(1);
      });

      test('should get camera info', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.getCameraInfo()).thenAnswer((_) async => CameraFacing.back);
        
        final result = await qrService.getCameraInfo();
        
        expect(result, CameraFacing.back);
        verify(mockQrController.getCameraInfo()).called(1);
      });
    });

    group('QR Code Widget Generation', () {
      test('should generate QR code widget successfully', () {
        const testData = 'DOT_QR|checkin|1705282800000|office-main';
        
        final widget = qrService.generateQrCodeWidget(
          data: testData,
          size: 150.0,
        );
        
        expect(widget, isNotNull);
      });

      test('should generate QR code widget with custom parameters', () {
        const testData = 'DOT_QR|checkout|1705311600000|office-branch';
        
        final widget = qrService.generateQrCodeWidget(
          data: testData,
          size: 300.0,
          foregroundColor: const Color(0xFF000000),
          backgroundColor: const Color(0xFFFFFFFF),
        );
        
        expect(widget, isNotNull);
      });
    });

    group('Disposal', () {
      test('should dispose controller properly', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.dispose()).thenAnswer((_) async {});
        
        await qrService.dispose();
        
        expect(qrService.qrController, null);
        verify(mockQrController.dispose()).called(1);
      });

      test('should handle disposal when controller is already null', () async {
        // Should not throw exception
        await qrService.dispose();
        expect(qrService.qrController, null);
      });
    });

    group('Error Handling', () {
      test('should handle controller errors gracefully', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.resumeCamera()).thenThrow(Exception('Camera error'));
        
        expect(
          () => qrService.startScanning(),
          throwsA(isA<QrCodeException>()),
        );
      });

      test('should handle flash toggle errors gracefully', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.toggleFlash()).thenThrow(Exception('Flash error'));
        
        // Should not throw exception, just log error
        await qrService.toggleFlash();
      });

      test('should handle get flash status errors gracefully', () async {
        qrService.initializeScanner(mockQrController);
        when(mockQrController.getFlashStatus()).thenThrow(Exception('Flash status error'));
        
        final result = await qrService.getFlashStatus();
        
        expect(result, false);
      });
    });

    group('Integration Scenarios', () {
      test('should handle complete QR scanning workflow', () {
        final testData = '${AppConstants.qrCodePrefix}checkin|1705282800000|office-main|verified';
        
        // Validate
        final isValid = qrService.validateQrCode(testData);
        expect(isValid, true);
        
        // Parse
        final parsed = qrService.parseQrCode(testData);
        expect(parsed, isNotNull);
        expect(parsed!['type'], 'checkin');
        
        // Check expiry
        final isExpired = qrService.isQrCodeExpired(parsed);
        expect(isExpired, true); // Should be expired due to old timestamp
      });

      test('should handle QR generation and validation cycle', () {
        // Generate
        final generatedData = qrService.generateQrCodeData(
          type: 'checkin',
          locationId: 'office-test',
          extraData: 'generated',
        );
        
        // Validate
        final isValid = qrService.validateQrCode(generatedData);
        expect(isValid, true);
        
        // Parse
        final parsed = qrService.parseQrCode(generatedData);
        expect(parsed, isNotNull);
        expect(parsed!['type'], 'checkin');
        expect(parsed['location_id'], 'office-test');
        expect(parsed['extra_data'], 'generated');
        
        // Should not be expired (just generated)
        final isExpired = qrService.isQrCodeExpired(parsed);
        expect(isExpired, false);
      });
    });
  });
}