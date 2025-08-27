import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Router } from 'express';
import * as Joi from 'joi';
import * as moment from 'moment-timezone';
import sharp from 'sharp';
import { validateRequest, authenticate, authorize } from '../middleware';

const router = Router();
const db = admin.firestore();
const storage = admin.storage();

// ========== VALIDATION SCHEMAS ==========

const checkInSchema = Joi.object({
  storeId: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    accuracy: Joi.number().optional(),
    address: Joi.string().optional(),
  }).required(),
  method: Joi.string().valid('QR_CODE', 'LOCATION', 'BIOMETRIC').required(),
  qrCodeId: Joi.string().optional(),
  photoUrl: Joi.string().optional(),
  notes: Joi.string().max(500).optional(),
  deviceId: Joi.string().optional(),
});

const checkOutSchema = Joi.object({
  storeId: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    accuracy: Joi.number().optional(),
    address: Joi.string().optional(),
  }).required(),
  photoUrl: Joi.string().optional(),
  notes: Joi.string().max(500).optional(),
  deviceId: Joi.string().optional(),
});

const approveAttendanceSchema = Joi.object({
  attendanceIds: Joi.array().items(Joi.string()).required(),
  notes: Joi.string().max(500).optional(),
});

const rejectAttendanceSchema = Joi.object({
  attendanceIds: Joi.array().items(Joi.string()).required(),
  reason: Joi.string().min(1).max(500).required(),
  notes: Joi.string().max(500).optional(),
});

// ========== API ENDPOINTS ==========

