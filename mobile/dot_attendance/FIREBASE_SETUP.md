# DOT Attendance Firebase Backend Setup

This document provides comprehensive instructions for setting up the Firebase backend for the DOT Attendance Flutter application.

## 🏗️ Architecture Overview

The DOT Attendance system uses Firebase as a complete backend-as-a-service solution with the following components:

### Firebase Services Used
- **Firebase Authentication** - User authentication with email/password and Google Sign-In
- **Cloud Firestore** - Real-time NoSQL database with offline support
- **Firebase Functions** - Server-side logic and API endpoints
- **Firebase Storage** - File storage for photos and documents
- **Firebase Messaging** - Push notifications
- **Firebase Analytics** - User behavior tracking
- **Firebase Crashlytics** - Error reporting and crash analytics
- **Firebase Remote Config** - Dynamic configuration
- **Firebase App Check** - Security and abuse prevention

### Database Collections

#### Core Collections
- `users` - User profiles with role-based permissions
- `stores` - Store locations and configurations
- `franchises` - Franchise information and hierarchy
- `attendance` - Individual attendance records
- `attendance_sessions` - Daily attendance sessions
- `attendance_stats` - Monthly/yearly statistics

#### Supporting Collections
- `notifications` - Push notifications and announcements
- `qr_codes` - Dynamic QR codes for check-in/check-out
- `settings` - Application and organization settings
- `audit_logs` - Security and action audit trail
- `reports` - Generated reports and exports

## 🚀 Quick Setup

### Prerequisites
1. **Firebase CLI** installed globally
   ```bash
   npm install -g firebase-tools
   ```

2. **Firebase Project** created at [Firebase Console](https://console.firebase.google.com)

3. **Node.js** version 18 or higher

4. **Flutter** development environment configured

### Automated Setup
Run the automated setup script:
```bash
cd /home/ec2-user/DOT/mobile/dot_attendance
./scripts/setup_firebase.sh
```

This script will:
- Configure Firebase project
- Set up Firestore security rules and indexes
- Deploy Cloud Functions
- Create sample data (development only)
- Configure storage rules
- Set up local emulators

## 📋 Manual Setup Instructions

If you prefer manual setup or need to customize the configuration:

### 1. Firebase Project Configuration

#### Initialize Firebase in project
```bash
firebase login
firebase init
```

#### Select services:
- ✅ Firestore
- ✅ Functions
- ✅ Hosting
- ✅ Storage
- ✅ Emulators

### 2. Firestore Setup

#### Deploy security rules
```bash
firebase deploy --only firestore:rules
```

#### Deploy indexes
```bash
firebase deploy --only firestore:indexes
```

#### Seed initial data
```bash
cd scripts
npm install -g ts-node typescript
npx ts-node migrate_and_seed.ts migrate
```

### 3. Cloud Functions Setup

#### Install dependencies and build
```bash
cd functions
npm install
npm run build
```

#### Deploy functions
```bash
firebase deploy --only functions
```

### 4. Storage Configuration

#### Deploy storage rules
```bash
firebase deploy --only storage
```

### 5. Flutter App Configuration

#### Install FlutterFire CLI
```bash
dart pub global activate flutterfire_cli
```

#### Configure Firebase for Flutter
```bash
flutterfire configure --project=your-project-id
```

This generates:
- `android/app/google-services.json`
- `ios/Runner/GoogleService-Info.plist`
- `lib/firebase_options.dart`

## 🔧 Environment Configuration

### Create Environment File
Copy `.env.example` to `.env` and configure:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_ANDROID_API_KEY=your-android-api-key
FIREBASE_IOS_API_KEY=your-ios-api-key
FIREBASE_WEB_API_KEY=your-web-api-key
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_IOS_BUNDLE_ID=com.dotattendance.app

# App Configuration
APP_NAME=DOT Attendance
APP_VERSION=1.0.0
BASE_URL=https://us-central1-your-project-id.cloudfunctions.net/api
```

### Service Account Setup
1. Go to Firebase Console > Project Settings > Service Accounts
2. Generate new private key
3. Save as `service-account-key.json` in project root
4. Add to `.gitignore`

## 🔐 Security Configuration

### User Roles Hierarchy
1. **USER** - Basic employee
   - Check in/out
   - View own attendance
   - Update own profile

2. **ADMIN** - Store administrator
   - Manage store users
   - Approve attendance
   - View store reports
   - Manage store settings

3. **MASTER_ADMIN** - Franchise administrator
   - Manage franchise stores
   - View franchise reports
   - Manage franchise users

4. **SUPER_ADMIN** - System administrator
   - Global access
   - System settings
   - All reports and analytics

### Firestore Security Rules
The security rules implement:
- Role-based access control
- Data isolation between stores/franchises
- Hierarchical permissions
- Audit logging
- Input validation

### Storage Security Rules
- User profile photos: Own uploads only
- Attendance photos: Own uploads, admin viewing
- Store assets: Admin management
- Generated reports: Role-based access

## 📱 Flutter Integration

### Initialize Firebase in App
```dart
// lib/main.dart
import 'package:firebase_core/firebase_core.dart';
import 'core/config/firebase_config.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await FirebaseConfig.initialize();
  
  runApp(MyApp());
}
```

### Use Firebase Services
```dart
// Authentication
final user = await FirebaseAuthService.signInWithEmailAndPassword(
  email: email,
  password: password,
);

