import crypto from 'crypto';
import QRCode from 'qrcode';

export interface QRCodeData {
  qrCode: string;
  token: string;
  expiresAt: number;
  timeLeft?: number;
}

export interface QRVerificationResult {
  valid: boolean;
  message: string;
}

export interface RefreshableQRCode {
  stop: () => void;
}

export class QRVerification {
  private readonly SECRET_KEY: string;
  private readonly EXPIRY_TIME = 30000; // 30 seconds

  constructor() {
    this.SECRET_KEY = process.env.QR_SECRET_KEY || 'default-secret-key';
  }

  /**
   * Generate dynamic QR code with expiration
   */
  async generateQRCode(businessId: string): Promise<QRCodeData> {
    const timestamp = Date.now();
    const expiresAt = timestamp + this.EXPIRY_TIME;
    const nonce = crypto.randomBytes(16).toString('hex');

    const payload = {
      businessId,
      timestamp,
      nonce,
      expiresAt
    };

    // Create HMAC signature
    const signature = this.createSignature(payload);
    const token = Buffer.from(JSON.stringify({
      ...payload,
      signature
    })).toString('base64');

    // Generate QR code image
    const qrCode = await QRCode.toDataURL(token, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300
    });

    return { qrCode, token, expiresAt };
  }

  /**
   * Verify QR code token
   */
  verifyQRCode(token: string, businessId: string): QRVerificationResult {
    try {
      const decoded = JSON.parse(
        Buffer.from(token, 'base64').toString()
      );

      const { signature, ...payload } = decoded;

      // Check expiration
      if (Date.now() > payload.expiresAt) {
        return { valid: false, message: 'QR 코드가 만료되었습니다' };
      }

      // Check business ID
      if (payload.businessId !== businessId) {
        return { valid: false, message: '잘못된 사업장 QR 코드입니다' };
      }

      // Verify signature
      const expectedSignature = this.createSignature(payload);
      if (signature !== expectedSignature) {
        return { valid: false, message: '유효하지 않은 QR 코드입니다' };
      }

      return { valid: true, message: '검증 성공' };
    } catch (error) {
      return { valid: false, message: 'QR 코드 검증 실패' };
    }
  }

  /**
   * Generate auto-refreshing QR code
   */
  async generateRefreshableQRCode(
    businessId: string,
    callback: (data: QRCodeData) => void
  ): Promise<RefreshableQRCode> {
    let intervalId: NodeJS.Timeout;
    let countdownId: NodeJS.Timeout;
    let timeLeft = 30;

    const generateAndEmit = async () => {
      const qrData = await this.generateQRCode(businessId);
      timeLeft = 30;
      callback({ ...qrData, timeLeft });
    };

    // Initial generation
    await generateAndEmit();

    // Set up refresh interval (every 30 seconds)
    intervalId = setInterval(generateAndEmit, this.EXPIRY_TIME);

    // Set up countdown interval (every second)
    countdownId = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        timeLeft = 30;
      }
    }, 1000);

    return {
      stop: () => {
        clearInterval(intervalId);
        clearInterval(countdownId);
      }
    };
  }

  /**
   * Create HMAC signature for payload
   */
  private createSignature(payload: any): string {
    return crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Generate QR code for display (React component helper)
   */
  async generateDisplayQRCode(data: string): Promise<string> {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
  }
}