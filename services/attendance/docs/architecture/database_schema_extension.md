# Database Schema Extension for Business Information

## Overview

This document outlines the extended database schema design for the attendance mobile application, specifically focusing on business information management for admin/master admin users.

## Current Implementation Status

✅ **Completed:**
- Extended User entity with business profile support
- Created comprehensive business-related entities (BusinessInfo, Representative, BusinessLocation, BusinessProfile)
- Updated Firebase service with extended mock data for archt723@gmail.com
- Added business profile management methods to Firebase service
- Implemented placeholder methods for future verification features

## Entity Structure

### 1. BusinessInfo Entity
**Purpose:** Stores core business registration and company information

```dart
BusinessInfo {
  String id,
  String businessRegistrationNumber,    // 248-01-02359
  String businessName,                  // DOT 본사
  String businessType,                  // 소프트웨어 개발업
  String businessAddress,
  String? businessPhone,
  String? businessEmail,
  String? representativeName,
  String? representativeAddress,
  DateTime? establishedDate,
  bool isVerified,                      // 사업자등록번호 인증 여부
  DateTime? verifiedAt,
  String? verificationDocument,
  DateTime? createdAt,
  DateTime? updatedAt,
}
```

**Key Features:**
- Business registration number validation with checksum algorithm
- Formatted display of registration number (000-00-00000)
- Verification tracking for compliance

### 2. Representative Entity
**Purpose:** Stores business representative personal information

```dart
Representative {
  String id,
  String name,                          // 임태균
  String phoneNumber,                   // 01093177090
  String? email,
  String? address,
  String? residentRegistrationNumber,   // 암호화된 형태
  bool isPhoneVerified,                 // 전화번호 인증 여부
  DateTime? phoneVerifiedAt,
  bool isIdentityVerified,              // 신분 인증 여부
  DateTime? identityVerifiedAt,
  String? identityDocument,
  DateTime? createdAt,
  DateTime? updatedAt,
}
```

**Key Features:**
- Phone number validation for Korean mobile and landline numbers
- Masking functionality for privacy (010-****-0000)
- Dual verification system (phone + identity)
- Verification status tracking

### 3. BusinessLocation Entity
**Purpose:** Manages multiple business locations/branches

```dart
BusinessLocation {
  String id,
  String businessInfoId,
  String name,                          // 강남지점, 홍대지점
  String address,
  String? detailAddress,
  String? postalCode,
  double? latitude,
  double? longitude,
  String? phoneNumber,
  String? managerUserId,
  String? managerName,
  int employeeCount,
  bool isActive,
  bool isHeadOffice,                    // 본사 여부
  String? businessHours,
  String? description,
  List<String>? facilityFeatures,
  DateTime? createdAt,
  DateTime? updatedAt,
}
```

**Key Features:**
- GPS coordinates support for location-based attendance
- Manager assignment system
- Head office designation
- Dynamic employee count tracking
- Facility features for enhanced location details

### 4. BusinessProfile Entity
**Purpose:** Comprehensive business profile aggregating all business data

```dart
BusinessProfile {
  String id,
  String userId,
  BusinessInfo businessInfo,
  Representative representative,
  List<BusinessLocation> locations,
  
  // Future expansion placeholders
  bool isPhoneVerificationEnabled,
  bool isBusinessNumberValidationEnabled,
  bool isDocumentUploadEnabled,
  
  // Verification tracking
  bool isProfileComplete,
  int verificationScore,                // 0-100 점수 시스템
  List<String>? pendingVerifications,
  List<String>? completedVerifications,
  
  DateTime? createdAt,
  DateTime? updatedAt,
  String? notes,
}
```

**Key Features:**
- Automated verification score calculation (0-100)
- Profile completion tracking
- Extensible verification system
- Centralized business data management

### 5. Extended User Entity
**Purpose:** Enhanced user entity with business profile integration

```dart
User {
  // ... existing fields
  BusinessProfile? businessProfile,     // 사업자 프로필 (admin+ only)
  String? organizationId,               // 호환성 유지
  String? organizationName,             // 호환성 유지
}
```

**New Computed Properties:**
- `bool isBusinessOwner` - Checks if user has admin+ role with business profile
- `String? businessName` - Returns business name or falls back to organization name
- `bool isRepresentative` - Verifies if user is registered as representative
- `String? businessVerificationStatus` - Returns verification completion status

## Firebase Service Extensions

### Business Profile Management Methods

```dart
// Core business profile operations
Future<Map<String, dynamic>?> getBusinessProfile(String userId)
Future<bool> updateBusinessProfile(String userId, Map<String, dynamic> profileData)

// Business location management
Future<List<Map<String, dynamic>>> getBusinessLocations(String userId)
Future<bool> addBusinessLocation(String userId, Map<String, dynamic> locationData)
Future<bool> updateBusinessLocation(String userId, String locationId, Map<String, dynamic> locationData)
Future<bool> deleteBusinessLocation(String userId, String locationId)
```