// Attendance
final result = await FirebaseAttendanceService.checkIn(
  storeId: storeId,
  method: AttendanceMethod.location,
  photo: photo,
);

// Real-time data
FirestoreService.subscribeToTodayAttendance(userId).listen((session) {
  // Update UI with real-time attendance data
});
```

## 🧪 Testing

### Local Development with Emulators
```bash
firebase emulators:start
```

This starts:
- Authentication Emulator: `http://localhost:9099`
- Firestore Emulator: `http://localhost:8080`
- Functions Emulator: `http://localhost:5001`
- Storage Emulator: `http://localhost:9199`
- Emulator UI: `http://localhost:4000`

### Testing with Sample Data
```bash
# Create sample users and stores
npm run migrate seed

# Clean up test data
npm run migrate cleanup
```

### Unit Tests
```bash
# Test Cloud Functions
cd functions
npm test

# Test Firestore rules
npm run test:rules
```

## 📊 Monitoring and Analytics

### Firebase Console Monitoring
- Authentication: User sign-ins, errors
- Firestore: Read/write operations, performance
- Functions: Execution metrics, error rates
- Storage: Upload/download metrics

### Custom Analytics Events
The app tracks:
- User authentication events
- Attendance check-ins/check-outs
- Feature usage
- Error occurrences
- Performance metrics

### Crashlytics Integration
- Automatic crash reporting
- Non-fatal error tracking
- Performance monitoring
- Custom logging

## 🔄 Data Synchronization

### Real-time Updates
- Attendance sessions update in real-time
- Notifications pushed instantly
- Status changes reflected immediately
- Multi-device synchronization

### Offline Support
- Attendance records cached locally
- Automatic sync when online
- Conflict resolution
- Retry mechanisms with exponential backoff

### Background Sync
- Scheduled functions for statistics
- Daily reports generation
- Data cleanup and archival
- Notification delivery

## 📈 Scaling Considerations

### Database Performance
- Composite indexes for complex queries
- Pagination for large datasets
- Data denormalization where appropriate
- Query optimization

### Function Optimization
- Memory allocation tuning
- Cold start mitigation
- Connection pooling
- Batch operations

### Storage Optimization
- Image compression and resizing
- CDN integration
- Automatic cleanup of old files
- Efficient file organization

## 🚀 Deployment

### Development Deployment
```bash
firebase use development
firebase deploy
```

### Production Deployment
```bash
firebase use production
firebase deploy --only firestore:rules,functions,storage
```

### CI/CD Pipeline
Example GitHub Actions workflow:

```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
        working-directory: ./functions
      - run: npm run build
        working-directory: ./functions
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /auth/login` - User authentication
- `POST /auth/logout` - Sign out
- `POST /auth/refresh` - Token refresh
- `POST /auth/reset-password` - Password reset

### Attendance Endpoints
- `POST /attendance/check-in` - Check in
- `POST /attendance/check-out` - Check out
- `GET /attendance/status` - Current status
- `GET /attendance/history` - Attendance history
- `POST /attendance/approve` - Approve records (Admin)

### User Management Endpoints
- `GET /users/profile` - Get profile
- `PUT /users/profile` - Update profile
- `GET /users/store/:storeId` - Get store users (Admin)
- `POST /users/create` - Create user (Admin)

### Reports Endpoints
- `GET /reports/monthly` - Monthly reports
- `GET /reports/weekly` - Weekly reports
- `POST /reports/custom` - Custom reports
- `GET /reports/export/:reportId` - Export report

## 🐛 Troubleshooting

### Common Issues

#### 1. Permission Denied Errors
```
Error: Missing or insufficient permissions
```
**Solution**: Check Firestore security rules and user role assignments

#### 2. Function Timeout Errors
```
Error: Function execution timed out
```
**Solution**: Optimize function code and increase timeout in firebase.json

#### 3. Storage Upload Failures
```
Error: File size exceeds maximum allowed size
```
**Solution**: Check storage rules and file size limits

#### 4. Offline Sync Issues
```
Error: Failed to sync offline records
```
**Solution**: Check network connectivity and retry mechanisms

### Debug Tools
- Firebase Emulator UI for local testing
- Firestore debug console
- Cloud Functions logs
- Crashlytics dashboard
- Analytics debug view

## 📞 Support

### Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [FlutterFire Documentation](https://firebase.flutter.dev)
- [Firebase Console](https://console.firebase.google.com)
- [Firebase Status](https://status.firebase.google.com)

### Getting Help
1. Check Firebase Console for error messages
2. Review function logs: `firebase functions:log`
3. Use Firebase Emulator for local debugging
4. Check Firestore rules simulator
5. Review security rules and permissions

---

## 🎯 Summary

The DOT Attendance Firebase backend provides:

✅ **Complete Authentication System** with multiple sign-in methods  
✅ **Real-time Database** with offline support and sync  
✅ **Serverless Functions** for business logic  
✅ **Secure File Storage** for photos and documents  
✅ **Push Notifications** for instant updates  
✅ **Role-based Security** with hierarchical permissions  
✅ **Analytics and Monitoring** for insights  
✅ **Scalable Architecture** ready for production  

The setup is production-ready with proper error handling, retry logic, offline support, and comprehensive security measures. All implementations use real Firebase SDKs and services without any mock data or placeholder functions.