#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 기존 Supabase 테이블 구조 확인');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  // 일반적으로 사용되는 테이블 이름들 시도
  const possibleTables = [
    'users', 'profiles', 'employees', 'user_profiles',
    'organizations', 'organizations_v3', 'companies',
    'roles', 'user_roles', 'role_assignments',
    'attendance', 'attendance_records', 'check_ins',
    'auth_users', 'public_users'
  ];

  console.log('\n📋 테이블 존재 여부 확인:');
  
  const existingTables = [];
  
  for (const table of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (!error) {
        console.log(`✅ ${table}: 존재함 (${data?.length || 0}개 샘플 레코드)`);
        existingTables.push(table);
        
        // 첫 번째 레코드가 있으면 구조 확인
        if (data && data.length > 0) {
          console.log(`   📝 컬럼: ${Object.keys(data[0]).join(', ')}`);
        }
      }
    } catch (err) {
      // 에러는 무시 (테이블이 없는 경우)
    }
  }

  console.log(`\n📊 총 ${existingTables.length}개 테이블 발견: ${existingTables.join(', ')}`);

  // 가장 적합한 테이블 찾기
  if (existingTables.includes('profiles')) {
    console.log('\n🎯 추천: profiles 테이블 사용');
    await analyzeTable('profiles');
  } else if (existingTables.includes('users')) {
    console.log('\n🎯 추천: users 테이블 사용');
    await analyzeTable('users');
  } else {
    console.log('\n⚠️  적합한 사용자 테이블을 찾을 수 없습니다');
    console.log('💡 Supabase 대시보드에서 테이블을 생성해야 할 것 같습니다');
  }
}

async function analyzeTable(tableName) {
  try {
    console.log(`\n🔬 ${tableName} 테이블 분석:`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);
    
    if (error) {
      console.log(`❌ 분석 실패: ${error.message}`);
      return;
    }

    console.log(`📊 레코드 수: ${data?.length || 0}`);
    
    if (data && data.length > 0) {
      console.log('📋 컬럼 구조:');
      const sample = data[0];
      Object.entries(sample).forEach(([key, value]) => {
        const type = typeof value;
        const preview = value ? String(value).substring(0, 30) : 'null';
        console.log(`   ${key}: ${type} (예: ${preview})`);
      });
    }

    // 테스트 사용자 생성 제안
    console.log('\n💡 테스트 사용자 생성 방법:');
    if (tableName === 'profiles') {
      console.log(`
await supabase.from('profiles').insert({
  email: 'admin@dottest.com',
  full_name: '테스트 관리자',
  role: 'admin'
});`);
    } else {
      console.log(`
await supabase.from('${tableName}').insert({
  email: 'admin@dottest.com',
  name: '테스트 관리자'
});`);
    }

  } catch (error) {
    console.error(`💥 ${tableName} 분석 중 오류:`, error);
  }
}

checkTables();