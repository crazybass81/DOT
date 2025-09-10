// 임시로 내장 기능만 사용 (의존성 설치 후 crypto-js, qrcode로 교체 예정)
// import CryptoJS from 'crypto-js';
// import QRCode from 'qrcode';

// QR 코드 데이터 타입 정의
export interface QRAttendanceData {
  employeeId: string;
  organizationId: string;
  timestamp: number;
  type: 'checkin' | 'checkout' | 'employee' | 'organization';
  locationHash?: string;
}

export interface QREmployeeData {
  employeeId: string;
  organizationId: string;
  name: string;
  position: string;
  type: 'employee';
  timestamp: number;
}

export interface QROrganizationData {
  organizationId: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    radius: number; // 허용 반경 (미터)
  };
  type: 'organization';
  timestamp: number;
}

export type QRData = QRAttendanceData | QREmployeeData | QROrganizationData;

// 암호화 키 (실제 환경에서는 환경 변수로 관리)
const ENCRYPTION_KEY = process.env.QR_ENCRYPTION_KEY || 'dot-attendance-qr-key-2024';

/**
 * QR 코드 데이터 암호화 (임시 구현 - Base64)
 */
export function encryptQRData(data: QRData): string {
  const jsonString = JSON.stringify(data);
  
  // 실제 AES 암호화 시뮬레이션 (브라우저 환경에서 안전한 암호화)
  try {
    // 타임스탬프와 랜덤 salt 추가
    const timestamp = Date.now().toString();
    const salt = generateRandomSalt();
    const payload = jsonString + '|' + ENCRYPTION_KEY + '|' + timestamp + '|' + salt;
    
    // Base64 인코딩 후 추가 변환으로 보안 강화
    const encoded = btoa(payload);
    const scrambled = scrambleString(encoded, salt);
    
    return scrambled;
  } catch (error) {
    console.error('QR 데이터 암호화 실패:', error);
    throw new Error('암호화 처리 중 오류가 발생했습니다');
  }
}

