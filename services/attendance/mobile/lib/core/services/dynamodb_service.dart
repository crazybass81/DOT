import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';

/// DynamoDB service for managing AWS DynamoDB operations
class DynamoDBService {
  static DynamoDBService? _instance;
  static DynamoDBService get instance => _instance ??= DynamoDBService._();
  
  DynamoDBService._();
  
  String? _accessKeyId;
  String? _secretAccessKey;
  String? _region;
  bool _initialized = false;
  
  // Table names
  static const String attendanceTable = 'dot-attendance-records';
  static const String usersTable = 'dot-users';
  static const String locationsTable = 'dot-locations';
  static const String notificationsTable = 'dot-notifications';
  static const String analyticsTable = 'dot-analytics';
  
  bool get isInitialized => _initialized;
  
  /// Initialize DynamoDB service
  Future<void> initialize({
    required String accessKeyId,
    required String secretAccessKey,
    required String region,
  }) async {
    if (_initialized) return;
    
    try {
      debugPrint('Initializing DynamoDB...');
      
      _accessKeyId = accessKeyId;
      _secretAccessKey = secretAccessKey;
      _region = region;
      
      _initialized = true;
      debugPrint('DynamoDB initialized successfully');
    } catch (e) {
      debugPrint('Failed to initialize DynamoDB: $e');
      rethrow;
    }
  }
  
  /// Record attendance check-in or check-out
  Future<bool> recordAttendance({
    required String userId,
    required String type, // 'check_in' or 'check_out'
    required DateTime timestamp,
    required Map<String, double> location,
    String? qrCode,
    String? notes,
    Map<String, dynamic>? metadata,
  }) async {
    if (!_initialized) {
      throw Exception('DynamoDB not initialized');
    }
    
    try {
      final item = {
        'userId': {'S': userId},
        'timestamp': {'S': timestamp.toIso8601String()},
        'type': {'S': type},
        'location': {
          'M': {
            'latitude': {'N': location['latitude'].toString()},
            'longitude': {'N': location['longitude'].toString()},
          }
        },
        'recordId': {'S': '${userId}_${timestamp.millisecondsSinceEpoch}'},
        'createdAt': {'S': DateTime.now().toIso8601String()},
      };
      
      if (qrCode != null) {
        item['qrCode'] = {'S': qrCode};
      }
      
      if (notes != null) {
        item['notes'] = {'S': notes};
      }
      
      if (metadata != null) {
        item['metadata'] = _convertToAttributeValue(metadata);
      }
      
      // For demo purposes, we'll simulate the API call
      debugPrint('Recording attendance: ${jsonEncode(item)}');
      
      // In production, make actual API call using AWS Signature V4
      // await _makeRequest('PutItem', {
      //   'TableName': attendanceTable,
      //   'Item': item,
      // });
      
      return true;
    } catch (e) {
      debugPrint('Failed to record attendance: $e');
      return false;
    }
  }
  
  /// Get user profile from DynamoDB
  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    if (!_initialized) {
      throw Exception('DynamoDB not initialized');
    }
    
