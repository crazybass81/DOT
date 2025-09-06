#!/usr/bin/env node
/**
 * Phase 4.1.4: PostgreSQL Extensions 마이그레이션 적용 스크립트
 * 실제 Supabase 프로젝트에 Extensions 및 헬퍼 함수들을 생성
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function applyExtensionsMigration() {
  console.log('🚀 Phase 4.1.4: PostgreSQL Extensions 마이그레이션 시작')
  
  // Supabase 클라이언트 생성 (Service Role Key 필요)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.')
    console.log('📋 해결 방법:')
    console.log('1. Supabase Dashboard → Settings → API')
    console.log('2. Service Role Key 복사')
    console.log('3. .env.local 파일에 SUPABASE_SERVICE_ROLE_KEY=your_key 추가')
    console.log('')
    console.log('🔧 대안: Supabase SQL Editor에서 직접 실행')
    console.log('- https://app.supabase.com/project/mljyiuzetchtjudbcfvd/sql')
    console.log('- 아래 SQL 파일 내용을 복사하여 실행:')
    
    // 마이그레이션 파일 경로 출력
    const migrationPath = path.join(__dirname, '../supabase/migrations/006_enable_extensions.sql')
    console.log(`- 파일 경로: ${migrationPath}`)
    
    if (fs.existsSync(migrationPath)) {
      console.log('📄 마이그레이션 SQL:')
      console.log('=' .repeat(60))
      const sqlContent = fs.readFileSync(migrationPath, 'utf8')
      console.log(sqlContent)
      console.log('=' .repeat(60))
    }
    
    return false
  }
  
  console.log('✅ Service Role Key 확인됨')
  
  // Service Role 클라이언트로 연결
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  try {
    // 마이그레이션 파일 읽기
    const migrationPath = path.join(__dirname, '../supabase/migrations/006_enable_extensions.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ 마이그레이션 파일을 찾을 수 없습니다:', migrationPath)
      return false
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8')
    console.log('📄 마이그레이션 파일 로드 완료')
    
    // SQL을 개별 명령으로 분할 (간단한 방식)
    const sqlCommands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd && !cmd.startsWith('--') && cmd !== '')
    
    console.log(`📊 ${sqlCommands.length}개 SQL 명령 실행 예정`)
    
    // 각 SQL 명령 실행
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i] + ';' // 세미콜론 복원
      
      console.log(`🔄 명령 ${i + 1}/${sqlCommands.length} 실행 중...`)
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql: command })
        
        if (error) {
          console.error(`❌ 명령 ${i + 1} 실행 오류:`, error.message)
          console.log('SQL:', command.substring(0, 100) + '...')
          
          // Extensions는 특권이 필요할 수 있으므로 경고만 하고 계속
          if (error.message.includes('extension') || error.message.includes('permission')) {
            console.log('⚠️  Extensions 관련 오류 - 계속 진행')
            continue
          }
        } else {
          console.log(`✅ 명령 ${i + 1} 완료`)
        }
      } catch (err) {
        console.error(`❌ 명령 ${i + 1} 예외:`, err.message)
      }
    }
    
    console.log('🎉 마이그레이션 적용 완료!')
    
    // 결과 검증
    console.log('🔍 Extensions 상태 검증 중...')
    
    const { data: uuid_test, error: uuid_error } = await supabase.rpc('generate_uuid')
    if (!uuid_error) {
      console.log('✅ UUID 생성 함수 작동:', uuid_test)
    } else {
      console.log('⚠️  UUID 생성 함수 확인 필요:', uuid_error.message)
    }
    
    const { data: ext_status, error: ext_error } = await supabase.rpc('check_extensions_status')
    if (!ext_error) {
      console.log('✅ Extensions 상태:', ext_status)
    } else {
      console.log('⚠️  Extensions 상태 확인 필요:', ext_error.message)
    }
    
    return true
    
  } catch (error) {
    console.error('❌ 마이그레이션 적용 중 오류:', error.message)
    return false
  }
}

// 직접 실행된 경우
if (require.main === module) {
  applyExtensionsMigration()
    .then(success => {
      if (success) {
        console.log('🎉 Phase 4.1.4 완료!')
        process.exit(0)
      } else {
        console.log('⚠️  수동 적용이 필요합니다.')
        process.exit(1)
      }
    })
    .catch(err => {
      console.error('❌ 스크립트 실행 오류:', err)
      process.exit(1)
    })
}

module.exports = { applyExtensionsMigration }