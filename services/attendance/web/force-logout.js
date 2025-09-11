#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔨 강제 로그아웃 및 세션 정리');

const supabase = createClient(supabaseUrl, supabaseKey);

async function forceLogout() {
  try {
    console.log('\n🔐 1. 모든 세션 확인 및 제거...');
    
    // 여러 번 로그아웃 시도
    for (let i = 0; i < 3; i++) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        console.log(`🔄 ${i + 1}차 시도: 세션 발견 (${session.user.email}), 로그아웃 실행...`);
        
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.log(`❌ ${i + 1}차 로그아웃 실패:`, error.message);
        } else {
          console.log(`✅ ${i + 1}차 로그아웃 성공`);
        }
        
        // 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.log(`ℹ️ ${i + 1}차 확인: 세션 없음`);
        break;
      }
    }

    // 전역 로그아웃 시도 (모든 세션 제거)
    console.log('\n🌐 2. 전역 로그아웃 시도...');
    const { error: globalSignOutError } = await supabase.auth.signOut({ 
      scope: 'global' 
    });
    
    if (globalSignOutError) {
      console.log('⚠️ 전역 로그아웃 실패:', globalSignOutError.message);
    } else {
      console.log('✅ 전역 로그아웃 성공');
    }

    // 최종 상태 확인
    console.log('\n🔍 3. 최종 세션 상태 확인...');
    const { data: { session: finalSession } } = await supabase.auth.getSession();
    
    if (finalSession) {
      console.log('❌ 세션이 여전히 남아있습니다!');
      console.log('세션 정보:', {
        user_id: finalSession.user.id,
        email: finalSession.user.email,
        expires_at: finalSession.expires_at
      });
    } else {
      console.log('✅ 모든 세션이 정리되었습니다!');
    }

    console.log('\n🧹 4. 추가 정리 방법:');
    console.log('브라우저에서 다음을 실행하세요:');
    console.log('1. localStorage.clear()');
    console.log('2. sessionStorage.clear()');
    console.log('3. 쿠키 삭제 (개발자도구 → Application → Cookies)');
    console.log('4. 페이지 새로고침');

  } catch (error) {
    console.error('💥 예상치 못한 오류:', error);
  }
}

forceLogout();