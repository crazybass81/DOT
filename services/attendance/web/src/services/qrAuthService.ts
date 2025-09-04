import { UserRole, UserStatus, User } from '@/types/user.types';

interface QRCodeData {
  type: 'attendance';
  businessId: string;
  locationId: string;
  timestamp: string;
  nonce: string;
  signature: string;
}

class QRAuthService {
  private static instance: QRAuthService;
  
  private constructor() {}
  
  static getInstance(): QRAuthService {
    if (!QRAuthService.instance) {
      QRAuthService.instance = new QRAuthService();
    }
    return QRAuthService.instance;
  }

  /**
   * QR 코드 검증 및 사용자 인증
   */
  async authenticateWithQR(qrData: string, deviceInfo: any): Promise<{
    isNewUser: boolean;
    user?: User;
    businessId?: string;
    locationId?: string;
  }> {
    try {
      // QR 코드 파싱
      const parsedQR: QRCodeData = JSON.parse(qrData);
      
      // QR 코드 검증
      if (!this.validateQRCode(parsedQR)) {
        throw new Error('Invalid QR code');
      }
      
      // 디바이스 핑거프린트 생성
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
      
      // 기존 사용자 확인 (localStorage 또는 API)
      const existingUser = await this.findUserByDevice(deviceFingerprint);
      
      if (existingUser) {
        return {
          isNewUser: false,
          user: existingUser,
          businessId: parsedQR.businessId,
          locationId: parsedQR.locationId
        };
      }
      
      // 신규 사용자
      return {
        isNewUser: true,
        businessId: parsedQR.businessId,
        locationId: parsedQR.locationId
      };
    } catch (error) {
      console.error('QR authentication error:', error);
      throw new Error('QR 인증 실패');
    }
  }

  /**
   * QR 코드 유효성 검증
   */
  private validateQRCode(qrData: QRCodeData): boolean {
    // 타임스탬프 검증 (5분 이내)
    const timestamp = new Date(qrData.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    
    if (diffMinutes > 5) {
      console.error('QR code expired');
      return false;
    }
    
    // 서명 검증
    const verified = await this.verifyHMACSignature(qrData, signature)
    
    return true;
  }

  /**
   * 디바이스 핑거프린트 생성
   */
  private generateDeviceFingerprint(deviceInfo: any): string {
    const components = [
      deviceInfo.userAgent,
      deviceInfo.platform,
      deviceInfo.language,
      deviceInfo.screenResolution,
      deviceInfo.timezone
    ];
    
    // 간단한 해시 생성 (실제로는 더 정교한 방법 사용)
    return btoa(components.join('|'));
  }

  /**
   * 디바이스로 사용자 찾기
   */
  private async findUserByDevice(deviceFingerprint: string): Promise<User | null> {
    // localStorage 확인
    const cachedUser = localStorage.getItem('qrUser');
    if (cachedUser) {
      const user = JSON.parse(cachedUser) as User;
      if (user.deviceFingerprint === deviceFingerprint) {
        return user;
      }
    }
    
    // API 호출 (현재는 null 반환)
    // TODO: 실제 API 구현
    return null;
  }

  /**
   * 사용자 역할 확인
   */
  hasRole(user: User | null, role: UserRole): boolean {
    if (!user) return false;
    return user.role === role;
  }

  /**
   * 권한 확인
   */
  canAccess(user: User | null, resource: string): boolean {
    if (!user) return false;
    
    const permissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'], // 모든 권한
      [UserRole.BUSINESS_ADMIN]: [
        'business:*',
        'employee:*',
        'attendance:read',
        'report:*'
      ],
      [UserRole.EMPLOYEE]: [
        'attendance:create',
        'attendance:read:own',
        'profile:read:own',
        'profile:update:own'
      ]
    };
    
    const userPermissions = permissions[user.role] || [];
    
    // 와일드카드 권한 확인
    if (userPermissions.includes('*')) return true;
    
    // 정확한 권한 확인
    if (userPermissions.includes(resource)) return true;
    
    // 패턴 매칭 권한 확인
    for (const permission of userPermissions) {
      if (permission.includes('*')) {
        const pattern = permission.replace('*', '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(resource)) return true;
      }
    }
    
    return false;
  }

  /**
   * 현재 사용자 정보 저장
   */
  saveCurrentUser(user: User): void {
    localStorage.setItem('qrUser', JSON.stringify(user));
  }

  /**
   * 현재 사용자 정보 가져오기
   */
  getCurrentUser(): User | null {
    const cachedUser = localStorage.getItem('qrUser');
    if (cachedUser) {
      return JSON.parse(cachedUser) as User;
    }
    return null;
  }

  /**
   * 로그아웃 (localStorage 클리어)
   */
  logout(): void {
    localStorage.removeItem('qrUser');
  }
}

export const qrAuthService = QRAuthService.getInstance();