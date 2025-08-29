import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_firestore/firebase_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';

/// Firebase service for managing all Firebase operations
class FirebaseService {
  static FirebaseService? _instance;
  static FirebaseService get instance => _instance ??= FirebaseService._();
  
  FirebaseService._();
  
  late FirebaseApp _app;
  late FirebaseAuth _auth;
  late FirebaseFirestore _firestore;
  late FirebaseStorage _storage;
  late FirebaseAnalytics _analytics;
  late FirebaseMessaging _messaging;
  late FirebaseFunctions _functions;
  
  bool _initialized = false;
  
  FirebaseApp get app => _app;
  FirebaseAuth get auth => _auth;
  FirebaseFirestore get firestore => _firestore;
  FirebaseStorage get storage => _storage;
  FirebaseAnalytics get analytics => _analytics;
  FirebaseMessaging get messaging => _messaging;
  FirebaseFunctions get functions => _functions;
  
  bool get isInitialized => _initialized;
  
  /// Initialize Firebase services
  Future<void> initialize() async {
    if (_initialized) return;
    
    try {
      debugPrint('Initializing Firebase...');
      
      // Initialize Firebase app
      _app = await Firebase.initializeApp();
      
      // Initialize services
      _auth = FirebaseAuth.instance;
      _firestore = FirebaseFirestore.instance;
      _storage = FirebaseStorage.instance;
      _analytics = FirebaseAnalytics.instance;
      _messaging = FirebaseMessaging.instance;
      _functions = FirebaseFunctions.instance;
      
      // Configure Firestore settings
      _firestore.settings = const Settings(
        persistenceEnabled: true,
        cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
      );
      
      // Request messaging permissions
      await _requestMessagingPermissions();
      
      // Set up message handlers
      await _setupMessageHandlers();
      
      _initialized = true;
      debugPrint('Firebase initialized successfully');
    } catch (e) {
      debugPrint('Firebase initialization error: $e');
      rethrow;
    }
  }
  
  /// Request messaging permissions
  Future<void> _requestMessagingPermissions() async {
    try {
      final settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      
      debugPrint('Messaging permissions: ${settings.authorizationStatus}');
      
      // Get FCM token
      final token = await _messaging.getToken();
      debugPrint('FCM Token: $token');
      
      // Listen to token refresh
      _messaging.onTokenRefresh.listen((newToken) {
        debugPrint('FCM Token refreshed: $newToken');
        // TODO: Update token on server
      });
    } catch (e) {
      debugPrint('Failed to request messaging permissions: $e');
    }
  }
  
