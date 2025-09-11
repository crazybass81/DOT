#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 profiles 테이블 스키마 확인');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesSchema() {
  try {
    console.log('\n📋 1. 최소한의 데이터로 스키마 확인...');
    
    // 최소한의 데이터로 insert 시도
    const testInserts = [
      { email: 'test1@example.com' },
      { id: 'test-uuid', email: 'test2@example.com' },
      { email: 'test3@example.com', name: 'Test User' },
      { email: 'test4@example.com', display_name: 'Test User' },
      { email: 'test5@example.com', username: 'testuser' },
    ];

    for (const testData of testInserts) {
      try {
        console.log(`🧪 테스트 데이터:`, testData);
        const { data, error } = await supabase
          .from('profiles')
          .insert(testData)
          .select();

        if (error) {
          console.log(`   ❌ 오류: ${error.message}`);
          if (error.details) console.log(`   📋 상세: ${error.details}`);
        } else {
          console.log(`   ✅ 성공:`, data);
          
          // 성공했으면 즉시 삭제
          await supabase
            .from('profiles')
            .delete()
            .eq('email', testData.email);
          console.log(`   🗑️ 삭제 완료`);
          break; // 성공하면 더 이상 테스트하지 않음
        }
      } catch (err) {
        console.log(`   💥 예외: ${err.message}`);
      }
    }

    console.log('\n📊 2. 기존 profiles 데이터 조회...');
    
    const { data: allProfiles, error: selectError } = await supabase
      .from('profiles')
      .select('*');

    if (selectError) {
      console.log(`❌ 조회 오류: ${selectError.message}`);
    } else {
      console.log(`✅ 조회 성공: ${allProfiles.length}개 레코드`);
      if (allProfiles.length > 0) {
        console.log('📋 첫 번째 레코드 구조:');
        console.log(JSON.stringify(allProfiles[0], null, 2));
      }
    }

  } catch (error) {
    console.error('💥 예상치 못한 오류:', error);
  }
}

checkProfilesSchema();