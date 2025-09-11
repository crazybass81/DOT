#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 프로필 테이블을 사용한 테스트 사용자 설정');

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestUser() {
  try {
    console.log('\n📡 1. Supabase 연결 테스트...');
    
    // 1. 먼저 Auth에 사용자 생성 또는 로그인
    console.log('\n🔐 2. Auth 사용자 생성/로그인...');
    
    let authUser = null;
    
    // 회원가입 시도
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@dottest.com',
      password: 'DotTest123!',
    });

    if (signUpError && !signUpError.message.includes('already registered')) {
      console.error('❌ 회원가입 실패:', signUpError);
      return;
    }

    if (signUpError?.message.includes('already registered')) {
      console.log('🔄 기존 사용자로 로그인 시도...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@dottest.com',
        password: 'DotTest123!',
      });
      
      if (signInError) {
        console.error('❌ 로그인 실패:', signInError);
        return;
      }
      authUser = signInData.user;
      console.log('✅ 기존 사용자 로그인 성공');
    } else {
      authUser = signUpData.user;
      console.log('✅ 새 사용자 생성 성공');
    }

    console.log(`👤 Auth 사용자 ID: ${authUser.id}`);

    // 2. profiles 테이블에 사용자 정보 추가
    console.log('\n📝 3. profiles 테이블에 사용자 정보 추가...');
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        email: 'admin@dottest.com',
        full_name: '테스트 관리자',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ 프로필 생성 실패:', profileError);
      return;
    }

    console.log('✅ 프로필 생성 성공:', profileData);

    // 3. organizations_v3 테이블에 테스트 조직 생성
    console.log('\n🏢 4. 테스트 조직 생성...');
    
    const { data: orgData, error: orgError } = await supabase
      .from('organizations_v3')
      .upsert({
        name: '테스트 회사',
        type: 'company',
        description: 'DOT 출석 관리 테스트용 회사',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ 조직 생성 실패:', orgError);
      return;
    }

    console.log('✅ 조직 생성 성공:', orgData);

    // 4. role_assignments 테이블에 역할 할당
    console.log('\n👔 5. 역할 할당...');
    
    const { data: roleData, error: roleError } = await supabase
      .from('role_assignments')
      .upsert({
        identity_id: authUser.id,
        organization_id: orgData.id,
        role: 'admin',
        is_active: true,
        employee_code: 'ADMIN001',
        department: 'IT',
        position: '시스템 관리자',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();

    if (roleError) {
      console.error('❌ 역할 할당 실패:', roleError);
      // 역할 할당이 실패해도 계속 진행
    } else {
      console.log('✅ 역할 할당 성공:', roleData);
    }

    // 5. 생성된 사용자 정보 확인
    console.log('\n🎯 6. 최종 사용자 정보 확인...');
    
    const { data: finalProfile, error: finalError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'admin@dottest.com')
      .single();

    if (finalError) {
      console.error('❌ 사용자 정보 조회 실패:', finalError);
    } else {
      console.log('✅ 최종 사용자 정보:', finalProfile);
    }

    console.log('\n🎉 테스트 사용자 설정 완료!');
    console.log('📧 이메일: admin@dottest.com');
    console.log('🔑 비밀번호: DotTest123!');
    console.log('👤 역할: admin');
    console.log('🏢 조직:', orgData.name);

  } catch (error) {
    console.error('💥 예상치 못한 오류:', error);
  }
}

setupTestUser();