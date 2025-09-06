// 데이터베이스 사용자 확인 스크립트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase 환경변수가 설정되지 않았습니다');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    console.log('🔍 unified_identities 테이블 확인...');
    const { data: identities, error: identityError } = await supabase
      .from('unified_identities')
      .select('id, email, full_name, id_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (identityError) {
      console.error('❌ unified_identities 조회 오류:', identityError.message);
    } else {
      console.log(`📋 등록된 통합 아이디: ${identities?.length || 0}개`);
      identities?.forEach((identity, index) => {
        console.log(`  ${index + 1}. ${identity.email} (${identity.full_name || 'No name'}) - ${identity.id_type}`);
      });
    }

    console.log('\n🔍 role_assignments 테이블 확인...');
    const { data: roles, error: roleError } = await supabase
      .from('role_assignments')
      .select('id, identity_id, role, organization_id, is_active')
      .eq('is_active', true)
      .limit(5);

    if (roleError) {
      console.error('❌ role_assignments 조회 오류:', roleError.message);
    } else {
      console.log(`👥 활성 역할 할당: ${roles?.length || 0}개`);
      roles?.forEach((role, index) => {
        console.log(`  ${index + 1}. ${role.role} (${role.identity_id}) - org: ${role.organization_id || 'none'}`);
      });
    }

    console.log('\n🔍 organizations_v3 테이블 확인...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations_v3')
      .select('id, name, org_type, is_active')
      .eq('is_active', true)
      .limit(5);

    if (orgError) {
      console.error('❌ organizations_v3 조회 오류:', orgError.message);
    } else {
      console.log(`🏢 등록된 조직: ${orgs?.length || 0}개`);
      orgs?.forEach((org, index) => {
        console.log(`  ${index + 1}. ${org.name} (${org.org_type})`);
      });
    }

  } catch (error) {
    console.error('💥 전체 오류:', error.message);
  }
}

checkUsers();