# Device Token Mapping System for FCM and Multi-Device Support

A comprehensive device token management system that provides FCM (Firebase Cloud Messaging) integration, multi-device support, device fingerprinting, and advanced security features for the DOT attendance system.

## System Overview

The device token mapping system consists of:

1. **Database Schema** - Comprehensive tables for device tokens, notifications, sessions, and security events
2. **FCM Service** - Supabase Edge Function for handling device registration, updates, and notifications
3. **Device Management UI** - React component for managing registered devices
4. **Device Fingerprinting** - Advanced browser fingerprinting for device identification and security
5. **Client Library** - JavaScript library for FCM integration and device management

## Features

### Core Functionality
- ✅ Multi-device support per user
- ✅ FCM token registration and renewal
- ✅ Device trust management with security levels
- ✅ Auto-expiry of old tokens based on inactivity
- ✅ Push notification support with delivery tracking
- ✅ Device fingerprinting for enhanced security
- ✅ Session management with risk scoring
- ✅ Security event logging and monitoring

### Security Features
- 🔒 Device verification with codes
- 🔒 Trust levels (trusted, verified, unknown, suspicious, blocked)
- 🔒 Failed authentication attempt tracking
- 🔒 Geofencing and location validation
- 🔒 Risk score calculation
- 🔒 Security event monitoring
- 🔒 Row Level Security (RLS) policies

### Management Features
- 📱 Primary device designation
- 📱 Device activation/deactivation
- 📱 Notification history and analytics
- 📱 Usage statistics and metrics
- 📱 Security event dashboard
- 📱 Bulk device operations

## File Structure

```
/services/attendance/
├── supabase/
│   ├── migrations/
│   │   └── 005_device_tokens.sql          # Database schema
│   └── functions/
│       └── fcm-token/
│           └── index.ts                   # FCM service function
├── web/
│   ├── app/
│   │   ├── api/fcm-token/
│   │   │   └── route.ts                   # API route handler
│   │   └── settings/devices/
│   │       └── page.tsx                   # Device management UI
│   ├── lib/
│   │   ├── device-fingerprint.ts          # Fingerprinting utility
│   │   └── fcm-client.ts                  # FCM client library
│   └── public/
│       └── firebase-messaging-sw.js       # Service worker
└── docs/
    └── device-token-system.md             # This documentation
```

## Database Schema

### Core Tables

#### `device_tokens`
Primary table storing device information and FCM tokens.

**Key Fields:**
- `employee_id` - User who owns the device
- `device_id` - Unique device fingerprint identifier
- `fcm_token` - Firebase Cloud Messaging token
- `device_name` - User-friendly device name
- `trust_level` - Security trust level
- `is_primary` - Primary device flag
- `fingerprint_data` - Device fingerprint data (JSONB)
- `last_used_at` - Last activity timestamp

#### `fcm_notifications`
Tracks all push notifications sent to devices.

**Key Fields:**
- `device_token_id` - Target device
- `notification_title/body` - Message content
- `delivery_status` - Delivery tracking
- `sent_at/delivered_at/read_at` - Timing metrics

#### `device_sessions`
Manages active device sessions with security context.

**Key Fields:**
- `session_token` - Unique session identifier
- `device_token_id` - Associated device
- `auth_method` - Authentication method used
- `risk_score` - Calculated security risk (0.0-1.0)

#### `device_security_events`
Logs security-related events for monitoring.

**Key Fields:**
- `event_type` - Type of security event
- `severity` - Event severity level
- `risk_score` - Associated risk score
- `automated_action` - System response taken

### Views and Analytics

#### `v_employee_devices`
Aggregated view of devices per employee with statistics.

#### `v_fcm_statistics`
Push notification analytics and delivery metrics.

#### `v_device_security_summary`
Security overview with risk assessment.

## API Endpoints

### Device Registration
```typescript
POST /api/fcm-token
{
  "action": "register",
  "fcmToken": "string",
  "deviceId": "string",
  "deviceInfo": {
    "name": "string",
    "type": "mobile|tablet|desktop|web",
    "platform": "string",
    "browser": "string"
  },
  "fingerprintData": { /* fingerprint object */ },
  "location": {
    "latitude": number,
    "longitude": number,
    "accuracy": number
  }
}
```

### Device Update
```typescript
POST /api/fcm-token
{
  "action": "update",
  "deviceTokenId": "string",
  "fcmToken": "string", // optional
  "deviceInfo": { /* updates */ }
}
```

### Device Verification
```typescript
POST /api/fcm-token
{
  "action": "validate",
  "deviceTokenId": "string",
  "verificationCode": "string"
}
```

### Send Notification
```typescript
POST /api/fcm-token
{
  "action": "notify",
  "deviceTokenId": "string",
  "notification": {
    "title": "string",
    "body": "string",
    "type": "string",
    "data": { /* custom data */ },
    "priority": "normal|high"
  }
}
```

### Get Device List
```typescript
GET /api/fcm-token?action=list
```

## Device Fingerprinting

The system uses advanced browser fingerprinting to create unique, stable device identifiers.

### Fingerprint Components

