-- contracts 테이블 기능 테스트
-- TDD: 테스트 먼저 작성하여 요구사항 명확화

-- 테스트 준비: 임시 테스트 데이터
INSERT INTO auth.users (id, email) VALUES 
  ('550e8400-e29b-41d4-a716-446655440003', 'worker@example.com'),
  ('550e8400-e29b-41d4-a716-446655440004', 'employer@example.com');

INSERT INTO organizations (id, name, metadata) VALUES
  ('550e8400-e29b-41d4-a716-446655440013', '계약 테스트 조직', '{}');

INSERT INTO employees (id, user_id, organization_id, email, name, position) VALUES
  ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440013', 'worker@example.com', '근로자', 'worker'),
  ('550e8400-e29b-41d4-a716-446655440024', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440013', 'employer@example.com', '사업주', 'admin');

-- 테스트 1: contracts 테이블 존재 여부
DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'contracts'
  )), 'contracts 테이블이 존재해야 합니다';
  
  RAISE NOTICE 'PASS: contracts 테이블 존재 확인';
END $$;

-- 테스트 2: 필수 컬럼 존재 여부
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) >= 8 FROM information_schema.columns 
    WHERE table_name = 'contracts' 
    AND column_name IN ('id', 'employee_id', 'organization_id', 'contract_type', 'start_date', 'status', 'wage_amount', 'wage_type')),
    '필수 컬럼들이 존재해야 합니다';
    
  RAISE NOTICE 'PASS: 필수 컬럼 존재 확인';
END $$;

-- 테스트 3: contract_type과 status CHECK 제약조건
DO $$
BEGIN
  BEGIN
    INSERT INTO contracts (employee_id, organization_id, contract_type, start_date) 
    VALUES ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440013', 'INVALID_TYPE', '2024-01-01');
    ASSERT FALSE, 'invalid contract_type이 거부되지 않았습니다';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: contract_type CHECK 제약조건 동작';
  END;
  
  BEGIN
    INSERT INTO contracts (employee_id, organization_id, start_date, status) 
    VALUES ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440013', '2024-01-01', 'INVALID_STATUS');
    ASSERT FALSE, 'invalid status가 거부되지 않았습니다';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: status CHECK 제약조건 동작';
  END;
END $$;

-- 테스트 4: 유효한 계약 삽입
DO $$
DECLARE
  test_id UUID;
BEGIN
  INSERT INTO contracts (employee_id, organization_id, contract_type, start_date, wage_amount, wage_type) 
  VALUES ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440013', 'EMPLOYMENT', '2024-01-01', 15000, 'HOURLY')
  RETURNING id INTO test_id;
  
  ASSERT test_id IS NOT NULL, '유효한 계약 삽입이 실패했습니다';
  RAISE NOTICE 'PASS: 유효한 계약 삽입 성공';
END $$;

-- 테스트 5: 근로자가 여러 계약을 가질 수 있는지 (다른 조직)
DO $$
BEGIN
  -- 다른 조직과의 계약
  INSERT INTO organizations (id, name, metadata) VALUES
    ('550e8400-e29b-41d4-a716-446655440014', '다른 조직', '{}');
  
  INSERT INTO employees (id, user_id, organization_id, email, name, position) VALUES
    ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440014', 'worker@example.com', '근로자', 'worker');
    
  INSERT INTO contracts (employee_id, organization_id, contract_type, start_date) VALUES
    ('550e8400-e29b-41d4-a716-446655440025', '550e8400-e29b-41d4-a716-446655440014', 'PART_TIME', '2024-02-01');
  
  -- 같은 사용자가 여러 조직에서 계약을 가지는지 확인
  ASSERT (SELECT COUNT(DISTINCT c.organization_id) 
          FROM contracts c 
          JOIN employees e ON c.employee_id = e.id 
          WHERE e.user_id = '550e8400-e29b-41d4-a716-446655440003') >= 2,
    '근로자가 여러 조직과 계약을 가져야 합니다';
    
  RAISE NOTICE 'PASS: 다중 계약 지원';
END $$;

-- 테스트 6: 계약 기간 검증 (종료일이 시작일보다 이후여야 함)
DO $$
BEGIN
  BEGIN
    INSERT INTO contracts (employee_id, organization_id, start_date, end_date) 
    VALUES ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440013', '2024-12-31', '2024-01-01');
    ASSERT FALSE, '종료일이 시작일보다 이전인 계약이 거부되지 않았습니다';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: 계약 기간 검증 동작';
  END;
END $$;

-- 테스트 7: 급여 정보 검증 (0 이상)
DO $$
BEGIN
  BEGIN
    INSERT INTO contracts (employee_id, organization_id, start_date, wage_amount) 
    VALUES ('550e8400-e29b-41d4-a716-446655440023', '550e8400-e29b-41d4-a716-446655440013', '2024-01-01', -1000);
    ASSERT FALSE, '음수 급여가 거부되지 않았습니다';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: 급여 검증 동작';
  END;
END $$;

-- 테스트 8: 유틸리티 함수 테스트 - 활성 계약 조회
DO $$
DECLARE
  active_contract_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_contract_count
  FROM get_active_contracts('550e8400-e29b-41d4-a716-446655440003');
  
  ASSERT active_contract_count >= 1, '활성 계약 조회 함수가 작동하지 않습니다';
  RAISE NOTICE 'PASS: 활성 계약 조회 함수';
END $$;

-- 정리: 테스트 데이터 삭제
DELETE FROM contracts WHERE employee_id IN (
  SELECT id FROM employees WHERE user_id IN ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004')
);
DELETE FROM employees WHERE user_id IN ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004');
DELETE FROM organizations WHERE id IN ('550e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440014');

RAISE NOTICE '✅ contracts 테이블 테스트 완료';