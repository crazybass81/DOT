#!/usr/bin/env node

/**
 * 🚀 Supabase 테스트 사용자 자동 설정 스크립트
 * 
 * 이 스크립트는:
 * 1. Supabase에 사용자 계정 생성 (archt723@gmail.com)
 * 2. employees 테이블에 MASTER_ADMIN 권한으로 등록
 * 3. 모든 권한 자동 부여
 * 4. 로그인 테스트까지 한번에 실행
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// 색상 코드
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Supabase 설정 (환경변수에서 읽기)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

// 테스트 계정 정보
const TEST_USER = {
  email: 'archt723@gmail.com',
  password: 'Master123!@#',
  name: 'Master Administrator',
  phone: '010-0000-0000'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

async function setupTestUser() {
  log('\n═══════════════════════════════════════════', 'cyan');
  log('   🚀 Supabase 테스트 사용자 설정 시작', 'bright');
  log('═══════════════════════════════════════════\n', 'cyan');

  // Supabase 연결 확인
  if (SUPABASE_URL.includes('your-project') || SUPABASE_ANON_KEY === 'your-anon-key') {
    log('⚠️  Supabase 설정이 필요합니다!', 'yellow');
    log('다음 정보를 입력해주세요:\n', 'yellow');
    
    const url = await question('Supabase URL (https://xxx.supabase.co): ');
    const anonKey = await question('Supabase Anon Key: ');
    const serviceKey = await question('Supabase Service Role Key (선택사항, Enter로 건너뛰기): ');
    
    if (!url || !anonKey) {
      log('\n❌ Supabase 정보가 필요합니다!', 'red');
      process.exit(1);
    }
    
    // 환경변수 파일 생성 제안
    log('\n💡 .env.local 파일에 다음 내용을 추가하세요:', 'green');
    console.log(`
NEXT_PUBLIC_SUPABASE_URL=${url}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
${serviceKey ? `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}` : '# SUPABASE_SERVICE_ROLE_KEY=your-service-key'}
    `);
    
    // 임시로 사용
    SUPABASE_URL = url;
    SUPABASE_ANON_KEY = anonKey;
    if (serviceKey) SUPABASE_SERVICE_KEY = serviceKey;
  }

  // Supabase 클라이언트 생성
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const supabaseAdmin = SUPABASE_SERVICE_KEY !== 'your-service-key' 
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : supabase;

  try {
    // 1단계: 사용자 계정 생성
    log('\n📝 1단계: Supabase Auth에 사용자 생성 중...', 'cyan');
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
      options: {
        data: {
          name: TEST_USER.name,
          phone: TEST_USER.phone,
          role: 'MASTER_ADMIN'
        }
      }
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        log('   ℹ️  사용자가 이미 존재합니다. 로그인을 시도합니다...', 'yellow');
      } else {
        throw signUpError;
      }
    } else {
      log('   ✅ 사용자 계정 생성 완료!', 'green');
      log(`   📧 Email: ${TEST_USER.email}`, 'green');
      log(`   🔑 Password: ${TEST_USER.password}`, 'green');
    }

    // 2단계: 로그인 테스트
    log('\n🔐 2단계: 로그인 테스트 중...', 'cyan');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });

    if (signInError) {
      throw signInError;
    }

    log('   ✅ 로그인 성공!', 'green');
    const userId = signInData.user.id;
    log(`   🆔 User ID: ${userId}`, 'green');

    // 3단계: employees 테이블에 데이터 추가
    log('\n👤 3단계: employees 테이블에 MASTER_ADMIN으로 등록 중...', 'cyan');
    
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .upsert({
        id: userId,
        email: TEST_USER.email,
        name: TEST_USER.name,
        phone: TEST_USER.phone,
        role: 'MASTER_ADMIN',
        is_active: true,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select()
      .single();

    if (employeeError) {
      log(`   ⚠️  employees 테이블 업데이트 실패: ${employeeError.message}`, 'yellow');
      log('   ℹ️  수동으로 SQL을 실행해야 할 수 있습니다.', 'yellow');
    } else {
      log('   ✅ MASTER_ADMIN 권한 부여 완료!', 'green');
    }

    // 4단계: 모든 권한 부여 (master_admin_permissions가 있는 경우)
    log('\n🎯 4단계: 모든 시스템 권한 부여 중...', 'cyan');
    
    try {
      // 모든 권한 가져오기
      const { data: permissions, error: permError } = await supabaseAdmin
        .from('master_admin_permissions')
        .select('id')
        .eq('is_active', true);

      if (!permError && permissions && permissions.length > 0) {
        // 권한 부여
        const permissionGrants = permissions.map(perm => ({
          employee_id: userId,
          permission_id: perm.id,
          is_active: true,
          approval_status: 'approved',
          notes: 'Auto-granted to Master Administrator'
        }));

        const { error: grantError } = await supabaseAdmin
          .from('employee_permissions')
          .upsert(permissionGrants, {
            onConflict: 'employee_id,permission_id'
          });

        if (!grantError) {
          log(`   ✅ ${permissions.length}개의 권한 부여 완료!`, 'green');
        }
      }
    } catch (e) {
      log('   ℹ️  권한 시스템이 설정되지 않았을 수 있습니다.', 'yellow');
    }

    // 5단계: 테스트 결과 요약
    log('\n═══════════════════════════════════════════', 'magenta');
    log('   🎉 설정 완료! 테스트 계정 정보', 'bright');
    log('═══════════════════════════════════════════', 'magenta');
    
    console.log(`
${colors.cyan}📧 이메일:${colors.reset} ${colors.bright}${TEST_USER.email}${colors.reset}
${colors.cyan}🔑 비밀번호:${colors.reset} ${colors.bright}${TEST_USER.password}${colors.reset}
${colors.cyan}👤 이름:${colors.reset} ${TEST_USER.name}
${colors.cyan}🎖️ 권한:${colors.reset} ${colors.bright}MASTER_ADMIN${colors.reset}

${colors.green}✅ 사용 가능한 기능:${colors.reset}
   • 모든 직원 기능 사용 가능
   • 매니저 승인 기능 사용 가능
   • 관리자 대시보드 접근 가능
   • 시스템 전체 설정 가능

${colors.yellow}🌐 로그인 페이지:${colors.reset}
   • 일반: http://localhost:3002/login
   • 마스터: http://localhost:3002/master-admin/login

${colors.cyan}💡 팁:${colors.reset} 이제 하드코딩 없이 실제 Supabase 인증으로 로그인 가능합니다!
    `);

    // 6단계: 하드코딩 제거 제안
    log('📌 다음 단계:', 'yellow');
    log('   1. 로그인 페이지에서 하드코딩된 코드 제거', 'yellow');
    log('   2. Supabase 인증만 사용하도록 수정', 'yellow');
    log('   3. npm run dev로 테스트', 'yellow');

  } catch (error) {
    log(`\n❌ 오류 발생: ${error.message}`, 'red');
    
    if (error.message.includes('Invalid API key')) {
      log('\n💡 해결 방법:', 'yellow');
      log('   1. Supabase 대시보드에서 API 키 확인', 'yellow');
      log('   2. .env.local 파일에 올바른 키 입력', 'yellow');
      log('   3. 다시 실행', 'yellow');
    }
  } finally {
    rl.close();
  }
}

// 스크립트 실행
setupTestUser().catch(console.error);