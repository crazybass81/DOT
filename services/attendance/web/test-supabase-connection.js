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

    // 2. 테스트 사용자 확인 (unified_identities + role_assignments)
    console.log('\n👤 2. 기존 테스트 사용자 확인...');
    const { data: identities, error: identitiesError } = await supabase
      .from('unified_identities')
      .select(`
        *,
        role_assignments!role_assignments_identity_id_fkey(
          role,
          organization_id,
          is_active
        )
      `)
      .limit(10);
    
    if (identitiesError) {
      console.error('❌ 사용자 조회 실패:', identitiesError);
    } else {
      console.log(`📋 현재 등록된 사용자: ${identities.length}명`);
      identities.forEach(identity => {
        const roles = identity.role_assignments?.filter(r => r.is_active)?.map(r => r.role) || [];
        console.log(`  - ${identity.email} (${identity.full_name}, 역할: ${roles.join(', ') || '없음'})`);
      });
    }

    // 3. 테스트 사용자 생성 (admin@test.com)
    console.log('\n🔨 3. 테스트 사용자 생성 시도...');
    
    // 먼저 유효한 이메일로 Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@dottest.com',
      password: 'DotTest123!',
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Auth 사용자 생성 실패:', authError);
      
      // 기존 사용자로 로그인 시도
      console.log('🔄 기존 사용자로 로그인 시도...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@dottest.com',
        password: 'DotTest123!',
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
      
      // 1) unified_identities 테이블에 사용자 추가
      const { data: identityData, error: identityError } = await supabase
        .from('unified_identities')
        .upsert({
          email: 'test.admin@example.com',
          full_name: '테스트 관리자',
          auth_user_id: authData?.user?.id,
          id_type: 'personal',
          is_active: true,
        })
        .select()
        .single();

      if (identityError) {
        console.error('❌ Identity 생성 실패:', identityError);
        return;
      }
      
      console.log('✅ Identity 생성 성공:', identityData);

      // 2) 기본 조직 생성 또는 확인
      const { data: orgData, error: orgError } = await supabase
        .from('organizations_v3')
        .upsert({
          name: '테스트 회사',
          type: 'company',
          is_active: true,
        })
        .select()
        .single();

      if (orgError) {
        console.error('❌ 조직 생성 실패:', orgError);
        return;
      }

      // 3) role_assignments 테이블에 역할 할당
      const { data: roleData, error: roleError } = await supabase
        .from('role_assignments')
        .upsert({
          identity_id: identityData.id,
          organization_id: orgData.id,
          role: 'admin',
          is_active: true,
          employee_code: 'ADMIN001',
          department: 'IT',
          position: '시스템 관리자',
        })
        .select();

      if (roleError) {
        console.error('❌ 역할 할당 실패:', roleError);
      } else {
        console.log('✅ 역할 할당 성공:', roleData);
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