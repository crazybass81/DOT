import 'package:local_auth/local_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import '../errors/exceptions.dart';

class BiometricService {
  final LocalAuthentication _localAuth = LocalAuthentication();

  /// Check if biometric authentication is available
  Future<bool> isBiometricAvailable() async {
    try {
      final isAvailable = await _localAuth.canCheckBiometrics;
      final isDeviceSupported = await _localAuth.isDeviceSupported();
      return isAvailable && isDeviceSupported;
    } catch (e) {
      debugPrint('Error checking biometric availability: $e');
      return false;
    }
  }

  /// Get available biometric types
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _localAuth.getAvailableBiometrics();
    } catch (e) {
      debugPrint('Error getting available biometrics: $e');
      return [];
    }
  }

  /// Authenticate using biometrics
  Future<bool> authenticateWithBiometrics({
    required String reason,
    bool biometricOnly = false,
  }) async {
    try {
      // Check if biometrics are available
      final isAvailable = await isBiometricAvailable();
      if (!isAvailable) {
        throw const BiometricException(
          message: 'Biometric authentication is not available on this device',
        );
      }

      // Perform authentication
      final isAuthenticated = await _localAuth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          biometricOnly: biometricOnly,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );

      return isAuthenticated;
    } on PlatformException catch (e) {
      debugPrint('Biometric authentication error: ${e.code} - ${e.message}');
      _handlePlatformException(e);
      return false;
    } catch (e) {
      debugPrint('Unexpected biometric error: $e');
      throw BiometricException(message: 'Authentication failed: ${e.toString()}');
    }
  }

  /// Stop ongoing authentication
  Future<void> stopAuthentication() async {
    try {
      await _localAuth.stopAuthentication();
    } catch (e) {
      debugPrint('Error stopping authentication: $e');
    }
  }

  /// Check if device has biometrics enrolled
  Future<bool> hasBiometricsEnrolled() async {
    try {
      final availableBiometrics = await getAvailableBiometrics();
      return availableBiometrics.isNotEmpty;
    } catch (e) {
      debugPrint('Error checking enrolled biometrics: $e');
      return false;
    }
  }

  /// Get biometric authentication status message
  String getBiometricStatusMessage(List<BiometricType> biometrics) {
    if (biometrics.isEmpty) {
      return 'No biometric authentication methods available';
    }

    final List<String> types = [];
    
    if (biometrics.contains(BiometricType.fingerprint)) {
      types.add('Fingerprint');
    }
    if (biometrics.contains(BiometricType.face)) {
      types.add('Face ID');
    }
    if (biometrics.contains(BiometricType.iris)) {
      types.add('Iris');
    }
    if (biometrics.contains(BiometricType.strong)) {
      types.add('Strong Biometric');
    }
    if (biometrics.contains(BiometricType.weak)) {
      types.add('Weak Biometric');
    }

    if (types.length == 1) {
      return '${types.first} authentication is available';
    } else if (types.length == 2) {
      return '${types.first} and ${types.last} authentication are available';
    } else {
      return 'Multiple biometric authentication methods are available';
    }
  }

  /// Handle platform-specific exceptions
  void _handlePlatformException(PlatformException e) {
    switch (e.code) {
      case 'NotAvailable':
        throw const BiometricException(
          message: 'Biometric authentication is not available on this device',
        );
      case 'NotEnrolled':
        throw const BiometricException(
          message: 'No biometric credentials are enrolled. Please set up biometric authentication in device settings.',
        );
      case 'PasscodeNotSet':
        throw const BiometricException(
          message: 'No passcode is set. Please set up a passcode in device settings.',
        );
      case 'BiometricOnlyNotSupported':
        throw const BiometricException(
          message: 'Biometric-only authentication is not supported on this device',
        );
      case 'DeviceNotSupported':
        throw const BiometricException(
          message: 'This device does not support biometric authentication',
        );
      case 'LockedOut':
        throw const BiometricException(
          message: 'Biometric authentication is locked out. Please try again later or use your passcode.',
        );
      case 'PermanentlyLockedOut':
        throw const BiometricException(
          message: 'Biometric authentication is permanently locked out. Please use your passcode.',
        );
      case 'UserCancel':
        throw const BiometricException(
          message: 'Authentication was cancelled by user',
        );
      case 'UserFallback':
        throw const BiometricException(
          message: 'User chose to use fallback authentication method',
        );
      case 'SystemCancel':
        throw const BiometricException(
          message: 'Authentication was cancelled by system',
        );
      case 'InvalidContext':
        throw const BiometricException(
          message: 'Invalid authentication context',
        );
      case 'BiometricBindingChanged':
        throw const BiometricException(
          message: 'Biometric binding has changed. Please re-authenticate.',
        );
      default:
        throw BiometricException(
          message: 'Biometric authentication failed: ${e.message ?? e.code}',
        );
    }
  }

  /// Get user-friendly biometric type name
  String getBiometricTypeName(BiometricType type) {
    switch (type) {
      case BiometricType.fingerprint:
        return 'Fingerprint';
      case BiometricType.face:
        return 'Face ID';
      case BiometricType.iris:
        return 'Iris';
      case BiometricType.strong:
        return 'Strong Biometric';
      case BiometricType.weak:
        return 'Weak Biometric';
    }
  }

  /// Check if specific biometric type is available
  Future<bool> isBiometricTypeAvailable(BiometricType type) async {
    try {
      final availableBiometrics = await getAvailableBiometrics();
      return availableBiometrics.contains(type);
    } catch (e) {
      debugPrint('Error checking biometric type availability: $e');
      return false;
    }
  }
}