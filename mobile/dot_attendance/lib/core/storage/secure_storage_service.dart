import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';

import '../constants/app_constants.dart';
import '../errors/exceptions.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService(this._storage);

  // Authentication tokens
  Future<void> storeAccessToken(String token) async {
    try {
      await _storage.write(key: AppConstants.accessTokenKey, value: token);
    } catch (e) {
      debugPrint('Failed to store access token: $e');
      throw const StorageException(message: 'Failed to store authentication data');
    }
  }

  Future<String?> getAccessToken() async {
    try {
      return await _storage.read(key: AppConstants.accessTokenKey);
    } catch (e) {
      debugPrint('Failed to get access token: $e');
      return null;
    }
  }

  Future<void> deleteAccessToken() async {
    try {
      await _storage.delete(key: AppConstants.accessTokenKey);
    } catch (e) {
      debugPrint('Failed to delete access token: $e');
    }
  }

  Future<void> storeRefreshToken(String token) async {
    try {
      await _storage.write(key: AppConstants.refreshTokenKey, value: token);
    } catch (e) {
      debugPrint('Failed to store refresh token: $e');
      throw const StorageException(message: 'Failed to store authentication data');
    }
  }

  Future<String?> getRefreshToken() async {
    try {
      return await _storage.read(key: AppConstants.refreshTokenKey);
    } catch (e) {
      debugPrint('Failed to get refresh token: $e');
      return null;
    }
  }

  Future<void> deleteRefreshToken() async {
    try {
      await _storage.delete(key: AppConstants.refreshTokenKey);
    } catch (e) {
      debugPrint('Failed to delete refresh token: $e');
    }
  }

  // Biometric credentials
  Future<void> storeBiometricCredentials(String username, String password) async {
    try {
      await _storage.write(key: '${AppConstants.userDataKey}_username', value: username);
      await _storage.write(key: '${AppConstants.userDataKey}_password', value: password);
    } catch (e) {
      debugPrint('Failed to store biometric credentials: $e');
      throw const StorageException(message: 'Failed to store biometric data');
    }
  }

  Future<Map<String, String>?> getBiometricCredentials() async {
    try {
      final username = await _storage.read(key: '${AppConstants.userDataKey}_username');
      final password = await _storage.read(key: '${AppConstants.userDataKey}_password');
      
      if (username != null && password != null) {
        return {
          'username': username,
          'password': password,
        };
      }
      return null;
    } catch (e) {
      debugPrint('Failed to get biometric credentials: $e');
      return null;
    }
  }

  Future<void> deleteBiometricCredentials() async {
    try {
      await _storage.delete(key: '${AppConstants.userDataKey}_username');
      await _storage.delete(key: '${AppConstants.userDataKey}_password');
    } catch (e) {
      debugPrint('Failed to delete biometric credentials: $e');
    }
  }

  // Encryption keys
  Future<void> storeEncryptionKey(String key) async {
    try {
      await _storage.write(key: 'encryption_key', value: key);
    } catch (e) {
      debugPrint('Failed to store encryption key: $e');
      throw const StorageException(message: 'Failed to store encryption key');
    }
  }

  Future<String?> getEncryptionKey() async {
    try {
      return await _storage.read(key: 'encryption_key');
    } catch (e) {
      debugPrint('Failed to get encryption key: $e');
      return null;
    }
  }

  Future<void> deleteEncryptionKey() async {
    try {
      await _storage.delete(key: 'encryption_key');
    } catch (e) {
      debugPrint('Failed to delete encryption key: $e');
    }
  }

  // PIN/Password storage
  Future<void> storeHashedPin(String hashedPin) async {
    try {
      await _storage.write(key: 'hashed_pin', value: hashedPin);
    } catch (e) {
      debugPrint('Failed to store hashed PIN: $e');
      throw const StorageException(message: 'Failed to store PIN');
    }
  }

  Future<String?> getHashedPin() async {
    try {
      return await _storage.read(key: 'hashed_pin');
    } catch (e) {
      debugPrint('Failed to get hashed PIN: $e');
      return null;
    }
  }

  Future<void> deleteHashedPin() async {
    try {
      await _storage.delete(key: 'hashed_pin');
    } catch (e) {
      debugPrint('Failed to delete hashed PIN: $e');
    }
  }

  // Generic secure storage methods
  Future<void> storeSecureData(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (e) {
      debugPrint('Failed to store secure data for key $key: $e');
      throw StorageException(message: 'Failed to store data for $key');
    }
  }

  Future<String?> getSecureData(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (e) {
      debugPrint('Failed to get secure data for key $key: $e');
      return null;
    }
  }

  Future<void> deleteSecureData(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (e) {
      debugPrint('Failed to delete secure data for key $key: $e');
    }
  }

  // Clear all secure storage
  Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
    } catch (e) {
      debugPrint('Failed to clear all secure storage: $e');
      throw const StorageException(message: 'Failed to clear secure storage');
    }
  }

  // Check if storage contains a key
  Future<bool> containsKey(String key) async {
    try {
      return await _storage.containsKey(key: key);
    } catch (e) {
      debugPrint('Failed to check if key exists: $e');
      return false;
    }
  }

  // Get all keys
  Future<Map<String, String>?> getAllSecureData() async {
    try {
      return await _storage.readAll();
    } catch (e) {
      debugPrint('Failed to get all secure data: $e');
      return null;
    }
  }
}