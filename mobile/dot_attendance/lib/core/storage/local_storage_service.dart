import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/foundation.dart';

import '../constants/app_constants.dart';
import '../errors/exceptions.dart';

class LocalStorageService {
  final SharedPreferences _prefs;

  LocalStorageService(this._prefs);

  // Theme settings
  Future<void> setThemeMode(String themeMode) async {
    try {
      await _prefs.setString(AppConstants.themeKey, themeMode);
    } catch (e) {
      debugPrint('Failed to set theme mode: $e');
      throw const StorageException(message: 'Failed to save theme preference');
    }
  }

  String? getThemeMode() {
    try {
      return _prefs.getString(AppConstants.themeKey);
    } catch (e) {
      debugPrint('Failed to get theme mode: $e');
      return null;
    }
  }

  // Language settings
  Future<void> setLanguage(String languageCode) async {
    try {
      await _prefs.setString(AppConstants.languageKey, languageCode);
    } catch (e) {
      debugPrint('Failed to set language: $e');
      throw const StorageException(message: 'Failed to save language preference');
    }
  }

  String? getLanguage() {
    try {
      return _prefs.getString(AppConstants.languageKey);
    } catch (e) {
      debugPrint('Failed to get language: $e');
      return null;
    }
  }

  // First launch flag
  Future<void> setFirstLaunch(bool isFirstLaunch) async {
    try {
      await _prefs.setBool(AppConstants.firstLaunchKey, isFirstLaunch);
    } catch (e) {
      debugPrint('Failed to set first launch flag: $e');
      throw const StorageException(message: 'Failed to save app state');
    }
  }

  bool isFirstLaunch() {
    try {
      return _prefs.getBool(AppConstants.firstLaunchKey) ?? true;
    } catch (e) {
      debugPrint('Failed to get first launch flag: $e');
      return true;
    }
  }

  // Biometric settings
  Future<void> setBiometricEnabled(bool enabled) async {
    try {
      await _prefs.setBool(AppConstants.biometricEnabledKey, enabled);
    } catch (e) {
      debugPrint('Failed to set biometric enabled: $e');
      throw const StorageException(message: 'Failed to save biometric preference');
    }
  }

  bool isBiometricEnabled() {
    try {
      return _prefs.getBool(AppConstants.biometricEnabledKey) ?? false;
    } catch (e) {
      debugPrint('Failed to get biometric enabled: $e');
      return false;
    }
  }

  // User data
  Future<void> storeUserData(Map<String, dynamic> userData) async {
    try {
      final userDataJson = jsonEncode(userData);
      await _prefs.setString(AppConstants.userDataKey, userDataJson);
    } catch (e) {
      debugPrint('Failed to store user data: $e');
      throw const StorageException(message: 'Failed to save user data');
    }
  }

