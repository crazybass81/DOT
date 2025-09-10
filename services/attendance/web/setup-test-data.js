#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 DOT 근태관리 시스템 - 테스트 데이터 초기화');
console.log('===============================================\n');

async function setupTestData() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    console.log('📡 Supabase 연결 성공\n');

    // 1. 테스트 조직 생성
    console.log('🏢 1. 테스트 조직 생성 중...');
    
    const testOrganization = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'DOT 테스트 카페',
      description: '근태관리 시스템 테스트용 조직',
      type: 'company',
      address: '서울특별시 강남구 테헤란로 123',
      phone: '02-1234-5678',
      email: 'test@dotcafe.com',
      settings: {
        work_start_time: '09:00',
        work_end_time: '18:00',
        break_time: 60,
        overtime_rate: 1.5
      },
      business_hours: {
        monday: { open: '09:00', close: '18:00' },
        tuesday: { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday: { open: '09:00', close: '18:00' },
        friday: { open: '09:00', close: '18:00' },
        saturday: { open: '10:00', close: '16:00' },
        sunday: { closed: true }
      },
      location: {
        latitude: 37.5665,
        longitude: 126.9780,
        radius: 100
      },
      is_active: true
    };

    const { data: orgData, error: orgError } = await supabase
      .from('organizations_v3')
      .upsert(testOrganization)
      .select()
      .single();

    if (orgError) {
      console.log(`   ❌ 조직 생성 실패: ${orgError.message}`);
    } else {
      console.log(`   ✅ 조직 생성 성공: ${orgData.name}`);
    }

    // 2. 테스트 사용자들 생성
    console.log('\n👥 2. 테스트 사용자 생성 중...');
    
    const testUsers = [
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        email: 'master@dotcafe.com',
        full_name: '김관리자',
        phone: '010-1234-5678',
        id_type: 'corporate',
        is_active: true,
        metadata: { 
          department: 'IT',
          position: '시스템 관리자',
          hire_date: '2024-01-01'
        }
      },
      {
        id: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
        email: 'admin@dotcafe.com',
        full_name: '박매니저',
        phone: '010-2345-6789',
        id_type: 'corporate',
        is_active: true,
        metadata: { 
          department: '운영',
          position: '매장 관리자',
          hire_date: '2024-02-01'
        }
      },
      {
        id: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
        email: 'employee1@dotcafe.com',
        full_name: '이직원',
        phone: '010-3456-7890',
        id_type: 'personal',
        is_active: true,
        metadata: { 
          department: '서비스',
          position: '바리스타',
          hire_date: '2024-03-01'
        }
      }
    ];

    let userCount = 0;
    for (const user of testUsers) {
      const { data: userData, error: userError } = await supabase
        .from('unified_identities')
        .upsert(user)
        .select()
        .single();

      if (userError) {
        console.log(`   ❌ 사용자 생성 실패 (${user.full_name}): ${userError.message}`);
      } else {
        console.log(`   ✅ 사용자 생성 성공: ${userData.full_name} (${userData.email})`);
        userCount++;
      }
    }

    console.log(`\n📊 테스트 데이터 생성 완료`);
    console.log(`✅ 사용자: ${userCount}명 생성`);
    
    console.log('\n🎯 테스트 계정 정보:');
    console.log('   • 마스터 관리자: master@dotcafe.com (김관리자)');
    console.log('   • 일반 관리자: admin@dotcafe.com (박매니저)');
    console.log('   • 직원1: employee1@dotcafe.com (이직원)');

  } catch (error) {
    console.error('❌ 테스트 데이터 생성 실패:', error.message);
    console.error('   상세 오류:', error);
    process.exit(1);
  }
}

// 실행
setupTestData()
  .then(() => {
    console.log('\n✨ 모든 테스트 데이터 생성이 완료되었습니다!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 예상치 못한 오류:', error);
    process.exit(1);
  });