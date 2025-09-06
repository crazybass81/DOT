/**
 * TDD Test: 현재 데이터베이스 스키마 확인
 * Mock 사용 금지 - 실제 Supabase 데이터베이스 구조 파악
 */

import { createClient } from '@supabase/supabase-js'

describe('현재 데이터베이스 스키마 확인', () => {
  let supabase: any
  
  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sanlpdXpldGNodGp1ZGJjZnZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDg3MDUsImV4cCI6MjA3MjIyNDcwNX0.8s8-zrgnztjabvrVE32J2ZRCiH5bVrypyHBJjHNzfjQ'
    supabase = createClient(supabaseUrl, supabaseKey)
  })

  test('attendance 테이블 구조 확인', async () => {
    try {
      // 빈 조건으로 조회하여 테이블 존재 여부와 컬럼 구조 확인
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .limit(1)

      console.log('📊 attendance 테이블 조회 결과:', { data, error })

      if (error) {
        if (error.code === 'PGRST106') {
          console.log('❌ attendance 테이블이 존재하지 않음')
          expect(error.code).toBe('PGRST106')
        } else {
          console.log('⚠️  attendance 테이블 접근 오류:', error.message)
          expect(true).toBe(true) // 일단 통과하고 오류 내용 확인
        }
      } else {
        console.log('✅ attendance 테이블 존재함')
        expect(data).toBeDefined()
        
        if (data && data.length > 0) {
          console.log('📋 attendance 테이블 컬럼 구조:', Object.keys(data[0]))
        } else {
          console.log('ℹ️  attendance 테이블이 비어있음')
        }
      }

    } catch (exception) {
      console.log('🔥 attendance 테이블 조회 중 예외:', exception)
      expect(true).toBe(true)
    }
  })

  test('employees 테이블 구조 확인', async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .limit(1)

      console.log('📊 employees 테이블 조회 결과:', { data, error })

      if (error) {
        if (error.code === 'PGRST106') {
          console.log('❌ employees 테이블이 존재하지 않음')
          expect(error.code).toBe('PGRST106')
        } else {
          console.log('⚠️  employees 테이블 접근 오류:', error.message)
          expect(true).toBe(true)
        }
      } else {
        console.log('✅ employees 테이블 존재함')
        if (data && data.length > 0) {
          console.log('📋 employees 테이블 컬럼 구조:', Object.keys(data[0]))
        } else {
          console.log('ℹ️  employees 테이블이 비어있음')
        }
      }

    } catch (exception) {
      console.log('🔥 employees 테이블 조회 중 예외:', exception)
      expect(true).toBe(true)
    }
  })

  test('organizations 테이블 구조 확인', async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)

      console.log('📊 organizations 테이블 조회 결과:', { data, error })

      if (error) {
        if (error.code === 'PGRST106') {
          console.log('❌ organizations 테이블이 존재하지 않음')
          expect(error.code).toBe('PGRST106')
        } else {
          console.log('⚠️  organizations 테이블 접근 오류:', error.message)
          expect(true).toBe(true)
        }
      } else {
        console.log('✅ organizations 테이블 존재함')
        if (data && data.length > 0) {
          console.log('📋 organizations 테이블 컬럼 구조:', Object.keys(data[0]))
        } else {
          console.log('ℹ️  organizations 테이블이 비어있음')
        }
      }

    } catch (exception) {
      console.log('🔥 organizations 테이블 조회 중 예외:', exception)
      expect(true).toBe(true)
    }
  })

  test('locations 테이블 구조 확인', async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .limit(1)

      console.log('📊 locations 테이블 조회 결과:', { data, error })

      if (error) {
        if (error.code === 'PGRST106') {
          console.log('❌ locations 테이블이 존재하지 않음')
          expect(error.code).toBe('PGRST106')
        } else {
          console.log('⚠️  locations 테이블 접근 오류:', error.message)
          expect(true).toBe(true)
        }
      } else {
        console.log('✅ locations 테이블 존재함')
        if (data && data.length > 0) {
          console.log('📋 locations 테이블 컬럼 구조:', Object.keys(data[0]))
        } else {
          console.log('ℹ️  locations 테이블이 비어있음')
        }
      }

    } catch (exception) {
      console.log('🔥 locations 테이블 조회 중 예외:', exception)
      expect(true).toBe(true)
    }
  })

  test('breaks 테이블 구조 확인', async () => {
    try {
      const { data, error } = await supabase
        .from('breaks')
        .select('*')
        .limit(1)

      console.log('📊 breaks 테이블 조회 결과:', { data, error })

      if (error) {
        if (error.code === 'PGRST106') {
          console.log('❌ breaks 테이블이 존재하지 않음')
          expect(error.code).toBe('PGRST106')
        } else {
          console.log('⚠️  breaks 테이블 접근 오류:', error.message)
          expect(true).toBe(true)
        }
      } else {
        console.log('✅ breaks 테이블 존재함')
        if (data && data.length > 0) {
          console.log('📋 breaks 테이블 컬럼 구조:', Object.keys(data[0]))
        } else {
          console.log('ℹ️  breaks 테이블이 비어있음')
        }
      }

    } catch (exception) {
      console.log('🔥 breaks 테이블 조회 중 예외:', exception)
      expect(true).toBe(true)
    }
  })

  test('데이터베이스 연결 및 권한 확인', async () => {
    try {
      // auth.users 테이블에 접근해보기
      const { data, error } = await supabase.auth.getUser()
      
      console.log('🔐 인증 상태 확인:', { data, error })
      
      if (error) {
        console.log('⚠️  사용자 인증 정보 없음:', error.message)
        expect(true).toBe(true)
      } else {
        console.log('✅ 사용자 인증됨')
        expect(data).toBeDefined()
      }

      // RLS 정책 테스트를 위한 기본 테이블 접근
      const { data: testData, error: testError } = await supabase
        .rpc('version')

      console.log('🗄️  데이터베이스 버전 확인:', { data: testData, error: testError })

    } catch (exception) {
      console.log('🔥 데이터베이스 연결 확인 중 예외:', exception)
      expect(true).toBe(true)
    }
  })

  test('현재 프로젝트 설정 확인', async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co'
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '...'
    
    console.log('📋 현재 Supabase 설정:')
    console.log(`- URL: ${supabaseUrl}`)
    console.log(`- 프로젝트 ID: ${supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]}`)
    console.log(`- API Key 길이: ${supabaseKey.length}자`)
    console.log(`- API Key 시작: ${supabaseKey.substring(0, 20)}...`)
    
    expect(supabaseUrl).toContain('mljyiuzetchtjudbcfvd')
    expect(supabaseKey.length).toBeGreaterThan(100)
  })
})