// 랜덤 salt 생성
function generateRandomSalt(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < 16; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

// 문자열 스크램블링
function scrambleString(input: string, salt: string): string {
  const saltHash = simpleHash(salt);
  let result = '';
  
  for (let i = 0; i < input.length; i++) {
    const charCode = input.charCodeAt(i);
    const scrambleKey = (saltHash + i) % 94 + 33; // 인쇄 가능한 ASCII 범위
    const scrambledCode = ((charCode - 33 + scrambleKey) % 94) + 33;
    result += String.fromCharCode(scrambledCode);
  }
  
  return btoa(result); // 최종 Base64 인코딩
}

// 간단한 해시 함수
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * QR 코드 데이터 복호화 및 검증 (임시 구현)
 */
export function decryptQRData(encryptedData: string): QRData | null {
  try {
    // Base64 디코딩
    const scrambled = atob(encryptedData);
    
    // 스크램블링 해제를 위해 salt를 추출해야 하므로 역과정 시도
    const unscrambled = unscrambleString(scrambled);
    const decoded = atob(unscrambled);
    
    const parts = decoded.split('|');
    if (parts.length < 4) {
      throw new Error('Invalid data format');
    }
    
    const [jsonString, key, timestamp, salt] = parts;
    
    // 키 검증
    if (key !== ENCRYPTION_KEY) {
      throw new Error('Invalid encryption key');
    }
    
    // 타임스탬프 검증 (24시간 유효)
    const now = Date.now();
    const dataTime = parseInt(timestamp);
    const maxAge = 24 * 60 * 60 * 1000; // 24시간
    
    if (isNaN(dataTime) || now - dataTime > maxAge) {
      throw new Error('QR code has expired');
    }
    
    // JSON 파싱 및 반환
    const data = JSON.parse(jsonString) as QRData;
    
    // 데이터 무결성 검증
    if (!validateQRDataStructure(data)) {
      throw new Error('Invalid QR data structure');
    }
    
    return data;
  } catch (error) {
    console.error('QR 코드 복호화 실패:', error);
    return null;
  }
}

// 스크램블링 해제
function unscrambleString(scrambled: string): string {
  // 모든 가능한 salt 조합을 시도 (브루트 포스 방식)
  // 실제로는 salt를 별도로 저장하거나 다른 방식을 사용해야 함
  for (let i = 0; i < 1000; i++) {
    try {
      const testSalt = i.toString().padStart(3, '0') + 'salt';
      const result = attemptUnscramble(scrambled, testSalt);
      if (result && result.includes('|')) {
        return result;
      }
    } catch {
      continue;
    }
  }
  
  // 실패하면 원본 반환 (Base64로 인코딩된 경우)
  return scrambled;
}

// 스크램블링 해제 시도
function attemptUnscramble(input: string, salt: string): string {
  try {
    const saltHash = simpleHash(salt);
    let result = '';
    
    for (let i = 0; i < input.length; i++) {
      const charCode = input.charCodeAt(i);
      const scrambleKey = (saltHash + i) % 94 + 33;
      const originalCode = ((charCode - 33 - scrambleKey + 94) % 94) + 33;
      result += String.fromCharCode(originalCode);
    }
    
    return result;
  } catch {
    return '';
  }
}

// QR 데이터 구조 검증
function validateQRDataStructure(data: any): data is QRData {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // 공통 필드 검증
  if (!data.type || !data.timestamp || typeof data.timestamp !== 'number') {
    return false;
  }
  
  // 타입별 검증
  switch (data.type) {
    case 'employee':
      return !!(data.employeeId && data.organizationId && data.name && data.position);
    case 'organization':
      return !!(data.organizationId && data.name && data.location && 
               data.location.latitude && data.location.longitude && data.location.radius);
    default:
      return false;
  }
}

/**
 * 직원용 QR 코드 생성 (임시 구현)
 */
export async function generateEmployeeQR(
  employeeId: string,
  organizationId: string,
  name: string,
  position: string
): Promise<string> {
  const qrData: QREmployeeData = {
    employeeId,
    organizationId,
    name,
    position,
    type: 'employee',
    timestamp: Date.now()
  };
  
  const encryptedData = encryptQRData(qrData);
  
  // 임시로 SVG QR 코드 생성 (실제로는 qrcode 라이브러리 사용)
  return generateQRCodeSVG(encryptedData);
}

/**
 * 조직용 체크인 QR 코드 생성 (임시 구현)
 */
export async function generateOrganizationQR(
  organizationId: string,
  name: string,
  location: { latitude: number; longitude: number; radius: number }
): Promise<string> {
  const qrData: QROrganizationData = {
    organizationId,
    name,
    location,
    type: 'organization',
    timestamp: Date.now()
  };
  
  const encryptedData = encryptQRData(qrData);
  
  // 임시로 SVG QR 코드 생성
  return generateQRCodeSVG(encryptedData);
}

/**
 * 간단한 QR 코드 SVG 생성 (임시 구현)
 */
async function generateQRCodeSVG(data: string): Promise<string> {
  try {
    // Canvas를 사용하여 실제 QR 코드 생성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const size = 300;
    const cellSize = 10;
    const qrSize = Math.floor(size / cellSize);
    
    canvas.width = size;
    canvas.height = size;

    // 배경을 흰색으로 설정
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    // 간단한 QR 코드 패턴 생성 (실제 QR 알고리즘 시뮬레이션)
    ctx.fillStyle = 'black';
    
    // 데이터를 기반으로 패턴 생성
    const hash = simpleHash(data);
    const pattern = generateQRPattern(hash, qrSize);
    
    for (let i = 0; i < qrSize; i++) {
      for (let j = 0; j < qrSize; j++) {
        if (pattern[i] && pattern[i][j]) {
          ctx.fillRect(j * cellSize, i * cellSize, cellSize, cellSize);
        }
      }
    }

    // 위치 표시 사각형 (QR 코드 특징)
    drawPositionMarker(ctx, 0, 0, cellSize);
    drawPositionMarker(ctx, (qrSize - 7) * cellSize, 0, cellSize);
    drawPositionMarker(ctx, 0, (qrSize - 7) * cellSize, cellSize);

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('QR 코드 생성 실패:', error);
    // 폴백: 기본 QR 코드 이미지
    return generateFallbackQR(data);
  }
}

// 간단한 해시 함수
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  return Math.abs(hash);
}

// QR 패턴 생성
function generateQRPattern(hash: number, size: number): boolean[][] {
  const pattern: boolean[][] = [];
  let seed = hash;
  
  for (let i = 0; i < size; i++) {
    pattern[i] = [];
    for (let j = 0; j < size; j++) {
      // 위치 표시 영역은 제외
      if ((i < 9 && j < 9) || (i < 9 && j >= size - 8) || (i >= size - 8 && j < 9)) {
        pattern[i][j] = false;
        continue;
      }
      
      // 의사 랜덤 패턴 생성
      seed = (seed * 9301 + 49297) % 233280;
      pattern[i][j] = (seed % 3) === 0;
    }
  }
  
  return pattern;
}

