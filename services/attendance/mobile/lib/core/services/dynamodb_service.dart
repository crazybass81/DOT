import 'package:aws_dynamodb_api/dynamodb-2012-08-10.dart';
import 'package:aws_common/aws_common.dart';
import 'package:flutter/foundation.dart';

/// DynamoDB service for managing AWS DynamoDB operations
class DynamoDBService {
  static DynamoDBService? _instance;
  static DynamoDBService get instance => _instance ??= DynamoDBService._();
  
  DynamoDBService._();
  
  late DynamoDB _dynamoDB;
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
    String? sessionToken,
  }) async {
    if (_initialized) return;
    
    try {
      debugPrint('Initializing DynamoDB...');
      
      // Create AWS credentials
      final credentials = sessionToken != null
          ? AwsClientCredentials(
              accessKey: accessKeyId,
              secretKey: secretAccessKey,
              sessionToken: sessionToken,
            )
          : AwsClientCredentials(
              accessKey: accessKeyId,
              secretKey: secretAccessKey,
            );
      
      // Initialize DynamoDB client
      _dynamoDB = DynamoDB(
        region: region,
        credentials: credentials,
      );
      
      // Verify connection by describing tables
      await _verifyConnection();
      
      _initialized = true;
      debugPrint('DynamoDB initialized successfully');
    } catch (e) {
      debugPrint('DynamoDB initialization error: $e');
      rethrow;
    }
  }
  
  /// Verify DynamoDB connection
  Future<void> _verifyConnection() async {
    try {
      final result = await _dynamoDB.listTables(limit: 1);
      debugPrint('DynamoDB connected. Tables: ${result.tableNames}');
    } catch (e) {
      throw Exception('Failed to connect to DynamoDB: $e');
    }
  }
  
  /// Create attendance record
  Future<void> createAttendanceRecord({
    required String userId,
    required String type, // 'check_in' or 'check_out'
    required DateTime timestamp,
    required double latitude,
    required double longitude,
    String? photoUrl,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final item = {
        'userId': AttributeValue(s: userId),
        'recordId': AttributeValue(s: '${userId}_${timestamp.millisecondsSinceEpoch}'),
        'type': AttributeValue(s: type),
        'timestamp': AttributeValue(n: timestamp.millisecondsSinceEpoch.toString()),
        'latitude': AttributeValue(n: latitude.toString()),
        'longitude': AttributeValue(n: longitude.toString()),
        'date': AttributeValue(s: timestamp.toIso8601String().split('T')[0]),
        'time': AttributeValue(s: timestamp.toIso8601String().split('T')[1]),
        'ttl': AttributeValue(n: (timestamp.add(const Duration(days: 90)).millisecondsSinceEpoch ~/ 1000).toString()),
      };
      
      if (photoUrl != null) {
        item['photoUrl'] = AttributeValue(s: photoUrl);
      }
      
      if (metadata != null) {
        item['metadata'] = AttributeValue(m: _convertMapToAttributeValues(metadata));
      }
      
      await _dynamoDB.putItem(
        tableName: attendanceTable,
        item: item,
      );
      
      debugPrint('Attendance record created successfully');
    } catch (e) {
      debugPrint('Failed to create attendance record: $e');
      rethrow;
    }
  }
  
  /// Get attendance records for a user
  Future<List<Map<String, dynamic>>> getAttendanceRecords({
    required String userId,
    required DateTime startDate,
    required DateTime endDate,
  }) async {
    try {
      final result = await _dynamoDB.query(
        tableName: attendanceTable,
        keyConditionExpression: 'userId = :userId AND #ts BETWEEN :start AND :end',
        expressionAttributeNames: {
          '#ts': 'timestamp',
        },
        expressionAttributeValues: {
          ':userId': AttributeValue(s: userId),
          ':start': AttributeValue(n: startDate.millisecondsSinceEpoch.toString()),
          ':end': AttributeValue(n: endDate.millisecondsSinceEpoch.toString()),
        },
        scanIndexForward: false, // Sort descending
      );
      
      final records = result.items?.map((item) => _convertAttributeValuesToMap(item)).toList() ?? [];
      
      debugPrint('Retrieved ${records.length} attendance records');
      return records;
    } catch (e) {
      debugPrint('Failed to get attendance records: $e');
      rethrow;
    }
  }
  
  /// Get user profile
  Future<Map<String, dynamic>?> getUserProfile(String userId) async {
    try {
      final result = await _dynamoDB.getItem(
        tableName: usersTable,
        key: {
          'userId': AttributeValue(s: userId),
        },
      );
      
      if (result.item != null) {
        return _convertAttributeValuesToMap(result.item!);
      }
      
      return null;
    } catch (e) {
      debugPrint('Failed to get user profile: $e');
      rethrow;
    }
  }
  
  /// Update user profile
  Future<void> updateUserProfile({
    required String userId,
    Map<String, dynamic>? updates,
  }) async {
    if (updates == null || updates.isEmpty) return;
    
    try {
      final updateExpression = <String>[];
      final expressionAttributeNames = <String, String>{};
      final expressionAttributeValues = <String, AttributeValue>{};
      
      updates.forEach((key, value) {
        final placeholder = '#$key';
        final valuePlaceholder = ':$key';
        
        updateExpression.add('$placeholder = $valuePlaceholder');
        expressionAttributeNames[placeholder] = key;
        expressionAttributeValues[valuePlaceholder] = _convertToAttributeValue(value);
      });
      
      await _dynamoDB.updateItem(
        tableName: usersTable,
        key: {
          'userId': AttributeValue(s: userId),
        },
        updateExpression: 'SET ${updateExpression.join(', ')}',
        expressionAttributeNames: expressionAttributeNames,
        expressionAttributeValues: expressionAttributeValues,
      );
      
      debugPrint('User profile updated successfully');
    } catch (e) {
      debugPrint('Failed to update user profile: $e');
      rethrow;
    }
  }
  
  /// Save notification
  Future<void> saveNotification({
    required String userId,
    required String title,
    required String body,
    required String type,
    Map<String, dynamic>? data,
  }) async {
    try {
      final timestamp = DateTime.now();
      
      await _dynamoDB.putItem(
        tableName: notificationsTable,
        item: {
          'userId': AttributeValue(s: userId),
          'notificationId': AttributeValue(s: '${userId}_${timestamp.millisecondsSinceEpoch}'),
          'title': AttributeValue(s: title),
          'body': AttributeValue(s: body),
          'type': AttributeValue(s: type),
          'timestamp': AttributeValue(n: timestamp.millisecondsSinceEpoch.toString()),
          'read': AttributeValue(bool_: false),
          'data': data != null ? AttributeValue(m: _convertMapToAttributeValues(data)) : null,
          'ttl': AttributeValue(n: (timestamp.add(const Duration(days: 30)).millisecondsSinceEpoch ~/ 1000).toString()),
        },
      );
      
      debugPrint('Notification saved successfully');
    } catch (e) {
      debugPrint('Failed to save notification: $e');
      rethrow;
    }
  }
  
  /// Get notifications for a user
  Future<List<Map<String, dynamic>>> getNotifications({
    required String userId,
    int limit = 50,
  }) async {
    try {
      final result = await _dynamoDB.query(
        tableName: notificationsTable,
        keyConditionExpression: 'userId = :userId',
        expressionAttributeValues: {
          ':userId': AttributeValue(s: userId),
        },
        scanIndexForward: false,
        limit: limit,
      );
      
      final notifications = result.items?.map((item) => _convertAttributeValuesToMap(item)).toList() ?? [];
      
      debugPrint('Retrieved ${notifications.length} notifications');
      return notifications;
    } catch (e) {
      debugPrint('Failed to get notifications: $e');
      rethrow;
    }
  }
  
  /// Mark notification as read
  Future<void> markNotificationAsRead({
    required String userId,
    required String notificationId,
  }) async {
    try {
      await _dynamoDB.updateItem(
        tableName: notificationsTable,
        key: {
          'userId': AttributeValue(s: userId),
          'notificationId': AttributeValue(s: notificationId),
        },
        updateExpression: 'SET #read = :true',
        expressionAttributeNames: {
          '#read': 'read',
        },
        expressionAttributeValues: {
          ':true': AttributeValue(bool_: true),
        },
      );
      
      debugPrint('Notification marked as read');
    } catch (e) {
      debugPrint('Failed to mark notification as read: $e');
      rethrow;
    }
  }
  
  /// Log analytics event
  Future<void> logAnalyticsEvent({
    required String userId,
    required String eventName,
    Map<String, dynamic>? parameters,
  }) async {
    try {
      final timestamp = DateTime.now();
      
      await _dynamoDB.putItem(
        tableName: analyticsTable,
        item: {
          'userId': AttributeValue(s: userId),
          'eventId': AttributeValue(s: '${userId}_${timestamp.millisecondsSinceEpoch}_$eventName'),
          'eventName': AttributeValue(s: eventName),
          'timestamp': AttributeValue(n: timestamp.millisecondsSinceEpoch.toString()),
          'date': AttributeValue(s: timestamp.toIso8601String().split('T')[0]),
          'parameters': parameters != null ? AttributeValue(m: _convertMapToAttributeValues(parameters)) : null,
          'ttl': AttributeValue(n: (timestamp.add(const Duration(days: 365)).millisecondsSinceEpoch ~/ 1000).toString()),
        },
      );
      
      debugPrint('Analytics event logged: $eventName');
    } catch (e) {
      debugPrint('Failed to log analytics event: $e');
    }
  }
  
  /// Batch write items
  Future<void> batchWriteItems({
    required String tableName,
    required List<Map<String, AttributeValue>> items,
  }) async {
    try {
      // DynamoDB batch write supports up to 25 items
      const batchSize = 25;
      
      for (var i = 0; i < items.length; i += batchSize) {
        final batch = items.skip(i).take(batchSize).toList();
        
        await _dynamoDB.batchWriteItem(
          requestItems: {
            tableName: batch.map((item) => WriteRequest(
              putRequest: PutRequest(item: item),
            )).toList(),
          },
        );
      }
      
      debugPrint('Batch write completed for ${items.length} items');
    } catch (e) {
      debugPrint('Failed to batch write items: $e');
      rethrow;
    }
  }
  
  /// Convert Dart map to DynamoDB AttributeValue map
  Map<String, AttributeValue> _convertMapToAttributeValues(Map<String, dynamic> map) {
    final result = <String, AttributeValue>{};
    
    map.forEach((key, value) {
      result[key] = _convertToAttributeValue(value);
    });
    
    return result;
  }
  
  /// Convert Dart value to DynamoDB AttributeValue
  AttributeValue _convertToAttributeValue(dynamic value) {
    if (value == null) {
      return AttributeValue(null_: true);
    } else if (value is String) {
      return AttributeValue(s: value);
    } else if (value is num) {
      return AttributeValue(n: value.toString());
    } else if (value is bool) {
      return AttributeValue(bool_: value);
    } else if (value is List) {
      return AttributeValue(l: value.map(_convertToAttributeValue).toList());
    } else if (value is Map<String, dynamic>) {
      return AttributeValue(m: _convertMapToAttributeValues(value));
    } else {
      return AttributeValue(s: value.toString());
    }
  }
  
  /// Convert DynamoDB AttributeValue map to Dart map
  Map<String, dynamic> _convertAttributeValuesToMap(Map<String, AttributeValue> attributeValues) {
    final result = <String, dynamic>{};
    
    attributeValues.forEach((key, value) {
      result[key] = _convertFromAttributeValue(value);
    });
    
    return result;
  }
  
  /// Convert DynamoDB AttributeValue to Dart value
  dynamic _convertFromAttributeValue(AttributeValue value) {
    if (value.null_ == true) {
      return null;
    } else if (value.s != null) {
      return value.s;
    } else if (value.n != null) {
      return num.tryParse(value.n!) ?? value.n;
    } else if (value.bool_ != null) {
      return value.bool_;
    } else if (value.l != null) {
      return value.l!.map(_convertFromAttributeValue).toList();
    } else if (value.m != null) {
      return _convertAttributeValuesToMap(value.m!);
    } else {
      return null;
    }
  }
  
  /// Clean up resources
  void dispose() {
    _initialized = false;
  }
}