import CryptoJS from 'crypto-js';
import QRCode from 'qrcode';

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
 * QR 코드 데이터 암호화
 */
export function encryptQRData(data: QRData): string {
  const jsonString = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
  return encrypted;
}

/**
 * QR 코드 데이터 복호화 및 검증
 */
export function decryptQRData(encryptedData: string): QRData | null {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    
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
 * 직원용 QR 코드 생성
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
  return await QRCode.toDataURL(encryptedData, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

/**
 * 조직용 체크인 QR 코드 생성
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
  return await QRCode.toDataURL(encryptedData, {
    width: 300,
    margin: 2,
    color: {
      dark: '#1f2937', // 진한 회색
      light: '#FFFFFF'
    }
  });
}

/**
 * 위치 기반 해시 생성 (보안 강화)
 */
export function generateLocationHash(latitude: number, longitude: number): string {
  const locationString = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
  return CryptoJS.MD5(locationString + ENCRYPTION_KEY).toString();
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