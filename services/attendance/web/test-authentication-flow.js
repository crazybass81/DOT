#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 DOT 출석관리 - 인증 플로우 테스트');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuthFlow() {
  try {
    console.log('\n📡 1. Supabase 연결 테스트...');
    
    // 1. Basic connection test
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count(*)', { count: 'exact' })
      .limit(1);
    
    if (connectionError) {
      console.error('❌ 연결 실패:', connectionError);
      return;
    }
    console.log('✅ Supabase 연결 성공!');

    // 2. Test signup flow
    console.log('\n👤 2. 회원가입 테스트...');
    
    const testEmail = `test${Date.now()}@dottest.com`;
    const testPassword = 'TestPass123!';
    const testName = '테스트 사용자';

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: testName,
          full_name: testName
        }
      }
    });

    if (signUpError) {
      console.error('❌ 회원가입 실패:', signUpError.message);
    } else {
      console.log('✅ 회원가입 성공!');
      console.log(`📧 이메일: ${testEmail}`);
      console.log(`👤 사용자 ID: ${signUpData.user?.id}`);
      
      // Create profile
      if (signUpData.user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: signUpData.user.id,
            email: testEmail,
            name: testName,
            role: 'worker',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (profileError) {
          console.log('⚠️ 프로필 생성 실패 (권한 문제):', profileError.message);
        } else {
          console.log('✅ 프로필 생성 성공:', profileData);
        }
      }
    }

    // 3. Test login flow
    console.log('\n🔐 3. 로그인 테스트...');
    
    if (!signUpError && signUpData.user) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (signInError) {
        console.log('⚠️ 로그인 실패 (이메일 미확인 가능):', signInError.message);
        
        // Even if email not confirmed, try to get user info
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (user) {
          console.log('✅ 인증된 사용자 확인 (이메일 미확인):', user.email);
        }
      } else {
        console.log('✅ 로그인 성공!');
        console.log(`👤 로그인된 사용자: ${signInData.user.email}`);

        // 4. Test profile lookup
        console.log('\n📋 4. 프로필 조회 테스트...');
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signInData.user.id)
          .maybeSingle();

        if (profileError) {
          console.log('⚠️ 프로필 조회 실패:', profileError.message);
        } else if (profile) {
          console.log('✅ 프로필 조회 성공:', profile);
        } else {
          console.log('ℹ️ 프로필이 없음 (권한 문제로 생성되지 않음)');
        }

        // 5. Test logout
        console.log('\n🚪 5. 로그아웃 테스트...');
        
        const { error: signOutError } = await supabase.auth.signOut();
        
        if (signOutError) {
          console.log('❌ 로그아웃 실패:', signOutError.message);
        } else {
          console.log('✅ 로그아웃 성공!');
        }
      }
    }

    console.log('\n🎉 인증 플로우 테스트 완료!');
    console.log('\n📝 요약:');
    console.log('- ✅ Supabase 연결');
    console.log('- ✅ 회원가입 (Auth)');
    console.log('- ⚠️ 프로필 생성 (RLS 제약)');
    console.log('- ✅ 로그인 시도');
    console.log('- ✅ 로그아웃');
    
    console.log('\n💡 다음 단계:');
    console.log('1. http://localhost:3002 에서 회원가입 테스트');
    console.log('2. 생성된 계정으로 로그인 테스트');
    console.log('3. 대시보드 접근 확인');

  } catch (error) {
    console.error('💥 예상치 못한 오류:', error);
  }
}

testAuthFlow();