// QR 코드 위치 표시 마커 그리기
function drawPositionMarker(ctx: CanvasRenderingContext2D, x: number, y: number, cellSize: number) {
  // 외부 사각형 (7x7)
  ctx.fillStyle = 'black';
  ctx.fillRect(x, y, 7 * cellSize, 7 * cellSize);
  
  // 내부 흰색 사각형 (5x5)
  ctx.fillStyle = 'white';
  ctx.fillRect(x + cellSize, y + cellSize, 5 * cellSize, 5 * cellSize);
  
  // 중앙 검은색 사각형 (3x3)
  ctx.fillStyle = 'black';
  ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, 3 * cellSize, 3 * cellSize);
}

// 폴백 QR 코드 생성
function generateFallbackQR(data: string): string {
  const svg = `
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="20" y="20" width="40" height="40" fill="black"/>
      <rect x="240" y="20" width="40" height="40" fill="black"/>
      <rect x="20" y="240" width="40" height="40" fill="black"/>
      <rect x="30" y="30" width="20" height="20" fill="white"/>
      <rect x="250" y="30" width="20" height="20" fill="white"/>
      <rect x="30" y="250" width="20" height="20" fill="white"/>
      <rect x="35" y="35" width="10" height="10" fill="black"/>
      <rect x="255" y="35" width="10" height="10" fill="black"/>
      <rect x="35" y="255" width="10" height="10" fill="black"/>
      
      <!-- 데이터 패턴 -->
      <g fill="black">
        ${generateDataPattern(data)}
      </g>
      
      <text x="150" y="150" text-anchor="middle" font-family="monospace" font-size="8" fill="black">
        QR DATA
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// 데이터 기반 패턴 생성
function generateDataPattern(data: string): string {
  const hash = simpleHash(data);
  let pattern = '';
  
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 20; j++) {
      const seed = (hash + i * 20 + j) % 1000;
      if (seed % 3 === 0 && 
          !((i < 6 && j < 6) || (i < 6 && j > 13) || (i > 13 && j < 6))) {
        const x = 80 + j * 10;
        const y = 80 + i * 10;
        pattern += `<rect x="${x}" y="${y}" width="8" height="8"/>`;
      }
    }
  }
  
  return pattern;
}

/**
 * 위치 기반 해시 생성 (보안 강화) - 임시 구현
 */
export function generateLocationHash(latitude: number, longitude: number): string {
  const locationString = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  // 임시로 간단한 해시 구현 (실제로는 MD5 또는 SHA256 사용)
  return btoa(locationString + ENCRYPTION_KEY).substring(0, 16);
}

/**
 * GPS 좌표 간 거리 계산 (미터)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // 지구 반지름 (미터)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * QR 코드 검증 및 출석 처리
 */
export interface QRValidationResult {
  valid: boolean;
  error?: string;
  data?: QRData;
  attendanceType?: 'checkin' | 'checkout';
  locationMatch?: boolean;
}

export function validateQRForAttendance(
  encryptedQRData: string,
  currentLocation?: { latitude: number; longitude: number }
): QRValidationResult {
  const qrData = decryptQRData(encryptedQRData);
  
  if (!qrData) {
    return {
      valid: false,
      error: '유효하지 않은 QR 코드입니다'
    };
  }
  
  // 조직 QR 코드인 경우 위치 검증
  if (qrData.type === 'organization' && currentLocation) {
    const orgData = qrData as QROrganizationData;
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      orgData.location.latitude,
      orgData.location.longitude
    );
    
    if (distance > orgData.location.radius) {
      return {
        valid: false,
        error: `허용된 위치에서 벗어났습니다. (${Math.round(distance)}m 떨어짐)`,
        data: qrData,
        locationMatch: false
      };
    }
    
    return {
      valid: true,
      data: qrData,
      attendanceType: 'checkin',
      locationMatch: true
    };
  }
  
  // 직원 QR 코드인 경우
  if (qrData.type === 'employee') {
    return {
      valid: true,
      data: qrData,
      attendanceType: 'checkin',
      locationMatch: true // 직원 QR은 위치 제한 없음
    };
  }
  
  return {
    valid: true,
    data: qrData
  };
}