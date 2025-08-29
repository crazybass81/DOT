import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
// import 'package:firebase_messaging/firebase_messaging.dart'; // Disabled for now
// import 'package:timezone/timezone.dart' as tz; // Disabled for now

import '../constants/app_constants.dart';
import '../errors/exceptions.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  // final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance; // Disabled for now

  /// Static method for easy access
  static Future<void> initialize() async {
    await _instance._initialize();
  }

  /// Static method for showing notifications
  static Future<void> showNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    await _instance._showNotificationInternal(
      id: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title: title,
      body: body,
      payload: payload,
    );
  }

  /// Initialize notification service
  Future<void> _initialize() async {
    try {
      await _initializeLocalNotifications();
      // await _initializeFirebaseMessaging(); // Disabled for now
      debugPrint('Notification service initialized (without Firebase)');
    } catch (e) {
      debugPrint('Notification service initialization failed: $e');
      throw NotificationException(message: 'Failed to initialize notifications: $e');
    }
  }

  /// Initialize local notifications
  Future<void> _initializeLocalNotifications() async {
    const androidInitSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInitSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    const initSettings = InitializationSettings(
      android: androidInitSettings,
      iOS: iosInitSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channels for Android
    if (Platform.isAndroid) {
      await _createNotificationChannels();
    }

    // Request permissions for iOS
    if (Platform.isIOS) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );
    }
  }

  /// Create notification channels for Android
  Future<void> _createNotificationChannels() async {
    final androidPlugin = _localNotifications.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();

    if (androidPlugin != null) {
      // Attendance channel
      const attendanceChannel = AndroidNotificationChannel(
        AppConstants.attendanceNotificationChannel,
        'Attendance Notifications',
        description: 'Notifications for attendance reminders and updates',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
      );

      // General channel
      const generalChannel = AndroidNotificationChannel(
        AppConstants.generalNotificationChannel,
        'General Notifications',
        description: 'General app notifications',
        importance: Importance.defaultImportance,
        playSound: true,
      );

      await androidPlugin.createNotificationChannel(attendanceChannel);
      await androidPlugin.createNotificationChannel(generalChannel);
    }
  }

  /// Initialize Firebase messaging (dummy implementation)
  Future<void> _initializeFirebaseMessaging() async {
    debugPrint('Firebase messaging initialization skipped (dummy implementation)');
    // All Firebase messaging functionality is disabled for now
  }

  /// Handle foreground messages (dummy implementation)
  void _handleForegroundMessage(dynamic message) {
    debugPrint('Foreground message received (dummy): $message');
    // Firebase messaging disabled
  }

  /// Handle background message clicks (dummy implementation)
  void _handleBackgroundMessageClick(dynamic message) {
    debugPrint('Background message clicked (dummy): $message');
    // Firebase messaging disabled
  }

  /// Handle notification taps
  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('Notification tapped: ${response.payload}');
    if (response.payload != null) {
      _navigateBasedOnPayload({'payload': response.payload});
    }
  }

  /// Navigate based on notification payload
  void _navigateBasedOnPayload(Map<String, dynamic> data) {
    // Implement navigation logic based on notification data
    // This can be handled by a navigation service or router
  }

  /// Internal method for showing notifications
  Future<void> _showNotificationInternal({
    required int id,
    required String title,
    required String body,
    String? payload,
    String channelId = AppConstants.generalNotificationChannel,
  }) async {
    try {
      const androidDetails = AndroidNotificationDetails(
        AppConstants.generalNotificationChannel,
        'General Notifications',
        importance: Importance.high,
        priority: Priority.high,
        showWhen: false,
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      await _localNotifications.show(
        id,
        title,
        body,
        notificationDetails,
        payload: payload,
      );
    } catch (e) {
      debugPrint('Failed to show notification: $e');
      throw NotificationException(message: 'Failed to show notification: $e');
    }
  }

  /// Show local notification with ID
  Future<void> showNotificationWithId({
    required int id,
    required String title,
    required String body,
    String? payload,
    String channelId = AppConstants.generalNotificationChannel,
  }) async {
    await _showNotificationInternal(
      id: id,
      title: title,
      body: body,
      payload: payload,
      channelId: channelId,
    );
  }

  /// Show attendance reminder notification
  Future<void> showAttendanceReminder({
    required String title,
    required String body,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      AppConstants.attendanceNotificationChannel,
      'Attendance Notifications',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: false,
      icon: '@drawable/ic_attendance',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      notificationDetails,
      payload: 'attendance_reminder',
    );
  }

  /// Schedule notification
  Future<void> scheduleNotification({
    required int id,
    required String title,
    required String body,
    required DateTime scheduledDate,
    String? payload,
    String channelId = AppConstants.generalNotificationChannel,
  }) async {
    try {
      const androidDetails = AndroidNotificationDetails(
        AppConstants.generalNotificationChannel,
        'General Notifications',
        importance: Importance.high,
        priority: Priority.high,
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      const notificationDetails = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      // Timezone scheduling temporarily disabled - using simple delay instead
      final delayDuration = scheduledDate.difference(DateTime.now());
      if (delayDuration.isNegative) {
        // If scheduled date is in the past, show immediately
        await _localNotifications.show(id, title, body, notificationDetails, payload: payload);
      } else {
        // Use simple delay for now (not persistent across app restarts)
        Future.delayed(delayDuration, () async {
          await _localNotifications.show(id, title, body, notificationDetails, payload: payload);
        });
        debugPrint('Notification scheduled with simple delay: ${delayDuration.inSeconds} seconds');
      }
    } catch (e) {
      debugPrint('Failed to schedule notification: $e');
      throw NotificationException(message: 'Failed to schedule notification: $e');
    }
  }

  /// Cancel notification
  Future<void> cancelNotification(int id) async {
    await _localNotifications.cancel(id);
  }

  /// Cancel all notifications
  Future<void> cancelAllNotifications() async {
    await _localNotifications.cancelAll();
  }

  /// Get pending notifications
  Future<List<PendingNotificationRequest>> getPendingNotifications() async {
    return await _localNotifications.pendingNotificationRequests();
  }

  /// Get FCM token (dummy implementation)
  Future<String?> getFCMToken() async {
    debugPrint('FCM token requested (returning dummy token)');
    return 'dummy-fcm-token-for-development';
  }

  /// Subscribe to topic (dummy implementation)
  Future<void> subscribeToTopic(String topic) async {
    debugPrint('Subscribed to topic (dummy): $topic');
  }

  /// Unsubscribe from topic (dummy implementation)
  Future<void> unsubscribeFromTopic(String topic) async {
    debugPrint('Unsubscribed from topic (dummy): $topic');
  }

  /// Check notification permissions
  Future<bool> areNotificationsEnabled() async {
    if (Platform.isAndroid) {
      final androidPlugin = _localNotifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      return await androidPlugin?.areNotificationsEnabled() ?? false;
    } else if (Platform.isIOS) {
      final iosPlugin = _localNotifications.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      return await iosPlugin?.checkPermissions().then((permissions) =>
          permissions?.isEnabled == true) ?? false;
    }
    return false;
  }

  /// Request notification permissions
  Future<bool> requestPermissions() async {
    if (Platform.isAndroid) {
      final androidPlugin = _localNotifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      return await androidPlugin?.requestPermission() ?? false;
    } else if (Platform.isIOS) {
      final iosPlugin = _localNotifications.resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin>();
      return await iosPlugin?.requestPermissions(
        alert: true,
        badge: true,
        sound: true,
      ) ?? false;
    }
    return false;
  }
}

/// Background message handler (dummy implementation)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(dynamic message) async {
  debugPrint('Background message received (dummy): $message');
}