// Check in
router.post('/check-in', authenticate, validateRequest(checkInSchema), async (req, res) => {
  try {
    const userId = req.user!.uid;
    const { storeId, location, method, qrCodeId, photoUrl, notes, deviceId } = req.body;
    
    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userDoc.data()!;
    
    // Verify user has access to store
    if (!canAccessStore(userData, storeId)) {
      return res.status(403).json({ error: 'Access denied to this store' });
    }
    
    // Get store data
    const storeDoc = await db.collection('stores').doc(storeId).get();
    if (!storeDoc.exists) {
      return res.status(404).json({ error: 'Store not found' });
    }
    
    const storeData = storeDoc.data()!;
    
    // Validate location if method is LOCATION
    if (method === 'LOCATION') {
      const distance = calculateDistance(
        location.latitude, location.longitude,
        storeData.location.latitude, storeData.location.longitude
      );
      
      if (distance > storeData.location.radiusMeters) {
        return res.status(400).json({
          error: 'You are too far from the store to check in',
          distance: Math.round(distance),
          maxDistance: storeData.location.radiusMeters,
        });
      }
    }
    
    // Validate QR code if method is QR_CODE
    if (method === 'QR_CODE') {
      if (!qrCodeId) {
        return res.status(400).json({ error: 'QR code ID is required' });
      }
      
      const qrCodeDoc = await db.collection('qr_codes').doc(qrCodeId).get();
      if (!qrCodeDoc.exists) {
        return res.status(400).json({ error: 'Invalid QR code' });
      }
      
      const qrCodeData = qrCodeDoc.data()!;
      if (qrCodeData.storeId !== storeId) {
        return res.status(400).json({ error: 'QR code does not belong to this store' });
      }
      
      if (qrCodeData.expiresAt && new Date() > qrCodeData.expiresAt.toDate()) {
        return res.status(400).json({ error: 'QR code has expired' });
      }
    }
    
    // Check if user already has a check-in today
    const today = moment().startOf('day').toDate();
    const sessionId = generateSessionId(userId, today);
    
    const existingSession = await db.collection('attendance_sessions').doc(sessionId).get();
    if (existingSession.exists && existingSession.data()?.checkIn) {
      return res.status(400).json({
        error: 'You have already checked in today',
        checkInTime: existingSession.data()?.checkIn?.timestamp,
      });
    }
    
    // Check working hours
    const now = new Date();
    const isLate = isLateCheckIn(now, storeData.workingHours);
    
    // Create attendance record
    const attendanceData = {
      userId,
      storeId,
      franchiseId: storeData.franchiseId,
      type: 'CHECK_IN',
      status: 'APPROVED', // Auto-approve check-ins by default
      method,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      location,
      photoUrl: photoUrl || null,
      notes: notes || null,
      qrCodeId: qrCodeId || null,
      deviceId: deviceId || null,
      isLate,
      distanceFromStore: method === 'LOCATION' ? calculateDistance(
        location.latitude, location.longitude,
        storeData.location.latitude, storeData.location.longitude
      ) : null,
      ipAddress: req.ip,
    };
    
    const attendanceRef = await db.collection('attendance').add(attendanceData);
    const attendanceId = attendanceRef.id;
    
    // Create or update attendance session
    const sessionData = {
      userId,
      storeId,
      franchiseId: storeData.franchiseId,
      date: admin.firestore.Timestamp.fromDate(today),
      checkIn: {
        id: attendanceId,
        ...attendanceData,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isComplete: false,
    };
    
    await db.collection('attendance_sessions').doc(sessionId).set(sessionData, { merge: true });
    
    // Log audit event
    await logAuditEvent({
      type: 'ATTENDANCE_CHECK_IN',
      userId,
      storeId,
      attendanceId,
      details: {
        method,
        isLate,
        location: `${location.latitude},${location.longitude}`,
      },
    });
    
    res.status(200).json({
      success: true,
      attendanceId,
      checkInTime: now.toISOString(),
      isLate,
      message: isLate ? 'Checked in successfully (Late)' : 'Checked in successfully',
    });
    
  } catch (error) {
    console.error('Error in check-in:', error);
    res.status(500).json({ error: 'Failed to check in. Please try again.' });
  }
});

// Check out
router.post('/check-out', authenticate, validateRequest(checkOutSchema), async (req, res) => {
  try {
    const userId = req.user!.uid;
    const { storeId, location, photoUrl, notes, deviceId } = req.body;
    
    // Get today's attendance session
    const today = moment().startOf('day').toDate();
    const sessionId = generateSessionId(userId, today);
    
    const sessionDoc = await db.collection('attendance_sessions').doc(sessionId).get();
    if (!sessionDoc.exists || !sessionDoc.data()?.checkIn) {
      return res.status(400).json({ error: 'No check-in found for today. Please check in first.' });
    }
    
    const sessionData = sessionDoc.data()!;
    
    if (sessionData.checkOut) {
      return res.status(400).json({
        error: 'You have already checked out today',
        checkOutTime: sessionData.checkOut.timestamp,
      });
    }
    
    // Get store data for validation
    const storeDoc = await db.collection('stores').doc(storeId).get();
    const storeData = storeDoc.data()!;
    
    // Check working hours
    const now = new Date();
    const isEarly = isEarlyCheckOut(now, storeData.workingHours);
    
    // Create attendance record
    const attendanceData = {
      userId,
      storeId,
      franchiseId: storeData.franchiseId,
      type: 'CHECK_OUT',
      status: 'APPROVED',
      method: 'LOCATION',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      location,
      photoUrl: photoUrl || null,
      notes: notes || null,
      deviceId: deviceId || null,
      isEarly,
      distanceFromStore: calculateDistance(
        location.latitude, location.longitude,
        storeData.location.latitude, storeData.location.longitude
      ),
      ipAddress: req.ip,
    };
    
    const attendanceRef = await db.collection('attendance').add(attendanceData);
    const attendanceId = attendanceRef.id;
    
    // Calculate working time
    const checkInTime = sessionData.checkIn.timestamp.toDate();
    const workingMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / (1000 * 60));
    
    // Update attendance session
    await db.collection('attendance_sessions').doc(sessionId).update({
      checkOut: {
        id: attendanceId,
        ...attendanceData,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isComplete: true,
      totalWorkingMinutes: workingMinutes,
    });
    
    // Log audit event
    await logAuditEvent({
      type: 'ATTENDANCE_CHECK_OUT',
      userId,
      storeId,
      attendanceId,
      details: {
        isEarly,
        workingMinutes,
        location: `${location.latitude},${location.longitude}`,
      },
    });
    
    res.status(200).json({
      success: true,
      attendanceId,
      checkOutTime: now.toISOString(),
      workingMinutes,
      isEarly,
      message: isEarly ? 'Checked out successfully (Early)' : 'Checked out successfully',
    });
    
  } catch (error) {
    console.error('Error in check-out:', error);
    res.status(500).json({ error: 'Failed to check out. Please try again.' });
  }
});

// Get current attendance status
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user!.uid;
    
    // Get today's attendance session
    const today = moment().startOf('day').toDate();
    const sessionId = generateSessionId(userId, today);
    
    const sessionDoc = await db.collection('attendance_sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(200).json({
        status: 'NOT_STARTED',
        hasCheckedIn: false,
        hasCheckedOut: false,
        workingMinutes: 0,
      });
    }
    
    const sessionData = sessionDoc.data()!;
    const hasCheckedIn = !!sessionData.checkIn;
    const hasCheckedOut = !!sessionData.checkOut;
    
    let status = 'NOT_STARTED';
    if (hasCheckedIn && hasCheckedOut) {
      status = 'COMPLETED';
    } else if (hasCheckedIn) {
      status = 'WORKING';
    }
    
    // Calculate current working time if checked in but not out
    let workingMinutes = sessionData.totalWorkingMinutes || 0;
    if (hasCheckedIn && !hasCheckedOut) {
      const checkInTime = sessionData.checkIn.timestamp.toDate();
      workingMinutes = Math.floor((new Date().getTime() - checkInTime.getTime()) / (1000 * 60));
    }
    
    res.status(200).json({
      status,
      hasCheckedIn,
      hasCheckedOut,
      checkInTime: sessionData.checkIn?.timestamp?.toDate()?.toISOString() || null,
      checkOutTime: sessionData.checkOut?.timestamp?.toDate()?.toISOString() || null,
      workingMinutes,
      isLate: sessionData.checkIn?.isLate || false,
      isEarly: sessionData.checkOut?.isEarly || false,
    });
    
  } catch (error) {
    console.error('Error getting attendance status:', error);
    res.status(500).json({ error: 'Failed to get attendance status' });
  }
});

