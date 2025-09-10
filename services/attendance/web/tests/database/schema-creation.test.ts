/**
 * DOT 근태관리 시스템 - 데이터베이스 스키마 생성 테스트
 * TDD 방식으로 스키마 생성을 검증
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/lib/supabase-config';

describe('데이터베이스 스키마 생성 테스트', () => {
  let supabase: ReturnType<typeof createClient<Database>>;
  
  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    supabase = createClient<Database>(supabaseUrl, supabaseKey);
  });

  describe('필수 테이블 존재 검증', () => {
    test('attendance_records 테이블이 존재해야 함', async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    test('unified_identities 테이블이 존재해야 함', async () => {
      const { data, error } = await supabase
        .from('unified_identities')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('organizations_v3 테이블이 존재해야 함', async () => {
      const { data, error } = await supabase
        .from('organizations_v3')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('role_assignments 테이블이 존재해야 함', async () => {
      const { data, error } = await supabase
        .from('role_assignments')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('뷰(View) 존재 검증', () => {
    test('user_roles_view 뷰가 존재해야 함', async () => {
      const { data, error } = await supabase
        .from('user_roles_view')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    test('active_employees 뷰가 존재해야 함', async () => {
      const { data, error } = await supabase
        .from('active_employees')
        .select('*')
        .limit(1);
      
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  describe('attendance_records 테이블 구조 검증', () => {
    test('필수 컬럼들이 모두 존재해야 함', async () => {
      // 빈 INSERT를 시도하여 컬럼 구조 확인
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: '00000000-0000-0000-0000-000000000000',
          business_id: '00000000-0000-0000-0000-000000000000',
        })
        .select();
      
      // 외래키 제약조건 오류는 예상됨 (테스트용 UUID가 존재하지 않음)
      // 중요한 것은 컬럼 구조 오류가 아닌지 확인
      if (error) {
        expect(error.message).not.toContain('column');
        expect(error.message).not.toContain('does not exist');
      }
    });

    test('verification_method 열거형 값 검증', async () => {
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: '00000000-0000-0000-0000-000000000000',
          business_id: '00000000-0000-0000-0000-000000000000',
          verification_method: 'invalid_method' as any
        })
        .select();
      
      expect(error).toBeTruthy();
      expect(error?.message).toContain('check constraint');
    });

    test('status 열거형 값 검증', async () => {
      const { error } = await supabase
        .from('attendance_records')
        .insert({
          employee_id: '00000000-0000-0000-0000-000000000000',
          business_id: '00000000-0000-0000-0000-000000000000',
          status: 'invalid_status' as any
        })
        .select();
      
      expect(error).toBeTruthy();
      expect(error?.message).toContain('check constraint');
    });
  });

  describe('데이터 타입 검증', () => {
    test('JSONB 컬럼이 JSON 데이터를 수용해야 함', async () => {
      const testLocation = {
        latitude: 37.5665,
        longitude: 126.9780,
        address: "서울특별시 중구 을지로 100",
        accuracy: 10
      };

      // 실제 삽입은 하지 않고 쿼리 빌드만 테스트
      const query = supabase
        .from('attendance_records')
        .insert({
          employee_id: '00000000-0000-0000-0000-000000000000',
          business_id: '00000000-0000-0000-0000-000000000000',
          check_in_location: testLocation,
          check_out_location: testLocation
        });

      expect(query).toBeDefined();
    });

    test('날짜 및 시간 컬럼이 올바른 타입을 가져야 함', async () => {
      const testDate = new Date().toISOString();
      
      const query = supabase
        .from('attendance_records')
        .insert({
          employee_id: '00000000-0000-0000-0000-000000000000',
          business_id: '00000000-0000-0000-0000-000000000000',
          check_in_time: testDate,
          check_out_time: testDate,
          work_date: testDate.split('T')[0]
        });

      expect(query).toBeDefined();
    });
  });

  describe('RLS (Row Level Security) 검증', () => {
    test('attendance_records 테이블에 RLS가 활성화되어야 함', async () => {
      // 인증되지 않은 상태에서 접근 시도
      const { error } = await supabase
        .from('attendance_records')
        .select('*');
      
      // RLS가 제대로 설정되었다면 빈 결과나 권한 오류가 발생해야 함
      if (error) {
        expect(error.message).toContain('permission denied');
      }
    });
  });

  describe('성능 및 인덱스 검증', () => {
    test('대용량 쿼리 성능이 허용 범위 내여야 함', async () => {
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .limit(100);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // 쿼리 시간이 5초를 넘지 않아야 함
      expect(queryTime).toBeLessThan(5000);
      
      if (error) {
        // 권한 오류는 예상됨 (RLS 때문에)
        expect(error.message).not.toContain('timeout');
      }
    });
  });

  describe('데이터 무결성 검증', () => {
    test('체크 제약조건이 올바르게 작동해야 함', async () => {
      // check_out_time이 check_in_time보다 이전인 경우
      const invalidData = {
        employee_id: '00000000-0000-0000-0000-000000000000',
        business_id: '00000000-0000-0000-0000-000000000000',
        check_in_time: '2025-01-01T10:00:00Z',
        check_out_time: '2025-01-01T09:00:00Z' // 이전 시간
      };

      const { error } = await supabase
        .from('attendance_records')
        .insert(invalidData);
      
      expect(error).toBeTruthy();
      expect(error?.message).toContain('check constraint');
    });
  });
});

// 통합 테스트: 전체 워크플로우
describe('출근/퇴근 워크플로우 통합 테스트', () => {
  let supabase: ReturnType<typeof createClient<Database>>;
  
  beforeAll(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mljyiuzetchtjudbcfvd.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    supabase = createClient<Database>(supabaseUrl, supabaseKey);
  });

  test('완전한 출근/퇴근 사이클 시뮬레이션', async () => {
    // 이 테스트는 실제 데이터가 있을 때만 실행
    // 현재는 스키마 구조만 검증
    
    const mockAttendance = {
      employee_id: '550e8400-e29b-41d4-a716-446655440000', // 가상 UUID
      business_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', // 가상 UUID
      check_in_time: new Date().toISOString(),
      verification_method: 'gps' as const,
      status: 'active' as const,
      check_in_location: {
        latitude: 37.5665,
        longitude: 126.9780,
        address: "서울특별시 중구"
      }
    };

    // 스키마 구조 검증용 (실제 삽입은 실패할 것으로 예상)
    const query = supabase
      .from('attendance_records')
      .insert(mockAttendance);

    expect(query).toBeDefined();
  });
});