#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧹 인증 상태 정리');

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearAuthState() {
  try {
    console.log('\n🔐 1. 현재 세션 확인...');
    
    // 현재 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (session) {
      console.log(`✅ 활성 세션 발견: ${session.user.email}`);
      console.log(`👤 사용자 ID: ${session.user.id}`);
      
      // 로그아웃
      console.log('\n🚪 2. 로그아웃 실행...');
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.log('❌ 로그아웃 실패:', signOutError.message);
      } else {
        console.log('✅ 로그아웃 성공!');
      }
    } else {
      console.log('ℹ️ 활성 세션이 없습니다.');
    }

    // 세션 재확인
    console.log('\n🔍 3. 최종 상태 확인...');
    const { data: { session: finalSession } } = await supabase.auth.getSession();
    
    if (finalSession) {
      console.log('⚠️ 세션이 여전히 남아있습니다.');
    } else {
      console.log('✅ 세션이 완전히 정리되었습니다.');
    }

    console.log('\n💡 다음 단계:');
    console.log('1. 브라우저 캐시와 로컬 스토리지 정리');
    console.log('2. http://localhost:3002 접속하여 로그인 페이지 확인');
    console.log('3. 새로운 계정으로 회원가입 테스트');

  } catch (error) {
    console.error('💥 예상치 못한 오류:', error);
  }
}

clearAuthState();