  Map<String, dynamic>? getUserData() {
    try {
      final userDataJson = _prefs.getString(AppConstants.userDataKey);
      if (userDataJson != null) {
        return jsonDecode(userDataJson) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('Failed to get user data: $e');
      return null;
    }
  }

  Future<void> deleteUserData() async {
    try {
      await _prefs.remove(AppConstants.userDataKey);
    } catch (e) {
      debugPrint('Failed to delete user data: $e');
    }
  }

  // Attendance cache
  Future<void> cacheAttendanceData(String key, Map<String, dynamic> data) async {
    try {
      final dataJson = jsonEncode(data);
      await _prefs.setString('attendance_$key', dataJson);
    } catch (e) {
      debugPrint('Failed to cache attendance data: $e');
      throw const CacheException(message: 'Failed to cache attendance data');
    }
  }

  Map<String, dynamic>? getCachedAttendanceData(String key) {
    try {
      final dataJson = _prefs.getString('attendance_$key');
      if (dataJson != null) {
        return jsonDecode(dataJson) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('Failed to get cached attendance data: $e');
      return null;
    }
  }

  Future<void> deleteCachedAttendanceData(String key) async {
    try {
      await _prefs.remove('attendance_$key');
    } catch (e) {
      debugPrint('Failed to delete cached attendance data: $e');
    }
  }

  // Generic data storage
  Future<void> storeString(String key, String value) async {
    try {
      await _prefs.setString(key, value);
    } catch (e) {
      debugPrint('Failed to store string for key $key: $e');
      throw StorageException(message: 'Failed to store data for $key');
    }
  }

  String? getString(String key) {
    try {
      return _prefs.getString(key);
    } catch (e) {
      debugPrint('Failed to get string for key $key: $e');
      return null;
    }
  }

  Future<void> storeBool(String key, bool value) async {
    try {
      await _prefs.setBool(key, value);
    } catch (e) {
      debugPrint('Failed to store bool for key $key: $e');
      throw StorageException(message: 'Failed to store data for $key');
    }
  }

  bool? getBool(String key) {
    try {
      return _prefs.getBool(key);
    } catch (e) {
      debugPrint('Failed to get bool for key $key: $e');
      return null;
    }
  }

  Future<void> storeInt(String key, int value) async {
    try {
      await _prefs.setInt(key, value);
    } catch (e) {
      debugPrint('Failed to store int for key $key: $e');
      throw StorageException(message: 'Failed to store data for $key');
    }
  }

  int? getInt(String key) {
    try {
      return _prefs.getInt(key);
    } catch (e) {
      debugPrint('Failed to get int for key $key: $e');
      return null;
    }
  }

  Future<void> storeDouble(String key, double value) async {
    try {
      await _prefs.setDouble(key, value);
    } catch (e) {
      debugPrint('Failed to store double for key $key: $e');
      throw StorageException(message: 'Failed to store data for $key');
    }
  }

  double? getDouble(String key) {
    try {
      return _prefs.getDouble(key);
    } catch (e) {
      debugPrint('Failed to get double for key $key: $e');
      return null;
    }
  }

  Future<void> storeStringList(String key, List<String> values) async {
    try {
      await _prefs.setStringList(key, values);
    } catch (e) {
      debugPrint('Failed to store string list for key $key: $e');
      throw StorageException(message: 'Failed to store data for $key');
    }
  }

  List<String>? getStringList(String key) {
    try {
      return _prefs.getStringList(key);
    } catch (e) {
      debugPrint('Failed to get string list for key $key: $e');
      return null;
    }
  }

  Future<void> storeJson(String key, Map<String, dynamic> data) async {
    try {
      final jsonString = jsonEncode(data);
      await _prefs.setString(key, jsonString);
    } catch (e) {
      debugPrint('Failed to store JSON for key $key: $e');
      throw StorageException(message: 'Failed to store data for $key');
    }
  }

  Map<String, dynamic>? getJson(String key) {
    try {
      final jsonString = _prefs.getString(key);
      if (jsonString != null) {
        return jsonDecode(jsonString) as Map<String, dynamic>;
      }
      return null;
    } catch (e) {
      debugPrint('Failed to get JSON for key $key: $e');
      return null;
    }
  }

  // Utility methods
  Future<void> remove(String key) async {
    try {
      await _prefs.remove(key);
    } catch (e) {
      debugPrint('Failed to remove key $key: $e');
    }
  }

  bool containsKey(String key) {
    try {
      return _prefs.containsKey(key);
    } catch (e) {
      debugPrint('Failed to check if key exists: $e');
      return false;
    }
  }

  Future<void> clear() async {
    try {
      await _prefs.clear();
    } catch (e) {
      debugPrint('Failed to clear preferences: $e');
      throw const StorageException(message: 'Failed to clear storage');
    }
  }

  Set<String> getKeys() {
    try {
      return _prefs.getKeys();
    } catch (e) {
      debugPrint('Failed to get keys: $e');
      return <String>{};
    }
  }
}