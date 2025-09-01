const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

class QRService {
  constructor() {
    this.QR_PREFIX = 'DOT_QR';
    this.QR_EXPIRY_MINUTES = 5;
  }

  // Validate QR code format
  validateQRCode(qrCode) {
    if (!qrCode || typeof qrCode !== 'string') {
      return false;
    }
    return qrCode.startsWith(`${this.QR_PREFIX}|`);
  }

  // Parse QR code data
  parseQRCode(qrCode) {
    if (!this.validateQRCode(qrCode)) {
      throw new Error('Invalid QR code format');
    }

    const parts = qrCode.split('|');
    if (parts.length < 4) {
      throw new Error('Incomplete QR code data');
    }

    return {
      prefix: parts[0],
      type: parts[1],
      timestamp: parseInt(parts[2]),
      locationId: parts[3],
      extraData: parts[4] || null
    };
  }

  // Check if QR code is expired
  isExpired(timestamp) {
    const now = Date.now();
    const expiryTime = this.QR_EXPIRY_MINUTES * 60 * 1000;
    return (now - timestamp) > expiryTime;
  }

  // Generate QR code data string
  generateQRData(type, locationId, extraData = null) {
    const timestamp = Date.now();
    const parts = [
      this.QR_PREFIX,
      type,
      timestamp,
      locationId
    ];
    
    if (extraData) {
      parts.push(extraData);
    }
    
    return parts.join('|');
  }

  // Generate QR code image
  async generateQRImage(data, options = {}) {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    };

    const qrOptions = { ...defaultOptions, ...options };
    
    try {
      // Generate as data URL
      const qrDataUrl = await QRCode.toDataURL(data, qrOptions);
      
      // Also generate as buffer for saving
      const qrBuffer = await QRCode.toBuffer(data, qrOptions);
      
      return {
        dataUrl: qrDataUrl,
        buffer: qrBuffer,
        data: data
      };
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  // Generate unique QR code for branch
  async generateBranchQR(branchId, branchName) {
    const qrId = uuidv4();
    const qrData = this.generateQRData('checkin', branchId, qrId);
    const qrImage = await this.generateQRImage(qrData);
    
    return {
      qrCode: qrId,
      qrData: qrData,
      branchId: branchId,
      branchName: branchName,
      imageUrl: qrImage.dataUrl,
      createdAt: new Date().toISOString()
    };
  }

  // Validate attendance QR for check-in
  validateAttendanceQR(qrCode, branchId) {
    try {
      const qrData = this.parseQRCode(qrCode);
      
      // Check if it's an attendance QR
      if (qrData.type !== 'checkin') {
        return { valid: false, error: 'Invalid QR type for attendance' };
      }
      
      // Check if QR is for correct branch
      if (qrData.locationId !== branchId) {
        return { valid: false, error: 'QR code for different location' };
      }
      
      // Check if expired
      if (this.isExpired(qrData.timestamp)) {
        return { valid: false, error: 'QR code expired' };
      }
      
      return { valid: true, data: qrData };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

module.exports = new QRService();