#!/usr/bin/env node

/**
 * 이메일 인증 비활성화 및 즉시 로그인 설정 테스트
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

async function testImmediateSignup() {
  console.log('🧪 즉시 로그인 회원가입 테스트...\n');
  
  try {
    // 테스트용 이메일 (Gmail이지만 유효한 형식)
    const testEmail = `devtest${Date.now()}@gmail.com`;
    const testPassword = 'DevTest123!';
    const testName = '개발테스트사용자';
    
    console.log('📧 테스트 계정 정보:');
    console.log(`   - 이메일: ${testEmail}`);
    console.log(`   - 비밀번호: ${testPassword}`);
    console.log(`   - 이름: ${testName}`);
    
    // 회원가입 시도
    console.log('\n⚡ 회원가입 시도 중...');
    
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
      console.log('❌ 회원가입 실패:', signUpError.message);
      return false;
    }
    
    console.log('✅ 회원가입 요청 성공!');
    console.log(`   - 사용자 ID: ${signUpData.user?.id}`);
    console.log(`   - 이메일: ${signUpData.user?.email}`);
    
    if (signUpData.session) {
      console.log('🎉 즉시 로그인됨! (이메일 인증 비활성화됨)');
      console.log(`   - 액세스 토큰: ${signUpData.session.access_token.substring(0, 20)}...`);
      
      // 세션이 있으면 데이터베이스 저장을 바로 시도
      console.log('\n💾 데이터베이스 저장 시도...');
      
      return {
        user: signUpData.user,
        session: signUpData.session,
        immediate: true
      };
    } else {
      console.log('📧 이메일 인증이 필요함 (이메일 발송이 제한되어 문제 발생 예상)');
      
      return {
        user: signUpData.user,
        session: null,
        immediate: false,
        needsVerification: true
      };
    }
    
  } catch (error) {
    console.error('❌ 테스트 중 오류:', error.message);
    return false;
  }
}

async function createUserProfiles(userData, sessionData) {
  console.log('👤 사용자 프로필 생성 중...');
  
  try {
    // 먼저 기본 조직이 있는지 확인
    const { data: defaultOrg, error: orgError } = await supabase
      .from('organizations_v3')
      .select('*')
      .eq('name', 'default-org')
      .maybeSingle();
    
    if (orgError || !defaultOrg) {
      console.log('⚠️  기본 조직이 없습니다. 먼저 조직을 생성해야 합니다.');
      return false;
    }
    
    console.log(`✅ 기본 조직 확인: ${defaultOrg.display_name}`);
    
    // unified_identities 생성 시도
    const identityData = {
      email: userData.email,
      full_name: userData.user_metadata?.name || '사용자',
      auth_user_id: userData.id,
      is_active: true
    };
    
    const { data: identity, error: identityError } = await supabase
      .from('unified_identities')
      .insert(identityData)
      .select()
      .single();
    
    if (identityError) {
      console.log('❌ unified_identities 생성 실패:', identityError.message);
      
      if (identityError.message.includes('row-level security')) {
        console.log('💡 RLS 정책으로 인한 차단. Service Role Key 필요');
      }
      
      return false;
    }
    
    console.log('✅ unified_identities 생성 성공!');
    console.log(`   - ID: ${identity.id}`);
    
    // role_assignments 생성
    const roleData = {
      identity_id: identity.id,
      organization_id: defaultOrg.id,
      role: 'WORKER',
      is_active: true,
      employee_code: `EMP${Date.now()}`,
      department: '개발팀',
      position: '사원'
    };
    
    const { data: role, error: roleError } = await supabase
      .from('role_assignments')
      .insert(roleData)
      .select()
      .single();
    
    if (roleError) {
      console.log('⚠️  role_assignments 생성 실패:', roleError.message);
    } else {
      console.log('✅ role_assignments 생성 성공!');
      console.log(`   - 역할: ${role.role}`);
      console.log(`   - 사번: ${role.employee_code}`);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 프로필 생성 중 오류:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 이메일 인증 비활성화 테스트');
  console.log('==============================\n');
  
  console.log('📧 Supabase 이메일 반송 문제 해결책:');
  console.log('1. 개발 환경에서는 이메일 인증 비활성화');
  console.log('2. 회원가입 즉시 로그인 가능하도록 구현');
  console.log('3. 프로덕션에서는 별도 SMTP 설정\n');
  
  const result = await testImmediateSignup();
  
  if (result && result.immediate) {
    console.log('\n✅ 즉시 로그인 성공! 이제 프로필 생성을 시도합니다.');
    
    const profileSuccess = await createUserProfiles(result.user, result.session);
    
    if (profileSuccess) {
      console.log('\n🎉 완전한 회원가입 플로우 성공!');
      console.log('   ✅ Supabase Auth 계정 생성');
      console.log('   ✅ 즉시 로그인 (세션 생성)');
      console.log('   ✅ unified_identities 생성');
      console.log('   ✅ role_assignments 생성');
      
      console.log('\n📝 AuthContext 수정이 필요합니다:');
      console.log('- signUp 함수에서 프로필 자동 생성 로직 추가');
      console.log('- Service Role Key 또는 RLS 정책 수정 필요');
      
    } else {
      console.log('\n⚠️  계정 생성은 성공했지만 프로필 생성에 실패했습니다.');
      console.log('RLS 정책 또는 권한 문제를 해결해야 합니다.');
    }
    
  } else if (result && !result.immediate) {
    console.log('\n⚠️  이메일 인증이 여전히 활성화되어 있습니다.');
    console.log('Supabase Dashboard에서 "Enable email confirmations"를 비활성화해주세요.');
    
  } else {
    console.log('\n❌ 회원가입 테스트에 실패했습니다.');
  }
  
  console.log('\n🔗 Supabase Dashboard 접속:');
  console.log(`   ${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/project/_/auth/settings`);
}

main().catch(console.error);