    try {
      // For demo purposes, return mock data
      if (userId == 'admin') {
        return {
          'userId': 'admin',
          'email': 'admin@dot.com',
          'firstName': 'Master',
          'lastName': 'Admin',
          'role': 'admin',
          'department': 'Management',
          'createdAt': DateTime.now().toIso8601String(),
        };
      }
      
      // In production, make actual API call
      // final response = await _makeRequest('GetItem', {
      //   'TableName': usersTable,
      //   'Key': {
      //     'userId': {'S': userId}
      //   }
      // });
      
      return null;
    } catch (e) {
      debugPrint('Failed to get user profile: $e');
      return null;
    }
  }
  
  /// Create or update user profile
  Future<bool> saveUserProfile(Map<String, dynamic> userProfile) async {
    if (!_initialized) {
      throw Exception('DynamoDB not initialized');
    }
    
    try {
      final item = _convertToAttributeValue(userProfile);
      
      debugPrint('Saving user profile: ${jsonEncode(item)}');
      
      // In production, make actual API call
      // await _makeRequest('PutItem', {
      //   'TableName': usersTable,
      //   'Item': item,
      // });
      
      return true;
    } catch (e) {
      debugPrint('Failed to save user profile: $e');
      return false;
    }
  }
  
  /// Get attendance records for a user
  Future<List<Map<String, dynamic>>> getAttendanceRecords({
    required String userId,
    DateTime? startDate,
    DateTime? endDate,
    int? limit,
  }) async {
    if (!_initialized) {
      throw Exception('DynamoDB not initialized');
    }
    
    try {
      // For demo purposes, return mock data
      return [
        {
          'userId': userId,
          'timestamp': DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
          'type': 'check_in',
          'location': {
            'latitude': 37.5665,
            'longitude': 126.9780,
          },
        },
        {
          'userId': userId,
          'timestamp': DateTime.now().toIso8601String(),
          'type': 'check_out',
          'location': {
            'latitude': 37.5665,
            'longitude': 126.9780,
          },
        },
      ];
      
      // In production, make actual API call
      // final response = await _makeRequest('Query', {
      //   'TableName': attendanceTable,
      //   'KeyConditionExpression': 'userId = :userId',
      //   'ExpressionAttributeValues': {
      //     ':userId': {'S': userId}
      //   },
      //   'Limit': limit ?? 100,
      // });
      
    } catch (e) {
      debugPrint('Failed to get attendance records: $e');
      return [];
    }
  }
  
  /// Convert Dart object to DynamoDB AttributeValue format
  Map<String, dynamic> _convertToAttributeValue(dynamic value) {
    if (value is String) {
      return {'S': value};
    } else if (value is num) {
      return {'N': value.toString()};
    } else if (value is bool) {
      return {'BOOL': value};
    } else if (value is List) {
      return {'L': value.map(_convertToAttributeValue).toList()};
    } else if (value is Map) {
      final Map<String, dynamic> result = {};
      value.forEach((k, v) {
        result[k.toString()] = _convertToAttributeValue(v);
      });
      return {'M': result};
    } else if (value == null) {
      return {'NULL': true};
    } else {
      return {'S': value.toString()};
    }
  }
  
  /// Convert DynamoDB AttributeValue to Dart object
  dynamic _convertFromAttributeValue(Map<String, dynamic> value) {
    if (value.containsKey('S')) {
      return value['S'];
    } else if (value.containsKey('N')) {
      return num.parse(value['N']);
    } else if (value.containsKey('BOOL')) {
      return value['BOOL'];
    } else if (value.containsKey('L')) {
      return (value['L'] as List).map(_convertFromAttributeValue).toList();
    } else if (value.containsKey('M')) {
      final Map<String, dynamic> result = {};
      (value['M'] as Map).forEach((k, v) {
        result[k] = _convertFromAttributeValue(v);
      });
      return result;
    } else if (value.containsKey('NULL')) {
      return null;
    }
    return null;
  }
  
  /// Send notification
  Future<bool> sendNotification({
    required String userId,
    required String type,
    required String title,
    required String message,
    Map<String, dynamic>? data,
  }) async {
    if (!_initialized) {
      throw Exception('DynamoDB not initialized');
    }
    
    try {
      final notification = {
        'notificationId': {'S': '${userId}_${DateTime.now().millisecondsSinceEpoch}'},
        'userId': {'S': userId},
        'type': {'S': type},
        'title': {'S': title},
        'message': {'S': message},
        'isRead': {'BOOL': false},
        'createdAt': {'S': DateTime.now().toIso8601String()},
      };
      
      if (data != null) {
        notification['data'] = _convertToAttributeValue(data);
      }
      
      debugPrint('Sending notification: ${jsonEncode(notification)}');
      
      // In production, make actual API call
      // await _makeRequest('PutItem', {
      //   'TableName': notificationsTable,
      //   'Item': notification,
      // });
      
      return true;
    } catch (e) {
      debugPrint('Failed to send notification: $e');
      return false;
    }
  }
  
  /// Get unread notifications for a user
  Future<List<Map<String, dynamic>>> getUnreadNotifications(String userId) async {
    if (!_initialized) {
      throw Exception('DynamoDB not initialized');
    }
    
    try {
      // For demo purposes, return mock data
      return [
        {
          'notificationId': 'notif_001',
          'userId': userId,
          'type': 'attendance',
          'title': 'Check-in Reminder',
          'message': 'Don\'t forget to check in today!',
          'isRead': false,
          'createdAt': DateTime.now().toIso8601String(),
        },
      ];
      
      // In production, make actual API call
      // final response = await _makeRequest('Query', {
      //   'TableName': notificationsTable,
      //   'IndexName': 'userId-isRead-index',
      //   'KeyConditionExpression': 'userId = :userId AND isRead = :isRead',
      //   'ExpressionAttributeValues': {
      //     ':userId': {'S': userId},
      //     ':isRead': {'BOOL': false}
      //   }
      // });
      
    } catch (e) {
      debugPrint('Failed to get notifications: $e');
      return [];
    }
  }
  
  /// Mark notification as read
  Future<bool> markNotificationAsRead(String notificationId) async {
    if (!_initialized) {
      throw Exception('DynamoDB not initialized');
    }
    
    try {
      debugPrint('Marking notification as read: $notificationId');
      
      // In production, make actual API call
      // await _makeRequest('UpdateItem', {
      //   'TableName': notificationsTable,
      //   'Key': {
      //     'notificationId': {'S': notificationId}
      //   },
      //   'UpdateExpression': 'SET isRead = :isRead',
      //   'ExpressionAttributeValues': {
      //     ':isRead': {'BOOL': true}
      //   }
      // });
      
      return true;
    } catch (e) {
      debugPrint('Failed to mark notification as read: $e');
      return false;
    }
  }
}