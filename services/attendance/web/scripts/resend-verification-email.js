#!/usr/bin/env node

/**
 * 인증메일 재발송 스크립트
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

async function resendVerificationEmail() {
  const targetEmail = 'archt723@gmail.com';
  
  console.log('📧 인증메일 재발송 중...\n');
  console.log(`대상 이메일: ${targetEmail}`);
  
  try {
    // Supabase에서 인증메일 재발송
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: {
        emailRedirectTo: 'http://localhost:3002/auth/callback'
      }
    });

    if (error) {
      console.error('❌ 인증메일 재발송 실패:', error.message);
      
      if (error.message.includes('email not confirmed')) {
        console.log('\n💡 해결 방법:');
        console.log('1. 이메일이 이미 인증되었을 수 있습니다');
        console.log('2. 또는 계정이 존재하지 않을 수 있습니다');
      } else if (error.message.includes('too many requests')) {
        console.log('\n⏰ 너무 많은 요청:');
        console.log('- 잠시 후 다시 시도해주세요');
        console.log('- Supabase는 인증메일 재발송에 제한이 있습니다');
      }
      
      return false;
    }

    console.log('✅ 인증메일 재발송 성공!');
    console.log(`📬 ${targetEmail}로 새로운 인증메일이 발송되었습니다.`);
    console.log('\n📋 인증 완료 방법:');
    console.log('1. 이메일함(스팸함도 확인) 확인');
    console.log('2. "Confirm your signup" 또는 "이메일 인증" 제목의 메일 찾기');
    console.log('3. 메일 안의 "Confirm email" 링크 클릭');
    console.log('4. 인증 완료 시 자동으로 로그인 페이지로 이동');
    
    return true;
    
  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error.message);
    return false;
  }
}

async function checkEmailStatus() {
  console.log('🔍 이메일 인증 상태 확인...\n');
  
  try {
    // 직접 로그인 시도해보기
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'archt723@gmail.com',
      password: 'TestPassword123!'
    });

    if (loginError) {
      if (loginError.message.includes('email not confirmed')) {
        console.log('📧 상태: 이메일 인증이 아직 완료되지 않았습니다.');
        return 'not_confirmed';
      } else if (loginError.message.includes('Invalid login credentials')) {
        console.log('🔐 상태: 계정은 존재하지만 비밀번호가 다르거나 다른 문제가 있습니다.');
        return 'invalid_credentials';
      } else {
        console.log('❌ 로그인 오류:', loginError.message);
        return 'error';
      }
    } else {
      console.log('✅ 상태: 이메일이 이미 인증되었습니다!');
      console.log(`   - 사용자 ID: ${loginData.user?.id}`);
      console.log(`   - 이메일: ${loginData.user?.email}`);
      
      // 로그아웃
      await supabase.auth.signOut();
      return 'confirmed';
    }
    
  } catch (error) {
    console.error('❌ 상태 확인 중 오류:', error.message);
    return 'error';
  }
}

async function alternativeMethod() {
  console.log('\n🔄 대안 방법: 새로운 테스트 계정 생성\n');
  
  // 다른 Gmail 주소로 테스트
  const newTestEmail = `archt723+${Date.now()}@gmail.com`;
  console.log(`📧 새로운 테스트 이메일: ${newTestEmail}`);
  console.log('   (Gmail의 + alias 기능 사용)');
  
  try {
    const { data: newSignUp, error: newSignUpError } = await supabase.auth.signUp({
      email: newTestEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          name: '아키텍트723'
        },
        emailRedirectTo: 'http://localhost:3002/auth/callback'
      }
    });

    if (newSignUpError) {
      console.log('❌ 새 계정 생성 실패:', newSignUpError.message);
      return false;
    }

    console.log('✅ 새 테스트 계정 생성 성공!');
    console.log(`   - 사용자 ID: ${newSignUp.user?.id}`);
    
    if (newSignUp.session) {
      console.log('🎉 즉시 로그인됨! (이메일 인증 비활성화됨)');
    } else {
      console.log('📧 인증메일 발송됨 - 이메일함을 확인해주세요');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ 대안 방법 실패:', error.message);
    return false;
  }
}

async function main() {
  console.log('📧 인증메일 재발송 도구');
  console.log('======================\n');
  
  // 1. 현재 상태 확인
  const status = await checkEmailStatus();
  
  if (status === 'confirmed') {
    console.log('\n✅ 이메일이 이미 인증되었습니다. 로그인을 시도해보세요!');
    return;
  }
  
  // 2. 인증메일 재발송 시도
  if (status === 'not_confirmed') {
    console.log('\n📤 인증메일 재발송 시도...');
    const resendSuccess = await resendVerificationEmail();
    
    if (resendSuccess) {
      console.log('\n⏰ 잠시 기다린 후 이메일함을 확인해주세요.');
      console.log('   - 보통 1-2분 내에 도착합니다');
      console.log('   - 스팸함도 꼭 확인해주세요');
      return;
    }
  }
  
  // 3. 대안 방법 제시
  console.log('\n🤔 인증메일이 계속 안 온다면...');
  console.log('1. Gmail + alias를 사용한 새 테스트 계정 만들기');
  console.log('2. 또는 Supabase Dashboard에서 이메일 인증 비활성화');
  
  console.log('\n새 테스트 계정을 만들어볼까요? (y/N)');
  
  // 자동으로 대안 방법 실행
  console.log('\n🚀 자동으로 새 테스트 계정 생성 중...');
  await alternativeMethod();
}

main().catch(console.error);