// Get attendance history
router.get('/history', authenticate, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const startDate = req.query.startDate ? moment(req.query.startDate as string).startOf('day').toDate() : moment().subtract(30, 'days').startOf('day').toDate();
    const endDate = req.query.endDate ? moment(req.query.endDate as string).endOf('day').toDate() : moment().endOf('day').toDate();
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    
    const query = db
      .collection('attendance_sessions')
      .where('userId', '==', userId)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', admin.firestore.Timestamp.fromDate(endDate))
      .orderBy('date', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);
    
    const snapshot = await query.get();
    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate().toISOString().split('T')[0],
    }));
    
    res.status(200).json({
      sessions,
      pagination: {
        page,
        limit,
        total: sessions.length,
        hasMore: sessions.length === limit,
      },
    });
    
  } catch (error) {
    console.error('Error getting attendance history:', error);
    res.status(500).json({ error: 'Failed to get attendance history' });
  }
});

// Get pending approvals (Admin only)
router.get('/pending-approvals', authenticate, authorize(['ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const userId = req.user!.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data()!;
    
    let query = db.collection('attendance').where('status', '==', 'PENDING');
    
    // Apply scope based on user role
    if (userData.role === 'ADMIN') {
      const storeIds = getAccessibleStoreIds(userData);
      if (storeIds.length === 0) {
        return res.status(200).json({ approvals: [] });
      }
      query = query.where('storeId', 'in', storeIds.slice(0, 10)); // Firestore limit
    } else if (userData.role === 'MASTER_ADMIN') {
      const franchiseIds = getAccessibleFranchiseIds(userData);
      if (franchiseIds.length > 0) {
        query = query.where('franchiseId', 'in', franchiseIds.slice(0, 10));
      }
    }
    
    query = query.orderBy('timestamp', 'desc').limit(50);
    
    const snapshot = await query.get();
    const approvals = await Promise.all(
      snapshot.docs.map(async doc => {
        const data = doc.data();
        
        // Get user info
        const userDoc = await db.collection('users').doc(data.userId).get();
        const userInfo = userDoc.exists ? {
          name: `${userDoc.data()?.firstName} ${userDoc.data()?.lastName}`,
          employeeId: userDoc.data()?.employeeId,
        } : null;
        
        return {
          id: doc.id,
          ...data,
          userInfo,
        };
      })
    );
    
    res.status(200).json({ approvals });
    
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    res.status(500).json({ error: 'Failed to get pending approvals' });
  }
});

