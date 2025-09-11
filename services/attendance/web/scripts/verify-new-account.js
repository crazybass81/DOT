#!/usr/bin/env node

/**
 * 새로 생성한 계정(archt723+숫자@gmail.com) 확인
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

async function verifyNewAccount() {
  console.log('🔍 새로 생성한 계정 확인...\n');
  
  try {
    // 최근 생성된 계정들 확인 (archt723+로 시작하는 이메일)
    const { data: identities, error: identitiesError } = await supabase
      .from('unified_identities')
      .select('*')
      .ilike('email', 'archt723+%@gmail.com')
      .order('created_at', { ascending: false });
    
    if (identitiesError) {
      console.log('⚠️  unified_identities 조회 오류:', identitiesError.message);
      return false;
    }

    if (!identities || identities.length === 0) {
      console.log('❌ archt723+*@gmail.com 형태의 계정이 없습니다.');
      console.log('');
      console.log('💡 확인사항:');
      console.log('1. 컨펌메일 링크를 클릭했는지 확인');
      console.log('2. 인증이 성공적으로 완료되었는지 확인');
      console.log('3. 데이터베이스 트리거가 작동했는지 확인');
      return false;
    }

    console.log(`✅ 발견된 계정 수: ${identities.length}개\n`);
    
    for (let i = 0; i < identities.length; i++) {
      const identity = identities[i];
      console.log(`📧 계정 ${i + 1}: ${identity.email}`);
      console.log(`   - ID: ${identity.id}`);
      console.log(`   - 이름: ${identity.full_name}`);
      console.log(`   - Auth User ID: ${identity.auth_user_id}`);
      console.log(`   - 생성일: ${new Date(identity.created_at).toLocaleString()}`);
      console.log(`   - 활성 상태: ${identity.is_active ? '활성' : '비활성'}`);

      // 역할 할당 확인
      const { data: roles, error: rolesError } = await supabase
        .from('role_assignments')
        .select(`
          *,
          organizations_v3(name, display_name)
        `)
        .eq('identity_id', identity.id);

      if (rolesError) {
        console.log(`   ⚠️  역할 조회 오류: ${rolesError.message}`);
      } else if (!roles || roles.length === 0) {
        console.log(`   📋 역할 할당: 없음`);
      } else {
        console.log(`   📋 역할 할당: ${roles.length}개`);
        roles.forEach((role, roleIndex) => {
          console.log(`     [${roleIndex + 1}] ${role.role} @ ${role.organizations_v3?.display_name || role.organizations_v3?.name || '조직 정보 없음'}`);
        });
      }
      
      console.log('');
    }

    // 로그인 테스트 (가장 최근 계정으로)
    const latestAccount = identities[0];
    console.log(`🔐 로그인 테스트: ${latestAccount.email}`);
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: latestAccount.email,
      password: 'TestPassword123!'
    });

    if (loginError) {
      console.log('❌ 로그인 실패:', loginError.message);
    } else {
      console.log('✅ 로그인 성공!');
      console.log(`   - 사용자 ID: ${loginData.user?.id}`);
      console.log(`   - 이메일 인증 상태: ${loginData.user?.email_confirmed_at ? '인증됨' : '미인증'}`);
      
      // 로그아웃
      await supabase.auth.signOut();
    }

    return true;
    
  } catch (error) {
    console.error('❌ 계정 확인 중 오류:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 새로 생성한 계정 확인');
  console.log('========================\n');
  
  const success = await verifyNewAccount();
  
  if (success) {
    console.log('\n🎉 계정 확인이 완료되었습니다!');
  } else {
    console.log('\n❌ 계정을 찾을 수 없습니다.');
    console.log('\n📋 다음 단계:');
    console.log('1. 컨펌메일을 받았는지 확인 (스팸함 포함)');
    console.log('2. 컨펌메일 링크를 클릭했는지 확인');
    console.log('3. /auth/success 페이지가 나타났는지 확인');
    console.log('4. 데이터베이스 트리거 작동 상태 확인');
  }
}

main().catch(console.error);