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
      'role': 'masterAdmin',
      'organizationId': 'org_001',
      'organizationName': 'DOT 본사',
      'createdAt': DateTime.now().toIso8601String(),
      'isActive': true,
      
      // Extended business profile information
      'businessProfile': {
        'id': 'business_profile_001',
        'userId': 'admin_001',
        
        // Business information
        'businessInfo': {
          'id': 'business_001',
          'businessRegistrationNumber': '2480102359', // 248-01-02359
          'businessName': 'DOT 본사',
          'businessType': '소프트웨어 개발업',
          'businessAddress': '서울시 강남구 테헤란로 123',
          'businessPhone': '02-1234-5678',
          'businessEmail': 'business@dot.com',
          'representativeName': '임태균',
          'establishedDate': DateTime.now().subtract(const Duration(days: 365)).toIso8601String(),
          'isVerified': true,
          'verifiedAt': DateTime.now().toIso8601String(),
          'createdAt': DateTime.now().toIso8601String(),
        },
        
        // Representative information
        'representative': {
          'id': 'rep_001',
          'name': '임태균',
          'phoneNumber': '01093177090',
          'email': 'archt723@gmail.com',
          'address': '서울시 강남구',
          'isPhoneVerified': true,
          'phoneVerifiedAt': DateTime.now().toIso8601String(),
          'isIdentityVerified': true,
          'identityVerifiedAt': DateTime.now().toIso8601String(),
          'createdAt': DateTime.now().toIso8601String(),
        },
        
        // Business locations
        'locations': [
          {
            'id': 'location_001',
            'businessInfoId': 'business_001',
            'name': '강남본사',
            'address': '서울시 강남구 테헤란로 123',
            'detailAddress': '10층',
            'postalCode': '06142',
            'latitude': 37.5012767,
            'longitude': 127.0396597,
            'phoneNumber': '02-1234-5678',
            'managerUserId': 'admin_001',
            'managerName': '임태균',
            'employeeCount': 5,
            'isActive': true,
            'isHeadOffice': true,
            'businessHours': '09:00-18:00',
            'description': '본사 사무실',
            'facilityFeatures': ['주차가능', 'WiFi', '엘리베이터'],
            'createdAt': DateTime.now().toIso8601String(),
          },
          {
            'id': 'location_002',
            'businessInfoId': 'business_001',
            'name': '강남지점',
            'address': '서울시 강남구 역삼동 456',
            'detailAddress': '5층',
            'postalCode': '06234',
            'phoneNumber': '02-5678-9012',
            'managerUserId': null,
            'managerName': null,
            'employeeCount': 3,
            'isActive': true,
            'isHeadOffice': false,
            'businessHours': '09:00-18:00',
            'description': '강남 지점 사무실',
            'facilityFeatures': ['WiFi', '회의실'],
            'createdAt': DateTime.now().toIso8601String(),
          },
          {
            'id': 'location_003',
            'businessInfoId': 'business_001',
            'name': '홍대지점',
            'address': '서울시 마포구 홍익로 789',
            'detailAddress': '3층',
            'postalCode': '04039',
            'phoneNumber': '02-9012-3456',
            'managerUserId': null,
            'managerName': null,
            'employeeCount': 2,
            'isActive': true,
            'isHeadOffice': false,
            'businessHours': '10:00-19:00',
            'description': '홍대 지점 사무실',
            'facilityFeatures': ['WiFi', '주차가능', '카페'],
            'createdAt': DateTime.now().toIso8601String(),
          }
        ],
        
        // Future expansion placeholders
        'isPhoneVerificationEnabled': true,
        'isBusinessNumberValidationEnabled': true,
        'isDocumentUploadEnabled': false, // 추후 구현
        'isProfileComplete': true,
        'verificationScore': 95,
        'completedVerifications': [
          'phone_verification',
          'business_registration_verification',
          'identity_verification'
        ],
        'pendingVerifications': [],
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
        'notes': '테스트용 완전 인증된 사업자 프로필'
      },
      
      // Legacy branch data for backward compatibility
      'branches': [
        {
          'id': 'branch_001',
          'name': '강남지점',
          'address': '서울시 강남구',
          'manager': null,
          'employeeCount': 3,
        },
        {
          'id': 'branch_002', 
          'name': '홍대지점',
          'address': '서울시 마포구',
          'manager': null,
          'employeeCount': 2,
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