// Approve attendance records
router.post('/approve', authenticate, authorize(['ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN']), validateRequest(approveAttendanceSchema), async (req, res) => {
  try {
    const approverId = req.user!.uid;
    const { attendanceIds, notes } = req.body;
    
    const batch = db.batch();
    
    for (const attendanceId of attendanceIds) {
      const attendanceRef = db.collection('attendance').doc(attendanceId);
      batch.update(attendanceRef, {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        notes: notes || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    await batch.commit();
    
    // Log audit event
    await logAuditEvent({
      type: 'ATTENDANCE_APPROVED',
      userId: approverId,
      details: {
        attendanceIds,
        count: attendanceIds.length,
        notes,
      },
    });
    
    res.status(200).json({
      success: true,
      approvedCount: attendanceIds.length,
    });
    
  } catch (error) {
    console.error('Error approving attendance:', error);
    res.status(500).json({ error: 'Failed to approve attendance records' });
  }
});

// Reject attendance records
router.post('/reject', authenticate, authorize(['ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN']), validateRequest(rejectAttendanceSchema), async (req, res) => {
  try {
    const rejectedBy = req.user!.uid;
    const { attendanceIds, reason, notes } = req.body;
    
    const batch = db.batch();
    
    for (const attendanceId of attendanceIds) {
      const attendanceRef = db.collection('attendance').doc(attendanceId);
      batch.update(attendanceRef, {
        status: 'REJECTED',
        rejectedBy,
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason,
        notes: notes || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    await batch.commit();
    
    // Log audit event
    await logAuditEvent({
      type: 'ATTENDANCE_REJECTED',
      userId: rejectedBy,
      details: {
        attendanceIds,
        count: attendanceIds.length,
        reason,
        notes,
      },
    });
    
    res.status(200).json({
      success: true,
      rejectedCount: attendanceIds.length,
    });
    
  } catch (error) {
    console.error('Error rejecting attendance:', error);
    res.status(500).json({ error: 'Failed to reject attendance records' });
  }
});

// ========== HELPER FUNCTIONS ==========

// Generate session ID for a user and date
function generateSessionId(userId: string, date: Date): string {
  const dateStr = moment(date).format('YYYY-MM-DD');
  return `${userId}_${dateStr}`;
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Check if check-in is late
function isLateCheckIn(checkInTime: Date, workingHours: any): boolean {
  const dayOfWeek = checkInTime.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  if (!workingHours || !workingHours[dayName] || !workingHours[dayName].isWorkingDay) {
    return false;
  }
  
  const startTime = workingHours[dayName].startTime; // Format: "HH:mm"
  const [startHour, startMinute] = startTime.split(':').map(Number);
  
  const scheduledStart = new Date(checkInTime);
  scheduledStart.setHours(startHour, startMinute, 0, 0);
  
  // Allow 15-minute grace period
  const graceTime = new Date(scheduledStart.getTime() + 15 * 60 * 1000);
  
  return checkInTime > graceTime;
}

// Check if check-out is early
function isEarlyCheckOut(checkOutTime: Date, workingHours: any): boolean {
  const dayOfWeek = checkOutTime.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  if (!workingHours || !workingHours[dayName] || !workingHours[dayName].isWorkingDay) {
    return false;
  }
  
  const endTime = workingHours[dayName].endTime; // Format: "HH:mm"
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const scheduledEnd = new Date(checkOutTime);
  scheduledEnd.setHours(endHour, endMinute, 0, 0);
  
  // Allow 15-minute early checkout
  const earlyTime = new Date(scheduledEnd.getTime() - 15 * 60 * 1000);
  
  return checkOutTime < earlyTime;
}

// Check if user can access store
function canAccessStore(userData: any, storeId: string): boolean {
  if (userData.role === 'SUPER_ADMIN') {
    return true;
  }
  
  return userData.storeId === storeId ||
    userData.managedStoreIds?.includes(storeId) ||
    false;
}

// Get accessible store IDs for user
function getAccessibleStoreIds(userData: any): string[] {
  if (userData.role === 'SUPER_ADMIN') {
    return []; // Empty means all stores
  }
  
  const storeIds = [];
  if (userData.storeId) {
    storeIds.push(userData.storeId);
  }
  if (userData.managedStoreIds) {
    storeIds.push(...userData.managedStoreIds);
  }
  
  return [...new Set(storeIds)];
}

// Get accessible franchise IDs for user
function getAccessibleFranchiseIds(userData: any): string[] {
  if (userData.role === 'SUPER_ADMIN') {
    return []; // Empty means all franchises
  }
  
  const franchiseIds = [];
  if (userData.franchiseId) {
    franchiseIds.push(userData.franchiseId);
  }
  if (userData.managedFranchiseIds) {
    franchiseIds.push(...userData.managedFranchiseIds);
  }
  
  return [...new Set(franchiseIds)];
}

// Log audit event
async function logAuditEvent(event: any): Promise<void> {
  try {
    await db.collection('audit_logs').add({
      ...event,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging audit event:', error);
  }
}

// ========== CLOUD FUNCTION HELPERS ==========

// Update attendance session when attendance record changes
export async function updateAttendanceSession(attendanceId: string, attendanceData: any): Promise<void> {
  try {
    const sessionId = generateSessionId(attendanceData.userId, attendanceData.timestamp.toDate());
    const sessionRef = db.collection('attendance_sessions').doc(sessionId);
    
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    if (attendanceData.type === 'CHECK_IN') {
      updateData.checkIn = {
        id: attendanceId,
        ...attendanceData,
      };
    } else if (attendanceData.type === 'CHECK_OUT') {
      updateData.checkOut = {
        id: attendanceId,
        ...attendanceData,
      };
      updateData.isComplete = true;
    }
    
    await sessionRef.set(updateData, { merge: true });
  } catch (error) {
    console.error('Error updating attendance session:', error);
  }
}

// Log attendance event
export async function logAttendanceEvent(
  attendanceId: string,
  attendanceData: any,
  action: 'CREATE' | 'UPDATE'
): Promise<void> {
  try {
    await logAuditEvent({
      type: `ATTENDANCE_${action}`,
      attendanceId,
      userId: attendanceData.userId,
      storeId: attendanceData.storeId,
      details: {
        attendanceType: attendanceData.type,
        status: attendanceData.status,
        method: attendanceData.method,
      },
    });
  } catch (error) {
    console.error('Error logging attendance event:', error);
  }
}

// Process attendance photo
export async function processAttendancePhoto(object: any): Promise<void> {
  try {
    const filePath = object.name;
    const fileName = filePath.split('/').pop();
    
    if (!fileName) return;
    
    const bucket = storage.bucket(object.bucket);
    const file = bucket.file(filePath);
    
    // Download the file
    const [fileBuffer] = await file.download();
    
    // Resize and optimize image
    const processedImage = await sharp(fileBuffer)
      .resize(800, 600, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    // Upload processed image
    const processedPath = filePath.replace('attendance_photos/', 'attendance_photos/processed_');
    const processedFile = bucket.file(processedPath);
    
    await processedFile.save(processedImage, {
      metadata: {
        contentType: 'image/jpeg',
        metadata: {
          processed: 'true',
          originalSize: fileBuffer.length,
          processedSize: processedImage.length,
        },
      },
    });
    
    console.log(`Processed attendance photo: ${fileName}`);
    
  } catch (error) {
    console.error('Error processing attendance photo:', error);
  }
}

// Export router and functions
export const attendanceFunctions = {
  router,
  updateAttendanceSession,
  logAttendanceEvent,
  processAttendancePhoto,
};