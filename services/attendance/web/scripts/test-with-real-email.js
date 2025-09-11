#!/usr/bin/env node

/**
 * 실제 도메인 이메일로 회원가입 테스트
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

async function testWithRealEmail() {
  console.log('🚀 실제 도메인 이메일로 회원가입 테스트...\n');

  // 실제 Gmail 주소 사용 (테스트용)
  const testEmail = `testuser${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  const testName = '테스트 사용자';

  console.log(`📧 테스트 계정: ${testEmail}`);
  console.log(`🔐 비밀번호: ${testPassword}`);
  console.log(`👤 이름: ${testName}\n`);

  try {
    console.log('📊 현재 데이터베이스 상태 확인...');
    
    const { data: identitiesCount } = await supabase
      .from('unified_identities')
      .select('count', { count: 'exact', head: true });

    console.log(`   - unified_identities: ${identitiesCount?.count || 0}개\n`);

    console.log('✏️  실제 Gmail 주소로 회원가입 시도...');
    
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
      
      if (signUpError.message.includes('invalid')) {
        console.log('\n🔧 Supabase Authentication 설정이 필요합니다:');
        console.log('1. Supabase Dashboard > Authentication > Settings');
        console.log('2. "Enable email confirmations" 설정');
        console.log('3. "Enable third-party providers" 설정');
        console.log('4. Email provider 설정 확인');
      }
      
      return false;
    }

    console.log('✅ 회원가입 요청 성공!');
    console.log(`   - 사용자 ID: ${signUpData.user?.id}`);
    console.log(`   - 이메일: ${signUpData.user?.email}`);
    
    if (!signUpData.session) {
      console.log('📧 이메일 인증이 활성화되어 있습니다.');
      console.log('   - 이메일 확인 후 로그인 가능');
    } else {
      console.log('🎉 즉시 로그인됨');
    }

    return true;

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error.message);
    return false;
  }
}

async function checkSupabaseConfig() {
  console.log('🔍 Supabase 설정 확인...\n');
  
  try {
    // 기본적인 접근 테스트
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('⚠️  Supabase 연결에 문제가 있을 수 있습니다:', error.message);
    } else {
      console.log('✅ Supabase 연결 정상');
    }

    // 테이블 접근 테스트
    const { data: testQuery, error: tableError } = await supabase
      .from('unified_identities')
      .select('count', { count: 'exact', head: true });
    
    if (tableError) {
      console.log('⚠️  unified_identities 테이블 접근 실패:', tableError.message);
      console.log('   - scripts/complete-signup-setup.sql을 실행해야 할 수 있습니다');
    } else {
      console.log('✅ 데이터베이스 테이블 접근 정상');
    }

  } catch (error) {
    console.error('❌ 설정 확인 중 오류:', error.message);
  }
  
  console.log();
}

async function main() {
  console.log('🧪 실제 도메인 이메일 회원가입 테스트');
  console.log('======================================\n');
  
  await checkSupabaseConfig();
  
  const success = await testWithRealEmail();
  
  if (success) {
    console.log('\n✅ 회원가입이 성공적으로 처리되었습니다!');
  } else {
    console.log('\n❌ 회원가입이 실패했습니다.');
    console.log('\n📋 체크리스트:');
    console.log('□ Supabase Dashboard > Authentication > Settings에서 설정 확인');
    console.log('□ scripts/complete-signup-setup.sql 실행');
    console.log('□ 환경 변수 (.env.local) 확인');
    console.log('□ Email provider 설정 확인');
  }
}

main().catch(console.error);