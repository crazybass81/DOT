import { QRVerification } from '@/lib/services/qr-verification';

describe('QRVerification', () => {
  let qrService: QRVerification;
  const testBusinessId = 'restaurant_001';

  beforeEach(() => {
    process.env.QR_SECRET_KEY = 'test-secret-key-12345';
    qrService = new QRVerification();
  });

  describe('generateQRCode', () => {
    it('should generate QR code with valid token', async () => {
      const result = await qrService.generateQRCode(testBusinessId);
      
      expect(result.qrCode).toBeDefined();
      expect(result.qrCode).toContain('data:image/png;base64');
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should generate unique tokens for each call', async () => {
      const result1 = await qrService.generateQRCode(testBusinessId);
      const result2 = await qrService.generateQRCode(testBusinessId);
      
      expect(result1.token).not.toBe(result2.token);
    });

    it('should set correct expiration time (30 seconds)', async () => {
      const startTime = Date.now();
      const result = await qrService.generateQRCode(testBusinessId);
      
      const expectedExpiry = startTime + 30000;
      expect(result.expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 100);
      expect(result.expiresAt).toBeLessThanOrEqual(expectedExpiry + 100);
    });
  });

  describe('verifyQRCode', () => {
    it('should verify valid QR code successfully', async () => {
      const { token } = await qrService.generateQRCode(testBusinessId);
      
      const result = qrService.verifyQRCode(token, testBusinessId);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('검증 성공');
    });

    it('should reject expired QR code', async () => {
      const { token } = await qrService.generateQRCode(testBusinessId);
      
      // Mock expired token by waiting
      jest.useFakeTimers();
      jest.advanceTimersByTime(31000); // 31 seconds
      
      const result = qrService.verifyQRCode(token, testBusinessId);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('QR 코드가 만료되었습니다');
      
      jest.useRealTimers();
    });

    it('should reject QR code for wrong business', async () => {
      const { token } = await qrService.generateQRCode(testBusinessId);
      
      const result = qrService.verifyQRCode(token, 'wrong_business_id');
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('잘못된 사업장 QR 코드입니다');
    });

    it('should reject tampered QR code', () => {
      // Create a valid-looking but tampered token
      const tamperedData = {
        businessId: testBusinessId,
        timestamp: Date.now(),
        nonce: 'fake-nonce',
        expiresAt: Date.now() + 30000,
        signature: 'invalid-signature'
      };
      const tamperedToken = Buffer.from(JSON.stringify(tamperedData)).toString('base64');
      
      const result = qrService.verifyQRCode(tamperedToken, testBusinessId);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('유효하지 않은');
    });

    it('should handle invalid token format gracefully', () => {
      const invalidToken = 'not-a-valid-token';
      
      const result = qrService.verifyQRCode(invalidToken, testBusinessId);
      
      expect(result.valid).toBe(false);
      expect(result.message).toBe('QR 코드 검증 실패');
    });
  });

  describe('generateRefreshableQRCode', () => {
    it('should auto-refresh QR code every 30 seconds', async () => {
      const callback = jest.fn();
      
      const refreshHandle = await qrService.generateRefreshableQRCode(
        testBusinessId,
        callback
      );
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          qrCode: expect.any(String),
          token: expect.any(String),
          expiresAt: expect.any(Number),
          timeLeft: 30
        })
      );
      
      refreshHandle.stop();
    });
  });
});