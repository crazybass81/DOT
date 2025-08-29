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
      
      // Direct fields for dashboard compatibility
      'representativeName': '임태균',
      'representativePhone': '01093177090',
      'businessRegistrationNumber': '248-01-02359',
      'phoneVerified': false,
      'identityVerified': false,
      'businessNumberVerified': false,
      'businessRegistrationUploaded': false,
      
      // Simple branches array for dashboard compatibility
      'branches': [
        {
          'id': 'branch_001',
          'name': '강남본사',
          'address': '서울시 강남구 테헤란로 123',
          'phone': '02-1234-5678',
          'isHeadOffice': true,
          'manager': '임태균',
          'employeeCount': 5,
        },
        {
          'id': 'branch_002', 
          'name': '강남지점',
          'address': '서울시 강남구 역삼동 456',
          'phone': '02-5678-9012',
          'isHeadOffice': false,
          'manager': null,
          'employeeCount': 3,
        },
        {
          'id': 'branch_003',
          'name': '홍대지점',
          'address': '서울시 마포구 홍익로 789',
          'phone': '02-3456-7890',
          'isHeadOffice': false,
          'manager': null,
          'employeeCount': 2,
        }
      ],
      
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

  // ==================== Business Profile Management ====================
  
  /// 사업자 프로필 조회
  Future<Map<String, dynamic>?> getBusinessProfile(String userId) async {
    debugPrint('Getting business profile for user: $userId');
    
    // Find user by ID and return business profile
    for (final userData in _mockUsers.values) {
      if (userData['uid'] == userId) {
        return userData['businessProfile'] as Map<String, dynamic>?;
      }
    }
    
    return null;
  }
  
  /// 사업자 프로필 업데이트
  Future<bool> updateBusinessProfile(String userId, Map<String, dynamic> profileData) async {
    debugPrint('Updating business profile for user: $userId');
    debugPrint('Profile data: $profileData');
    
    // Find user by ID and update business profile
    for (final entry in _mockUsers.entries) {
      final userData = entry.value;
      if (userData['uid'] == userId) {
        userData['businessProfile'] = {
          ...userData['businessProfile'] ?? {},
          ...profileData,
          'updatedAt': DateTime.now().toIso8601String(),
        };
        return true;
      }
    }
    
    return false;
  }
  
  /// 사업장 목록 조회
  Future<List<Map<String, dynamic>>> getBusinessLocations(String userId) async {
    debugPrint('Getting business locations for user: $userId');
    
    final businessProfile = await getBusinessProfile(userId);
    if (businessProfile != null) {
      final locations = businessProfile['locations'] as List<dynamic>?;
      return locations?.cast<Map<String, dynamic>>() ?? [];
    }
    
    return [];
  }
  
  /// 사업장 추가
  Future<bool> addBusinessLocation(String userId, Map<String, dynamic> locationData) async {
    debugPrint('Adding business location for user: $userId');
    debugPrint('Location data: $locationData');
    
    final businessProfile = await getBusinessProfile(userId);
    if (businessProfile != null) {
      final locations = List<Map<String, dynamic>>.from(businessProfile['locations'] ?? []);
      
      // Generate new location ID
      final newLocationId = 'location_${DateTime.now().millisecondsSinceEpoch}';
      final newLocation = {
        'id': newLocationId,
        'createdAt': DateTime.now().toIso8601String(),
        ...locationData,
      };
      
      locations.add(newLocation);
      
      return await updateBusinessProfile(userId, {
        'locations': locations,
      });
    }
    
    return false;
  }
  
  /// 사업장 수정
  Future<bool> updateBusinessLocation(String userId, String locationId, Map<String, dynamic> locationData) async {
    debugPrint('Updating business location: $locationId for user: $userId');
    
    final businessProfile = await getBusinessProfile(userId);
    if (businessProfile != null) {
      final locations = List<Map<String, dynamic>>.from(businessProfile['locations'] ?? []);
      
      final locationIndex = locations.indexWhere((loc) => loc['id'] == locationId);
      if (locationIndex != -1) {
        locations[locationIndex] = {
          ...locations[locationIndex],
          ...locationData,
          'updatedAt': DateTime.now().toIso8601String(),
        };
        
        return await updateBusinessProfile(userId, {
          'locations': locations,
        });
      }
    }
    
    return false;
  }
  
  /// 사업장 삭제
  Future<bool> deleteBusinessLocation(String userId, String locationId) async {
    debugPrint('Deleting business location: $locationId for user: $userId');
    
    final businessProfile = await getBusinessProfile(userId);
    if (businessProfile != null) {
      final locations = List<Map<String, dynamic>>.from(businessProfile['locations'] ?? []);
      
      locations.removeWhere((loc) => loc['id'] == locationId);
      
      return await updateBusinessProfile(userId, {
        'locations': locations,
      });
    }
    
    return false;
  }
  
  // ==================== Verification Methods (Future Implementation) ====================
  
  /// 전화번호 인증 요청 (플레이스홀더)
  Future<bool> requestPhoneVerification(String phoneNumber) async {
    debugPrint('Requesting phone verification for: $phoneNumber');
    // TODO: 실제 SMS 인증 로직 구현
    return true;
  }
  
  /// 전화번호 인증 확인 (플레이스홀더)
  Future<bool> verifyPhoneNumber(String phoneNumber, String verificationCode) async {
    debugPrint('Verifying phone number: $phoneNumber with code: $verificationCode');
    // TODO: 실제 인증 코드 확인 로직 구현
    return verificationCode == '123456'; // 테스트용 고정 코드
  }
  
  /// 사업자등록번호 검증 (플레이스홀더)
  Future<Map<String, dynamic>?> validateBusinessRegistrationNumber(String registrationNumber) async {
    debugPrint('Validating business registration number: $registrationNumber');
    
    // TODO: 실제 사업자등록번호 검증 API 연동
    // 현재는 테스트용 데이터 반환
    if (registrationNumber.replaceAll(RegExp(r'[^0-9]'), '') == '2480102359') {
      return {
        'isValid': true,
        'businessName': 'DOT 본사',
        'representativeName': '임태균',
        'businessType': '소프트웨어 개발업',
        'businessAddress': '서울시 강남구 테헤란로 123',
        'establishedDate': '2023-01-01',
      };
    }
    
    return {'isValid': false, 'error': '등록되지 않은 사업자등록번호입니다.'};
  }
  
  /// 서류 업로드 (플레이스홀더)
  Future<String?> uploadDocument(String userId, String documentType, List<int> fileBytes) async {
    debugPrint('Uploading document type: $documentType for user: $userId');
    
    // TODO: 실제 파일 업로드 로직 구현 (Firebase Storage)
    // 현재는 테스트용 URL 반환
    final mockUrl = 'https://storage.example.com/documents/${userId}_${documentType}_${DateTime.now().millisecondsSinceEpoch}.jpg';
    
    await logEvent(name: 'document_upload', parameters: {
      'user_id': userId,
      'document_type': documentType,
      'file_size': fileBytes.length,
    });
    
    return mockUrl;
  }
}