#!/usr/bin/env node

/**
 * 데이터베이스 설정 및 트리거 상태 확인
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

async function checkDatabaseSetup() {
  console.log('🔍 데이터베이스 설정 및 트리거 상태 확인...\n');
  
  try {
    // 1. 테이블 존재 여부 확인
    console.log('📊 1단계: 필수 테이블 존재 여부 확인...');
    
    const tables = ['unified_identities', 'profiles', 'organizations_v3', 'role_assignments'];
    
    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ ${tableName}: 테이블 없음 또는 접근 불가 (${error.message})`);
        } else {
          console.log(`   ✅ ${tableName}: 존재 (${data?.count || 0}개 레코드)`);
        }
      } catch (err) {
        console.log(`   ❌ ${tableName}: 오류 - ${err.message}`);
      }
    }
    
    // 2. 기본 조직 확인
    console.log('\n🏢 2단계: 기본 조직 확인...');
    
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations_v3')
      .select('*')
      .eq('name', 'default-org')
      .single();
    
    if (orgsError) {
      console.log('   ❌ 기본 조직(default-org)이 없습니다.');
      console.log('   💡 기본 조직을 생성해야 합니다.');
    } else {
      console.log(`   ✅ 기본 조직 존재: ${orgs.display_name} (ID: ${orgs.id})`);
    }
    
    // 3. 이메일 인증 설정 테스트
    console.log('\n📧 3단계: 이메일 인증 시스템 테스트...');
    
    // 임시 이메일로 가입 테스트
    const testEmail = `test${Date.now()}@test.local`;
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          name: '테스트사용자'
        }
      }
    });
    
    if (signUpError) {
      console.log('   ❌ 회원가입 테스트 실패:', signUpError.message);
    } else {
      console.log('   ✅ 회원가입 요청 성공');
      console.log(`   📧 사용자 ID: ${signUpData.user?.id}`);
      
      if (signUpData.session) {
        console.log('   🎉 즉시 로그인됨 (이메일 인증 비활성화됨)');
        
        // 3초 후 데이터베이스 확인
        console.log('\n   ⏳ 3초 후 데이터베이스 자동 생성 확인...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { data: identityData } = await supabase
          .from('unified_identities')
          .select('*')
          .eq('email', testEmail)
          .single();
        
        if (identityData) {
          console.log('   ✅ unified_identities 자동 생성 성공!');
          console.log('   💡 트리거가 정상 작동합니다.');
        } else {
          console.log('   ❌ unified_identities 생성 실패');
          console.log('   💡 트리거가 작동하지 않습니다.');
        }
      } else {
        console.log('   📧 이메일 인증이 활성화되어 있습니다.');
        console.log('   💡 이메일 인증 완료 후 트리거가 실행됩니다.');
      }
    }
    
    // 4. RLS 정책 확인 (간접적)
    console.log('\n🛡️  4단계: RLS 정책 테스트...');
    
    try {
      const { data: testInsert, error: insertError } = await supabase
        .from('unified_identities')
        .insert({
          email: `rls-test${Date.now()}@test.local`,
          full_name: 'RLS 테스트',
          auth_user_id: '00000000-0000-0000-0000-000000000000', // 임시 UUID
          is_active: true
        });
      
      if (insertError) {
        console.log('   ❌ RLS 정책으로 인한 직접 삽입 차단됨 (정상)');
        console.log(`   📋 오류: ${insertError.message}`);
        console.log('   💡 회원가입 시 트리거 또는 특별한 권한이 필요합니다.');
      } else {
        console.log('   ⚠️  RLS 정책이 너무 느슨할 수 있습니다.');
      }
    } catch (err) {
      console.log('   ❌ RLS 테스트 중 오류:', err.message);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 데이터베이스 확인 중 오류:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 데이터베이스 설정 및 트리거 상태 확인');
  console.log('======================================\n');
  
  const success = await checkDatabaseSetup();
  
  console.log('\n📋 === 종합 진단 결과 ===');
  
  if (success) {
    console.log('\n✅ 데이터베이스 확인 완료!');
    console.log('\n📝 다음 단계:');
    console.log('1. 트리거 작동 상태에 따라 해결책 선택');
    console.log('2. 이메일 인증 활성화/비활성화 결정');
    console.log('3. 기본 조직이 없다면 생성');
    console.log('4. AuthContext에서 회원가입 후 직접 프로필 생성 구현');
  } else {
    console.log('\n❌ 데이터베이스 확인 실패');
    console.log('Supabase 연결 또는 권한 문제가 있을 수 있습니다.');
  }
}

main().catch(console.error);