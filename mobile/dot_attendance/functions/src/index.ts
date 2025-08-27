import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Initialize Firebase Admin
admin.initializeApp();

// Import function modules
import { authFunctions } from './modules/auth';
import { attendanceFunctions } from './modules/attendance';
import { notificationFunctions } from './modules/notifications';
import { reportsFunctions } from './modules/reports';
import { userFunctions } from './modules/user';
import { storeFunctions } from './modules/store';
import { scheduledFunctions } from './modules/scheduled';
import { webhookFunctions } from './modules/webhooks';

// ========== EXPRESS API SETUP ==========

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://dotattendance.com', 'https://admin.dotattendance.com']
    : true,
  credentials: true,
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API routes
app.use('/auth', authFunctions.router);
app.use('/attendance', attendanceFunctions.router);
app.use('/notifications', notificationFunctions.router);
app.use('/reports', reportsFunctions.router);
app.use('/users', userFunctions.router);
app.use('/stores', storeFunctions.router);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error);
  
  res.status(error.status || 500).json({
    error: {
      code: error.code || 'internal-error',
      message: error.message || 'An internal error occurred',
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
    },
  });
});

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);

// ========== AUTHENTICATION TRIGGERS ==========

// User creation trigger
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    console.log('New user created:', user.uid);
    
    // Create user document in Firestore
    await admin.firestore().collection('users').doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || null,
      role: 'USER',
      status: 'PENDING', // Requires admin approval
      employeeId: user.uid.substring(0, 8).toUpperCase(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Send welcome notification to admins
    await notificationFunctions.sendNewUserNotification(user);

    console.log('User document created successfully');
  } catch (error) {
    console.error('Error in onUserCreate:', error);
  }
});

// User deletion trigger
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {
    console.log('User deleted:', user.uid);
    
    // Clean up user data
    const batch = admin.firestore().batch();
    
    // Delete user document
    batch.delete(admin.firestore().collection('users').doc(user.uid));
    
    // Delete user's attendance sessions
    const attendanceSessions = await admin.firestore()
      .collection('attendance_sessions')
      .where('userId', '==', user.uid)
      .get();
    
    attendanceSessions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete user's notifications
    const notifications = await admin.firestore()
      .collection('notifications')
      .where('userId', '==', user.uid)
      .get();
    
    notifications.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log('User cleanup completed');
  } catch (error) {
    console.error('Error in onUserDelete:', error);
  }
});

// ========== FIRESTORE TRIGGERS ==========

// User document update trigger
export const onUserUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      const userId = context.params.userId;
      
      // Check if status changed to ACTIVE
      if (before.status !== 'ACTIVE' && after.status === 'ACTIVE') {
        await notificationFunctions.sendUserActivationNotification(userId, after);
      }
      
      // Check if role changed
      if (before.role !== after.role) {
        await notificationFunctions.sendRoleChangeNotification(userId, before.role, after.role);
      }
      
      // Update user search index if needed
      await userFunctions.updateUserSearchIndex(userId, after);
      
    } catch (error) {
      console.error('Error in onUserUpdate:', error);
    }
  });

// Attendance record creation trigger
export const onAttendanceCreate = functions.firestore
  .document('attendance/{attendanceId}')
  .onCreate(async (snapshot, context) => {
    try {
      const attendanceData = snapshot.data();
      const attendanceId = context.params.attendanceId;
      
      // Update attendance session
      await attendanceFunctions.updateAttendanceSession(attendanceId, attendanceData);
      
      // Send notification if approval is required
      if (attendanceData.status === 'PENDING') {
        await notificationFunctions.sendAttendanceApprovalNotification(attendanceId, attendanceData);
      }
      
      // Log attendance event
      await attendanceFunctions.logAttendanceEvent(attendanceId, attendanceData, 'CREATE');
      
    } catch (error) {
      console.error('Error in onAttendanceCreate:', error);
    }
  });

// Attendance record update trigger
export const onAttendanceUpdate = functions.firestore
  .document('attendance/{attendanceId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      const attendanceId = context.params.attendanceId;
      
      // Check if status changed
      if (before.status !== after.status) {
        // Update attendance session
        await attendanceFunctions.updateAttendanceSession(attendanceId, after);
        
        // Send notification to user
        if (after.status === 'APPROVED') {
          await notificationFunctions.sendAttendanceApprovedNotification(after.userId, attendanceId);
        } else if (after.status === 'REJECTED') {
          await notificationFunctions.sendAttendanceRejectedNotification(
            after.userId, 
            attendanceId, 
            after.rejectionReason
          );
        }
      }
      
      // Log attendance event
      await attendanceFunctions.logAttendanceEvent(attendanceId, after, 'UPDATE');
      
    } catch (error) {
      console.error('Error in onAttendanceUpdate:', error);
    }
  });

