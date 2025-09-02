import 'package:supabase_flutter/supabase_flutter.dart';

// Supabase 연결 테스트 스크립트
// 실행: dart run test_supabase_connection.dart

void main() async {
  print('🚀 Supabase 연결 테스트 시작...\n');
  
  try {
    // Supabase 초기화
    await Supabase.initialize(
      url: 'https://mljyiuzetchtjudbcfvd.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1NjEwMzQsImV4cCI6MjA1MTEzNzAzNH0.7gcNa4W_tHxJ86GJZP8-0ysPM9_Jk3G_vLEAl1MneSk',
    );
    print('✅ Supabase 초기화 성공\n');
    
    final supabase = Supabase.instance.client;
    
    // 1. 로그인 테스트
    print('🔐 로그인 시도: archt723@gmail.com');
    try {
      final response = await supabase.auth.signInWithPassword(
        email: 'archt723@gmail.com',
        password: '1q2w3e2w1q!',
      );
      
      if (response.user != null) {
        print('✅ 로그인 성공!');
        print('   User ID: ${response.user!.id}');
        print('   Email: ${response.user!.email}\n');
        
        // 2. 프로필 정보 확인
        print('👤 프로필 정보 확인...');
        try {
          final profileData = await supabase
              .from('profiles')
              .select()
              .eq('id', response.user!.id)
              .single();
          
          print('✅ 프로필 정보:');
          print('   Name: ${profileData['name']}');
          print('   Role: ${profileData['role']}');
          print('   Created: ${profileData['created_at']}\n');
        } catch (e) {
          print('❌ 프로필 조회 실패: $e');
          print('   → profiles 테이블이 없거나 데이터가 없을 수 있습니다.');
          print('   → database_setup.sql을 실행해주세요.\n');
        }
        
        // 3. 로그아웃
        await supabase.auth.signOut();
        print('✅ 로그아웃 완료');
        
      } else {
        print('❌ 로그인 실패: 응답에 사용자 정보가 없습니다');
      }
    } catch (e) {
      print('❌ 로그인 실패: $e');
      print('\n가능한 원인:');
      print('1. 사용자가 생성되지 않았습니다.');
      print('   → Supabase Dashboard에서 사용자를 생성해주세요.');
      print('2. 비밀번호가 틀렸습니다.');
      print('   → 비밀번호: 1q2w3e2w1q!');
    }
    
    // 4. 테이블 존재 여부 확인
    print('\n📊 테이블 확인...');
    try {
      // profiles 테이블 확인
      final profiles = await supabase.from('profiles').select().limit(1);
      print('✅ profiles 테이블 존재');
      
      // attendance 테이블 확인
      final attendance = await supabase.from('attendance').select().limit(1);
      print('✅ attendance 테이블 존재');
      
      // breaks 테이블 확인
      final breaks = await supabase.from('breaks').select().limit(1);
      print('✅ breaks 테이블 존재');
      
    } catch (e) {
      print('❌ 테이블 확인 실패: $e');
      print('   → database_setup.sql을 먼저 실행해주세요.');
    }
    
  } catch (e) {
    print('❌ 초기화 실패: $e');
  }
  
  print('\n🏁 테스트 완료');
}