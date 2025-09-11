#!/usr/bin/env node

/**
 * 특정 이메일로 회원가입 테스트
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

async function testSpecificEmail() {
  console.log('🚀 archt723@gmail.com으로 회원가입 테스트...\n');

  const testEmail = 'archt723@gmail.com';
  const testPassword = 'TestPassword123!';
  const testName = '아키텍트723';

  console.log(`📧 테스트 계정: ${testEmail}`);
  console.log(`🔐 비밀번호: ${testPassword}`);
  console.log(`👤 이름: ${testName}\n`);

  try {
    // 1. 기존 계정 확인
    console.log('🔍 1단계: 기존 계정 확인...');
    
    const { data: existingIdentity } = await supabase
      .from('unified_identities')
      .select('*')
      .eq('email', testEmail)
      .single();

    if (existingIdentity) {
      console.log('⚠️  이미 등록된 이메일입니다.');
      console.log(`   - 기존 사용자 ID: ${existingIdentity.id}`);
      console.log(`   - 등록일: ${new Date(existingIdentity.created_at).toLocaleString()}`);
      
      // 기존 계정으로 로그인 테스트
      console.log('\n🔐 기존 계정으로 로그인 테스트...');
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (loginError) {
        console.log('❌ 기존 계정 로그인 실패:', loginError.message);
        
        if (loginError.message.includes('Invalid login credentials')) {
          console.log('💡 비밀번호가 다를 수 있습니다. 새로운 비밀번호로 재설정이 필요할 수 있습니다.');
        }
      } else {
        console.log('✅ 기존 계정 로그인 성공!');
        console.log(`   - 사용자 ID: ${loginData.user?.id}`);
        
        // 로그아웃
        await supabase.auth.signOut();
      }
      
      return true;
    }

    // 2. 새로운 계정으로 회원가입
    console.log('✏️  새로운 계정으로 회원가입 시도...');
    
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
      return false;
    }

    console.log('✅ 회원가입 요청 성공!');
    console.log(`   - 사용자 ID: ${signUpData.user?.id}`);
    console.log(`   - 이메일: ${signUpData.user?.email}`);
    
    if (!signUpData.session) {
      console.log('📧 이메일 인증이 필요합니다.');
      console.log(`   - ${testEmail}로 인증 이메일이 발송되었습니다.`);
      console.log('   - 이메일 확인 후 로그인해주세요.');
    } else {
      console.log('🎉 즉시 로그인됨!');
      
      // 생성된 데이터 확인
      console.log('\n📊 자동 생성된 데이터 확인...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { data: identity } = await supabase
        .from('unified_identities')
        .select(`
          *,
          role_assignments(
            *,
            organizations_v3(name, display_name)
          )
        `)
        .eq('auth_user_id', signUpData.user.id)
        .single();

      if (identity) {
        console.log('✅ unified_identities 데이터:');
        console.log(`   - ID: ${identity.id}`);
        console.log(`   - 이메일: ${identity.email}`);
        console.log(`   - 이름: ${identity.full_name}`);
        console.log(`   - 역할 수: ${identity.role_assignments?.length || 0}개`);
        
        if (identity.role_assignments && identity.role_assignments.length > 0) {
          identity.role_assignments.forEach((role, index) => {
            console.log(`   [역할 ${index + 1}] ${role.role} @ ${role.organizations_v3?.display_name || role.organizations_v3?.name}`);
          });
        }
      }
    }

    console.log('\n🎉 테스트 완료!');
    return true;

  } catch (error) {
    console.error('❌ 테스트 중 오류:', error.message);
    return false;
  }
}

async function main() {
  console.log('🧪 archt723@gmail.com 회원가입/로그인 테스트');
  console.log('==========================================\n');
  
  const success = await testSpecificEmail();
  
  if (success) {
    console.log('\n✅ 테스트가 성공적으로 완료되었습니다!');
    console.log('\n📝 다음 단계:');
    console.log('1. 웹 브라우저에서 http://localhost:3002/signup 접속');
    console.log(`2. ${testEmail}로 실제 회원가입 테스트`);
    console.log('3. 이메일 인증 완료 후 로그인 테스트');
  } else {
    console.log('\n❌ 테스트가 실패했습니다.');
  }
}

main().catch(console.error);