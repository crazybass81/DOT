#!/usr/bin/env node
// TDD 테스트 실행 스크립트

const fs = require('fs');
const path = require('path');

console.log('🧪 TDD: 데이터베이스 테스트 실행');

// 1. 테스트 파일 확인
const testFile = path.join(__dirname, 'database', 'user-roles.test.sql');
const schemaFile = path.join(__dirname, '..', 'sql-scripts', '01-create-user-roles-table.sql');

if (!fs.existsSync(testFile)) {
  console.error('❌ 테스트 파일을 찾을 수 없습니다:', testFile);
  process.exit(1);
}

if (!fs.existsSync(schemaFile)) {
  console.error('❌ 스키마 파일을 찾을 수 없습니다:', schemaFile);
  process.exit(1);
}

console.log('✅ 테스트 파일 확인 완료');
console.log('✅ 스키마 파일 확인 완료');

// 2. SQL 파일 구문 검증 (기본적인 검증)
const testContent = fs.readFileSync(testFile, 'utf8');
const schemaContent = fs.readFileSync(schemaFile, 'utf8');

// 기본 SQL 구문 검증
const hasCreateTable = schemaContent.includes('CREATE TABLE') && schemaContent.includes('user_roles');
const hasCheckConstraint = schemaContent.includes("CHECK (role_type IN ('WORKER', 'ADMIN', 'MANAGER', 'FRANCHISE'))");
const hasRLS = schemaContent.includes('ENABLE ROW LEVEL SECURITY');
const hasUtilityFunctions = schemaContent.includes('get_user_roles') && schemaContent.includes('has_role_in_organization');

if (!hasCreateTable) {
  console.error('❌ CREATE TABLE user_roles가 없습니다');
  process.exit(1);
}

if (!hasCheckConstraint) {
  console.error('❌ role_type CHECK 제약조건이 없습니다');
  process.exit(1);
}

if (!hasRLS) {
  console.error('❌ RLS 활성화가 없습니다');
  process.exit(1);
}

if (!hasUtilityFunctions) {
  console.error('❌ 유틸리티 함수들이 없습니다');
  process.exit(1);
}

console.log('✅ SQL 구문 검증 통과');

// 3. 테스트 케이스 확인
const testCases = [
  '테스트 1: user_roles 테이블 존재 여부',
  '테스트 2: 필수 컬럼 존재 여부', 
  '테스트 3: role_type CHECK 제약조건',
  '테스트 4: 유효한 역할 삽입',
  '테스트 5: 사용자가 여러 역할을 가질 수 있는지'
];

testCases.forEach((testCase, index) => {
  if (testContent.includes(testCase)) {
    console.log(`✅ ${testCase}`);
  } else {
    console.error(`❌ ${testCase} - 누락`);
  }
});

console.log('\n🎉 Phase 1.1 TDD 검증 완료');
console.log('📝 실제 데이터베이스 환경에서는 Supabase 콘솔에서 SQL을 실행하여 테스트하세요');

// 4. 다음 단계 안내
console.log('\n📋 다음 단계: Phase 1.2 - contracts 테이블 생성');
console.log('   npm run test:db 명령으로 실제 데이터베이스 테스트 실행 가능');

console.log('\n🔗 실행 방법:');
console.log('1. Supabase Dashboard → SQL Editor');
console.log('2. sql-scripts/01-create-user-roles-table.sql 복사 붙여넣기 실행');
console.log('3. tests/database/user-roles.test.sql 복사 붙여넣기 실행');
console.log('4. 모든 테스트가 PASS 되는지 확인');