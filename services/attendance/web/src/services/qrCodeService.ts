import crypto from 'crypto';

interface QRCodePayload {
  type: 'attendance';
  businessId: string;
  locationId: string;
  businessName?: string;
  locationName?: string;
}

class QRCodeService {
  private static instance: QRCodeService;
  private readonly SECRET_KEY = process.env.NEXT_PUBLIC_QR_SECRET || 'default-secret-key';
  
  private constructor() {}
  
  static getInstance(): QRCodeService {
    if (!QRCodeService.instance) {
      QRCodeService.instance = new QRCodeService();
    }
    return QRCodeService.instance;
  }

  /**
   * QR 코드 데이터 생성
   */
  generateQRCode(payload: QRCodePayload): string {
    const timestamp = new Date().toISOString();
    const nonce = this.generateNonce();
    
    const data = {
      ...payload,
      timestamp,
      nonce
    };
    
    // 서명 생성
    const signature = this.generateSignature(data);
    
    const qrData = {
      ...data,
      signature
    };
    
    // Base64 인코딩 - unescape/encodeURIComponent로 유니코드 처리
    const jsonString = JSON.stringify(qrData);
    if (typeof window !== 'undefined') {
      // 브라우저 환경에서 유니코드 안전한 Base64 인코딩
      return btoa(unescape(encodeURIComponent(jsonString)));
    } else {
      // Node.js 환경
      return Buffer.from(jsonString).toString('base64');
    }
  }

  /**
   * QR 코드 URL 생성 - 직접 접근 가능한 URL
   */
  generateQRCodeURL(businessId: string, locationId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const qrData = this.generateQRCode({
      type: 'attendance',
      businessId,
      locationId
    });
    
    // URL로 직접 접근 가능하도록 생성
    return `${baseUrl}/qr/${encodeURIComponent(qrData)}`;
  }

  /**
   * QR 코드 검증
   */
  validateQRCode(encodedData: string): boolean {
    try {
      // Base64 디코딩 - 유니코드 처리
      let jsonStr: string;
      if (typeof window !== 'undefined') {
        // 브라우저 환경
        jsonStr = decodeURIComponent(escape(atob(encodedData)));
      } else {
        // Node.js 환경
        jsonStr = Buffer.from(encodedData, 'base64').toString('utf-8');
      }
      const data = JSON.parse(jsonStr);
      
      // 타임스탬프 확인 제거 - QR은 재발급 전까지 계속 유효
      // const timestamp = new Date(data.timestamp);
      // const now = new Date();
      // const diffHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
      
      // if (diffHours > 24) {
      //   console.error('QR code expired');
      //   return false;
      // }
      
      // 서명 검증
      const { signature, ...payload } = data;
      const expectedSignature = this.generateSignature(payload);
      
      if (signature !== expectedSignature) {
        console.error('Invalid signature');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('QR validation error:', error);
      return false;
    }
  }

  /**
   * QR 코드 파싱
   */
  parseQRCode(encodedData: string): any {
    try {
      let jsonStr: string;
      if (typeof window !== 'undefined') {
        // 브라우저 환경
        jsonStr = decodeURIComponent(escape(atob(encodedData)));
      } else {
        // Node.js 환경
        jsonStr = Buffer.from(encodedData, 'base64').toString('utf-8');
      }
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('QR parsing error:', error);
      return null;
    }
  }

  /**
   * 난수 생성
   */
  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * HMAC 서명 생성
   */
  private generateSignature(data: any): string {
    const message = JSON.stringify(data);
    
    // 브라우저 환경에서는 Web Crypto API 사용
    if (typeof window !== 'undefined') {
      // 간단한 해시 (실제로는 Web Crypto API 사용)
      return btoa(message + this.SECRET_KEY).substring(0, 32);
    }
    
    // Node.js 환경
    try {
      const hmac = crypto.createHmac('sha256', this.SECRET_KEY);
      hmac.update(message);
      return hmac.digest('hex');
    } catch {
      // Fallback
      return btoa(message + this.SECRET_KEY).substring(0, 32);
    }
  }

  /**
   * QR 코드 이미지 URL 생성 (Google Charts API)
   */
  generateQRImageURL(data: string, size: number = 200): string {
    const encoded = encodeURIComponent(data);
    return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encoded}`;
  }
}

export const qrCodeService = QRCodeService.getInstance();