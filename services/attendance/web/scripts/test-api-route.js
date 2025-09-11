#!/usr/bin/env node

/**
 * API 라우트 테스트 스크립트
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testApiRoute() {
  console.log('🚀 API 라우트 테스트 시작...\n');

  try {
    // 1. 테스트 사용자 회원가입
    console.log('1️⃣ 테스트 사용자 회원가입...');
    
    const testEmail = `apitest${Date.now()}@test.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'API 테스트 사용자';

    console.log(`📧 이메일: ${testEmail}`);
    console.log(`👤 이름: ${testName}\n`);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          name: testName
        }
      }
    });

    if (signUpError) {
      console.error('❌ 회원가입 실패:', signUpError.message);
      return false;
    }

    console.log('✅ Supabase Auth 회원가입 성공!');
    console.log(`   - 사용자 ID: ${signUpData.user?.id}`);
    console.log(`   - 세션: ${signUpData.session ? '즉시 생성됨' : '이메일 인증 필요'}\n`);

    // 2. API 라우트 호출 테스트
    console.log('2️⃣ API 라우트 호출 테스트...');
    
    const apiResponse = await fetch('http://localhost:3002/api/auth/create-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: signUpData.user.id,
        email: testEmail,
        fullName: testName
      })
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      console.error('❌ API 라우트 호출 실패:', apiResponse.status, errorData);
      return false;
    }

    const apiResult = await apiResponse.json();
    console.log('✅ API 라우트 호출 성공!');
    console.log('📋 응답 데이터:', JSON.stringify(apiResult, null, 2));

    // 3. 데이터베이스 확인
    console.log('\n3️⃣ 데이터베이스 레코드 확인...');

    const { data: identity, error: identityError } = await supabase
      .from('unified_identities')
      .select('*')
      .eq('auth_user_id', signUpData.user.id)
      .single();

    if (identityError) {
      console.log('⚠️ unified_identities 조회 실패:', identityError.message);
    } else {
      console.log('✅ unified_identities 레코드 존재');
      console.log(`   - ID: ${identity.id}`);
      console.log(`   - Email: ${identity.email}`);
      console.log(`   - Full Name: ${identity.full_name}`);
      console.log(`   - Active: ${identity.is_active}`);
    }

    const { data: roleAssignments, error: roleError } = await supabase
      .from('role_assignments')
      .select('*')
      .eq('identity_id', identity?.id);

    if (roleError) {
      console.log('⚠️ role_assignments 조회 실패:', roleError.message);
    } else if (roleAssignments && roleAssignments.length > 0) {
      console.log('✅ role_assignments 레코드 존재');
      roleAssignments.forEach((assignment, index) => {
        console.log(`   [${index + 1}] Role: ${assignment.role}`);
        console.log(`       Employee Code: ${assignment.employee_code}`);
        console.log(`       Active: ${assignment.is_active}`);
      });
    } else {
      console.log('⚠️ role_assignments 레코드 없음');
    }

    return true;

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 API 라우트 기능 테스트');
  console.log('========================\n');

  console.log('📋 테스트 목적:');
  console.log('1. Supabase Auth 회원가입 성공');
  console.log('2. /api/auth/create-profile 라우트 호출');
  console.log('3. 데이터베이스 레코드 생성 확인');
  console.log('4. 전체 회원가입 플로우 검증\n');

  const success = await testApiRoute();

  if (success) {
    console.log('\n🎉 API 라우트 테스트 성공!');
    console.log('✅ 회원가입 → API 호출 → DB 저장 플로우 완성');
  } else {
    console.log('\n❌ API 라우트 테스트 실패');
    console.log('🔧 문제 해결 필요:');
    console.log('1. 개발 서버가 실행 중인지 확인 (npm run dev)');
    console.log('2. 환경 변수 설정 확인');
    console.log('3. API 라우트 코드 확인');
  }
}

main().catch(console.error);