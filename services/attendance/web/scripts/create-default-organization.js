#!/usr/bin/env node

/**
 * 기본 조직(default-org) 생성
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

async function createDefaultOrganization() {
  console.log('🏢 기본 조직 생성 중...\n');
  
  try {
    // 1. 기존 조직 확인
    console.log('🔍 기존 조직 확인 중...');
    
    const { data: existingOrg, error: checkError } = await supabase
      .from('organizations_v3')
      .select('*')
      .eq('name', 'default-org')
      .maybeSingle();
    
    if (checkError) {
      console.log('⚠️  조직 확인 중 오류:', checkError.message);
    }
    
    if (existingOrg) {
      console.log('✅ 기본 조직이 이미 존재합니다.');
      console.log(`   - ID: ${existingOrg.id}`);
      console.log(`   - 이름: ${existingOrg.display_name}`);
      return existingOrg;
    }
    
    // 2. 기본 조직 생성 시도
    console.log('📝 기본 조직 생성 시도...');
    
    const organizationData = {
      name: 'default-org',
      display_name: 'DOT 기본 조직',
      description: 'DOT 출석 관리 시스템 기본 조직',
      is_active: true,
      settings: {
        timezone: 'Asia/Seoul',
        work_hours: {
          start: '09:00',
          end: '18:00'
        },
        features: {
          qr_enabled: true,
          gps_enabled: true,
          biometric_enabled: true,
          offline_enabled: true
        }
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: newOrg, error: createError } = await supabase
      .from('organizations_v3')
      .insert(organizationData)
      .select()
      .single();
    
    if (createError) {
      console.log('❌ 조직 생성 실패:', createError.message);
      
      if (createError.message.includes('row-level security')) {
        console.log('\n💡 RLS 정책으로 인해 직접 생성이 차단되었습니다.');
        console.log('🔧 다음 중 하나의 방법을 시도해보세요:');
        console.log('1. Supabase Dashboard에서 직접 생성');
        console.log('2. Service Role Key를 사용한 생성');
        console.log('3. RLS 정책 임시 비활성화 후 생성');
        
        return null;
      }
      
      return null;
    }
    
    console.log('✅ 기본 조직 생성 성공!');
    console.log(`   - ID: ${newOrg.id}`);
    console.log(`   - 이름: ${newOrg.display_name}`);
    console.log(`   - 설명: ${newOrg.description}`);
    
    return newOrg;
    
  } catch (error) {
    console.error('❌ 기본 조직 생성 중 오류:', error.message);
    return null;
  }
}

async function createManualOrganization() {
  console.log('\n🔧 수동 조직 생성 방법 안내');
  console.log('==========================\n');
  
  console.log('📋 다음 SQL을 Supabase SQL Editor에서 실행하세요:');
  console.log('');
  console.log('```sql');
  console.log(`INSERT INTO organizations_v3 (
    name,
    display_name,
    description,
    is_active,
    settings,
    created_at,
    updated_at
  ) VALUES (
    'default-org',
    'DOT 기본 조직',
    'DOT 출석 관리 시스템 기본 조직',
    true,
    '{
      "timezone": "Asia/Seoul",
      "work_hours": {
        "start": "09:00",
        "end": "18:00"
      },
      "features": {
        "qr_enabled": true,
        "gps_enabled": true,
        "biometric_enabled": true,
        "offline_enabled": true
      }
    }'::jsonb,
    NOW(),
    NOW()
  );`);
  console.log('```');
  console.log('');
  
  console.log('🔗 Supabase Dashboard 접속:');
  console.log(`   ${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('/rest/v1', '')}/project/_/sql`);
}

async function main() {
  console.log('🏢 기본 조직 생성 도구');
  console.log('====================\n');
  
  const organization = await createDefaultOrganization();
  
  if (!organization) {
    await createManualOrganization();
    console.log('\n❌ 자동 생성에 실패했습니다.');
    console.log('위의 SQL을 수동으로 실행한 후 다시 시도해주세요.');
  } else {
    console.log('\n🎉 기본 조직 생성이 완료되었습니다!');
    console.log('이제 회원가입 시스템이 정상적으로 작동할 수 있습니다.');
  }
}

main().catch(console.error);