import 'dart:typed_data';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

import '../constants/app_constants.dart';
import '../errors/exceptions.dart';

class QrService {
  QRViewController? _qrController;

  /// Initialize QR scanner controller
  Future<void> initializeScanner(QRViewController controller) async {
    try {
      await _checkCameraPermission();
      _qrController = controller;
      
      // Start scanning
      await _qrController?.resumeCamera();
    } catch (e) {
      debugPrint('Failed to initialize QR scanner: $e');
      if (e is CameraPermissionException) {
        rethrow;
      }
      throw QrCodeException(message: 'Failed to initialize QR scanner: $e');
    }
  }

  /// Scan QR code
  Stream<Barcode> scanQrCode() {
    if (_qrController == null) {
      throw const QrCodeException(message: 'QR scanner is not initialized');
    }

    return _qrController!.scannedDataStream;
  }

  /// Validate QR code data
  bool validateQrCode(String data) {
    try {
      // Check if QR code has the correct prefix
      if (!data.startsWith(AppConstants.qrCodePrefix)) {
        return false;
      }

      // Extract the actual data
      final qrData = data.substring(AppConstants.qrCodePrefix.length);
      
      // Parse QR code data (assuming JSON format)
      // You can customize this based on your QR code format
      if (qrData.isEmpty) {
        return false;
      }

      // Additional validation can be added here
      // For example, checking timestamp, signature, etc.
      
      return true;
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

      final qrData = data.substring(AppConstants.qrCodePrefix.length);
      
      // Parse the data based on your format
      // This is a simple example - customize based on your needs
      final parts = qrData.split('|');
      if (parts.length < 3) {
        throw const InvalidQrCodeException(message: 'Invalid QR code data structure');
      }

      final Map<String, dynamic> parsedData = {
        'type': parts[0],
        'timestamp': int.tryParse(parts[1]),
        'location_id': parts[2],
      };

      // Add additional fields if available
      if (parts.length > 3) {
        parsedData['extra_data'] = parts.sublist(3).join('|');
      }

      return parsedData;
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
      final parts = [type, timestamp.toString(), locationId];
      
      if (extraData != null && extraData.isNotEmpty) {
        parts.add(extraData);
      }

      final data = parts.join('|');
      return '${AppConstants.qrCodePrefix}$data';
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
    QrErrorCorrectLevel errorCorrectLevel = QrErrorCorrectLevel.M,
  }) {
    try {
      return QrImageView(
        data: data,
        version: version,
        size: size,
        foregroundColor: foregroundColor,
        backgroundColor: backgroundColor,
        errorCorrectionLevel: errorCorrectLevel,
        gapless: false,
        semanticsLabel: 'QR Code for attendance',
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
    QrErrorCorrectLevel errorCorrectLevel = QrErrorCorrectLevel.M,
  }) async {
    try {
      final qrPainter = QrPainter(
        data: data,
        version: version,
        errorCorrectionLevel: errorCorrectLevel,
        color: foregroundColor,
        emptyColor: backgroundColor,
        gapless: false,
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

      await _qrController!.resumeCamera();
    } catch (e) {
      debugPrint('Failed to start scanning: $e');
      throw QrCodeException(message: 'Failed to start scanning: $e');
    }
  }

  /// Stop QR scanning
  Future<void> stopScanning() async {
    try {
      if (_qrController == null) return;
      await _qrController!.pauseCamera();
    } catch (e) {
      debugPrint('Failed to stop scanning: $e');
    }
  }

  /// Toggle flash
  Future<void> toggleFlash() async {
    try {
      if (_qrController == null) return;
      await _qrController!.toggleFlash();
    } catch (e) {
      debugPrint('Failed to toggle flash: $e');
    }
  }

  /// Get flash status
  Future<bool?> getFlashStatus() async {
    try {
      if (_qrController == null) return false;
      return await _qrController!.getFlashStatus();
    } catch (e) {
      debugPrint('Failed to get flash status: $e');
      return false;
    }
  }

  /// Flip camera
  Future<void> flipCamera() async {
    try {
      if (_qrController == null) return;
      await _qrController!.flipCamera();
    } catch (e) {
      debugPrint('Failed to flip camera: $e');
    }
  }

  /// Get camera info
  Future<CameraFacing> getCameraInfo() async {
    try {
      if (_qrController == null) return CameraFacing.unknown;
      return await _qrController!.getCameraInfo();
    } catch (e) {
      debugPrint('Failed to get camera info: $e');
      return CameraFacing.unknown;
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
  QRViewController? get qrController => _qrController;

  /// Check if scanner is initialized
  bool get isInitialized => _qrController != null;
}