// Store document update trigger
export const onStoreUpdate = functions.firestore
  .document('stores/{storeId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      const storeId = context.params.storeId;
      
      // Check if QR code needs regeneration
      if (before.location !== after.location || before.workingHours !== after.workingHours) {
        await storeFunctions.regenerateStoreQRCode(storeId);
      }
      
      // Update store search index
      await storeFunctions.updateStoreSearchIndex(storeId, after);
      
    } catch (error) {
      console.error('Error in onStoreUpdate:', error);
    }
  });

// ========== SCHEDULED FUNCTIONS ==========

// Daily attendance statistics calculation
export const calculateDailyStats = functions.pubsub
  .schedule('0 2 * * *') // Run at 2 AM daily
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting daily stats calculation');
      await scheduledFunctions.calculateDailyAttendanceStats();
      console.log('Daily stats calculation completed');
    } catch (error) {
      console.error('Error in calculateDailyStats:', error);
    }
  });

// Weekly attendance report
export const generateWeeklyReports = functions.pubsub
  .schedule('0 8 * * 1') // Run at 8 AM every Monday
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting weekly report generation');
      await scheduledFunctions.generateWeeklyAttendanceReports();
      console.log('Weekly report generation completed');
    } catch (error) {
      console.error('Error in generateWeeklyReports:', error);
    }
  });

// Monthly attendance statistics
export const generateMonthlyStats = functions.pubsub
  .schedule('0 6 1 * *') // Run at 6 AM on the 1st of every month
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting monthly stats generation');
      await scheduledFunctions.generateMonthlyAttendanceStats();
      console.log('Monthly stats generation completed');
    } catch (error) {
      console.error('Error in generateMonthlyStats:', error);
    }
  });

// Cleanup expired QR codes
export const cleanupExpiredQRCodes = functions.pubsub
  .schedule('*/30 * * * *') // Run every 30 minutes
  .onRun(async (context) => {
    try {
      await scheduledFunctions.cleanupExpiredQRCodes();
    } catch (error) {
      console.error('Error in cleanupExpiredQRCodes:', error);
    }
  });

// Cleanup old audit logs
export const cleanupOldAuditLogs = functions.pubsub
  .schedule('0 3 * * 0') // Run at 3 AM every Sunday
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting audit log cleanup');
      await scheduledFunctions.cleanupOldAuditLogs();
      console.log('Audit log cleanup completed');
    } catch (error) {
      console.error('Error in cleanupOldAuditLogs:', error);
    }
  });

// Backup critical data
export const backupCriticalData = functions.pubsub
  .schedule('0 1 * * *') // Run at 1 AM daily
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting critical data backup');
      await scheduledFunctions.backupCriticalData();
      console.log('Critical data backup completed');
    } catch (error) {
      console.error('Error in backupCriticalData:', error);
    }
  });

// ========== STORAGE TRIGGERS ==========

// Process uploaded profile images
export const processProfileImage = functions.storage
  .object()
  .onFinalize(async (object) => {
    try {
      const filePath = object.name;
      
      if (!filePath || !filePath.startsWith('profile_images/')) {
        return;
      }
      
      await userFunctions.processProfileImage(object);
      
    } catch (error) {
      console.error('Error in processProfileImage:', error);
    }
  });

// Process uploaded attendance photos
export const processAttendancePhoto = functions.storage
  .object()
  .onFinalize(async (object) => {
    try {
      const filePath = object.name;
      
      if (!filePath || !filePath.startsWith('attendance_photos/')) {
        return;
      }
      
      await attendanceFunctions.processAttendancePhoto(object);
      
    } catch (error) {
      console.error('Error in processAttendancePhoto:', error);
    }
  });

// ========== WEBHOOK FUNCTIONS ==========

// FCM token refresh webhook
export const fcmTokenRefresh = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    
    await webhookFunctions.handleFCMTokenRefresh(req.body);
    res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('Error in fcmTokenRefresh:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// External system webhook
export const externalWebhook = functions.https.onRequest(async (req, res) => {
  try {
    await webhookFunctions.handleExternalWebhook(req, res);
  } catch (error) {
    console.error('Error in externalWebhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== CUSTOM FUNCTIONS FOR BIOMETRIC AUTH ==========

// Generate custom token for biometric authentication
export const generateCustomToken = functions.https.onCall(async (data, context) => {
  try {
    // Validate request
    if (!context.auth || !data.biometricHash) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to generate custom token'
      );
    }
    
    const uid = context.auth.uid;
    
    // Verify biometric hash (implement your verification logic)
    const isValidBiometric = await authFunctions.verifyBiometricHash(uid, data.biometricHash);
    
    if (!isValidBiometric) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invalid biometric authentication'
      );
    }
    
    // Generate custom token
    const customToken = await admin.auth().createCustomToken(uid);
    
    return { customToken };
    
  } catch (error) {
    console.error('Error generating custom token:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to generate custom token'
    );
  }
});

// ========== UTILITY FUNCTIONS ==========

// Test function for development
export const testFunction = functions.https.onCall(async (data, context) => {
  if (process.env.NODE_ENV === 'production') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Test function not available in production'
    );
  }
  
  return {
    message: 'Test function working!',
    timestamp: new Date().toISOString(),
    data,
  };
});