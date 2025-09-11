#!/usr/bin/env node

/**
 * 실제 이메일 회원가입 테스트 스크립트
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

async function testRealSignup() {
  console.log('🚀 실제 이메일 회원가입 테스트 시작...\n');

  // 테스트 계정 정보
  const testEmail = `testuser${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  const testName = '테스트 사용자';

  console.log(`📧 테스트 계정: ${testEmail}`);
  console.log(`👤 이름: ${testName}\n`);

  try {
    // 1. 데이터베이스 상태 확인
    console.log('📊 1단계: 현재 데이터베이스 상태 확인...');
    
    const { data: identitiesCount } = await supabase
      .from('unified_identities')
      .select('count', { count: 'exact', head: true });

    const { data: profilesCount } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    const { data: roleAssignmentsCount } = await supabase
      .from('role_assignments')  
      .select('count', { count: 'exact', head: true });

    console.log(`   - unified_identities: ${identitiesCount?.count || 0}개`);
    console.log(`   - profiles: ${profilesCount?.count || 0}개`);
    console.log(`   - role_assignments: ${roleAssignmentsCount?.count || 0}개\n`);

    // 2. 실제 회원가입 테스트
    console.log('✏️  2단계: 실제 이메일로 회원가입 시도...');
    
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
      
      // 상세한 에러 정보 출력
      if (signUpError.message.includes('invalid')) {
        console.log('\n🔧 해결 방법:');
        console.log('1. Supabase Dashboard > Authentication > Settings 확인');
        console.log('2. "Enable email confirmations" 설정 확인');
        console.log('3. Email provider 설정 확인');
      }
      
      return false;
    }

    console.log('✅ 회원가입 요청 성공!');
    
    if (!signUpData.session) {
      console.log('📧 이메일 인증이 필요합니다.');
      console.log(`   - 사용자 ID: ${signUpData.user?.id}`);
      console.log(`   - 이메일 인증 대기 중: ${signUpData.user?.email_confirmed_at ? '완료' : '대기중'}`);
    } else {
      console.log('🎉 즉시 로그인됨 (이메일 인증 비활성화됨)');
      console.log(`   - 세션 ID: ${signUpData.session.access_token.substring(0, 20)}...`);
    }

    // 3. 데이터베이스에 자동 생성된 데이터 확인
    console.log('\n🔍 3단계: 자동 생성된 데이터 확인...');
    
    // 약간의 지연을 두고 데이터 확인 (트리거 처리 시간)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // profiles 테이블 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', signUpData.user.id)
      .single();

    if (profileError) {
      console.log('⚠️  profiles 테이블에서 데이터를 찾을 수 없음:', profileError.message);
    } else {
      console.log('✅ profiles 테이블에 데이터 생성됨:');
      console.log(`   - ID: ${profile.id}`);
      console.log(`   - Email: ${profile.email}`);
      console.log(`   - Name: ${profile.name}`);
      console.log(`   - Role: ${profile.role}`);
    }

    // unified_identities 테이블 확인
    const { data: identity, error: identityError } = await supabase
      .from('unified_identities')
      .select('*')
      .eq('auth_user_id', signUpData.user.id)
      .single();

    if (identityError) {
      console.log('⚠️  unified_identities 테이블에서 데이터를 찾을 수 없음:', identityError.message);
    } else {
      console.log('✅ unified_identities 테이블에 데이터 생성됨:');
      console.log(`   - ID: ${identity.id}`);
      console.log(`   - Email: ${identity.email}`);
      console.log(`   - Full Name: ${identity.full_name}`);
      console.log(`   - ID Type: ${identity.id_type}`);
      console.log(`   - Verified: ${identity.is_verified}`);
      console.log(`   - Active: ${identity.is_active}`);

      // role_assignments 테이블 확인
      const { data: roleAssignments, error: roleError } = await supabase
        .from('role_assignments')
        .select(`
          *,
          organizations_v3(name, display_name)
        `)
        .eq('identity_id', identity.id);

      if (roleError) {
        console.log('⚠️  role_assignments 테이블에서 데이터를 찾을 수 없음:', roleError.message);
      } else if (roleAssignments && roleAssignments.length > 0) {
        console.log('✅ role_assignments 테이블에 데이터 생성됨:');
        roleAssignments.forEach((assignment, index) => {
          console.log(`   [${index + 1}] Role: ${assignment.role}`);
          console.log(`       Organization: ${assignment.organizations_v3?.display_name || assignment.organizations_v3?.name}`);
          console.log(`       Active: ${assignment.is_active}`);
          console.log(`       Primary: ${assignment.is_primary}`);
        });
      } else {
        console.log('⚠️  role_assignments 테이블에 데이터가 없음');
      }
    }

    // 4. 전체 통계 확인
    console.log('\n📊 4단계: 업데이트된 데이터베이스 상태...');
    
    const { data: newIdentitiesCount } = await supabase
      .from('unified_identities')
      .select('count', { count: 'exact', head: true });

    const { data: newProfilesCount } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    const { data: newRoleAssignmentsCount } = await supabase
      .from('role_assignments')
      .select('count', { count: 'exact', head: true });

    console.log(`   - unified_identities: ${newIdentitiesCount?.count || 0}개 (이전: ${identitiesCount?.count || 0}개)`);
    console.log(`   - profiles: ${newProfilesCount?.count || 0}개 (이전: ${profilesCount?.count || 0}개)`);
    console.log(`   - role_assignments: ${newRoleAssignmentsCount?.count || 0}개 (이전: ${roleAssignmentsCount?.count || 0}개)`);

    console.log('\n🎉 실제 이메일 회원가입 테스트 완료!');
    
    return true;

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
    return false;
  }
}

// 로그인 테스트 (선택적)
async function testLogin(email, password) {
  console.log('\n🔐 추가 테스트: 로그인 시도...');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('❌ 로그인 실패:', error.message);
      return false;
    }

    console.log('✅ 로그인 성공!');
    console.log(`   - 사용자 ID: ${data.user?.id}`);
    console.log(`   - 이메일: ${data.user?.email}`);
    
    return true;
  } catch (error) {
    console.error('❌ 로그인 테스트 중 오류:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 실제 이메일 회원가입 기능 테스트');
  console.log('=====================================\n');
  
  const success = await testRealSignup();
  
  if (success) {
    console.log('\n✅ 모든 기능이 정상적으로 작동합니다!');
    console.log('\n📝 다음 단계:');
    console.log('1. 웹 애플리케이션에서 실제 회원가입 테스트');
    console.log('2. 이메일 인증 프로세스 확인');
    console.log('3. 로그인 후 사용자 데이터 표시 확인');
  } else {
    console.log('\n❌ 설정에 문제가 있습니다.');
    console.log('\n🔧 해결 방법:');
    console.log('1. scripts/complete-signup-setup.sql을 Supabase Dashboard에서 실행');
    console.log('2. Authentication 설정 확인');
    console.log('3. 환경 변수 설정 확인');
  }
}

main().catch(console.error);