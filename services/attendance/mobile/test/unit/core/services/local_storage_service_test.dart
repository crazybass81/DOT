import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:dot_attendance/core/storage/local_storage_service.dart';
import 'package:dot_attendance/core/constants/app_constants.dart';
import 'package:dot_attendance/core/errors/exceptions.dart';

// Mock classes
@GenerateMocks([SharedPreferences])
import 'local_storage_service_test.mocks.dart';

void main() {
  late LocalStorageService storageService;
  late MockSharedPreferences mockPrefs;

  setUp(() {
    mockPrefs = MockSharedPreferences();
    storageService = LocalStorageService(mockPrefs);
  });

  group('LocalStorageService', () {
    group('Theme Settings', () {
      test('should set theme mode successfully', () async {
        when(mockPrefs.setString(AppConstants.themeKey, 'dark')).thenAnswer((_) async => true);
        
        await storageService.setThemeMode('dark');
        
        verify(mockPrefs.setString(AppConstants.themeKey, 'dark')).called(1);
      });

      test('should get theme mode successfully', () {
        when(mockPrefs.getString(AppConstants.themeKey)).thenReturn('dark');
        
        final result = storageService.getThemeMode();
        
        expect(result, 'dark');
        verify(mockPrefs.getString(AppConstants.themeKey)).called(1);
      });

      test('should return null when theme mode is not set', () {
        when(mockPrefs.getString(AppConstants.themeKey)).thenReturn(null);
        
        final result = storageService.getThemeMode();
        
        expect(result, null);
      });

      test('should throw exception when setting theme mode fails', () async {
        when(mockPrefs.setString(AppConstants.themeKey, 'dark')).thenThrow(Exception('Storage error'));
        
        expect(
          () => storageService.setThemeMode('dark'),
          throwsA(isA<StorageException>()),
        );
      });

      test('should return null when getting theme mode fails', () {
        when(mockPrefs.getString(AppConstants.themeKey)).thenThrow(Exception('Storage error'));
        
        final result = storageService.getThemeMode();
        
        expect(result, null);
      });
    });

    group('Language Settings', () {
      test('should set language successfully', () async {
        when(mockPrefs.setString(AppConstants.languageKey, 'ko')).thenAnswer((_) async => true);
        
        await storageService.setLanguage('ko');
        
        verify(mockPrefs.setString(AppConstants.languageKey, 'ko')).called(1);
      });

      test('should get language successfully', () {
        when(mockPrefs.getString(AppConstants.languageKey)).thenReturn('ko');
        
        final result = storageService.getLanguage();
        
        expect(result, 'ko');
        verify(mockPrefs.getString(AppConstants.languageKey)).called(1);
      });

      test('should return null when language is not set', () {
        when(mockPrefs.getString(AppConstants.languageKey)).thenReturn(null);
        
        final result = storageService.getLanguage();
        
        expect(result, null);
      });

      test('should throw exception when setting language fails', () async {
        when(mockPrefs.setString(AppConstants.languageKey, 'en')).thenThrow(Exception('Storage error'));
        
        expect(
          () => storageService.setLanguage('en'),
          throwsA(isA<StorageException>()),
        );
      });
    });

    group('First Launch Flag', () {
      test('should set first launch flag successfully', () async {
        when(mockPrefs.setBool(AppConstants.firstLaunchKey, false)).thenAnswer((_) async => true);
        
        await storageService.setFirstLaunch(false);
        
        verify(mockPrefs.setBool(AppConstants.firstLaunchKey, false)).called(1);
      });

      test('should get first launch flag successfully', () {
        when(mockPrefs.getBool(AppConstants.firstLaunchKey)).thenReturn(false);
        
        final result = storageService.isFirstLaunch();
        
        expect(result, false);
        verify(mockPrefs.getBool(AppConstants.firstLaunchKey)).called(1);
      });

      test('should return true by default when first launch flag is not set', () {
        when(mockPrefs.getBool(AppConstants.firstLaunchKey)).thenReturn(null);
        
        final result = storageService.isFirstLaunch();
        
        expect(result, true);
      });

      test('should throw exception when setting first launch flag fails', () async {
        when(mockPrefs.setBool(AppConstants.firstLaunchKey, true)).thenThrow(Exception('Storage error'));
        
        expect(
          () => storageService.setFirstLaunch(true),
          throwsA(isA<StorageException>()),
        );
      });
    });

    group('Biometric Settings', () {
      test('should set biometric enabled successfully', () async {
        when(mockPrefs.setBool(AppConstants.biometricEnabledKey, true)).thenAnswer((_) async => true);
        
        await storageService.setBiometricEnabled(true);
        
        verify(mockPrefs.setBool(AppConstants.biometricEnabledKey, true)).called(1);
      });

      test('should get biometric enabled successfully', () {
        when(mockPrefs.getBool(AppConstants.biometricEnabledKey)).thenReturn(true);
        
        final result = storageService.isBiometricEnabled();
        
        expect(result, true);
        verify(mockPrefs.getBool(AppConstants.biometricEnabledKey)).called(1);
      });

      test('should return false by default when biometric enabled is not set', () {
        when(mockPrefs.getBool(AppConstants.biometricEnabledKey)).thenReturn(null);
        
        final result = storageService.isBiometricEnabled();
        
        expect(result, false);
      });
    });

    group('User Data', () {
      test('should store user data successfully', () async {
        final userData = {
          'id': 'user-001',
          'name': 'John Doe',
          'email': 'john@example.com',
          'role': 'USER'
        };
        
        when(mockPrefs.setString(AppConstants.userDataKey, any)).thenAnswer((_) async => true);
        
        await storageService.storeUserData(userData);
        
        verify(mockPrefs.setString(AppConstants.userDataKey, any)).called(1);
      });

      test('should get user data successfully', () {
        const userDataJson = '{"id":"user-001","name":"John Doe","email":"john@example.com","role":"USER"}';
        when(mockPrefs.getString(AppConstants.userDataKey)).thenReturn(userDataJson);
        
        final result = storageService.getUserData();
        
        expect(result, isNotNull);
        expect(result!['id'], 'user-001');
        expect(result['name'], 'John Doe');
        expect(result['email'], 'john@example.com');
        expect(result['role'], 'USER');
      });

      test('should return null when user data is not set', () {
        when(mockPrefs.getString(AppConstants.userDataKey)).thenReturn(null);
        
        final result = storageService.getUserData();
        
        expect(result, null);
      });

      test('should delete user data successfully', () async {
        when(mockPrefs.remove(AppConstants.userDataKey)).thenAnswer((_) async => true);
        
        await storageService.deleteUserData();
        
        verify(mockPrefs.remove(AppConstants.userDataKey)).called(1);
      });

      test('should throw exception when storing user data fails', () async {
        final userData = {'id': 'user-001'};
        when(mockPrefs.setString(AppConstants.userDataKey, any)).thenThrow(Exception('Storage error'));
        
        expect(
          () => storageService.storeUserData(userData),
          throwsA(isA<StorageException>()),
        );
      });

      test('should return null when getting user data fails', () {
        when(mockPrefs.getString(AppConstants.userDataKey)).thenThrow(Exception('Storage error'));
        
        final result = storageService.getUserData();
        
        expect(result, null);
      });

      test('should return null when user data JSON is malformed', () {
        when(mockPrefs.getString(AppConstants.userDataKey)).thenReturn('invalid json');
        
        final result = storageService.getUserData();
        
        expect(result, null);
      });
    });

    group('Attendance Cache', () {
      test('should cache attendance data successfully', () async {
        final attendanceData = {
          'id': 'att-001',
          'userId': 'user-001',
          'checkInTime': '2024-01-15T09:00:00.000Z',
          'status': 'present'
        };
        
        when(mockPrefs.setString('attendance_today', any)).thenAnswer((_) async => true);
        
        await storageService.cacheAttendanceData('today', attendanceData);
        
        verify(mockPrefs.setString('attendance_today', any)).called(1);
      });

      test('should get cached attendance data successfully', () {
        const attendanceDataJson = '{"id":"att-001","userId":"user-001","status":"present"}';
        when(mockPrefs.getString('attendance_today')).thenReturn(attendanceDataJson);
        
        final result = storageService.getCachedAttendanceData('today');
        
        expect(result, isNotNull);
        expect(result!['id'], 'att-001');
        expect(result['status'], 'present');
      });

      test('should return null when cached attendance data is not found', () {
        when(mockPrefs.getString('attendance_today')).thenReturn(null);
        
        final result = storageService.getCachedAttendanceData('today');
        
        expect(result, null);
      });

      test('should delete cached attendance data successfully', () async {
        when(mockPrefs.remove('attendance_today')).thenAnswer((_) async => true);
        
        await storageService.deleteCachedAttendanceData('today');
        
        verify(mockPrefs.remove('attendance_today')).called(1);
      });

      test('should throw exception when caching attendance data fails', () async {
        final attendanceData = {'id': 'att-001'};
        when(mockPrefs.setString('attendance_test', any)).thenThrow(Exception('Storage error'));
        
        expect(
          () => storageService.cacheAttendanceData('test', attendanceData),
          throwsA(isA<CacheException>()),
        );
      });
    });

    group('Generic Storage Methods', () {
      test('should store and get string values', () async {
        when(mockPrefs.setString('test_key', 'test_value')).thenAnswer((_) async => true);
        when(mockPrefs.getString('test_key')).thenReturn('test_value');
        
        await storageService.storeString('test_key', 'test_value');
        final result = storageService.getString('test_key');
        
        expect(result, 'test_value');
        verify(mockPrefs.setString('test_key', 'test_value')).called(1);
        verify(mockPrefs.getString('test_key')).called(1);
      });

      test('should store and get bool values', () async {
        when(mockPrefs.setBool('test_bool', true)).thenAnswer((_) async => true);
        when(mockPrefs.getBool('test_bool')).thenReturn(true);
        
        await storageService.storeBool('test_bool', true);
        final result = storageService.getBool('test_bool');
        
        expect(result, true);
        verify(mockPrefs.setBool('test_bool', true)).called(1);
        verify(mockPrefs.getBool('test_bool')).called(1);
      });

      test('should store and get int values', () async {
        when(mockPrefs.setInt('test_int', 42)).thenAnswer((_) async => true);
        when(mockPrefs.getInt('test_int')).thenReturn(42);
        
        await storageService.storeInt('test_int', 42);
        final result = storageService.getInt('test_int');
        
        expect(result, 42);
        verify(mockPrefs.setInt('test_int', 42)).called(1);
        verify(mockPrefs.getInt('test_int')).called(1);
      });

      test('should store and get double values', () async {
        when(mockPrefs.setDouble('test_double', 3.14)).thenAnswer((_) async => true);
        when(mockPrefs.getDouble('test_double')).thenReturn(3.14);
        
        await storageService.storeDouble('test_double', 3.14);
        final result = storageService.getDouble('test_double');
        
        expect(result, 3.14);
        verify(mockPrefs.setDouble('test_double', 3.14)).called(1);
        verify(mockPrefs.getDouble('test_double')).called(1);
      });

      test('should store and get string list values', () async {
        final testList = ['item1', 'item2', 'item3'];
        when(mockPrefs.setStringList('test_list', testList)).thenAnswer((_) async => true);
        when(mockPrefs.getStringList('test_list')).thenReturn(testList);
        
        await storageService.storeStringList('test_list', testList);
        final result = storageService.getStringList('test_list');
        
        expect(result, testList);
        verify(mockPrefs.setStringList('test_list', testList)).called(1);
        verify(mockPrefs.getStringList('test_list')).called(1);
      });

      test('should store and get JSON values', () async {
        final testData = {'key': 'value', 'number': 123, 'flag': true};
        when(mockPrefs.setString('test_json', any)).thenAnswer((_) async => true);
        when(mockPrefs.getString('test_json')).thenReturn('{"key":"value","number":123,"flag":true}');
        
        await storageService.storeJson('test_json', testData);
        final result = storageService.getJson('test_json');
        
        expect(result, testData);
        verify(mockPrefs.setString('test_json', any)).called(1);
        verify(mockPrefs.getString('test_json')).called(1);
      });

      test('should return null for non-existent keys', () {
        when(mockPrefs.getString('non_existent')).thenReturn(null);
        when(mockPrefs.getBool('non_existent')).thenReturn(null);
        when(mockPrefs.getInt('non_existent')).thenReturn(null);
        when(mockPrefs.getDouble('non_existent')).thenReturn(null);
        when(mockPrefs.getStringList('non_existent')).thenReturn(null);
        
        expect(storageService.getString('non_existent'), null);
        expect(storageService.getBool('non_existent'), null);
        expect(storageService.getInt('non_existent'), null);
        expect(storageService.getDouble('non_existent'), null);
        expect(storageService.getStringList('non_existent'), null);
        expect(storageService.getJson('non_existent'), null);
      });
    });

    group('Utility Methods', () {
      test('should remove key successfully', () async {
        when(mockPrefs.remove('test_key')).thenAnswer((_) async => true);
        
        await storageService.remove('test_key');
        
        verify(mockPrefs.remove('test_key')).called(1);
      });

      test('should check if key contains successfully', () {
        when(mockPrefs.containsKey('existing_key')).thenReturn(true);
        when(mockPrefs.containsKey('non_existing_key')).thenReturn(false);
        
        expect(storageService.containsKey('existing_key'), true);
        expect(storageService.containsKey('non_existing_key'), false);
      });

      test('should clear all preferences successfully', () async {
        when(mockPrefs.clear()).thenAnswer((_) async => true);
        
        await storageService.clear();
        
        verify(mockPrefs.clear()).called(1);
      });

      test('should get all keys successfully', () {
        final testKeys = {'key1', 'key2', 'key3'};
        when(mockPrefs.getKeys()).thenReturn(testKeys);
        
        final result = storageService.getKeys();
        
        expect(result, testKeys);
        verify(mockPrefs.getKeys()).called(1);
      });

      test('should return empty set when getting keys fails', () {
        when(mockPrefs.getKeys()).thenThrow(Exception('Storage error'));
        
        final result = storageService.getKeys();
        
        expect(result, <String>{});
      });

      test('should throw exception when clearing fails', () async {
        when(mockPrefs.clear()).thenThrow(Exception('Storage error'));
        
        expect(
          () => storageService.clear(),
          throwsA(isA<StorageException>()),
        );
      });
    });

    group('Error Handling', () {
      test('should handle storage exceptions gracefully in getters', () {
        when(mockPrefs.getString(any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.getBool(any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.getInt(any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.getDouble(any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.getStringList(any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.containsKey(any)).thenThrow(Exception('Storage error'));
        
        expect(storageService.getString('test'), null);
        expect(storageService.getBool('test'), null);
        expect(storageService.getInt('test'), null);
        expect(storageService.getDouble('test'), null);
        expect(storageService.getStringList('test'), null);
        expect(storageService.getJson('test'), null);
        expect(storageService.containsKey('test'), false);
      });

      test('should throw appropriate exceptions in setters', () async {
        when(mockPrefs.setString(any, any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.setBool(any, any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.setInt(any, any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.setDouble(any, any)).thenThrow(Exception('Storage error'));
        when(mockPrefs.setStringList(any, any)).thenThrow(Exception('Storage error'));
        
        expect(() => storageService.storeString('test', 'value'), throwsA(isA<StorageException>()));
        expect(() => storageService.storeBool('test', true), throwsA(isA<StorageException>()));
        expect(() => storageService.storeInt('test', 1), throwsA(isA<StorageException>()));
        expect(() => storageService.storeDouble('test', 1.0), throwsA(isA<StorageException>()));
        expect(() => storageService.storeStringList('test', ['item']), throwsA(isA<StorageException>()));
        expect(() => storageService.storeJson('test', {}), throwsA(isA<StorageException>()));
      });

      test('should handle removal errors gracefully', () async {
        when(mockPrefs.remove(any)).thenThrow(Exception('Storage error'));
        
        // Should not throw exception
        await storageService.remove('test');
        await storageService.deleteUserData();
        await storageService.deleteCachedAttendanceData('test');
      });
    });
  });
}