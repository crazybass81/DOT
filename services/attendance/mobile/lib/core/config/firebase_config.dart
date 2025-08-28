import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_remote_config/firebase_remote_config.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import '../services/notification_service.dart';

class FirebaseConfig {
  static FirebaseApp? _app;
  static FirebaseAnalytics? _analytics;
  static FirebaseCrashlytics? _crashlytics;
  static FirebaseRemoteConfig? _remoteConfig;

  static FirebaseApp get app {
    if (_app == null) {
      throw Exception('Firebase not initialized. Call FirebaseConfig.initialize() first.');
    }
    return _app!;
  }

  static FirebaseAnalytics get analytics {
    if (_analytics == null) {
      throw Exception('Firebase Analytics not initialized.');
    }
    return _analytics!;
  }

  static FirebaseCrashlytics get crashlytics {
    if (_crashlytics == null) {
      throw Exception('Firebase Crashlytics not initialized.');
    }
    return _crashlytics!;
  }

  static FirebaseRemoteConfig get remoteConfig {
    if (_remoteConfig == null) {
      throw Exception('Firebase Remote Config not initialized.');
    }
    return _remoteConfig!;
  }

  /// Initialize Firebase with all required services
  static Future<void> initialize() async {
    try {
      // Initialize Firebase Core
      _app = await Firebase.initializeApp(
        options: await _getFirebaseOptions(),
      );

      // Initialize App Check for security
      await FirebaseAppCheck.instance.activate(
        androidProvider: kDebugMode 
            ? AndroidProvider.debug 
            : AndroidProvider.playIntegrity,
        appleProvider: kDebugMode 
            ? AppleProvider.debug 
            : AppleProvider.deviceCheck,
      );

      // Initialize Analytics
      _analytics = FirebaseAnalytics.instance;
      await _analytics!.setAnalyticsCollectionEnabled(!kDebugMode);

      // Initialize Crashlytics
      _crashlytics = FirebaseCrashlytics.instance;
      
      // Set crashlytics collection enabled only in release mode
      await _crashlytics!.setCrashlyticsCollectionEnabled(!kDebugMode);

      // Pass all uncaught "fatal" errors from the framework to Crashlytics
      if (!kDebugMode) {
        FlutterError.onError = _crashlytics!.recordFlutterFatalError;
        
        // Pass all uncaught asynchronous errors to Crashlytics
        PlatformDispatcher.instance.onError = (error, stack) {
          _crashlytics!.recordError(error, stack, fatal: true);
          return true;
        };
      }

      // Initialize Remote Config
      await _initializeRemoteConfig();

      // Initialize Firebase Messaging
      await _initializeMessaging();

      // Log successful initialization
      await _analytics!.logEvent(
        name: 'firebase_initialized',
        parameters: {
          'timestamp': DateTime.now().millisecondsSinceEpoch,
          'debug_mode': kDebugMode,
        },
      );

    } catch (e, stackTrace) {
      if (_crashlytics != null) {
        await _crashlytics!.recordError(
          e, 
          stackTrace, 
          reason: 'Firebase initialization failed',
          fatal: true,
        );
      }
      rethrow;
    }
  }

  /// Initialize Remote Config with default values
  static Future<void> _initializeRemoteConfig() async {
    _remoteConfig = FirebaseRemoteConfig.instance;
    
    await _remoteConfig!.setConfigSettings(
      RemoteConfigSettings(
        fetchTimeout: const Duration(minutes: 1),
        minimumFetchInterval: kDebugMode 
            ? Duration.zero 
            : const Duration(hours: 1),
      ),
    );

    // Set default values
    await _remoteConfig!.setDefaults(<String, dynamic>{
      'attendance_radius_meters': 100.0,
      'max_check_in_window_minutes': 30,
      'max_check_out_window_minutes': 30,
      'require_photo_checkin': true,
      'require_photo_checkout': false,
      'enable_biometric_auth': true,
      'enable_qr_checkin': true,
      'qr_code_expiry_minutes': 5,
      'max_offline_days': 7,
      'sync_interval_minutes': 15,
      'force_update_version': '1.0.0',
      'maintenance_mode': false,
      'maintenance_message': 'App is under maintenance. Please try again later.',
    });

    try {
      await _remoteConfig!.fetchAndActivate();
    } catch (e) {
      // Log but don't fail initialization if remote config fails
      print('Remote Config fetch failed: $e');
    }
  }

