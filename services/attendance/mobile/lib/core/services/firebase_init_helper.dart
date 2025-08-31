import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../../data/models/user_model.dart';
import '../../data/models/enums/user_role.dart';

/// Firebase 초기 설정 헬퍼
/// 테스트 계정 및 초기 데이터 설정용
class FirebaseInitHelper {
  static final FirebaseAuth _auth = FirebaseAuth.instance;
  static final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  /// MASTER_ADMIN 계정 생성 및 설정
  static Future<void> setupMasterAdmin() async {
    try {
      const email = 'archt723@gmail.com';
      const password = '1q2w3e2w1q!';
      
      // 1. Firebase Auth에서 사용자 생성 또는 로그인
      UserCredential userCredential;
      try {
        // 먼저 로그인 시도
        userCredential = await _auth.signInWithEmailAndPassword(
          email: email,
          password: password,
        );
        print('✅ 기존 계정으로 로그인 성공');
      } catch (e) {
        // 계정이 없으면 생성
        try {
          userCredential = await _auth.createUserWithEmailAndPassword(
            email: email,
            password: password,
          );
          print('✅ 새 계정 생성 성공');
        } catch (createError) {
          print('❌ 계정 생성/로그인 실패: $createError');
          return;
        }
      }

      // 2. Firestore에 사용자 문서 생성/업데이트
      final user = UserModel(
        id: userCredential.user!.uid,
        email: email,
        name: 'Master Admin',
        role: UserRole.MASTER_ADMIN,
        department: 'Management',
        position: 'System Administrator',
        employeeId: 'EMP001',
        profileImageUrl: null,
        isActive: true,
        createdAt: DateTime.now(),
        lastLoginAt: DateTime.now(),
        fcmToken: null,
        biometricEnabled: false,
      );

      await _firestore
          .collection('users')
          .doc(user.id)
          .set(user.toJson(), SetOptions(merge: true));

      print('✅ Firestore 사용자 문서 생성/업데이트 완료');
      print('📧 Email: $email');
      print('🔑 Password: $password');
      print('👤 Role: MASTER_ADMIN');
      print('🆔 User ID: ${user.id}');
      
      // 3. 기본 설정 문서 생성
      await _setupDefaultSettings();
      
    } catch (e) {
      print('❌ 설정 중 오류 발생: $e');
    }
  }

  /// 기본 앱 설정 생성
  static Future<void> _setupDefaultSettings() async {
    try {
      // 회사 설정
      await _firestore.collection('settings').doc('company').set({
        'name': 'DOT Company',
        'address': 'Seoul, South Korea',
        'workStartTime': '09:00',
        'workEndTime': '18:00',
        'lunchStartTime': '12:00',
        'lunchEndTime': '13:00',
        'allowRemoteWork': true,
        'requireLocationCheck': true,
        'autoCheckOutTime': '23:59',
        'overtimeAllowed': true,
        'weekendWorkAllowed': false,
      }, SetOptions(merge: true));

      // QR 코드 설정
      await _firestore.collection('settings').doc('qr').set({
        'validityDuration': 60, // 60초
        'refreshInterval': 30, // 30초마다 새로고침
        'requireLocation': true,
        'allowedRadius': 100, // 100미터 반경
      }, SetOptions(merge: true));

      // 출퇴근 설정
      await _firestore.collection('settings').doc('attendance').set({
        'autoSyncInterval': 5, // 5분마다 동기화
        'maxBreakDuration': 60, // 최대 60분 휴게
        'minWorkDuration': 240, // 최소 4시간 근무
        'overtimeThreshold': 540, // 9시간 이상 초과근무
      }, SetOptions(merge: true));

      print('✅ 기본 설정 생성 완료');
    } catch (e) {
      print('❌ 설정 생성 중 오류: $e');
    }
  }

  /// 테스트 부서 및 사용자 생성
  static Future<void> createTestData() async {
    try {
      // 부서 생성
      final departments = ['Development', 'Design', 'Marketing', 'HR'];
      for (final dept in departments) {
        await _firestore.collection('departments').doc(dept.toLowerCase()).set({
          'name': dept,
          'isActive': true,
          'createdAt': FieldValue.serverTimestamp(),
        });
      }

      print('✅ 테스트 부서 생성 완료');

      // 테스트 QR 위치 생성
      await _firestore.collection('qr_locations').doc('office_main').set({
        'name': 'Main Office',
        'latitude': 37.5665,
        'longitude': 126.9780,
        'address': 'Seoul City Hall, Seoul',
        'isActive': true,
        'createdAt': FieldValue.serverTimestamp(),
      });

      print('✅ 테스트 QR 위치 생성 완료');
    } catch (e) {
      print('❌ 테스트 데이터 생성 중 오류: $e');
    }
  }

  /// 모든 초기 설정 실행
  static Future<void> initializeAll() async {
    print('🚀 Firebase 초기 설정 시작...');
    await setupMasterAdmin();
    await createTestData();
    print('✅ Firebase 초기 설정 완료!');
  }
}