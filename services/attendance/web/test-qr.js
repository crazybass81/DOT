// QR 시스템 테스트 스크립트
const { encryptQRData, decryptQRData, validateQRForAttendance } = require('./lib/qr-utils.ts');

// 테스트 데이터 생성
console.log('=== QR 코드 시스템 테스트 ===\n');

// 1. 직원용 QR 코드 데이터 생성
const employeeData = {
  employeeId: 'EMP001',
  organizationId: 'ORG001',
  name: '홍길동',
  position: '개발팀 매니저',
  type: 'employee',
  timestamp: Date.now()
};

console.log('1. 직원용 QR 데이터:');
console.log(JSON.stringify(employeeData, null, 2));

// Base64 인코딩 (encryptQRData 함수와 동일한 로직)
const ENCRYPTION_KEY = 'dot-attendance-qr-key-2024';
const employeeEncrypted = btoa(JSON.stringify(employeeData) + '|' + ENCRYPTION_KEY);
console.log('암호화된 데이터:', employeeEncrypted);

// 2. 조직용 QR 코드 데이터 생성
const organizationData = {
  organizationId: 'ORG001',
  name: '본사 사무실',
  location: {
    latitude: 37.5665,
    longitude: 126.9780,
    radius: 100
  },
  type: 'organization',
  timestamp: Date.now()
};

console.log('\n2. 조직용 QR 데이터:');
console.log(JSON.stringify(organizationData, null, 2));

const organizationEncrypted = btoa(JSON.stringify(organizationData) + '|' + ENCRYPTION_KEY);
console.log('암호화된 데이터:', organizationEncrypted);

// 3. QR 코드 URL 생성
const baseUrl = 'http://localhost:3002/qr';
const employeeQRUrl = `${baseUrl}/${encodeURIComponent(employeeEncrypted)}`;
const organizationQRUrl = `${baseUrl}/${encodeURIComponent(organizationEncrypted)}`;

console.log('\n3. 생성된 QR URL:');
console.log('직원용 QR URL:', employeeQRUrl);
console.log('조직용 QR URL:', organizationQRUrl);

console.log('\n=== 테스트 완료 ===');
console.log('위 URL들을 브라우저에서 테스트할 수 있습니다.');
console.log('또는 QR 생성기에서 암호화된 데이터를 직접 입력하여 테스트하세요.');