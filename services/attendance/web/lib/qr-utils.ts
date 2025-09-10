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
  // 임시로 Base64 인코딩 사용 (실제로는 AES 암호화 필요)
  return btoa(jsonString + '|' + ENCRYPTION_KEY);
}

/**
 * QR 코드 데이터 복호화 및 검증 (임시 구현)
 */
export function decryptQRData(encryptedData: string): QRData | null {
  try {
    // Base64 디코딩
    const decoded = atob(encryptedData);
    const [jsonString, key] = decoded.split('|');
    
    if (key !== ENCRYPTION_KEY) {
      throw new Error('Invalid encryption key');
    }
    
    if (!jsonString) {
      throw new Error('Failed to decrypt data');
    }
    
    const data = JSON.parse(jsonString) as QRData;
    
    // 타임스탬프 검증 (24시간 유효)
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24시간
    
    if (now - data.timestamp > maxAge) {
      throw new Error('QR code has expired');
    }
    
    return data;
  } catch (error) {
    console.error('QR 코드 복호화 실패:', error);
    return null;
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
function generateQRCodeSVG(data: string): string {
  // 실제로는 qrcode 라이브러리를 사용해야 하지만, 임시로 더미 SVG 생성
  const size = 300;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <rect x="50" y="50" width="200" height="200" fill="black" opacity="0.1"/>
      <text x="150" y="150" text-anchor="middle" font-family="Arial" font-size="12" fill="black">
        QR CODE
      </text>
      <text x="150" y="170" text-anchor="middle" font-family="Arial" font-size="8" fill="gray">
        ${data.substring(0, 20)}...
      </text>
    </svg>
  `;
  
  // SVG를 Data URL로 변환
  return `data:image/svg+xml;base64,${btoa(svg)}`;
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