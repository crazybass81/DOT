import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

/// Firebase 하이브리드 아키텍처 구성
/// DynamoDB와 연동하여 최적의 성능과 비용 효율성 달성
class FirebaseConfig {
  static FirebaseApp? _app;
  static FirebaseAuth? _auth;
  static FirebaseDatabase? _realtimeDb;
  static FirebaseFirestore? _firestore;
  static FirebaseMessaging? _messaging;
  static FirebaseStorage? _storage;
  static FirebaseAnalytics? _analytics;
  
  // Firebase 프로젝트 설정 (환경별 분리)
  static const FirebaseOptions _devOptions = FirebaseOptions(
    apiKey: 'YOUR_DEV_API_KEY',
    appId: 'YOUR_DEV_APP_ID',
    messagingSenderId: 'YOUR_DEV_SENDER_ID',
    projectId: 'dot-attendance-dev',
    authDomain: 'dot-attendance-dev.firebaseapp.com',
    databaseURL: 'https://dot-attendance-dev.firebaseio.com',
    storageBucket: 'dot-attendance-dev.appspot.com',
  );
  
  static const FirebaseOptions _prodOptions = FirebaseOptions(
    apiKey: 'YOUR_PROD_API_KEY',
    appId: 'YOUR_PROD_APP_ID',
    messagingSenderId: 'YOUR_PROD_SENDER_ID',
    projectId: 'dot-attendance',
    authDomain: 'dot-attendance.firebaseapp.com',
    databaseURL: 'https://dot-attendance.firebaseio.com',
    storageBucket: 'dot-attendance.appspot.com',
  );
  
  /// Firebase 초기화
  static Future<void> initialize() async {
    try {
      // 환경에 따른 옵션 선택
      final options = kDebugMode ? _devOptions : _prodOptions;
      
      _app = await Firebase.initializeApp(options: options);
      
      // 서비스 초기화
      _auth = FirebaseAuth.instance;
      _realtimeDb = FirebaseDatabase.instance;
      _firestore = FirebaseFirestore.instance;
      _messaging = FirebaseMessaging.instance;
      _storage = FirebaseStorage.instance;
      _analytics = FirebaseAnalytics.instance;
      
      // Crashlytics 설정
      await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(!kDebugMode);
      
      // 오프라인 지원 활성화
      await _enableOfflineSupport();
      
      // FCM 권한 요청
      await _requestNotificationPermissions();
      
      debugPrint('✅ Firebase 초기화 완료: ${options.projectId}');
    } catch (e) {
      debugPrint('❌ Firebase 초기화 실패: $e');
      rethrow;
    }
  }
  
  /// 오프라인 지원 설정
  static Future<void> _enableOfflineSupport() async {
    // Realtime Database 오프라인 지속성
    _realtimeDb!.setPersistenceEnabled(true);
    _realtimeDb!.setPersistenceCacheSizeBytes(10 * 1024 * 1024); // 10MB
    
    // Firestore 오프라인 지속성
    _firestore!.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  }
  
  /// 푸시 알림 권한 요청
  static Future<void> _requestNotificationPermissions() async {
    final settings = await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    
    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      final token = await _messaging!.getToken();
      debugPrint('🔔 FCM Token: $token');
      
      // 토큰을 DynamoDB에 저장하기 위해 Lambda 호출
      await _saveFcmTokenToDynamoDB(token!);
    }
  }
  
  /// FCM 토큰을 DynamoDB에 저장
  static Future<void> _saveFcmTokenToDynamoDB(String token) async {
    // TODO: Lambda 함수 호출하여 DynamoDB에 저장
    // AWS SDK 또는 API Gateway 통해 구현
  }
  
  // Getters
  static FirebaseAuth get auth => _auth!;
  static FirebaseDatabase get realtimeDb => _realtimeDb!;
  static FirebaseFirestore get firestore => _firestore!;
  static FirebaseMessaging get messaging => _messaging!;
  static FirebaseStorage get storage => _storage!;
  static FirebaseAnalytics get analytics => _analytics!;
  
  /// 에러 기록 (Crashlytics)
  static Future<void> recordError(
    dynamic exception,
    StackTrace? stack, {
    String? reason,
    bool fatal = false,
  }) async {
    await FirebaseCrashlytics.instance.recordError(
      exception,
      stack,
      reason: reason,
      fatal: fatal,
    );
  }
}

/// Firebase Realtime Database 헬퍼
class RealtimeDbHelper {
  static final _db = FirebaseConfig.realtimeDb;
  
