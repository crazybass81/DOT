# QR Code Management System

A comprehensive QR code generation, scanning, and management system for attendance tracking applications.

## Features

### 🎯 QR Code Generation
- **Single QR Generation**: Create individual QR codes for specific branches and locations
- **Batch Generation**: Generate multiple QR codes simultaneously for different branches
- **Customizable Options**: Configure size, colors, error correction levels, and formats
- **Multiple Types**: Support for check-in, check-out, event, and visitor QR codes
- **Expiration Support**: Set expiration dates for time-limited QR codes

### 📱 QR Code Scanning
- **Real-time Camera Scanning**: Use device camera for live QR code scanning
- **Image Upload Scanning**: Upload images containing QR codes for processing
- **Signature Validation**: Verify QR code authenticity using HMAC signatures
- **Expiration Checking**: Automatically detect and handle expired QR codes
- **Multi-camera Support**: Switch between front/back cameras on supported devices

### ☁️ Cloud Integration
- **Supabase Storage**: Automatic upload and storage of generated QR code images
- **Database Tracking**: Store metadata, usage statistics, and scan logs
- **Public URLs**: Generate shareable links for QR code images
- **Batch Operations**: Handle bulk operations efficiently

### 📊 Management & Analytics
- **QR Code Inventory**: View and manage all generated QR codes
- **Usage Statistics**: Track scan counts, success rates, and performance metrics
- **Status Management**: Activate/deactivate QR codes as needed
- **Export Options**: Download QR codes in PNG, SVG, or JPEG formats
- **Print Optimization**: Generate print-ready layouts with labels

### 🔒 Security Features
- **HMAC Signatures**: Prevent tampering with cryptographic signatures
- **UUID Identifiers**: Use secure unique identifiers for each QR code
- **Expiration Validation**: Time-based access control
- **Error Correction**: Built-in error correction for damaged codes

## Components

### QRGenerator
Main component for generating QR codes with full customization options.

```tsx
import QRGenerator from './QRGenerator';

<QRGenerator
  branches={branches}
  onQRGenerated={(qrData, dataUrl) => console.log('Generated:', qrData)}
  onBatchGenerated={(results) => console.log('Batch:', results)}
/>
```

### QRScanner
Real-time QR code scanning with camera integration and validation.

```tsx
import QRScanner from './QRScanner';

<QRScanner
  onScanSuccess={(qrData, rawData) => console.log('Scanned:', qrData)}
  onScanError={(error) => console.error('Scan error:', error)}
  autoValidate={true}
  showPreview={true}
/>
```

### QRManagement
Complete management dashboard with generation, scanning, and inventory features.

```tsx
import QRManagement from './QRManagement';

<QRManagement
  branches={branches}
  onQRAction={(action, qrData) => console.log(action, qrData)}
/>
```

### QRCodeDemo
Full-featured demo showcasing all system capabilities.

```tsx
import QRCodeDemo from './QRCodeDemo';

<QRCodeDemo className="my-custom-class" />
```

## Utilities

### QRGenerator Class
Core utility class for QR code operations:

```typescript
import { QRGenerator, QRCodeConfig } from '../../utils/qr-generator';

// Generate QR data
const config: QRCodeConfig = {
  type: 'check-in',
  branchId: 'branch_001',
  branchName: 'Main Office',
  locationId: 'Reception',
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
};

const qrData = QRGenerator.createQRData(config);
const dataUrl = await QRGenerator.generateQRCode(qrData);
const svg = await QRGenerator.generateQRCodeSVG(qrData);

// Validate QR data
const validation = QRGenerator.validateQRData(qrData);
console.log('Valid:', validation.isValid, 'Errors:', validation.errors);
```

### useQRCode Hook
React hook for easy QR code management:

```typescript
import { useQRCode } from '../../hooks/useQRCode';

function MyComponent() {
  const {
    generateQRCode,
    generateBatchQRCodes,
    validateQRCode,
    downloadQRCode,
    isLoading,
    error,
    generatedQRs
  } = useQRCode();

  const handleGenerate = async () => {
    const result = await generateQRCode({
      type: 'check-in',
      branchId: 'branch_001',
      branchName: 'Main Office'
    });
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isLoading}>
        Generate QR Code
      </button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

## Database Schema

### QR Codes Table
```sql
CREATE TABLE qr_codes (
    id UUID PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('check-in', 'check-out', 'event', 'visitor')),
    branch_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    location_id TEXT,
    event_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    signature TEXT NOT NULL,
    image_url TEXT,
    storage_path TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    used_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ
);
```

### QR Code Scans Table
```sql
CREATE TABLE qr_code_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID NOT NULL REFERENCES qr_codes(id),
    user_id UUID,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    scan_result TEXT NOT NULL CHECK (scan_result IN ('success', 'expired', 'invalid', 'error')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);
```

## Supabase Edge Function

Deploy the QR generation edge function:

```bash
# Deploy the function
supabase functions deploy qr-generate

# Test the function
curl -X POST 'https://your-project.supabase.co/functions/v1/qr-generate?action=generate' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "check-in",
    "branchId": "branch_001",
    "branchName": "Main Office",
    "locationId": "Reception"
  }'
```

### Function Endpoints

- **POST** `/qr-generate?action=generate` - Generate single QR code
- **POST** `/qr-generate?action=batch` - Generate batch QR codes  
- **POST** `/qr-generate?action=validate` - Validate QR code data
- **GET** `/qr-generate` - List all QR codes
- **GET** `/qr-generate?id=:id` - Get specific QR code

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### QR Code Options
```typescript
const options: QRCodeOptions = {
  width: 256,           // QR code size in pixels
  margin: 2,            // Margin around QR code
  errorCorrectionLevel: 'M', // L, M, Q, H
  color: {
    dark: '#000000',    // Foreground color
    light: '#FFFFFF'    // Background color
  },
  type: 'image/png',    // Output format
  quality: 0.92         // Image quality (0-1)
};
```

## Security Considerations

1. **Signature Validation**: All QR codes include HMAC signatures for tamper detection
2. **Expiration Checking**: Time-based access control prevents unauthorized access
3. **UUID Identifiers**: Cryptographically secure unique identifiers
4. **Input Validation**: Comprehensive validation of all user inputs
5. **CORS Configuration**: Proper CORS headers for secure API access

## Performance Optimization

1. **Batch Operations**: Use batch generation for multiple QR codes
2. **Caching**: Implement caching for frequently accessed QR codes  
3. **Image Optimization**: Use appropriate image formats and compression
4. **Database Indexing**: Optimize database queries with proper indexes
5. **CDN Integration**: Use CDN for QR code image delivery

## Browser Compatibility

- **QR Generation**: Works in all modern browsers
- **Camera Scanning**: Requires HTTPS and camera permissions
- **File Upload**: Supported in all browsers with file API
- **Download**: Uses modern download APIs with fallback support

## Error Handling

The system includes comprehensive error handling:

- **Generation Errors**: Invalid configurations, encoding failures
- **Validation Errors**: Signature mismatches, expired codes, malformed data
- **Camera Errors**: No camera access, permission denied
- **Network Errors**: API failures, storage issues
- **File Errors**: Invalid formats, upload failures

## Testing

Run tests for the QR code system:

```bash
# Unit tests
npm run test -- --testPathPattern=qr

# Integration tests  
npm run test:integration -- --testNamePattern="QR"

# Coverage report
npm run test:coverage -- --collectCoverageFrom="**/*qr*"
```

## License

This QR code management system is part of the DOT attendance application and is proprietary software.

## Support

For technical support or questions about the QR code system, please contact the development team or create an issue in the project repository.