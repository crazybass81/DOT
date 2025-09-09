import * as QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export interface QRCodeConfig {
  type: 'check-in' | 'check-out' | 'event' | 'visitor';
  branchId: string;
  branchName: string;
  locationId?: string;
  eventId?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface QRCodeData {
  id: string;
  type: QRCodeConfig['type'];
  branchId: string;
  branchName: string;
  locationId?: string;
  eventId?: string;
  createdAt: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  signature: string;
}

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  quality?: number;
}

export interface BatchQRRequest {
  branches: Array<{
    branchId: string;
    branchName: string;
    types: QRCodeConfig['type'][];
    locationIds?: string[];
  }>;
  options?: QRCodeOptions;
  expiresAt?: Date;
}

export class QRGenerator {
  private static readonly DEFAULT_OPTIONS: QRCodeOptions = {
    width: 256,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    },
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92
  };

  /**
   * Generate a unique signature for QR code data validation
   */
  private static generateSignature(data: Omit<QRCodeData, 'signature'>): string {
    const payload = JSON.stringify({
      id: data.id,
      type: data.type,
      branchId: data.branchId,
      createdAt: data.createdAt.toISOString(),
      expiresAt: data.expiresAt?.toISOString()
    });
    
    // In production, use a proper HMAC with secret key
    return btoa(payload).slice(-16);
  }

  /**
   * Create QR code data structure
   */
  public static createQRData(config: QRCodeConfig): QRCodeData {
    const id = uuidv4();
    const createdAt = new Date();
    
    const qrData: Omit<QRCodeData, 'signature'> = {
      id,
      type: config.type,
      branchId: config.branchId,
      branchName: config.branchName,
      locationId: config.locationId,
      eventId: config.eventId,
      createdAt,
      expiresAt: config.expiresAt,
      metadata: config.metadata
    };

    return {
      ...qrData,
      signature: this.generateSignature(qrData)
    };
  }

  /**
   * Generate QR code as base64 data URL
   */
  public static async generateQRCode(
    data: QRCodeData,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      const qrString = JSON.stringify(data);
      
      const dataUrl = await QRCode.toDataURL(qrString, {
        width: finalOptions.width,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel,
        type: finalOptions.type
      });

      return dataUrl;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate QR code as SVG string
   */
  public static async generateQRCodeSVG(
    data: QRCodeData,
    options: QRCodeOptions = {}
  ): Promise<string> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    
    try {
      const qrString = JSON.stringify(data);
      
      const svg = await QRCode.toString(qrString, {
        type: 'svg',
        width: finalOptions.width,
        margin: finalOptions.margin,
        color: finalOptions.color,
        errorCorrectionLevel: finalOptions.errorCorrectionLevel
      });

      return svg;
    } catch (error) {
      throw new Error(`Failed to generate QR code SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate multiple QR codes for batch processing
   */
  public static async generateBatchQRCodes(
    request: BatchQRRequest
  ): Promise<Array<{
    qrData: QRCodeData;
    dataUrl: string;
    svg: string;
    filename: string;
  }>> {
    const results = [];

    for (const branch of request.branches) {
      for (const type of branch.types) {
        // Generate for branch-level QR codes
        const branchConfig: QRCodeConfig = {
          type,
          branchId: branch.branchId,
          branchName: branch.branchName,
          expiresAt: request.expiresAt,
          metadata: {
            batchGenerated: true,
            generatedAt: new Date().toISOString()
          }
        };

        const qrData = this.createQRData(branchConfig);
        const dataUrl = await this.generateQRCode(qrData, request.options);
        const svg = await this.generateQRCodeSVG(qrData, request.options);
        
        results.push({
          qrData,
          dataUrl,
          svg,
          filename: `${branch.branchName}_${type}_${qrData.id.slice(0, 8)}`
        });

        // Generate for specific locations if provided
        if (branch.locationIds) {
          for (const locationId of branch.locationIds) {
            const locationConfig: QRCodeConfig = {
              ...branchConfig,
              locationId,
              metadata: {
                ...branchConfig.metadata,
                locationId
              }
            };

            const locationQRData = this.createQRData(locationConfig);
            const locationDataUrl = await this.generateQRCode(locationQRData, request.options);
            const locationSVG = await this.generateQRCodeSVG(locationQRData, request.options);

            results.push({
              qrData: locationQRData,
              dataUrl: locationDataUrl,
              svg: locationSVG,
              filename: `${branch.branchName}_${locationId}_${type}_${locationQRData.id.slice(0, 8)}`
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Validate QR code data
   */
  public static validateQRData(data: QRCodeData): {
    isValid: boolean;
    errors: string[];
    isExpired?: boolean;
  } {
    const errors: string[] = [];

    // Check required fields
    if (!data.id) errors.push('Missing QR code ID');
    if (!data.type) errors.push('Missing QR code type');
    if (!data.branchId) errors.push('Missing branch ID');
    if (!data.branchName) errors.push('Missing branch name');
    if (!data.signature) errors.push('Missing signature');

    // Validate signature
    const expectedSignature = this.generateSignature({
      id: data.id,
      type: data.type,
      branchId: data.branchId,
      branchName: data.branchName,
      locationId: data.locationId,
      eventId: data.eventId,
      createdAt: data.createdAt,
      expiresAt: data.expiresAt,
      metadata: data.metadata
    });

    if (data.signature !== expectedSignature) {
      errors.push('Invalid signature - QR code may be tampered with');
    }

    // Check expiration
    const isExpired = data.expiresAt && new Date() > data.expiresAt;

    return {
      isValid: errors.length === 0,
      errors,
      isExpired
    };
  }

  /**
   * Parse QR code string back to data
   */
  public static parseQRCode(qrString: string): QRCodeData | null {
    try {
      const data = JSON.parse(qrString) as QRCodeData;
      
      // Convert date strings back to Date objects
      if (data.createdAt) {
        data.createdAt = new Date(data.createdAt);
      }
      if (data.expiresAt) {
        data.expiresAt = new Date(data.expiresAt);
      }

      return data;
    } catch (error) {
      console.error('Failed to parse QR code:', error);
      return null;
    }
  }

  /**
   * Generate print-optimized QR code with additional styling
   */
  public static async generatePrintQRCode(
    data: QRCodeData,
    options: QRCodeOptions & {
      includeLabel?: boolean;
      labelText?: string;
      includeExpiry?: boolean;
    } = {}
  ): Promise<{
    dataUrl: string;
    svg: string;
    printCSS: string;
  }> {
    const printOptions: QRCodeOptions = {
      width: 300,
      margin: 4,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H', // High error correction for print
      ...options
    };

    const dataUrl = await this.generateQRCode(data, printOptions);
    const svg = await this.generateQRCodeSVG(data, printOptions);

    const printCSS = `
      .qr-print-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        page-break-inside: avoid;
        margin: 20px;
        padding: 15px;
        border: 2px solid #333;
        border-radius: 8px;
        background: white;
      }
      
      .qr-print-code {
        margin-bottom: 15px;
      }
      
      .qr-print-label {
        font-family: 'Arial', sans-serif;
        font-size: 14px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 5px;
        color: #333;
      }
      
      .qr-print-info {
        font-family: 'Arial', sans-serif;
        font-size: 10px;
        text-align: center;
        color: #666;
        line-height: 1.4;
      }
      
      .qr-print-expiry {
        font-size: 9px;
        color: #999;
        margin-top: 5px;
      }
      
      @media print {
        .qr-print-container {
          break-inside: avoid;
          -webkit-break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    `;

    return {
      dataUrl,
      svg,
      printCSS
    };
  }

  /**
   * Create download blob for QR code
   */
  public static createDownloadBlob(
    dataUrl: string,
    type: 'png' | 'svg',
    filename: string
  ): { blob: Blob; url: string; filename: string } {
    let blob: Blob;
    
    if (type === 'svg') {
      // For SVG, we need to convert the data URL to SVG content
      const svgContent = atob(dataUrl.split(',')[1]);
      blob = new Blob([svgContent], { type: 'image/svg+xml' });
    } else {
      // For PNG, convert data URL to blob
      const byteCharacters = atob(dataUrl.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: 'image/png' });
    }

    const url = URL.createObjectURL(blob);
    const finalFilename = `${filename}.${type}`;

    return { blob, url, filename: finalFilename };
  }

  /**
   * Get QR code info for display
   */
  public static getQRCodeInfo(data: QRCodeData): {
    displayName: string;
    description: string;
    statusColor: string;
    isExpired: boolean;
  } {
    const isExpired = data.expiresAt ? new Date() > data.expiresAt : false;
    
    const typeLabels = {
      'check-in': 'Check In',
      'check-out': 'Check Out',
      'event': 'Event',
      'visitor': 'Visitor'
    };

    const displayName = `${data.branchName} - ${typeLabels[data.type]}`;
    
    let description = `Branch: ${data.branchName}`;
    if (data.locationId) description += ` | Location: ${data.locationId}`;
    if (data.eventId) description += ` | Event: ${data.eventId}`;
    
    const statusColor = isExpired ? '#ef4444' : '#10b981';

    return {
      displayName,
      description,
      statusColor,
      isExpired
    };
  }
}

export default QRGenerator;