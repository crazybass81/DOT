#!/usr/bin/env node

/**
 * archt723@gmail.com 계정 생성 확인 (수정된 버전)
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

async function verifyAccountCreation() {
  const targetEmail = 'archt723@gmail.com';
  
  console.log('🔍 archt723@gmail.com 계정 생성 확인 중...\n');
  
  try {
    // 1. auth.users 테이블에서 사용자 확인 (Supabase Auth)
    console.log('📋 1단계: Supabase Auth 사용자 확인...');
    
    // auth.users는 직접 접근이 제한되므로 현재 세션으로 확인
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user?.email === targetEmail) {
      console.log('✅ 현재 세션: archt723@gmail.com 로그인 상태');
      console.log(`   - 사용자 ID: ${sessionData.session.user.id}`);
    } else {
      console.log('ℹ️  현재 세션: 다른 사용자 또는 로그아웃 상태');
    }
    
    // 2. unified_identities 테이블 확인
    console.log('\n📊 2단계: unified_identities 테이블 확인...');
    
    const { data: identities, error: identitiesError } = await supabase
      .from('unified_identities')
      .select('*')
      .eq('email', targetEmail);
    
    if (identitiesError) {
      console.log('⚠️  unified_identities 조회 오류:', identitiesError.message);
    } else if (!identities || identities.length === 0) {
      console.log('❌ unified_identities: 해당 이메일로 등록된 계정 없음');
    } else if (identities.length === 1) {
      const identity = identities[0];
      console.log('✅ unified_identities: 계정 발견 (1개)');
      console.log(`   - ID: ${identity.id}`);
      console.log(`   - 이름: ${identity.full_name}`);
      console.log(`   - Auth User ID: ${identity.auth_user_id}`);
      console.log(`   - 생성일: ${new Date(identity.created_at).toLocaleString()}`);
      console.log(`   - 활성 상태: ${identity.is_active ? '활성' : '비활성'}`);
    } else {
      console.log(`⚠️  unified_identities: 중복 계정 발견 (${identities.length}개)`);
      identities.forEach((identity, index) => {
        console.log(`   [${index + 1}] ID: ${identity.id}, Auth ID: ${identity.auth_user_id}`);
      });
    }
    
    // 3. role_assignments 테이블 확인 (계정이 존재하는 경우)
    if (identities && identities.length > 0) {
      console.log('\n🛡️  3단계: 역할 할당 확인...');
      
      for (let i = 0; i < identities.length; i++) {
        const identity = identities[i];
        
        const { data: roles, error: rolesError } = await supabase
          .from('role_assignments')
          .select(`
            *,
            organizations_v3(name, display_name)
          `)
          .eq('identity_id', identity.id);
        
        if (rolesError) {
          console.log(`   [계정 ${i + 1}] 역할 조회 오류:`, rolesError.message);
        } else if (!roles || roles.length === 0) {
          console.log(`   [계정 ${i + 1}] 역할 할당 없음`);
        } else {
          console.log(`   [계정 ${i + 1}] 역할 할당 (${roles.length}개):`);
          roles.forEach((role, roleIndex) => {
            console.log(`     [${roleIndex + 1}] ${role.role} @ ${role.organizations_v3?.display_name || role.organizations_v3?.name || '조직 정보 없음'}`);
            console.log(`         - 활성: ${role.is_active ? 'Yes' : 'No'}`);
            console.log(`         - 사번: ${role.employee_code || '없음'}`);
            console.log(`         - 부서: ${role.department || '없음'}`);
            console.log(`         - 직급: ${role.position || '없음'}`);
          });
        }
      }
    }
    
    // 4. profiles 테이블 확인 (legacy)
    console.log('\n👤 4단계: profiles 테이블 확인 (legacy)...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', targetEmail);
    
    if (profilesError) {
      console.log('⚠️  profiles 조회 오류:', profilesError.message);
    } else if (!profiles || profiles.length === 0) {
      console.log('ℹ️  profiles: 해당 이메일로 등록된 프로필 없음 (정상 - unified_identities 사용 중)');
    } else {
      console.log(`✅ profiles: 레거시 프로필 발견 (${profiles.length}개)`);
      profiles.forEach((profile, index) => {
        console.log(`   [${index + 1}] ID: ${profile.id}, 이름: ${profile.full_name}`);
      });
    }
    
    // 5. 최종 요약
    console.log('\n📋 === 최종 요약 ===');
    
    if (!identities || identities.length === 0) {
      console.log('❌ 결과: archt723@gmail.com 계정이 데이터베이스에 생성되지 않았습니다.');
      console.log('');
      console.log('💡 가능한 원인:');
      console.log('   1. 회원가입 요청이 실제로 처리되지 않았음');
      console.log('   2. 이메일 인증이 필요하며 아직 확인하지 않았음');
      console.log('   3. 데이터베이스 트리거가 제대로 작동하지 않았음');
      console.log('');
      console.log('🔧 해결 방법:');
      console.log('   1. scripts/test-specific-email.js 다시 실행');
      console.log('   2. 이메일 인증 메일 확인');
      console.log('   3. Supabase Auth Dashboard에서 사용자 상태 확인');
    } else if (identities.length === 1) {
      console.log('✅ 결과: archt723@gmail.com 계정이 성공적으로 생성되었습니다!');
      console.log(`   - 계정 ID: ${identities[0].id}`);
      console.log(`   - 생성 시간: ${new Date(identities[0].created_at).toLocaleString()}`);
      
      // 역할 할당 상태 요약
      const roleCount = identities[0].role_assignments?.length || 0;
      if (roleCount > 0) {
        console.log(`   - 역할 할당: ${roleCount}개 역할`);
      } else {
        console.log('   - 역할 할당: 없음 (추가 설정 필요할 수 있음)');
      }
    } else {
      console.log(`⚠️  결과: archt723@gmail.com으로 중복 계정이 발견되었습니다. (${identities.length}개)`);
      console.log('   - 데이터 정리가 필요할 수 있습니다.');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 계정 확인 중 오류 발생:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

async function main() {
  console.log('🧪 archt723@gmail.com 계정 생성 확인');
  console.log('=================================\n');
  
  const success = await verifyAccountCreation();
  
  if (!success) {
    console.log('\n❌ 계정 확인에 실패했습니다.');
    process.exit(1);
  }
}

main().catch(console.error);