### Future Verification Methods (Placeholders)

```dart
// Phone verification (SMS)
Future<bool> requestPhoneVerification(String phoneNumber)
Future<bool> verifyPhoneNumber(String phoneNumber, String verificationCode)

// Business registration validation
Future<Map<String, dynamic>?> validateBusinessRegistrationNumber(String registrationNumber)

// Document upload
Future<String?> uploadDocument(String userId, String documentType, List<int> fileBytes)
```

## Mock Data Structure

The Firebase service has been updated with comprehensive test data for `archt723@gmail.com`:

```dart
{
  'uid': 'admin_001',
  'email': 'archt723@gmail.com',
  'role': 'masterAdmin',
  'businessProfile': {
    'businessInfo': {
      'businessRegistrationNumber': '2480102359',
      'businessName': 'DOT 본사',
      'representativeName': '임태균',
      'isVerified': true,
    },
    'representative': {
      'name': '임태균',
      'phoneNumber': '01093177090',
      'isPhoneVerified': true,
      'isIdentityVerified': true,
    },
    'locations': [
      {
        'name': '강남본사',
        'address': '서울시 강남구 테헤란로 123',
        'isHeadOffice': true,
        'employeeCount': 5,
        'managerName': '임태균',
      },
      // ... 강남지점, 홍대지점
    ],
    'verificationScore': 95,
    'isProfileComplete': true,
  }
}
```

## Firestore Database Design

### Collection Structure

```
users/{userId}
├── id: string
├── email: string
├── firstName: string
├── lastName: string
├── role: string
├── businessProfile: {
│   ├── id: string
│   ├── businessInfo: BusinessInfo
│   ├── representative: Representative
│   └── locations: BusinessLocation[]
│   └── verificationScore: number
│   └── ... other metadata
│ }
└── ... other user fields

// Alternative normalized approach for complex queries
businessProfiles/{businessProfileId}
├── userId: string
├── businessInfo: BusinessInfo
├── representative: Representative
├── verificationScore: number
└── ... other fields

businessLocations/{locationId}
├── businessProfileId: string
├── name: string
├── address: string
├── coordinates: GeoPoint
├── employeeCount: number
└── ... other location fields
```

### Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own business profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['superAdmin', 'masterAdmin'];
    }
    
    // Business profiles (if using normalized structure)
    match /businessProfiles/{profileId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

## Migration Strategy

### Phase 1: Entity Creation (✅ Complete)
- Create business-related entities
- Extend User entity with business profile
- Update mock data structure

### Phase 2: Service Integration (✅ Complete)
- Extend Firebase service with business methods
- Add placeholder verification methods
- Test with mock data

### Phase 3: UI Integration (Next)
- Create business profile management screens
- Implement location management interface
- Add verification workflow UI

### Phase 4: Backend Integration (Future)
- Replace mock data with real Firebase operations
- Implement actual verification services
- Add document upload functionality

## Data Validation

### Business Registration Number
- 10-digit numeric validation
- Checksum algorithm verification
- Format display as 000-00-00000

### Phone Numbers
- Korean mobile numbers: 010, 011, 016, 017, 018, 019
- Landline numbers: Area codes 02, 031-033, 041-044, 051-055, 061-064
- Format display as 000-0000-0000 or 00-000-0000

### Verification Score Calculation
- Basic info completion: 30 points
- Business registration verification: 25 points
- Representative verification: 25 points
- Location setup: 20 points
- Total: 100 points

## API Contracts

### Business Profile Response
```json
{
  "id": "business_profile_001",
  "userId": "admin_001",
  "businessInfo": {
    "businessRegistrationNumber": "248-01-02359",
    "businessName": "DOT 본사",
    "businessType": "소프트웨어 개발업",
    "isVerified": true
  },
  "representative": {
    "name": "임태균",
    "phoneNumber": "010-9317-7090",
    "isPhoneVerified": true,
    "isIdentityVerified": true
  },
  "locations": [
    {
      "id": "location_001",
      "name": "강남본사",
      "address": "서울시 강남구 테헤란로 123",
      "isHeadOffice": true,
      "employeeCount": 5
    }
  ],
  "verificationScore": 95,
  "completionStatus": "완료"
}
```

## Future Enhancements

### Phase 4: Advanced Verification
- SMS-based phone verification
- National Business Registry API integration
- OCR-based document verification
- Real-time business info validation

### Phase 5: Advanced Features
- Multi-business profile support
- Business relationship management
- Advanced analytics and reporting
- Compliance audit trails

### Phase 6: Integration
- Payment gateway integration
- Third-party service connections
- Advanced security features
- Performance optimization

## Testing

### Unit Tests Required
- Entity validation logic
- Phone number formatting
- Business registration number validation
- Verification score calculation

### Integration Tests Required
- Firebase service method testing
- Business profile CRUD operations
- Location management workflow
- Verification process testing

This comprehensive schema extension provides a solid foundation for business information management while maintaining extensibility for future features and compliance requirements.