  /// Initialize Firebase Messaging for push notifications
  static Future<void> _initializeMessaging() async {
    final messaging = FirebaseMessaging.instance;

    // Request permission for notifications
    final settings = await messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('User granted permission for notifications');
      
      // Initialize notification service
      await NotificationService.initialize();

      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Handle foreground messages
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        NotificationService.showNotification(
          title: message.notification?.title ?? 'DOT Attendance',
          body: message.notification?.body ?? '',
          payload: message.data.toString(),
        );
      });

      // Handle notification taps
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        _handleNotificationTap(message);
      });

      // Check for initial message (app opened from notification)
      final initialMessage = await messaging.getInitialMessage();
      if (initialMessage != null) {
        _handleNotificationTap(initialMessage);
      }

      // Get FCM token for this device
      final token = await messaging.getToken();
      print('FCM Token: $token');
      
      // Log token to analytics
      await _analytics?.logEvent(
        name: 'fcm_token_generated',
        parameters: {'token_length': token?.length ?? 0},
      );

    } else {
      print('User declined or has not granted permission for notifications');
    }
  }

  /// Handle notification tap events
  static void _handleNotificationTap(RemoteMessage message) {
    print('Notification tapped: ${message.data}');
    // TODO: Navigate to appropriate screen based on notification data
  }

  /// Get Firebase configuration options based on platform
  static Future<FirebaseOptions?> _getFirebaseOptions() async {
    try {
      if (defaultTargetPlatform == TargetPlatform.android) {
        return const FirebaseOptions(
          apiKey: String.fromEnvironment('FIREBASE_ANDROID_API_KEY'),
          appId: String.fromEnvironment('FIREBASE_ANDROID_APP_ID'),
          messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
          projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
          storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET'),
        );
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        return const FirebaseOptions(
          apiKey: String.fromEnvironment('FIREBASE_IOS_API_KEY'),
          appId: String.fromEnvironment('FIREBASE_IOS_APP_ID'),
          messagingSenderId: String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID'),
          projectId: String.fromEnvironment('FIREBASE_PROJECT_ID'),
          storageBucket: String.fromEnvironment('FIREBASE_STORAGE_BUCKET'),
          iosBundleId: String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID'),
        );
      }
    } catch (e) {
      print('Failed to get Firebase options from environment: $e');
    }

    // Fallback to default configuration file
    return null;
  }

  /// Log custom events to Firebase Analytics
  static Future<void> logEvent({
    required String name,
    Map<String, Object>? parameters,
  }) async {
    try {
      await _analytics?.logEvent(name: name, parameters: parameters);
    } catch (e) {
      print('Failed to log analytics event: $e');
    }
  }

  /// Log user properties to Firebase Analytics
  static Future<void> setUserProperty({
    required String name,
    required String? value,
  }) async {
    try {
      await _analytics?.setUserProperty(name: name, value: value);
    } catch (e) {
      print('Failed to set user property: $e');
    }
  }

  /// Set user ID for analytics and crashlytics
  static Future<void> setUserId(String? userId) async {
    try {
      await _analytics?.setUserId(id: userId);
      await _crashlytics?.setUserIdentifier(userId ?? '');
    } catch (e) {
      print('Failed to set user ID: $e');
    }
  }

  /// Record a non-fatal error
  static Future<void> recordError(
    dynamic exception,
    StackTrace? stackTrace, {
    String? reason,
    bool fatal = false,
    Iterable<DiagnosticsNode> context = const [],
  }) async {
    try {
      await _crashlytics?.recordError(
        exception,
        stackTrace,
        reason: reason,
        fatal: fatal,
        printDetails: kDebugMode,
      );
    } catch (e) {
      print('Failed to record error to Crashlytics: $e');
    }
  }

  /// Get Remote Config value
  static T getRemoteConfigValue<T>(String key, T defaultValue) {
    try {
      final value = _remoteConfig?.getValue(key);
      if (value == null) return defaultValue;

      switch (T) {
        case String:
          return value.asString() as T;
        case int:
          return value.asInt() as T;
        case double:
          return value.asDouble() as T;
        case bool:
          return value.asBool() as T;
        default:
          return defaultValue;
      }
    } catch (e) {
      print('Failed to get remote config value for $key: $e');
      return defaultValue;
    }
  }

  /// Dispose Firebase services
  static Future<void> dispose() async {
    // Firebase services are automatically disposed when the app is terminated
    // This method is kept for potential future cleanup logic
  }
}

/// Background message handler for Firebase Messaging
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Initialize Firebase if not already done
  await Firebase.initializeApp();
  
  print('Handling background message: ${message.messageId}');
  
  // Show notification
  await NotificationService.showNotification(
    title: message.notification?.title ?? 'DOT Attendance',
    body: message.notification?.body ?? '',
    payload: message.data.toString(),
  );
}