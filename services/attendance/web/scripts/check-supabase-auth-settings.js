#!/usr/bin/env node

/**
 * Supabase Authentication 설정 확인 및 수정 스크립트
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

async function checkAuthSettings() {
  console.log('🔍 Supabase Authentication 설정 확인...\n');
  
  try {
    // 1. 현재 인증 설정 확인
    console.log('📋 현재 상황 분석:');
    console.log('   - 회원가입 요청: ✅ 성공 (사용자 ID 생성됨)');
    console.log('   - 사용자 ID: 9eb935db-9530-4bcb-ac75-1e2f3f402bd0');
    console.log('   - 이메일 인증: ❌ 대기 중 (archt723@gmail.com)');
    console.log('   - unified_identities: ❌ 레코드 없음 (인증 대기로 인함)');
    
    // 2. 개발 환경을 위한 솔루션 제안
    console.log('\n💡 개발 환경 해결 방법:');
    console.log('');
    console.log('🎯 방법 1: 이메일 인증 비활성화 (개발용)');
    console.log('   1. Supabase Dashboard 접속');
    console.log('   2. Authentication > Settings');
    console.log('   3. "Enable email confirmations" 비활성화');
    console.log('   4. 새로운 계정으로 다시 테스트');
    
    console.log('\n🎯 방법 2: 수동으로 이메일 확인 처리');
    console.log('   1. archt723@gmail.com 이메일함 확인');
    console.log('   2. Supabase 인증 이메일 링크 클릭');
    console.log('   3. 인증 완료 후 자동으로 unified_identities 생성됨');
    
    console.log('\n🎯 방법 3: Service Role Key로 강제 인증 (개발용)');
    console.log('   - Service Role Key가 필요함');
    console.log('   - 보안상 프로덕션에서는 사용하지 말 것');
    
    // 3. 테스트 가능한 방법 실행
    console.log('\n🧪 테스트 방법: 인증 없이 즉시 가입');
    console.log('');
    console.log('다음 명령으로 이메일 인증 없이 즉시 가입되는 테스트용 계정 생성:');
    console.log('');
    console.log('임시 이메일로 테스트:');
    
    const tempEmail = `test${Date.now()}@example.com`;
    console.log(`📧 임시 테스트 이메일: ${tempEmail}`);
    
    console.log('\n회원가입 시도 중...');
    
    const { data: tempSignUp, error: tempError } = await supabase.auth.signUp({
      email: tempEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          name: '임시테스트사용자'
        }
      }
    });
    
    if (tempError) {
      console.log('❌ 임시 계정 생성 실패:', tempError.message);
    } else {
      console.log('✅ 임시 계정 생성 성공!');
      console.log(`   - 사용자 ID: ${tempSignUp.user?.id}`);
      console.log(`   - 세션 있음: ${tempSignUp.session ? 'Yes (즉시 로그인됨)' : 'No (이메일 인증 필요)'}`);
      
      if (tempSignUp.session) {
        console.log('🎉 즉시 로그인됨! 이메일 인증이 비활성화되어 있습니다.');
        
        // unified_identities 확인해보기
        setTimeout(async () => {
          console.log('\n📊 unified_identities 자동 생성 확인 중...');
          
          const { data: tempIdentity } = await supabase
            .from('unified_identities')
            .select('*')
            .eq('email', tempEmail)
            .single();
          
          if (tempIdentity) {
            console.log('✅ unified_identities 자동 생성 성공!');
            console.log('   → 시스템이 정상 작동 중입니다.');
            console.log('   → archt723@gmail.com도 이메일 인증만 하면 자동 생성됩니다.');
          } else {
            console.log('❌ unified_identities 생성되지 않음');
            console.log('   → 데이터베이스 트리거 문제 가능성');
          }
        }, 2000);
      } else {
        console.log('📧 이메일 인증이 활성화되어 있습니다.');
        console.log('   → archt723@gmail.com도 이메일 인증을 완료해야 합니다.');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 설정 확인 중 오류:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Supabase Authentication 설정 확인');
  console.log('====================================\n');
  
  const success = await checkAuthSettings();
  
  if (success) {
    console.log('\n✅ 설정 확인 완료!');
    console.log('\n📝 다음 단계:');
    console.log('1. 위의 해결 방법 중 하나 선택');
    console.log('2. archt723@gmail.com 이메일 인증 완료');
    console.log('3. 또는 Supabase Dashboard에서 이메일 인증 비활성화');
  }
}

main().catch(console.error);