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
      .from('organizations')
      .select('count(*)')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ 연결 실패:', connectionError);
      return;
    }
    console.log('✅ Supabase 연결 성공!');

    // 2. 테스트 사용자 확인
    console.log('\n👤 2. 기존 테스트 사용자 확인...');
    const { data: users, error: usersError } = await supabase
      .from('employees')
      .select('email, role, approval_status')
      .limit(10);
    
    if (usersError) {
      console.error('❌ 사용자 조회 실패:', usersError);
    } else {
      console.log(`📋 현재 등록된 사용자: ${users.length}명`);
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role}, ${user.approval_status})`);
      });
    }

    // 3. 테스트 사용자 생성 (admin@test.com)
    console.log('\n🔨 3. 테스트 사용자 생성 시도...');
    
    // 먼저 Supabase Auth에 사용자 생성
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: 'admin@test.com',
      password: 'Test123!',
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Auth 사용자 생성 실패:', authError);
      return;
    }

    if (authData.user) {
      console.log('✅ Auth 사용자 생성 성공:', authData.user.email);
      
      // Employee 테이블에 데이터 추가
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .upsert({
          id: authData.user.id,
          email: 'admin@test.com',
          name: '테스트 관리자',
          role: 'admin',
          approval_status: 'APPROVED',
          organization_id: 'default-org',
          employee_code: 'ADMIN001',
          is_active: true,
        })
        .select();

      if (employeeError) {
        console.error('❌ Employee 생성 실패:', employeeError);
      } else {
        console.log('✅ Employee 생성 성공:', employeeData);
      }
    } else {
      console.log('ℹ️  사용자가 이미 존재하거나 생성되지 않음');
    }

    console.log('\n🎯 로그인 테스트 정보:');
    console.log('📧 이메일: admin@test.com');
    console.log('🔑 비밀번호: Test123!');
    console.log('👤 역할: admin');
    
  } catch (error) {
    console.error('💥 예상치 못한 오류:', error);
  }
}

testConnection();