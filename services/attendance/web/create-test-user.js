// 테스트 사용자 생성 스크립트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase 환경변수가 설정되지 않았습니다');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const adminSupabase = serviceKey ? createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
}) : null;

async function createTestUser() {
  try {
    const testEmail = `testuser${Date.now()}@test.com`;
    const testPassword = 'TestPassword123!';
    
    console.log(`🚀 테스트 사용자 생성 중... (${testEmail})`);

    // 1. Supabase Auth에 사용자 생성
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: '테스트 사용자',
        }
      }
    });

    if (authError) {
      console.error('❌ Auth 사용자 생성 실패:', authError.message);
      return;
    }

    console.log('✅ Auth 사용자 생성 성공:', authUser.user?.id);

    // 2. unified_identities에 추가
    const { data: identity, error: identityError } = await supabase
      .from('unified_identities')
      .insert({
        email: testEmail,
        full_name: '테스트 사용자',
        id_type: 'personal',
        auth_user_id: authUser.user?.id,
        verification_status: 'pending',
        verification_method: 'email',
        is_verified: false,
        is_active: true
      })
      .select()
      .single();

    if (identityError) {
      console.error('❌ Identity 생성 실패:', identityError.message);
      return;
    }

    console.log('✅ 통합 신원 생성 성공:', identity.id);

    // 3. 테스트 조직 생성
    const { data: org, error: orgError } = await supabase
      .from('organizations_v3')
      .insert({
        name: '테스트 회사',
        code: `TEST${Date.now().toString().slice(-6)}`,
        org_type: 'business_owner',
        founder_identity_id: identity.id,
        business_status: 'active',
        settings: {
          workingHours: { start: '09:00', end: '18:00' },
          gpsTracking: { enabled: true, radius: 100 }
        },
        is_active: true
      })
      .select()
      .single();

    if (orgError) {
      console.error('❌ 조직 생성 실패:', orgError.message);
      return;
    }

    console.log('✅ 테스트 조직 생성 성공:', org.name);

    // 4. admin 역할 할당
    const { data: role, error: roleError } = await supabase
      .from('role_assignments')
      .insert({
        identity_id: identity.id,
        organization_id: org.id,
        role: 'admin',
        is_active: true,
        assigned_by: identity.id,
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (roleError) {
      console.error('❌ 역할 할당 실패:', roleError.message);
      return;
    }

    console.log('✅ Admin 역할 할당 성공');

    console.log('\n🎉 테스트 사용자 생성 완료!');
    console.log('로그인 정보:');
    console.log(`  📧 이메일: ${testEmail}`);
    console.log(`  🔒 비밀번호: ${testPassword}`);
    console.log(`  🏢 조직: ${org.name} (${org.code})`);
    console.log(`  👤 역할: admin`);

  } catch (error) {
    console.error('💥 전체 오류:', error.message);
  }
}

createTestUser();