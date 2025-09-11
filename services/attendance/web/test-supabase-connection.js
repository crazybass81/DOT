#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔗 Supabase 연결 테스트 시작...');
console.log('URL:', supabaseUrl);
console.log('Key (앞 20자):', supabaseKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // 1. 기본 연결 테스트
    console.log('\n📡 1. 기본 연결 테스트...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('organizations_v3')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (connectionError) {
      console.error('❌ 연결 실패:', connectionError);
      return;
    }
    console.log('✅ Supabase 연결 성공!');

    // 2. 테스트 사용자 확인 (profiles 테이블 시도)
    console.log('\n👤 2. 기존 테스트 사용자 확인...');
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .limit(10);
    
    if (usersError) {
      console.error('❌ 사용자 조회 실패:', usersError);
    } else {
      console.log(`📋 현재 등록된 사용자: ${users.length}명`);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role || '역할없음'})`);
      });
    }

    // 3. 테스트 사용자 생성 (admin@test.com)
    console.log('\n🔨 3. 테스트 사용자 생성 시도...');
    
    // 먼저 유효한 이메일로 Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'test.admin@example.com',
      password: 'TestPass123!',
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Auth 사용자 생성 실패:', authError);
      
      // 기존 사용자로 로그인 시도
      console.log('🔄 기존 사용자로 로그인 시도...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test.admin@example.com',
        password: 'TestPass123!',
      });
      
      if (signInError) {
        console.error('❌ 로그인도 실패:', signInError);
        return;
      } else {
        console.log('✅ 기존 사용자 로그인 성공');
      }
    }

    if (authData?.user || !authError) {
      console.log('✅ Auth 사용자 처리 성공');
      
      // Profiles 테이블에 데이터 추가
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          email: 'test.admin@example.com',
          full_name: '테스트 관리자',
          role: 'admin',
          avatar_url: null,
        })
        .select();

      if (profileError) {
        console.error('❌ Profile 생성 실패:', profileError);
      } else {
        console.log('✅ Profile 생성 성공:', profileData);
      }
    } else {
      console.log('ℹ️  사용자가 이미 존재하거나 생성되지 않음');
    }

    console.log('\n🎯 로그인 테스트 정보:');
    console.log('📧 이메일: test.admin@example.com');
    console.log('🔑 비밀번호: TestPass123!');
    console.log('👤 역할: admin');
    
  } catch (error) {
    console.error('💥 예상치 못한 오류:', error);
  }
}

testConnection();