1. **Canvas Fingerprinting** - Renders graphics and extracts signature
2. **WebGL Fingerprinting** - GPU and graphics driver information
3. **Audio Fingerprinting** - Audio processing characteristics
4. **Screen Properties** - Resolution, color depth, pixel ratio
5. **Navigator Properties** - User agent, platform, languages
6. **Font Detection** - Available system fonts
7. **Plugin Detection** - Installed browser plugins
8. **WebRTC** - Network interface information
9. **Hardware Info** - CPU cores, memory, battery status
10. **Timezone and Locale** - Geographic and language settings

### Fingerprint Stability

The system calculates stability scores to ensure reliable device identification:
- **High Stability (>0.9)** - Consistent across sessions
- **Medium Stability (0.7-0.9)** - Mostly consistent
- **Low Stability (<0.7)** - May change frequently

### Privacy Considerations

- Fingerprinting is used only for security and device management
- No tracking across different websites or applications
- Users can view and manage their device fingerprints
- Compliance with privacy regulations and best practices

## Security Architecture

### Trust Levels

1. **Trusted** - Verified devices with good security history
2. **Verified** - Devices that passed verification process
3. **Unknown** - New or unverified devices (default)
4. **Suspicious** - Devices with security concerns
5. **Blocked** - Devices denied access

### Risk Scoring

The system calculates risk scores (0.0-1.0) based on:
- Device trust level
- Failed authentication attempts
- Recent security events
- Location violations (if geofencing enabled)
- Unusual usage patterns

### Security Events

Automated logging of security-related events:
- Device registration/deactivation
- Failed verification attempts
- Geofence violations
- Suspicious login patterns
- Token refresh activities

## Usage Examples

### Initialize FCM Client

```typescript
import { initializeFCM } from '@/lib/fcm-client'

const fcmConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
}

const fcmClient = await initializeFCM(fcmConfig)
```

### Register Device

```typescript
const result = await fcmClient.registerDevice('My Work Computer')
if (result.success) {
  if (result.requiresVerification) {
    // Show verification dialog
    const code = await promptForVerificationCode()
    await fcmClient.verifyDevice(result.deviceId, code)
  }
}
```

### Generate Device Fingerprint

```typescript
import { generateDeviceFingerprint } from '@/lib/device-fingerprint'

const fingerprint = await generateDeviceFingerprint()
console.log('Device ID:', fingerprint.deviceId)
console.log('Entropy:', fingerprint.entropy)
console.log('Stability:', fingerprint.stability)
```

## Configuration

### Environment Variables

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Firebase Setup

1. Create Firebase project
2. Enable Cloud Messaging
3. Generate VAPID key
4. Configure web app credentials
5. Set up FCM server key in Supabase

## Monitoring and Maintenance

### Database Maintenance

The system includes automated cleanup functions:

```sql
-- Clean up expired tokens (run daily)
SELECT expire_old_device_tokens();

-- Clean up expired sessions (run hourly)
SELECT cleanup_expired_sessions();
```

### Monitoring Queries

```sql
-- Device statistics per user
SELECT * FROM v_employee_devices;

-- Security events requiring attention
SELECT * FROM device_security_events 
WHERE severity IN ('high', 'critical') 
  AND NOT resolved;

-- FCM delivery statistics
SELECT * FROM v_fcm_statistics 
WHERE date >= CURRENT_DATE - INTERVAL '7 days';
```

### Performance Optimization

- Indexes on frequently queried columns
- Partitioning for large notification tables
- Regular vacuum and analyze operations
- Connection pooling for high traffic

## Troubleshooting

### Common Issues

1. **FCM Token Registration Fails**
   - Check Firebase configuration
   - Verify VAPID key
   - Ensure service worker is registered

2. **Notifications Not Received**
   - Check notification permissions
   - Verify FCM token validity
   - Review delivery status in database

3. **Device Fingerprint Inconsistencies**
   - Check browser compatibility
   - Review fingerprint stability score
   - Consider fallback identification methods

4. **High Risk Scores**
   - Review security events
   - Check for failed authentication attempts
   - Verify device trust levels

### Debug Tools

- Browser developer tools for FCM debugging
- Supabase logs for server-side errors
- Device management UI for user-facing issues
- Database queries for data analysis

## Future Enhancements

### Planned Features
- [ ] Device certificate pinning
- [ ] Advanced biometric verification
- [ ] Machine learning-based risk assessment
- [ ] Cross-platform device synchronization
- [ ] Advanced geofencing with multiple zones
- [ ] Integration with mobile device management (MDM)

### Performance Improvements
- [ ] Implement caching for device lookups
- [ ] Optimize fingerprinting for mobile devices
- [ ] Add batch operations for bulk device management
- [ ] Implement real-time notifications for security events

## Support and Maintenance

### Regular Tasks
- Monitor security events and respond to threats
- Update device trust levels based on behavior
- Clean up expired tokens and sessions
- Analyze notification delivery metrics
- Review and optimize database performance

### Security Reviews
- Quarterly security assessment
- Update risk scoring algorithms
- Review and update trust policies
- Test emergency response procedures
- Audit access logs and permissions

---

This device token mapping system provides a robust foundation for secure multi-device support in the DOT attendance system. It balances security requirements with user convenience while maintaining scalability and performance.