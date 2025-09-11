#!/usr/bin/env node

/**
 * 실제 이메일 회원가입을 위한 데이터베이스 설정
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

async function setupRealSignup() {
  console.log('🚀 실제 이메일 회원가입을 위한 설정 시작...\n');

  // 1. 기본 조직 생성 시도
  console.log('📋 1단계: 기본 조직 생성...');
  try {
    // 기본 조직이 있는지 확인
    const { data: existingOrgs } = await supabase
      .from('organizations_v3')
      .select('*')
      .eq('code', 'default')
      .single();

    if (!existingOrgs) {
      // unified_identities에 시스템 admin 계정 생성 (임시)
      console.log('🔧 시스템 관리자 identity 생성...');
      const { data: systemIdentity, error: identityError } = await supabase
        .from('unified_identities')
        .insert({
          email: 'system@admin.com',
          full_name: 'System Admin',
          id_type: 'personal',
          is_verified: true,
          is_active: true
        })
        .select()
        .single();

      if (identityError) {
        console.log('⚠️  시스템 identity 생성 실패:', identityError.message);
      } else {
        console.log('✅ 시스템 identity 생성 완료');

        // 기본 조직 생성
        const { data: org, error: orgError } = await supabase
          .from('organizations_v3')
          .insert({
            code: 'default',
            name: 'Default Organization',
            display_name: 'DOT 출석 관리 시스템',
            org_type: 'business_owner',
            owner_identity_id: systemIdentity.id,
            is_active: true
          })
          .select()
          .single();

        if (orgError) {
          console.log('⚠️  기본 조직 생성 실패:', orgError.message);
        } else {
          console.log('✅ 기본 조직 생성 완료:', org.name);
        }
      }
    } else {
      console.log('✅ 기본 조직이 이미 존재함');
    }
  } catch (error) {
    console.log('⚠️  조직 설정 중 오류:', error.message);
  }

  // 2. profiles 테이블이 있는지 확인하고 없으면 생성 안내
  console.log('\n📋 2단계: 데이터베이스 테이블 확인...');
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('count', { count: 'exact', head: true });

  const { data: identities } = await supabase
    .from('unified_identities')
    .select('count', { count: 'exact', head: true });

  console.log('📊 현재 상태:');
  console.log(`   - profiles 테이블: ${profiles ? '존재함' : '없음'}`);
  console.log(`   - unified_identities 테이블: ${identities ? '존재함' : '없음'}`);

  // 3. 회원가입 트리거 생성을 위한 SQL 제공
  console.log('\n📋 3단계: 회원가입 자동 프로필 생성을 위한 SQL 설정');
  console.log('\n🔧 다음 SQL을 Supabase Dashboard > SQL Editor에서 실행하세요:\n');

  console.log(`
-- 1. profiles 테이블 생성 (없는 경우)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  role TEXT DEFAULT 'worker',
  employee_code TEXT,
  department TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RLS 정책 설정
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. 회원가입 시 자동 프로필 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'worker'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 트리거 생성
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. unified_identities 자동 생성 트리거
CREATE OR REPLACE FUNCTION handle_new_user_identity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO unified_identities (
    auth_user_id,
    email,
    full_name,
    id_type,
    is_verified,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'personal',
    true,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_identity ON auth.users;
CREATE TRIGGER on_auth_user_created_identity
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_identity();
`);

  console.log('\n✅ 설정 완료 후 실제 이메일로 회원가입이 가능합니다!');
  console.log('\n📧 Supabase Dashboard > Authentication > Settings에서:');
  console.log('   - Enable email confirmations: OFF로 설정 (즉시 가입)');
  console.log('   - 또는 ON으로 두고 이메일 확인 후 로그인');
}

setupRealSignup().catch(console.error);