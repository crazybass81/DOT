#!/usr/bin/env node
// TDD 테스트 실행 스크립트

const fs = require('fs');
const path = require('path');

console.log('🧪 TDD: 데이터베이스 테스트 실행');

// Phase 1.1: user_roles 테이블 테스트
console.log('\n🔍 Phase 1.1: user_roles 테이블 테스트');

const userRolesTestFile = path.join(__dirname, 'database', 'user-roles.test.sql');
const userRolesSchemaFile = path.join(__dirname, '..', 'sql-scripts', '01-create-user-roles-table.sql');

if (!fs.existsSync(userRolesTestFile)) {
  console.error('❌ user-roles 테스트 파일을 찾을 수 없습니다');
  process.exit(1);
}

if (!fs.existsSync(userRolesSchemaFile)) {
  console.error('❌ user-roles 스키마 파일을 찾을 수 없습니다');
  process.exit(1);
}

// user_roles SQL 파일 구문 검증
const userRolesTestContent = fs.readFileSync(userRolesTestFile, 'utf8');
const userRolesSchemaContent = fs.readFileSync(userRolesSchemaFile, 'utf8');

const hasUserRolesTable = userRolesSchemaContent.includes('CREATE TABLE') && userRolesSchemaContent.includes('user_roles');
const hasRoleTypeCheck = userRolesSchemaContent.includes("CHECK (role_type IN ('WORKER', 'ADMIN', 'MANAGER', 'FRANCHISE'))");
const hasUserRolesRLS = userRolesSchemaContent.includes('user_roles ENABLE ROW LEVEL SECURITY');
const hasUserRolesUtilityFunctions = userRolesSchemaContent.includes('get_user_roles') && userRolesSchemaContent.includes('has_role_in_organization');

let phase1Pass = true;

if (!hasUserRolesTable) {
  console.error('❌ CREATE TABLE user_roles가 없습니다');
  phase1Pass = false;
}

if (!hasRoleTypeCheck) {
  console.error('❌ role_type CHECK 제약조건이 없습니다');
  phase1Pass = false;
}

if (!hasUserRolesRLS) {
  console.error('❌ user_roles RLS 활성화가 없습니다');
  phase1Pass = false;
}

if (!hasUserRolesUtilityFunctions) {
  console.error('❌ user_roles 유틸리티 함수들이 없습니다');
  phase1Pass = false;
}

if (phase1Pass) {
  console.log('✅ Phase 1.1 user_roles 테이블 검증 통과');
}

// Phase 1.2: contracts 테이블 테스트
console.log('\n🔍 Phase 1.2: contracts 테이블 테스트');

const contractsTestFile = path.join(__dirname, 'database', 'contracts.test.sql');
const contractsSchemaFile = path.join(__dirname, '..', 'sql-scripts', '02-create-contracts-table.sql');

if (fs.existsSync(contractsTestFile) && fs.existsSync(contractsSchemaFile)) {
  const contractsTestContent = fs.readFileSync(contractsTestFile, 'utf8');
  const contractsSchemaContent = fs.readFileSync(contractsSchemaFile, 'utf8');
  
  // 계약 테이블 검증
  const hasContractsTable = contractsSchemaContent.includes('CREATE TABLE') && contractsSchemaContent.includes('contracts');
  const hasContractConstraints = contractsSchemaContent.includes('CHECK (contract_type IN') && contractsSchemaContent.includes('CHECK (status IN');
  const hasWageValidation = contractsSchemaContent.includes('CHECK (wage_amount >= 0)');
  const hasContractsRLS = contractsSchemaContent.includes('contracts ENABLE ROW LEVEL SECURITY');
  const hasContractsUtilityFunctions = contractsSchemaContent.includes('get_active_contracts') && contractsSchemaContent.includes('expire_contracts');
  
  let phase2Pass = true;
  
  if (!hasContractsTable) {
    console.error('❌ contracts 테이블 생성문 누락');
    phase2Pass = false;
  }
  if (!hasContractConstraints) {
    console.error('❌ 계약 타입/상태 제약조건 누락');
    phase2Pass = false;
  }
  if (!hasWageValidation) {
    console.error('❌ 급여 검증 제약조건 누락');
    phase2Pass = false;
  }
  if (!hasContractsRLS) {
    console.error('❌ contracts RLS 설정 누락');
    phase2Pass = false;
  }
  if (!hasContractsUtilityFunctions) {
    console.error('❌ 유틸리티 함수들 누락');
    phase2Pass = false;
  }
  
  if (phase2Pass) {
    console.log('✅ Phase 1.2 contracts 테이블 검증 통과');
  }
} else {
  console.log('⏭️  Phase 1.2 파일들이 준비되지 않았습니다');
}

// 테스트 케이스 확인
console.log('\n📋 테스트 케이스 확인:');
const testCases = [
  'user_roles 테이블 존재 여부',
  '필수 컬럼 존재 여부', 
  'role_type CHECK 제약조건',
  '유효한 역할 삽입',
  '사용자가 여러 역할을 가질 수 있는지'
];

testCases.forEach((testCase, index) => {
  if (userRolesTestContent.includes(testCase)) {
    console.log(`✅ ${testCase}`);
  } else {
    console.log(`❌ ${testCase} - 누락`);
  }
});

console.log('\n🎉 TDD Phase 1 (데이터베이스) 검증 완료');
console.log('📝 실제 데이터베이스 환경에서는 Supabase 콘솔에서 SQL을 실행하여 테스트하세요');

console.log('\n📋 다음 단계: Phase 1.3 - 타입 정의 및 유틸리티 함수');
console.log('   npm run test:db 명령으로 실제 데이터베이스 테스트 실행 가능');

console.log('\n🔗 실행 방법:');
console.log('1. Supabase Dashboard → SQL Editor');
console.log('2. sql-scripts/01-create-user-roles-table.sql 복사 붙여넣기 실행');
console.log('3. sql-scripts/02-create-contracts-table.sql 복사 붙여넣기 실행');
console.log('4. tests/database/*.test.sql 파일들로 테스트 실행');
console.log('5. 모든 테스트가 PASS 되는지 확인');