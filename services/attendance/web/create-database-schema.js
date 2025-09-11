#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🚀 DOT 출석 관리 - 데이터베이스 스키마 생성 시작');
console.log('📡 Supabase URL:', supabaseUrl);

// Service role key가 필요할 수 있지만, 일단 anon key로 시도
const supabase = createClient(supabaseUrl, supabaseKey);

async function createSchema() {
  try {
    console.log('\n📋 1. 스키마 SQL 파일 읽기...');
    
    // 통합 스키마 SQL 읽기
    const schemaSQL = fs.readFileSync('./src/scripts/create-unified-schema.sql', 'utf8');
    
    console.log('✅ 스키마 파일 읽기 성공');
    console.log(`📝 스키마 크기: ${Math.round(schemaSQL.length / 1024)}KB`);

    console.log('\n🔨 2. 데이터베이스 스키마 생성 시도...');
    
    // SQL을 여러 부분으로 나누어 실행
    const sqlStatements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 총 ${sqlStatements.length}개의 SQL 명령문 발견`);

    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      if (statement.length < 10) continue; // 너무 짧은 문장 스킵
      
      console.log(`\n🔄 [${i + 1}/${sqlStatements.length}] 실행 중...`);
      console.log(`📝 명령: ${statement.substring(0, 50)}...`);
      
      try {
        // RPC를 통해 SQL 실행 (이는 service role이 필요할 수 있음)
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });
        
        if (error) {
          console.log(`⚠️  오류 (계속 진행): ${error.message}`);
        } else {
          console.log(`✅ 성공`);
        }
      } catch (err) {
        console.log(`⚠️  예외 (계속 진행): ${err.message}`);
      }
    }

    console.log('\n🎯 3. 테이블 존재 확인...');
    
    // 생성된 테이블들 확인
    const tables = ['unified_identities', 'organizations_v3', 'role_assignments', 'attendance_records'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('count(*)', { count: 'exact' })
          .limit(1);
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: 테이블 존재 확인`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    console.log('\n💡 참고사항:');
    console.log('🔑 일부 명령은 Supabase service role key가 필요할 수 있습니다');
    console.log('🌐 Supabase 대시보드에서 SQL Editor를 통해 직접 실행하는 것을 권장합니다');
    console.log('📚 SQL 파일 위치: ./src/scripts/create-unified-schema.sql');

  } catch (error) {
    console.error('💥 스키마 생성 중 오류:', error);
  }
}

createSchema();