  /// 직원 출석 상태 업데이트
  static Future<void> updatePresence(String userId, String status) async {
    await _db.ref('presence/$userId').set({
      'status': status,
      'lastSeen': ServerValue.timestamp,
    });
  }
  
  /// QR 코드 생성 (30초 만료)
  static Future<String> generateQRCode(String employeeId, String type) async {
    final qrRef = _db.ref('activeQR').push();
    final qrCode = qrRef.key!;
    
    await qrRef.set({
      'employeeId': employeeId,
      'type': type,
      'createdAt': ServerValue.timestamp,
      'expiresAt': DateTime.now().add(Duration(seconds: 30)).millisecondsSinceEpoch,
      'used': false,
    });
    
    // 30초 후 자동 삭제
    Future.delayed(Duration(seconds: 30), () {
      qrRef.remove();
    });
    
    return qrCode;
  }
  
  /// QR 코드 검증
  static Future<Map<String, dynamic>?> validateQRCode(String qrCode) async {
    final snapshot = await _db.ref('activeQR/$qrCode').get();
    
    if (!snapshot.exists) return null;
    
    final data = Map<String, dynamic>.from(snapshot.value as Map);
    final expiresAt = data['expiresAt'] as int;
    
    if (DateTime.now().millisecondsSinceEpoch > expiresAt) {
      await snapshot.ref.remove();
      return null;
    }
    
    if (data['used'] == true) return null;
    
    // 사용 처리
    await snapshot.ref.update({'used': true});
    
    return data;
  }
  
  /// 실시간 위치 추적
  static Stream<DatabaseEvent> trackLocation(String userId) {
    return _db.ref('presence/$userId/currentLocation').onValue;
  }
}

/// Firestore 헬퍼 (구조화된 데이터)
class FirestoreHelper {
  static final _db = FirebaseConfig.firestore;
  
  /// 캐시된 리포트 가져오기
  static Future<Map<String, dynamic>?> getCachedReport(String reportId) async {
    final doc = await _db.collection('report_cache').doc(reportId).get();
    
    if (!doc.exists) return null;
    
    final data = doc.data()!;
    final expires = data['expires'] as int;
    
    if (DateTime.now().millisecondsSinceEpoch > expires) {
      await doc.reference.delete();
      return null;
    }
    
    return data['report'] as Map<String, dynamic>;
  }
  
  /// 리포트 캐싱 (1시간)
  static Future<void> cacheReport(String reportId, Map<String, dynamic> report) async {
    await _db.collection('report_cache').doc(reportId).set({
      'report': report,
      'expires': DateTime.now().add(Duration(hours: 1)).millisecondsSinceEpoch,
      'createdAt': FieldValue.serverTimestamp(),
    });
  }
  
  /// 팀 메시지 전송
  static Future<void> sendTeamMessage(String teamId, String message, String senderId) async {
    await _db.collection('teams/$teamId/messages').add({
      'message': message,
      'senderId': senderId,
      'timestamp': FieldValue.serverTimestamp(),
      'read': false,
    });
  }
  
  /// 팀 메시지 스트림
  static Stream<QuerySnapshot> getTeamMessages(String teamId) {
    return _db
        .collection('teams/$teamId/messages')
        .orderBy('timestamp', descending: true)
        .limit(50)
        .snapshots();
  }
}

/// Cloud Storage 헬퍼
class StorageHelper {
  static final _storage = FirebaseConfig.storage;
  
  /// 프로필 사진 업로드
  static Future<String> uploadProfilePhoto(String userId, Uint8List imageData) async {
    final ref = _storage.ref('profiles/$userId/photo.jpg');
    
    final metadata = SettableMetadata(
      contentType: 'image/jpeg',
      customMetadata: {
        'userId': userId,
        'uploadedAt': DateTime.now().toIso8601String(),
      },
    );
    
    final uploadTask = ref.putData(imageData, metadata);
    final snapshot = await uploadTask;
    
    return await snapshot.ref.getDownloadURL();
  }
  
  /// 리포트 PDF 업로드
  static Future<String> uploadReport(String reportId, Uint8List pdfData) async {
    final ref = _storage.ref('reports/$reportId.pdf');
    
    final metadata = SettableMetadata(
      contentType: 'application/pdf',
      customMetadata: {
        'reportId': reportId,
        'generatedAt': DateTime.now().toIso8601String(),
      },
    );
    
    final uploadTask = ref.putData(pdfData, metadata);
    final snapshot = await uploadTask;
    
    return await snapshot.ref.getDownloadURL();
  }
}