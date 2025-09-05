-- user_roles 테이블 기능 테스트
-- TDD: 테스트 먼저 작성하여 요구사항 명확화

-- 테스트 준비: 임시 테스트 데이터
INSERT INTO auth.users (id, email) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'test@example.com'),
  ('550e8400-e29b-41d4-a716-446655440002', 'admin@example.com');

INSERT INTO organizations (id, name, metadata) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', '테스트 조직', '{}'),
  ('550e8400-e29b-41d4-a716-446655440012', '다른 조직', '{}');

INSERT INTO employees (id, user_id, organization_id, email, name, position) VALUES
  ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'test@example.com', '테스트 사용자', 'worker'),
  ('550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440011', 'admin@example.com', '관리자', 'admin');

-- 테스트 1: user_roles 테이블 존재 여부
DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_roles'
  )), 'user_roles 테이블이 존재해야 합니다';
  
  RAISE NOTICE 'PASS: user_roles 테이블 존재 확인';
END $$;

-- 테스트 2: 필수 컬럼 존재 여부
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) = 6 FROM information_schema.columns 
    WHERE table_name = 'user_roles' 
    AND column_name IN ('id', 'employee_id', 'organization_id', 'role_type', 'is_active', 'granted_at')),
    '필수 컬럼들이 존재해야 합니다';
    
  RAISE NOTICE 'PASS: 필수 컬럼 존재 확인';
END $$;

-- 테스트 3: role_type CHECK 제약조건
DO $$
BEGIN
  BEGIN
    INSERT INTO user_roles (employee_id, organization_id, role_type) 
    VALUES ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 'INVALID_ROLE');
    ASSERT FALSE, 'invalid role_type이 거부되지 않았습니다';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: role_type CHECK 제약조건 동작';
  END;
END $$;

-- 테스트 4: 유효한 역할 삽입
DO $$
DECLARE
  test_id UUID;
BEGIN
  INSERT INTO user_roles (employee_id, organization_id, role_type) 
  VALUES ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 'WORKER')
  RETURNING id INTO test_id;
  
  ASSERT test_id IS NOT NULL, '유효한 역할 삽입이 실패했습니다';
  RAISE NOTICE 'PASS: 유효한 역할 삽입 성공';
END $$;

-- 테스트 5: 사용자가 여러 역할을 가질 수 있는지
DO $$
BEGIN
  INSERT INTO user_roles (employee_id, organization_id, role_type) VALUES
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440011', 'MANAGER'),
    ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440012', 'WORKER');
  
  ASSERT (SELECT COUNT(*) FROM user_roles WHERE employee_id = '550e8400-e29b-41d4-a716-446655440021') >= 2,
    '사용자가 여러 역할을 가져야 합니다';
    
  RAISE NOTICE 'PASS: 다중 역할 지원';
END $$;

-- 테스트 6: RLS 정책 - 자신의 역할만 조회 가능
-- 이 테스트는 RLS가 활성화된 후 실행됩니다
-- 현재는 스킵

-- 정리: 테스트 데이터 삭제
DELETE FROM user_roles WHERE employee_id IN ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440022');
DELETE FROM employees WHERE id IN ('550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440022');
DELETE FROM organizations WHERE id IN ('550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440012');

RAISE NOTICE '✅ user_roles 테이블 테스트 완료';