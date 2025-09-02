// QR Code type definitions for the attendance system

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

export interface QRCodeValidationResult {
  isValid: boolean;
  errors: string[];
  isExpired?: boolean;
  qrData?: QRCodeData;
}

export interface QRCodeInfo {
  displayName: string;
  description: string;
  statusColor: string;
  isExpired: boolean;
}

export interface GeneratedQRResult {
  qrData: QRCodeData;
  dataUrl: string;
  svg: string;
  filename: string;
  info: QRCodeInfo;
}

export interface BatchQRResult {
  qrData: QRCodeData;
  dataUrl: string;
  svg: string;
  filename: string;
}

export interface StoredQRCode {
  id: string;
  type: 'check-in' | 'check-out' | 'event' | 'visitor';
  branch_id: string;
  branch_name: string;
  location_id?: string;
  event_id?: string;
  created_at: string;
  expires_at?: string;
  metadata: any;
  signature: string;
  image_url: string;
  storage_path: string;
  is_active: boolean;
  used_count: number;
  last_used_at?: string;
  created_by?: string;
  updated_at: string;
}

export interface QRCodeScan {
  id: string;
  qr_code_id: string;
  user_id?: string;
  scanned_at: string;
  ip_address?: string;
  user_agent?: string;
  scan_location?: {
    lat: number;
    lng: number;
  };
  scan_result: 'success' | 'expired' | 'invalid' | 'error';
  error_message?: string;
  metadata?: Record<string, any>;
}

export interface QRCodeStats {
  total_qr_codes: number;
  active_qr_codes: number;
  expired_qr_codes: number;
  total_scans: number;
  successful_scans: number;
  failed_scans: number;
  most_used_qr_id?: string;
  most_used_qr_count: number;
}

export interface Branch {
  id: string;
  name: string;
  locations?: string[];
  description?: string;
  address?: string;
  timezone?: string;
  isActive?: boolean;
}

export interface QRScanResult {
  timestamp: Date;
  data: string;
  isValid: boolean;
  qrData?: QRCodeData;
  errors?: string[];
  isExpired?: boolean;
}

export interface SupabaseQRCodeResponse {
  success: boolean;
  qrData: QRCodeData;
  dataUrl: string;
  imageUrl: string;
  storagePath: string;
  error?: string;
}

export interface SupabaseBatchResponse {
  success: boolean;
  count: number;
  results: Array<{
    qrData: QRCodeData;
    dataUrl: string;
    imageUrl: string;
    filename: string;
    storagePath: string;
  }>;
  error?: string;
}

export interface QRCodeHookState {
  isLoading: boolean;
  error: string | null;
  generatedQRs: GeneratedQRResult[];
}

// Event types for QR code operations
export type QRCodeEvent = 
  | { type: 'generated'; qrData: QRCodeData; dataUrl: string }
  | { type: 'scanned'; qrData: QRCodeData; rawData: string }
  | { type: 'validated'; qrData: QRCodeData; isValid: boolean }
  | { type: 'expired'; qrData: QRCodeData }
  | { type: 'activated'; qrCodeId: string }
  | { type: 'deactivated'; qrCodeId: string }
  | { type: 'deleted'; qrCodeId: string };

// Print configuration
export interface QRCodePrintOptions extends QRCodeOptions {
  includeLabel?: boolean;
  labelText?: string;
  includeExpiry?: boolean;
  printCSS?: string;
}

export interface QRCodePrintResult {
  dataUrl: string;
  svg: string;
  printCSS: string;
}

// Download configuration
export interface QRCodeDownload {
  blob: Blob;
  url: string;
  filename: string;
}

// Camera configuration for QR scanner
export interface QRScannerCamera {
  id: string;
  label: string;
}

export interface QRScannerConfig {
  preferredCamera?: string;
  returnDetailedScanResult?: boolean;
  highlightScanRegion?: boolean;
  highlightCodeOutline?: boolean;
  maxScansPerSecond?: number;
  calculateScanRegion?: boolean;
}

// Error types
export class QRCodeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QRCodeError';
  }
}

export class QRValidationError extends QRCodeError {
  constructor(message: string, public validationErrors: string[]) {
    super(message, 'VALIDATION_ERROR', { validationErrors });
    this.name = 'QRValidationError';
  }
}

export class QRStorageError extends QRCodeError {
  constructor(message: string, public storageDetails?: any) {
    super(message, 'STORAGE_ERROR', storageDetails);
    this.name = 'QRStorageError';
  }
}

// Utility types
export type QRCodeType = QRCodeConfig['type'];
export type QRCodeStatus = 'active' | 'inactive' | 'expired';
export type QRScanResultType = 'success' | 'expired' | 'invalid' | 'error';
export type QRCodeFormat = 'png' | 'svg' | 'jpeg' | 'webp';
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// Constants
export const QR_CODE_TYPES: Record<QRCodeType, string> = {
  'check-in': 'Check In',
  'check-out': 'Check Out',
  'event': 'Event',
  'visitor': 'Visitor'
};

export const ERROR_CORRECTION_LEVELS: Record<ErrorCorrectionLevel, string> = {
  'L': 'Low (7%)',
  'M': 'Medium (15%)',
  'Q': 'Quartile (25%)',
  'H': 'High (30%)'
};

export const QR_CODE_SIZES = [128, 256, 512, 1024, 2048] as const;
export type QRCodeSize = typeof QR_CODE_SIZES[number];

export const DEFAULT_QR_OPTIONS: Required<QRCodeOptions> = {
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

// Type guards
export function isQRCodeData(obj: any): obj is QRCodeData {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.branchId === 'string' &&
    typeof obj.branchName === 'string' &&
    typeof obj.signature === 'string' &&
    obj.createdAt instanceof Date;
}

export function isValidQRCodeType(type: string): type is QRCodeType {
  return ['check-in', 'check-out', 'event', 'visitor'].includes(type);
}

export function isValidErrorCorrectionLevel(level: string): level is ErrorCorrectionLevel {
  return ['L', 'M', 'Q', 'H'].includes(level);
}

export default {
  QR_CODE_TYPES,
  ERROR_CORRECTION_LEVELS,
  QR_CODE_SIZES,
  DEFAULT_QR_OPTIONS,
  isQRCodeData,
  isValidQRCodeType,
  isValidErrorCorrectionLevel
};