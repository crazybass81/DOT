import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';

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
  
  Future<void> initialize() async {
    if (_initialized) return;
    
    try {
      debugPrint('Initializing Firebase...');
      
      // Initialize Firebase with mock implementation for development
      // In production, uncomment these lines with proper Firebase configuration
      
      // _app = await Firebase.initializeApp();
      // _auth = FirebaseAuth.instance;
      // _firestore = FirebaseFirestore.instance;
      // _storage = FirebaseStorage.instance;
      // _analytics = FirebaseAnalytics.instance;
      // _messaging = FirebaseMessaging.instance;
      // _functions = FirebaseFunctions.instance;
      
      // For now, create mock user database
      await _initializeMockUserDatabase();
      
      _initialized = true;
      debugPrint('Firebase initialized with mock data');
    } catch (e) {
      debugPrint('Firebase initialization error: $e');
      // Don't rethrow to allow app to run without Firebase
    }
  }
  
  // Mock user database for testing
  static final Map<String, Map<String, dynamic>> _mockUsers = {
    'archt723@gmail.com': {
      'uid': 'admin_001',
      'email': 'archt723@gmail.com',
      'password': '1q2w3e2w1q!', // In production, this would be hashed
      'firstName': 'Master',
      'lastName': 'Admin',
      'role': 'admin',
      'organizationId': 'org_001',
      'organizationName': 'DOT 본사',
      'createdAt': DateTime.now().toIso8601String(),
      'isActive': true,
      'branches': [
        {
          'id': 'branch_001',
          'name': '강남지점',
          'address': '서울시 강남구',
          'manager': null,
          'employeeCount': 0,
        },
        {
          'id': 'branch_002', 
          'name': '홍대지점',
          'address': '서울시 마포구',
          'manager': null,
          'employeeCount': 0,
        }
      ]
    }
  };
  
  Future<void> _initializeMockUserDatabase() async {
    debugPrint('Mock user database initialized with test account: archt723@gmail.com');
  }
  
  // Email/Password authentication with mock database
  Future<Map<String, dynamic>?> signInWithEmailPassword(String email, String password) async {
    debugPrint('Attempting sign in: $email');
    
    // Check mock user database
    if (_mockUsers.containsKey(email)) {
      final userData = _mockUsers[email]!;
      if (userData['password'] == password) {
        debugPrint('Authentication successful for: $email');
        
        // Return user data (excluding password)
        final userResult = Map<String, dynamic>.from(userData);
        userResult.remove('password');
        
        await logEvent(name: 'user_login', parameters: {
          'email': email,
          'role': userData['role'],
        });
        
        return userResult;
      }
    }
    
    debugPrint('Authentication failed for: $email');
    return null;
  }
  
  // Get user data by email
  Future<Map<String, dynamic>?> getUserByEmail(String email) async {
    if (_mockUsers.containsKey(email)) {
      final userData = Map<String, dynamic>.from(_mockUsers[email]!);
      userData.remove('password'); // Never return password
      return userData;
    }
    return null;
  }
  
  Future<void> signOut() async {
    debugPrint('Mock sign out');
  }
  
  User? get currentUser => null;
  
  Stream<User?> get authStateChanges => Stream.value(null);
  
  // Create attendance record
  Future<bool> createAttendanceRecord(Map<String, dynamic> data) async {
    debugPrint('Creating attendance record: $data');
    // Firebase is not initialized, but return success for testing
    return true;
  }
  
  // Log analytics event
  Future<void> logEvent({
    required String name,
    Map<String, Object?>? parameters,
  }) async {
    debugPrint('Logging event: $name with parameters: $parameters');
    // Analytics logging would happen here if Firebase was initialized
  }
  
  // Get attendance records
  Stream<Map<String, dynamic>> getAttendanceRecords({
    required DateTime startDate,
    required DateTime endDate,
  }) async* {
    debugPrint('Getting attendance records from $startDate to $endDate');
    yield {};
  }
}