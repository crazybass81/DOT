#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 데이터베이스 구조 상세 분석');

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  try {
    console.log('\n📋 1. 각 테이블의 스키마 구조 확인...');
    
    const tables = ['profiles', 'organizations_v3', 'role_assignments', 'user_roles', 'attendance'];
    
    for (const table of tables) {
      console.log(`\n🔬 ${table} 테이블 분석:`);
      
      try {
        // 빈 select로 컬럼 구조 파악
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
          continue;
        }
        
        console.log(`✅ ${table}: 접근 가능`);
        
        // 샘플 insert 시도로 필수 컬럼 파악
        if (table === 'profiles') {
          console.log('📝 profiles 테이블 테스트 insert 시도...');
          try {
            const { data: insertData, error: insertError } = await supabase
              .from('profiles')
              .insert({
                email: 'test@example.com',
                full_name: '테스트',
              })
              .select();
            
            if (insertError) {
              console.log(`   ⚠️ Insert 오류: ${insertError.message}`);
              console.log(`   📋 오류 코드: ${insertError.code}`);
              console.log(`   💡 힌트: ${insertError.hint || '없음'}`);
            } else {
              console.log(`   ✅ Insert 성공:`, insertData);
              
              // 성공했으면 바로 삭제
              await supabase
                .from('profiles')
                .delete()
                .eq('email', 'test@example.com');
              console.log(`   🗑️ 테스트 데이터 삭제 완료`);
            }
          } catch (err) {
            console.log(`   💥 Insert 예외: ${err.message}`);
          }
        }
        
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    console.log('\n🔐 2. Auth 사용자 확인...');
    
    // 현재 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log(`✅ 현재 로그인된 사용자: ${session.user.email}`);
      console.log(`👤 User ID: ${session.user.id}`);
    } else {
      console.log('❌ 로그인된 사용자 없음');
    }

    console.log('\n📊 3. 기존 데이터 확인...');
    
    // profiles 테이블 데이터 확인
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('*');
    
    if (!profilesError) {
      console.log(`📋 profiles 테이블: ${profilesData.length}개 레코드`);
      if (profilesData.length > 0) {
        profilesData.forEach(profile => {
          console.log(`   - ${profile.email} (${profile.full_name}, 역할: ${profile.role || '없음'})`);
        });
      }
    }

    // organizations_v3 테이블 데이터 확인
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations_v3')
      .select('*');
    
    if (!orgsError) {
      console.log(`🏢 organizations_v3 테이블: ${orgsData.length}개 레코드`);
      if (orgsData.length > 0) {
        orgsData.forEach(org => {
          console.log(`   - ${org.name} (${org.type})`);
        });
      }
    }

  } catch (error) {
    console.error('💥 예상치 못한 오류:', error);
  }
}

inspectDatabase();