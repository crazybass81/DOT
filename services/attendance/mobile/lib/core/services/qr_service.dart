import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../constants/app_constants.dart';
import '../errors/exceptions.dart';

class QrService {
  MobileScannerController? _qrController;

  /// Initialize QR scanner controller
  Future<void> initializeScanner() async {
    try {
      await _checkCameraPermission();
      _qrController = MobileScannerController();
      
      // Start scanning
      await _qrController?.start();
    } catch (e) {
      debugPrint('Failed to initialize QR scanner: $e');
      if (e is CameraPermissionException) {
        rethrow;
      }
      throw QrCodeException(message: 'Failed to initialize QR scanner: $e');
    }
  }

  /// Scan QR code
  Stream<BarcodeCapture> scanQrCode() {
    if (_qrController == null) {
      throw const QrCodeException(message: 'QR scanner is not initialized');
    }

    return _qrController!.barcodes;
  }

  /// Validate QR code data
  bool validateQrCode(String data) {
    try {
      // Check if it's a deep link URL
      if (data.startsWith('dotattendance://')) {
        final uri = Uri.tryParse(data);
        if (uri != null && uri.queryParameters.containsKey('token')) {
          return true;
        }
      }
      
      // Legacy format support (optional)
      if (data.startsWith(AppConstants.qrCodePrefix)) {
        final qrData = data.substring(AppConstants.qrCodePrefix.length);
        return qrData.isNotEmpty;
      }

      return false;
    } catch (e) {
      debugPrint('QR code validation failed: $e');
      return false;
    }
  }

  /// Parse QR code data
  Map<String, dynamic>? parseQrCode(String data) {
    try {
      if (!validateQrCode(data)) {
        throw const InvalidQrCodeException(message: 'Invalid QR code format');
      }

      // Parse deep link URL format
      if (data.startsWith('dotattendance://')) {
        final uri = Uri.parse(data);
        final token = uri.queryParameters['token'];
        final location = uri.queryParameters['location'];
        final type = uri.queryParameters['type'] ?? 'login';
        
        if (token == null) {
          throw const InvalidQrCodeException(message: 'Missing token in QR code');
        }
        
        // Parse token to extract timestamp
        final tokenParts = token.split('_');
        final timestamp = tokenParts.length >= 3 ? int.tryParse(tokenParts.last) : null;
        
        return {
          'type': type,
          'timestamp': timestamp,
          'location_id': location ?? '',
          'token': token,
        };
      }
      
      // Legacy format support
      if (data.startsWith(AppConstants.qrCodePrefix)) {
        final qrData = data.substring(AppConstants.qrCodePrefix.length);
        final parts = qrData.split('|');
        if (parts.length < 3) {
          throw const InvalidQrCodeException(message: 'Invalid QR code data structure');
        }

        return {
          'type': parts[0],
          'timestamp': int.tryParse(parts[1]),
          'location_id': parts[2],
          'extra_data': parts.length > 3 ? parts.sublist(3).join('|') : null,
        };
      }

      throw const InvalidQrCodeException(message: 'Unrecognized QR code format');
    } catch (e) {
      debugPrint('Failed to parse QR code: $e');
      if (e is InvalidQrCodeException) {
        rethrow;
      }
      throw QrCodeException(message: 'Failed to parse QR code: $e');
    }
  }

  /// Generate QR code data
  String generateQrCodeData({
    required String type,
    required String locationId,
    String? extraData,
  }) {
    try {
      final timestamp = DateTime.now().millisecondsSinceEpoch;
      
      // Generate a simple token for the QR code
      final token = '${type}_${locationId}_$timestamp';
      
      // Generate the QR code URL
      // Try multiple formats to find what works best
      
      // Option 1: Simple custom scheme (most reliable for deep linking)
      // 타입에 따라 다른 경로로 라우팅
      final action = type == 'attendance' ? 'checkin' : 'login';
      final qrUrl = 'dotattendance://$action?token=$token&location=$locationId&type=$type';
      
      // Option 2: HTTP URL that can be intercepted by the app
      // final qrUrl = 'http://attendance.local/qr?token=$token&location=$locationId&type=$type';
      
      debugPrint('Generated QR URL: $qrUrl');
      
      return qrUrl;
    } catch (e) {
      debugPrint('Failed to generate QR code data: $e');
      throw QrCodeException(message: 'Failed to generate QR code data: $e');
    }
  }