  /// Set up message handlers
  Future<void> _setupMessageHandlers() async {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Foreground message received: ${message.messageId}');
      _handleMessage(message);
    });
    
    // Handle background message clicks
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('Message clicked: ${message.messageId}');
      _handleMessageClick(message);
    });
    
    // Check if app was opened from a notification
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      debugPrint('App opened from notification: ${initialMessage.messageId}');
      _handleMessageClick(initialMessage);
    }
  }
  
  /// Handle incoming message
  void _handleMessage(RemoteMessage message) {
    // Process message based on type
    final data = message.data;
    final notification = message.notification;
    
    if (notification != null) {
      debugPrint('Notification: ${notification.title} - ${notification.body}');
    }
    
    if (data.isNotEmpty) {
      debugPrint('Message data: $data');
      
      // Handle different message types
      switch (data['type']) {
        case 'attendance_reminder':
          // Handle attendance reminder
          break;
        case 'announcement':
          // Handle announcement
          break;
        case 'alert':
          // Handle alert
          break;
        default:
          // Handle generic message
          break;
      }
    }
  }
  
  /// Handle message click
  void _handleMessageClick(RemoteMessage message) {
    final data = message.data;
    
    // Navigate based on message type
    if (data['route'] != null) {
      // TODO: Navigate to specific route
      debugPrint('Navigate to: ${data['route']}');
    }
  }
  
  // Authentication methods
  
  /// Sign in with email and password
  Future<User?> signInWithEmailPassword(String email, String password) async {
    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      
      await _analytics.logLogin(loginMethod: 'email');
      return credential.user;
    } catch (e) {
      debugPrint('Sign in error: $e');
      rethrow;
    }
  }
  
  /// Sign out
  Future<void> signOut() async {
    try {
      await _auth.signOut();
      await _analytics.logEvent(name: 'logout');
    } catch (e) {
      debugPrint('Sign out error: $e');
      rethrow;
    }
  }
  
  /// Get current user
  User? get currentUser => _auth.currentUser;
  
  /// Auth state changes stream
  Stream<User?> get authStateChanges => _auth.authStateChanges();
  
  // Firestore methods
  
  /// Get collection reference
  CollectionReference<Map<String, dynamic>> collection(String path) {
    return _firestore.collection(path);
  }
  
  /// Get document reference
  DocumentReference<Map<String, dynamic>> doc(String path) {
    return _firestore.doc(path);
  }
  
  /// Create attendance record
  Future<void> createAttendanceRecord(Map<String, dynamic> data) async {
    try {
      await collection('attendance').add({
        ...data,
        'timestamp': FieldValue.serverTimestamp(),
        'userId': currentUser?.uid,
      });
      
      await _analytics.logEvent(
        name: 'attendance_recorded',
        parameters: {'type': data['type']},
      );
    } catch (e) {
      debugPrint('Failed to create attendance record: $e');
      rethrow;
    }
  }
  
  /// Get attendance records
  Stream<QuerySnapshot<Map<String, dynamic>>> getAttendanceRecords({
    required DateTime startDate,
    required DateTime endDate,
  }) {
    return collection('attendance')
        .where('userId', isEqualTo: currentUser?.uid)
        .where('timestamp', isGreaterThanOrEqualTo: startDate)
        .where('timestamp', isLessThanOrEqualTo: endDate)
        .orderBy('timestamp', descending: true)
        .snapshots();
  }
  
  // Storage methods
  
  /// Upload file to storage
  Future<String> uploadFile({
    required String path,
    required Uint8List data,
    Map<String, String>? metadata,
  }) async {
    try {
      final ref = _storage.ref(path);
      
      final uploadTask = ref.putData(
        data,
        metadata != null ? SettableMetadata(customMetadata: metadata) : null,
      );
      
      final snapshot = await uploadTask;
      final downloadUrl = await snapshot.ref.getDownloadURL();
      
      await _analytics.logEvent(
        name: 'file_uploaded',
        parameters: {'path': path},
      );
      
      return downloadUrl;
    } catch (e) {
      debugPrint('Failed to upload file: $e');
      rethrow;
    }
  }
  
  /// Delete file from storage
  Future<void> deleteFile(String path) async {
    try {
      await _storage.ref(path).delete();
      
      await _analytics.logEvent(
        name: 'file_deleted',
        parameters: {'path': path},
      );
    } catch (e) {
      debugPrint('Failed to delete file: $e');
      rethrow;
    }
  }
  
  // Cloud Functions methods
  
  /// Call cloud function
  Future<T> callFunction<T>(String name, [Map<String, dynamic>? parameters]) async {
    try {
      final callable = _functions.httpsCallable(name);
      final result = await callable.call(parameters);
      
      await _analytics.logEvent(
        name: 'function_called',
        parameters: {'function': name},
      );
      
      return result.data as T;
    } catch (e) {
      debugPrint('Failed to call function $name: $e');
      rethrow;
    }
  }
  
  // Analytics methods
  
  /// Log custom event
  Future<void> logEvent({
    required String name,
    Map<String, Object?>? parameters,
  }) async {
    try {
      await _analytics.logEvent(name: name, parameters: parameters);
    } catch (e) {
      debugPrint('Failed to log event: $e');
    }
  }
  
  /// Set user property
  Future<void> setUserProperty({
    required String name,
    required String? value,
  }) async {
    try {
      await _analytics.setUserProperty(name: name, value: value);
    } catch (e) {
      debugPrint('Failed to set user property: $e');
    }
  }
  
  /// Set user ID for analytics
  Future<void> setUserId(String? userId) async {
    try {
      await _analytics.setUserId(userId: userId);
    } catch (e) {
      debugPrint('Failed to set user ID: $e');
    }
  }
  
  /// Clean up resources
  Future<void> dispose() async {
    _initialized = false;
  }
}

/// Background message handler for Firebase Messaging
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('Background message: ${message.messageId}');
  
  // Handle background message
  // This runs in a separate isolate
}