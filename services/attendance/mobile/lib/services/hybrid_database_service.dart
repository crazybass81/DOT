import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';
import '../config/firebase_config.dart';
import '../core/config/app_config.dart';
import '../data/models/attendance_record.dart';
import '../data/models/employee.dart';

/// 하이브리드 데이터베이스 서비스
/// Firebase(실시간) + DynamoDB(영구저장) 통합 관리
class HybridDatabaseService {
  static final _dio = Dio();
  static final _realtimeDb = FirebaseConfig.realtimeDb;
  static final _firestore = FirebaseConfig.firestore;
  
  // API Gateway endpoint for DynamoDB
  static String get _apiUrl => AppConfig.apiGatewayUrl;
  
  /// 서비스 초기화
  static Future<void> initialize() async {
    // Dio 인터셉터 설정
    _dio.interceptors.add(LogInterceptor(
      requestBody: kDebugMode,
      responseBody: kDebugMode,
    ));
    
    // Firebase 연결 상태 모니터링
    _realtimeDb.ref('.info/connected').onValue.listen((event) {
      final isConnected = event.snapshot.value as bool? ?? false;
      debugPrint('🔥 Firebase 연결 상태: ${isConnected ? '연결됨' : '연결 끊김'}');
    });
  }
  
  // ==================== 실시간 기능 (Firebase) ====================
  
  /// 직원 실시간 상태 업데이트
  static Future<void> updatePresence(String employeeId, String status) async {
    try {
      await _realtimeDb.ref('presence/$employeeId').set({
        'status': status,
        'lastSeen': ServerValue.timestamp,
        'device': kIsWeb ? 'web' : defaultTargetPlatform.name,
      });
    } catch (e) {
      debugPrint('❌ Presence 업데이트 실패: $e');
      rethrow;
    }
  }
  
  /// 실시간 상태 스트림
  static Stream<Map<String, dynamic>> watchPresence(String employeeId) {
    return _realtimeDb.ref('presence/$employeeId').onValue.map((event) {
      if (event.snapshot.value != null) {
        return Map<String, dynamic>.from(event.snapshot.value as Map);
      }
      return {'status': 'offline', 'lastSeen': null};
    });
  }
  
  /// QR 코드 생성 (30초 만료)
  static Future<String> generateQRCode({
    required String employeeId,
    required String checkType,
    Position? location,
  }) async {
    try {
      final qrRef = _realtimeDb.ref('activeQR').push();
      final qrCode = qrRef.key!;
      final expiresAt = DateTime.now().add(Duration(seconds: 30));
      
      await qrRef.set({
        'employeeId': employeeId,
        'checkType': checkType,
        'createdAt': ServerValue.timestamp,
        'expiresAt': expiresAt.millisecondsSinceEpoch,
        'location': location != null ? {
          'lat': location.latitude,
          'lng': location.longitude,
        } : null,
        'used': false,
      });
      
      // 30초 후 자동 삭제
      Timer(Duration(seconds: 31), () {
        qrRef.remove();
      });
      
      return qrCode;
    } catch (e) {
      debugPrint('❌ QR 코드 생성 실패: $e');
      rethrow;
    }
  }
  
  /// QR 코드 검증
  static Future<Map<String, dynamic>?> validateQRCode(String qrCode) async {
    try {
      final snapshot = await _realtimeDb.ref('activeQR/$qrCode').get();
      
      if (!snapshot.exists) {
        debugPrint('⚠️ QR 코드가 존재하지 않음: $qrCode');
        return null;
      }
      
      final data = Map<String, dynamic>.from(snapshot.value as Map);
      final expiresAt = data['expiresAt'] as int;
      
      // 만료 확인
      if (DateTime.now().millisecondsSinceEpoch > expiresAt) {
        await snapshot.ref.remove();
        debugPrint('⚠️ QR 코드 만료됨: $qrCode');
        return null;
      }
      
      // 사용 여부 확인
      if (data['used'] == true) {
        debugPrint('⚠️ QR 코드 이미 사용됨: $qrCode');
        return null;
      }
      
      // 사용 처리
      await snapshot.ref.update({'used': true});
      
      return data;
    } catch (e) {
      debugPrint('❌ QR 코드 검증 실패: $e');
      return null;
    }
  }
  
  // ==================== 영구 저장 (DynamoDB via API) ====================
  
  /// 출퇴근 기록 저장 (듀얼 라이트)
  static Future<AttendanceRecord> saveAttendance({
    required String employeeId,
    required String checkType,
    Position? location,
    String? deviceId,
    String verificationMethod = 'QR',
  }) async {
    final timestamp = DateTime.now();
    
    // 1. Firebase에 즉시 쓰기 (사용자 피드백)
    await updatePresence(
      employeeId,
      checkType == 'IN' ? 'checked-in' : 'checked-out',
    );
    
    // 2. Firebase에 임시 기록
    final tempRef = _realtimeDb.ref('tempAttendance').push();
    await tempRef.set({
      'employeeId': employeeId,
      'checkType': checkType,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'location': location != null ? {
        'lat': location.latitude,
        'lng': location.longitude,
      } : null,
      'deviceId': deviceId,
      'verificationMethod': verificationMethod,
    });
    
    // 3. DynamoDB에 영구 저장 (API 호출)
    try {
      final response = await _dio.post(
        '$_apiUrl/attendance',
        data: {
          'employeeId': employeeId,
          'checkType': checkType,
          'timestamp': timestamp.millisecondsSinceEpoch,
          'location': location != null ? {
            'lat': location.latitude,
            'lng': location.longitude,
          } : null,
          'deviceId': deviceId,
          'verificationMethod': verificationMethod,
        },
      );
      
      // 성공 시 임시 기록 삭제
      await tempRef.remove();
      
      return AttendanceRecord.fromJson(response.data);
    } catch (e) {
      debugPrint('❌ DynamoDB 저장 실패, Firebase에 보관: $e');
      // 실패 시 나중에 재시도를 위해 Firebase에 보관
      await tempRef.update({'syncStatus': 'pending'});
      
      // 임시 AttendanceRecord 반환
      return AttendanceRecord(
        employeeId: employeeId,
        timestamp: timestamp,
        checkType: checkType,
        location: location,
        deviceId: deviceId ?? 'unknown',
        verificationMethod: verificationMethod,
      );
    }
  }
  