  /// Generate QR code widget
  Widget generateQrCodeWidget({
    required String data,
    double size = 200.0,
    Color foregroundColor = Colors.black,
    Color backgroundColor = Colors.white,
    int version = QrVersions.auto,
    int errorCorrectLevel = QrErrorCorrectLevel.M,
  }) {
    try {
      return QrImageView(
        data: data,
        version: version,
        size: size,
        backgroundColor: backgroundColor,
        errorCorrectionLevel: errorCorrectLevel,
        gapless: false,
        semanticsLabel: 'QR Code for attendance',
        eyeStyle: QrEyeStyle(
          eyeShape: QrEyeShape.square,
          color: foregroundColor,
        ),
        dataModuleStyle: QrDataModuleStyle(
          dataModuleShape: QrDataModuleShape.square,
          color: foregroundColor,
        ),
      );
    } catch (e) {
      debugPrint('Failed to generate QR code widget: $e');
      throw QrCodeException(message: 'Failed to generate QR code widget: $e');
    }
  }

  /// Generate QR code as image bytes
  Future<Uint8List?> generateQrCodeBytes({
    required String data,
    double size = 200.0,
    Color foregroundColor = Colors.black,
    Color backgroundColor = Colors.white,
    int version = QrVersions.auto,
    int errorCorrectLevel = QrErrorCorrectLevel.M,
  }) async {
    try {
      final qrPainter = QrPainter(
        data: data,
        version: version,
        errorCorrectionLevel: errorCorrectLevel,
        gapless: false,
        eyeStyle: QrEyeStyle(
          eyeShape: QrEyeShape.square,
          color: foregroundColor,
        ),
        dataModuleStyle: QrDataModuleStyle(
          dataModuleShape: QrDataModuleShape.square,
          color: foregroundColor,
        ),
      );

      final picData = await qrPainter.toImageData(size);
      return picData?.buffer.asUint8List();
    } catch (e) {
      debugPrint('Failed to generate QR code bytes: $e');
      throw QrCodeException(message: 'Failed to generate QR code bytes: $e');
    }
  }

  /// Check if QR code is expired
  bool isQrCodeExpired(Map<String, dynamic> qrData) {
    try {
      final timestamp = qrData['timestamp'] as int?;
      if (timestamp == null) {
        return true;
      }

      final qrTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
      final now = DateTime.now();
      final difference = now.difference(qrTime);

      return difference > AppConstants.qrCodeExpiry;
    } catch (e) {
      debugPrint('Failed to check QR code expiry: $e');
      return true;
    }
  }

  /// Start QR scanning
  Future<void> startScanning() async {
    try {
      if (_qrController == null) {
        throw const QrCodeException(message: 'QR controller is not initialized');
      }

      await _qrController!.start();
    } catch (e) {
      debugPrint('Failed to start scanning: $e');
      throw QrCodeException(message: 'Failed to start scanning: $e');
    }
  }

  /// Stop QR scanning
  Future<void> stopScanning() async {
    try {
      if (_qrController == null) return;
      await _qrController!.stop();
    } catch (e) {
      debugPrint('Failed to stop scanning: $e');
    }
  }

  /// Toggle flash
  Future<void> toggleFlash() async {
    try {
      if (_qrController == null) return;
      await _qrController!.toggleTorch();
    } catch (e) {
      debugPrint('Failed to toggle flash: $e');
    }
  }

  /// Get flash status
  bool getFlashStatus() {
    try {
      if (_qrController == null) return false;
      return _qrController!.torchEnabled;
    } catch (e) {
      debugPrint('Failed to get flash status: $e');
      return false;
    }
  }

  /// Switch camera
  Future<void> switchCamera() async {
    try {
      if (_qrController == null) return;
      await _qrController!.switchCamera();
    } catch (e) {
      debugPrint('Failed to switch camera: $e');
    }
  }

  /// Get camera facing
  CameraFacing getCameraFacing() {
    try {
      if (_qrController == null) return CameraFacing.back;
      return _qrController!.facing;
    } catch (e) {
      debugPrint('Failed to get camera facing: $e');
      return CameraFacing.back;
    }
  }

  /// Check camera permission
  Future<void> _checkCameraPermission() async {
    final status = await Permission.camera.status;
    
    if (status.isDenied) {
      final result = await Permission.camera.request();
      if (!result.isGranted) {
        throw const CameraPermissionException(
          message: 'Camera permission is required to scan QR codes',
        );
      }
    } else if (status.isPermanentlyDenied) {
      throw const CameraPermissionException(
        message: 'Camera permission is permanently denied. Please enable it in settings.',
      );
    }
  }

  /// Dispose QR scanner
  Future<void> dispose() async {
    try {
      await _qrController?.dispose();
      _qrController = null;
    } catch (e) {
      debugPrint('Failed to dispose QR scanner: $e');
    }
  }

  /// Get QR controller
  MobileScannerController? get qrController => _qrController;

  /// Check if scanner is initialized
  bool get isInitialized => _qrController != null;
}