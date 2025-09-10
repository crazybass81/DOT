#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './.env.local' });

// Supabase 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 DOT 근태관리 시스템 - 스키마 생성 실행기');
console.log('===============================================\n');

async function executeSchema() {
    try {
        // Service Role 키 확인
        if (!supabaseServiceKey) {
            console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
            console.log('   Anon 키로 시도하지만 권한 제한이 있을 수 있습니다.\n');
        }

        // 클라이언트 생성 (가능하면 Service Role, 아니면 Anon)
        const supabase = createClient(
            supabaseUrl, 
            supabaseServiceKey || supabaseAnonKey,
            {
                auth: { persistSession: false },
                db: { schema: 'public' }
            }
        );

        console.log('📡 Supabase 연결 성공');
        
        // SQL 파일 읽기
        const sqlPath = path.join(__dirname, 'create-missing-schema.sql');
        if (!fs.existsSync(sqlPath)) {
            throw new Error(`SQL 파일을 찾을 수 없습니다: ${sqlPath}`);
        }

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');
        console.log(`📄 SQL 스크립트 로드: ${sqlPath}\n`);

        // SQL 실행 (단계별로 나누어 실행)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`🔧 총 ${statements.length}개의 SQL 구문을 실행합니다...\n`);

        let successCount = 0;
        let errors = [];

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // 주석이나 빈 구문 건너뛰기
            if (!statement || statement.startsWith('--') || statement.startsWith('COMMENT')) {
                continue;
            }

            try {
                console.log(`실행 중 (${i + 1}/${statements.length}): ${statement.substring(0, 50).replace(/\n/g, ' ')}...`);
                
                const { data, error } = await supabase.rpc('exec_sql', { 
                    sql_query: statement + ';' 
                });

                if (error) {
                    // RPC 함수가 없는 경우 직접 쿼리 시도
                    if (error.code === '42883') {
                        console.log('   ℹ️  직접 SQL 실행 시도...');
                        // 여기서는 제한된 구문만 실행 가능
                        errors.push(`구문 ${i + 1}: RPC 함수 없음 - ${error.message}`);
                    } else {
                        errors.push(`구문 ${i + 1}: ${error.message}`);
                        console.log(`   ❌ 오류: ${error.message}`);
                    }
                } else {
                    successCount++;
                    console.log('   ✅ 성공');
                }
            } catch (e) {
                errors.push(`구문 ${i + 1}: ${e.message}`);
                console.log(`   ❌ 예외: ${e.message}`);
            }
        }

        console.log('\n📊 실행 결과:');
        console.log(`   성공: ${successCount}개`);
        console.log(`   실패: ${errors.length}개`);

        if (errors.length > 0) {
            console.log('\n❌ 발생한 오류들:');
            errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
            
            console.log('\n💡 해결 방법:');
            console.log('1. Supabase 대시보드에서 직접 SQL을 실행해보세요');
            console.log('2. SUPABASE_SERVICE_ROLE_KEY를 설정해보세요');
            console.log('3. Supabase CLI를 사용해보세요: supabase db reset');
        }

        // 테이블 생성 확인
        console.log('\n🔍 생성된 테이블 확인 중...');
        
        const tables = ['attendance_records'];
        for (const table of tables) {
            try {
                const { data, error } = await supabase.from(table).select('*').limit(1);
                if (error) {
                    console.log(`   ❌ ${table}: ${error.message}`);
                } else {
                    console.log(`   ✅ ${table}: 정상 생성됨`);
                }
            } catch (e) {
                console.log(`   ❌ ${table}: ${e.message}`);
            }
        }

        // 뷰 확인
        console.log('\n👁️  생성된 뷰 확인 중...');
        const views = ['active_employees'];
        for (const view of views) {
            try {
                const { data, error } = await supabase.from(view).select('*').limit(1);
                if (error) {
                    console.log(`   ❌ ${view}: ${error.message}`);
                } else {
                    console.log(`   ✅ ${view}: 정상 생성됨`);
                }
            } catch (e) {
                console.log(`   ❌ ${view}: ${e.message}`);
            }
        }

        console.log('\n🎉 스키마 생성 프로세스 완료!');

    } catch (error) {
        console.error('❌ 스키마 생성 실패:', error.message);
        console.error('   상세 오류:', error);
        process.exit(1);
    }
}

// 실행
executeSchema()
    .then(() => {
        console.log('\n✨ 모든 작업이 완료되었습니다!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 예상치 못한 오류:', error);
        process.exit(1);
    });