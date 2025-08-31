import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  print('🚀 Firebase 연결 테스트 시작...\n');
  
  try {
    // 1. Firebase 초기화 (Android는 google-services.json 자동 사용)
    print('1️⃣ Firebase 초기화 중...');
    await Firebase.initializeApp();
    print('✅ Firebase 초기화 성공!\n');
    
    // 2. Authentication 테스트
    print('2️⃣ Authentication 테스트...');
    final auth = FirebaseAuth.instance;
    print('✅ Firebase Auth 인스턴스 생성 성공!');
    print('📧 현재 사용자: ${auth.currentUser?.email ?? "로그인 안됨"}\n');
    
    // 3. 테스트 계정으로 로그인 시도
    print('3️⃣ 테스트 계정 로그인 시도...');
    print('📧 이메일: archt723@gmail.com');
    print('🔑 비밀번호: 1q2w3e2w1q!');
    
    try {
      final credential = await auth.signInWithEmailAndPassword(
        email: 'archt723@gmail.com',
        password: '1q2w3e2w1q!',
      );
      print('✅ 로그인 성공!');
      print('👤 사용자 ID: ${credential.user?.uid}');
      print('📧 이메일: ${credential.user?.email}\n');
      
      // 4. Firestore 테스트
      print('4️⃣ Firestore 연결 테스트...');
      final firestore = FirebaseFirestore.instance;
      
      // 사용자 문서 확인
      final userDoc = await firestore
          .collection('users')
          .doc(credential.user!.uid)
          .get();
      
      if (userDoc.exists) {
        print('✅ Firestore에서 사용자 문서 찾음!');
        print('📄 데이터: ${userDoc.data()}\n');
      } else {
        print('⚠️ 사용자 문서가 없음. 새로 생성...');
        await firestore.collection('users').doc(credential.user!.uid).set({
          'email': 'archt723@gmail.com',
          'name': 'Master Admin',
          'role': 'MASTER_ADMIN',
          'department': 'Management',
          'position': 'System Administrator',
          'employeeId': 'EMP001',
          'isActive': true,
          'createdAt': FieldValue.serverTimestamp(),
          'lastLoginAt': FieldValue.serverTimestamp(),
        });
        print('✅ 사용자 문서 생성 완료!\n');
      }
      
      // 5. 설정 문서 확인
      print('5️⃣ Firestore 설정 문서 확인...');
      final settingsDoc = await firestore
          .collection('settings')
          .doc('company')
          .get();
      
      if (settingsDoc.exists) {
        print('✅ 회사 설정 문서 있음');
      } else {
        print('⚠️ 회사 설정 문서 없음. 기본값 생성...');
        await firestore.collection('settings').doc('company').set({
          'name': 'DOT Company',
          'workStartTime': '09:00',
          'workEndTime': '18:00',
          'allowRemoteWork': true,
          'requireLocationCheck': true,
        });
        print('✅ 회사 설정 생성 완료!');
      }
      
      // 로그아웃
      await auth.signOut();
      print('\n✅ 테스트 완료! 로그아웃됨.');
      
    } catch (e) {
      print('❌ 로그인 실패!');
      print('오류: $e');
      print('\n가능한 원인:');
      print('1. Firebase Console에서 이메일/비밀번호 인증이 활성화되지 않음');
      print('2. 테스트 계정이 생성되지 않음');
      print('3. 비밀번호가 틀림');
    }
    
  } catch (e) {
    print('❌ Firebase 초기화 실패!');
    print('오류: $e');
    print('\n가능한 원인:');
    print('1. google-services.json 파일이 없거나 잘못됨');
    print('2. Firebase 프로젝트가 제대로 설정되지 않음');
  }
  
  print('\n========================================');
  print('테스트 종료');
  print('========================================');
  
  // 앱 실행
  runApp(const TestApp());
}

class TestApp extends StatelessWidget {
  const TestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Firebase 테스트'),
        ),
        body: const Center(
          child: Text(
            '콘솔 로그를 확인하세요!',
            style: TextStyle(fontSize: 24),
          ),
        ),
      ),
    );
  }
}