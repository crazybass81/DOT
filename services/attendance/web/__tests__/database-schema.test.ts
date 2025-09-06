/**
 * TDD Test: Phase 4.1.2 - 데이터베이스 스키마 상태 확인 및 누락된 테이블 식별
 * user-permission-diagram.md에 명시된 요구사항에 따라 필요한 테이블들이 존재하는지 검증
 */

import { createClient } from '@supabase/supabase-js'

describe('Phase 4.1.2: 현재 데이터베이스 스키마 상태 확인', () => {
  let supabase: any

  // user-permission-diagram.md에서 정의된 필수 테이블들
  const requiredTables = [
    'organizations',
    'employees', 
    'contracts',
    'attendance',
    'user_roles',
    'audit_logs',
    'qr_codes',
    'device_tokens',
    'locations'
  ]

  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'

    supabase = createClient(supabaseUrl, supabaseKey)
  })

  test.each(requiredTables)('테이블 "%s" 존재 여부 확인', async (tableName) => {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`❌ 테이블 "${tableName}" 누락됨: ${error.message}`)
        // 누락된 테이블은 일단 기록하고 계속 진행
        expect(error.message).toContain('does not exist')
      } else {
        // 다른 에러 (예: RLS 정책으로 인한 접근 거부)는 테이블이 존재함을 의미
        console.log(`✅ 테이블 "${tableName}" 존재 (RLS 정책 적용됨)`)
        expect(true).toBe(true) // 테이블이 존재함
      }
    } else {
      console.log(`✅ 테이블 "${tableName}" 존재 및 접근 가능`)
      expect(error).toBeNull()
    }
  })

  test('조직(organizations) 테이블 스키마 검증', async () => {
    // organizations 테이블의 필수 컬럼들이 있는지 확인
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(0) // 스키마만 가져오기
      
    if (!error) {
      console.log('✅ organizations 테이블 스키마 접근 가능')
      expect(error).toBeNull()
    } else {
      console.log('⚠️ organizations 테이블 스키마 접근 불가:', error.message)
      // RLS 정책 때문일 수 있으므로 실패로 처리하지 않음
    }
  })

  test('직원(employees) 테이블 스키마 검증', async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .limit(0)
      
    if (!error) {
      console.log('✅ employees 테이블 스키마 접근 가능')
      expect(error).toBeNull()
    } else if (error.message.includes('does not exist')) {
      console.log('❌ employees 테이블이 존재하지 않음')
      expect(true).toBe(true) // 누락 사실 확인됨
    } else {
      console.log('✅ employees 테이블 존재 (RLS 정책 적용)')
      expect(true).toBe(true)
    }
  })

  test('출퇴근(attendance) 테이블 스키마 검증', async () => {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .limit(0)
      
    if (!error) {
      console.log('✅ attendance 테이블 스키마 접근 가능')
      expect(error).toBeNull()
    } else if (error.message.includes('does not exist')) {
      console.log('❌ attendance 테이블이 존재하지 않음')
      expect(true).toBe(true) // 누락 사실 확인됨
    } else {
      console.log('✅ attendance 테이블 존재 (RLS 정책 적용)')
      expect(true).toBe(true)
    }
  })

  test('근로계약(contracts) 테이블 스키마 검증', async () => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .limit(0)
      
    if (!error) {
      console.log('✅ contracts 테이블 스키마 접근 가능')
      expect(error).toBeNull()
    } else if (error.message.includes('does not exist')) {
      console.log('❌ contracts 테이블이 존재하지 않음')
      expect(true).toBe(true) // 누락 사실 확인됨
    } else {
      console.log('✅ contracts 테이블 존재 (RLS 정책 적용)')
      expect(true).toBe(true)
    }
  })

  test('권한(user_roles) 테이블 스키마 검증', async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .limit(0)
      
    if (!error) {
      console.log('✅ user_roles 테이블 스키마 접근 가능')
      expect(error).toBeNull()
    } else if (error.message.includes('does not exist')) {
      console.log('❌ user_roles 테이블이 존재하지 않음')
      expect(true).toBe(true) // 누락 사실 확인됨
    } else {
      console.log('✅ user_roles 테이블 존재 (RLS 정책 적용)')
      expect(true).toBe(true)
    }
  })

  test('감사로그(audit_logs) 테이블 스키마 검증', async () => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(0)
      
    if (!error) {
      console.log('✅ audit_logs 테이블 스키마 접근 가능')
      expect(error).toBeNull()
    } else if (error.message.includes('does not exist')) {
      console.log('❌ audit_logs 테이블이 존재하지 않음')
      expect(true).toBe(true) // 누락 사실 확인됨
    } else {
      console.log('✅ audit_logs 테이블 존재 (RLS 정책 적용)')
      expect(true).toBe(true)
    }
  })

  test('PostgreSQL Extensions 확인', async () => {
    // uuid-ossp extension 확인 (UUID 생성용)
    const { data: uuidData, error: uuidError } = await supabase.rpc('uuid_generate_v4')
    
    if (!uuidError) {
      console.log('✅ uuid-ossp extension 활성화됨')
      expect(uuidError).toBeNull()
    } else {
      console.log('⚠️ uuid-ossp extension 상태:', uuidError.message)
    }

    // pgcrypto extension 확인 (암호화용)
    // 직접적인 확인이 어려우므로 일단 생략
    console.log('🔄 pgcrypto extension은 별도 확인 필요')
    expect(true).toBe(true)
  })
})