  /// 출퇴근 기록 조회 (캐싱 적용)
  static Future<List<AttendanceRecord>> getAttendanceRecords({
    required String employeeId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    final cacheKey = 'attendance_${employeeId}_${startDate?.toIso8601String()}_${endDate?.toIso8601String()}';
    
    // 1. Firebase 캐시 확인
    try {
      final cachedDoc = await _firestore
          .collection('cache')
          .doc(cacheKey)
          .get();
      
      if (cachedDoc.exists) {
        final data = cachedDoc.data()!;
        final expires = (data['expires'] as Timestamp).toDate();
        
        if (DateTime.now().isBefore(expires)) {
          debugPrint('✅ 캐시에서 출퇴근 기록 반환');
          final records = (data['records'] as List)
              .map((r) => AttendanceRecord.fromJson(r))
              .toList();
          return records;
        }
      }
    } catch (e) {
      debugPrint('⚠️ 캐시 조회 실패: $e');
    }
    
    // 2. DynamoDB에서 조회
    try {
      final response = await _dio.get(
        '$_apiUrl/attendance/$employeeId',
        queryParameters: {
          if (startDate != null) 'startDate': startDate.toIso8601String(),
          if (endDate != null) 'endDate': endDate.toIso8601String(),
        },
      );
      
      final records = (response.data['records'] as List)
          .map((r) => AttendanceRecord.fromJson(r))
          .toList();
      
      // 3. 결과 캐싱 (1시간)
      await _firestore.collection('cache').doc(cacheKey).set({
        'records': records.map((r) => r.toJson()).toList(),
        'expires': Timestamp.fromDate(DateTime.now().add(Duration(hours: 1))),
        'createdAt': FieldValue.serverTimestamp(),
      });
      
      return records;
    } catch (e) {
      debugPrint('❌ 출퇴근 기록 조회 실패: $e');
      return [];
    }
  }
  
  // ==================== 오프라인 동기화 ====================
  
  /// 오프라인 데이터 동기화
  static Future<void> syncOfflineData() async {
    try {
      // Firebase에서 동기화 대기 중인 데이터 조회
      final pendingSnapshot = await _realtimeDb
          .ref('tempAttendance')
          .orderByChild('syncStatus')
          .equalTo('pending')
          .get();
      
      if (!pendingSnapshot.exists) {
        debugPrint('✅ 동기화할 오프라인 데이터 없음');
        return;
      }
      
      final pendingData = Map<String, dynamic>.from(pendingSnapshot.value as Map);
      
      for (final entry in pendingData.entries) {
        final key = entry.key;
        final data = Map<String, dynamic>.from(entry.value);
        
        try {
          // DynamoDB로 전송
          await _dio.post(
            '$_apiUrl/attendance',
            data: data,
          );
          
          // 성공 시 삭제
          await _realtimeDb.ref('tempAttendance/$key').remove();
          debugPrint('✅ 오프라인 데이터 동기화 성공: $key');
        } catch (e) {
          debugPrint('❌ 오프라인 데이터 동기화 실패: $key - $e');
        }
      }
    } catch (e) {
      debugPrint('❌ 오프라인 동기화 프로세스 실패: $e');
    }
  }
  
  // ==================== 팀 메시징 (Firestore) ====================
  
  /// 팀 메시지 전송
  static Future<void> sendTeamMessage({
    required String teamId,
    required String message,
    required String senderId,
  }) async {
    await _firestore.collection('teams/$teamId/messages').add({
      'message': message,
      'senderId': senderId,
      'timestamp': FieldValue.serverTimestamp(),
      'read': false,
    });
  }
  
  /// 팀 메시지 스트림
  static Stream<List<Map<String, dynamic>>> getTeamMessages(String teamId) {
    return _firestore
        .collection('teams/$teamId/messages')
        .orderBy('timestamp', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) {
          return snapshot.docs.map((doc) {
            final data = doc.data();
            data['id'] = doc.id;
            return data;
          }).toList();
        });
  }
}

// ==================== Riverpod Providers ====================

final hybridDatabaseServiceProvider = Provider((ref) => HybridDatabaseService());

final presenceStreamProvider = StreamProvider.family<Map<String, dynamic>, String>((ref, employeeId) {
  return HybridDatabaseService.watchPresence(employeeId);
});

final teamMessagesStreamProvider = StreamProvider.family<List<Map<String, dynamic>>, String>((ref, teamId) {
  return HybridDatabaseService.getTeamMessages(teamId);
});

final attendanceRecordsProvider = FutureProvider.family<List<AttendanceRecord>, String>((ref, employeeId) async {
  return HybridDatabaseService.getAttendanceRecords(
    employeeId: employeeId,
    startDate: DateTime.now().subtract(Duration(days: 30)),
    endDate: DateTime.now(),
  );
});