import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as Joi from 'joi';
import { validateRequest, authenticate, authorize } from '../middleware';

const router = Router();
const db = admin.firestore();
const messaging = admin.messaging();

// ========== NOTIFICATION TYPES ==========

interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  userId?: string;
  recipientIds?: string[];
  storeId?: string;
  franchiseId?: string;
  priority: 'low' | 'normal' | 'high';
  scheduled?: Date;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  readBy?: Record<string, Date>;
  status: 'pending' | 'sent' | 'failed';
}

enum NotificationType {
  ATTENDANCE_APPROVAL = 'attendance_approval',
  ATTENDANCE_APPROVED = 'attendance_approved',
  ATTENDANCE_REJECTED = 'attendance_rejected',
  USER_ACTIVATION = 'user_activation',
  ROLE_CHANGE = 'role_change',
  NEW_USER = 'new_user',
  SCHEDULE_REMINDER = 'schedule_reminder',
  LATE_CHECK_IN = 'late_check_in',
  MISSING_CHECK_OUT = 'missing_check_out',
  WEEKLY_REPORT = 'weekly_report',
  MONTHLY_STATS = 'monthly_stats',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  GENERAL_ANNOUNCEMENT = 'general_announcement',
}

// ========== VALIDATION SCHEMAS ==========

const sendNotificationSchema = Joi.object({
  type: Joi.string().valid(...Object.values(NotificationType)).required(),
  title: Joi.string().min(1).max(100).required(),
  body: Joi.string().min(1).max(500).required(),
  data: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
  recipientIds: Joi.array().items(Joi.string()).optional(),
  storeId: Joi.string().optional(),
  franchiseId: Joi.string().optional(),
  priority: Joi.string().valid('low', 'normal', 'high').default('normal'),
  scheduled: Joi.date().iso().optional(),
});

// ========== API ENDPOINTS ==========

// Send notification
router.post('/send', authenticate, authorize(['ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN']), validateRequest(sendNotificationSchema), async (req, res) => {
  try {
    const notificationData = req.body;
    const senderId = req.user!.uid;
    
    // Determine recipients
    let recipientIds: string[] = [];
    
    if (notificationData.recipientIds) {
      recipientIds = notificationData.recipientIds;
    } else if (notificationData.storeId) {
      // Get all users in the store
      const storeUsers = await getUsersByStoreId(notificationData.storeId);
      recipientIds = storeUsers.map(user => user.id);
    } else if (notificationData.franchiseId) {
      // Get all users in the franchise
      const franchiseUsers = await getUsersByFranchiseId(notificationData.franchiseId);
      recipientIds = franchiseUsers.map(user => user.id);
    } else {
      return res.status(400).json({
        error: 'Must specify recipientIds, storeId, or franchiseId'
      });
    }
    
    if (recipientIds.length === 0) {
      return res.status(400).json({
        error: 'No recipients found'
      });
    }
    
    // Create notification document
    const notification: NotificationData = {
      id: uuidv4(),
      type: notificationData.type,
      title: notificationData.title,
      body: notificationData.body,
      data: notificationData.data || {},
      recipientIds,
      storeId: notificationData.storeId,
      franchiseId: notificationData.franchiseId,
      priority: notificationData.priority,
      scheduled: notificationData.scheduled,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'pending',
    };
    
    await db.collection('notifications').doc(notification.id).set(notification);
    
    // Send immediately if not scheduled
    if (!notificationData.scheduled) {
      await sendNotificationToUsers(notification);
    }
    
    res.status(200).json({
      success: true,
      notificationId: notification.id,
      recipientCount: recipientIds.length,
    });
    
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      error: 'Failed to send notification'
    });
  }
});

// Get notifications for current user
router.get('/my-notifications', authenticate, async (req, res) => {
  try {
    const userId = req.user!.uid;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = (page - 1) * limit;
    
    const notificationsQuery = await db
      .collection('notifications')
      .where('recipientIds', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    const notifications = notificationsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      isRead: doc.data().readBy?.[userId] != null,
      readAt: doc.data().readBy?.[userId] || null,
    }));
    
    // Get unread count
    const unreadQuery = await db
      .collection('notifications')
      .where('recipientIds', 'array-contains', userId)
      .where(`readBy.${userId}`, '==', null)
      .get();
    
    const unreadCount = unreadQuery.docs.length;
    
    res.status(200).json({
      notifications,
      pagination: {
        page,
        limit,
        total: notifications.length,
        hasMore: notifications.length === limit,
      },
      unreadCount,
    });
    
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({
      error: 'Failed to get notifications'
    });
  }
});

// Mark notification as read
router.post('/:notificationId/read', authenticate, async (req, res) => {
  try {
    const notificationId = req.params.notificationId;
    const userId = req.user!.uid;
    
    const notificationRef = db.collection('notifications').doc(notificationId);
    const notificationDoc = await notificationRef.get();
    
    if (!notificationDoc.exists) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }
    
    const notificationData = notificationDoc.data();
    
    // Check if user is a recipient
    if (!notificationData?.recipientIds?.includes(userId)) {
      return res.status(403).json({
        error: 'Not authorized to read this notification'
      });
    }
    
    // Mark as read
    await notificationRef.update({
      [`readBy.${userId}`]: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    res.status(200).json({
      success: true
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      error: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', authenticate, async (req, res) => {
  try {
    const userId = req.user!.uid;
    
    const notificationsQuery = await db
      .collection('notifications')
      .where('recipientIds', 'array-contains', userId)
      .where(`readBy.${userId}`, '==', null)
      .get();
    
    const batch = db.batch();
    
    notificationsQuery.docs.forEach(doc => {
      batch.update(doc.ref, {
        [`readBy.${userId}`]: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    
    res.status(200).json({
      success: true,
      markedCount: notificationsQuery.docs.length,
    });
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      error: 'Failed to mark all notifications as read'
    });
  }
});

// ========== NOTIFICATION HELPER FUNCTIONS ==========

// Send notification to specific users
export async function sendNotificationToUsers(notification: NotificationData): Promise<void> {
  try {
    console.log(`Sending notification to ${notification.recipientIds?.length || 0} users`);
    
    if (!notification.recipientIds || notification.recipientIds.length === 0) {
      console.log('No recipients specified');
      return;
    }
    
    // Get FCM tokens for recipients
    const userTokens: string[] = [];
    const batchSize = 10; // Process users in batches
    
    for (let i = 0; i < notification.recipientIds.length; i += batchSize) {
      const batch = notification.recipientIds.slice(i, i + batchSize);
      
      const userDocs = await Promise.all(
        batch.map(userId => db.collection('users').doc(userId).get())
      );
      
      userDocs.forEach(doc => {
        if (doc.exists && doc.data()?.fcmToken) {
          userTokens.push(doc.data()!.fcmToken);
        }
      });
    }
    
    if (userTokens.length === 0) {
      console.log('No valid FCM tokens found');
      await updateNotificationStatus(notification.id, 'failed', 'No valid FCM tokens');
      return;
    }
    
    // Prepare FCM message
    const message: admin.messaging.MulticastMessage = {
      tokens: userTokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: {
        notificationId: notification.id,
        type: notification.type,
        ...notification.data,
      },
      android: {
        priority: notification.priority === 'high' ? 'high' : 'normal',
        notification: {
          icon: 'ic_notification',
          color: '#2196F3',
          sound: 'default',
          channelId: getChannelIdForType(notification.type),
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };
    
    // Send multicast message
    const response = await messaging.sendMulticast(message);
    
    console.log(`Notification sent successfully: ${response.successCount} succeeded, ${response.failureCount} failed`);
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(userTokens[idx]);
          console.error(`Failed to send to token ${userTokens[idx]}:`, resp.error);
        }
      });
      
      // Clean up invalid tokens
      await cleanupInvalidTokens(failedTokens);
    }
    
    // Update notification status
    await updateNotificationStatus(
      notification.id,
      response.successCount > 0 ? 'sent' : 'failed',
      `${response.successCount} sent, ${response.failureCount} failed`
    );
    
  } catch (error) {
    console.error('Error sending notification:', error);
    await updateNotificationStatus(notification.id, 'failed', error.message);
  }
}

// Update notification status
async function updateNotificationStatus(
  notificationId: string,
  status: 'pending' | 'sent' | 'failed',
  message?: string
): Promise<void> {
  await db.collection('notifications').doc(notificationId).update({
    status,
    sentAt: status === 'sent' ? admin.firestore.FieldValue.serverTimestamp() : null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(message && { statusMessage: message }),
  });
}

// Clean up invalid FCM tokens
async function cleanupInvalidTokens(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;
  
  try {
    // Find users with these tokens and remove them
    const batch = db.batch();
    const batchSize = 10;
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const tokenBatch = tokens.slice(i, i + batchSize);
      
      const userQuery = await db
        .collection('users')
        .where('fcmToken', 'in', tokenBatch)
        .get();
      
      userQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          fcmToken: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    }
    
    await batch.commit();
    console.log(`Cleaned up ${tokens.length} invalid FCM tokens`);
  } catch (error) {
    console.error('Error cleaning up invalid tokens:', error);
  }
}

// Get channel ID for notification type
function getChannelIdForType(type: string): string {
  switch (type) {
    case NotificationType.ATTENDANCE_APPROVAL:
    case NotificationType.ATTENDANCE_APPROVED:
    case NotificationType.ATTENDANCE_REJECTED:
      return 'attendance_channel';
    case NotificationType.SCHEDULE_REMINDER:
    case NotificationType.LATE_CHECK_IN:
    case NotificationType.MISSING_CHECK_OUT:
      return 'reminders_channel';
    case NotificationType.SYSTEM_MAINTENANCE:
      return 'system_channel';
    default:
      return 'general_channel';
  }
}

// ========== SPECIFIC NOTIFICATION FUNCTIONS ==========

// Send new user notification to admins
export async function sendNewUserNotification(user: admin.auth.UserRecord): Promise<void> {
  const notification: NotificationData = {
    id: uuidv4(),
    type: NotificationType.NEW_USER,
    title: 'New User Registration',
    body: `${user.displayName || user.email} has registered and needs approval.`,
    data: {
      userId: user.uid,
      email: user.email || '',
    },
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
  };
  
  // Get all admin users
  const adminUsers = await db
    .collection('users')
    .where('role', 'in', ['ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN'])
    .where('status', '==', 'ACTIVE')
    .get();
  
  notification.recipientIds = adminUsers.docs.map(doc => doc.id);
  
  await db.collection('notifications').doc(notification.id).set(notification);
  await sendNotificationToUsers(notification);
}

// Send user activation notification
export async function sendUserActivationNotification(userId: string, userData: any): Promise<void> {
  const notification: NotificationData = {
    id: uuidv4(),
    type: NotificationType.USER_ACTIVATION,
    title: 'Account Activated',
    body: 'Your DOT Attendance account has been activated. You can now start using the app.',
    data: {},
    recipientIds: [userId],
    priority: 'high',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
  };
  
  await db.collection('notifications').doc(notification.id).set(notification);
  await sendNotificationToUsers(notification);
}

// Send role change notification
export async function sendRoleChangeNotification(
  userId: string,
  oldRole: string,
  newRole: string
): Promise<void> {
  const notification: NotificationData = {
    id: uuidv4(),
    type: NotificationType.ROLE_CHANGE,
    title: 'Role Updated',
    body: `Your role has been updated from ${oldRole} to ${newRole}.`,
    data: {
      oldRole,
      newRole,
    },
    recipientIds: [userId],
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
  };
  
  await db.collection('notifications').doc(notification.id).set(notification);
  await sendNotificationToUsers(notification);
}

// Send attendance approval notification
export async function sendAttendanceApprovalNotification(
  attendanceId: string,
  attendanceData: any
): Promise<void> {
  const notification: NotificationData = {
    id: uuidv4(),
    type: NotificationType.ATTENDANCE_APPROVAL,
    title: 'Attendance Approval Required',
    body: `Attendance record from ${attendanceData.userId} requires approval.`,
    data: {
      attendanceId,
      userId: attendanceData.userId,
      storeId: attendanceData.storeId,
      type: attendanceData.type,
    },
    storeId: attendanceData.storeId,
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
  };
  
  // Get store admins
  const storeAdmins = await db
    .collection('users')
    .where('role', 'in', ['ADMIN', 'MASTER_ADMIN', 'SUPER_ADMIN'])
    .where('status', '==', 'ACTIVE')
    .get();
  
  const eligibleAdmins = storeAdmins.docs.filter(doc => {
    const userData = doc.data();
    return userData.role === 'SUPER_ADMIN' ||
           userData.storeId === attendanceData.storeId ||
           userData.managedStoreIds?.includes(attendanceData.storeId);
  });
  
  notification.recipientIds = eligibleAdmins.map(doc => doc.id);
  
  await db.collection('notifications').doc(notification.id).set(notification);
  await sendNotificationToUsers(notification);
}

// Send attendance approved notification
export async function sendAttendanceApprovedNotification(
  userId: string,
  attendanceId: string
): Promise<void> {
  const notification: NotificationData = {
    id: uuidv4(),
    type: NotificationType.ATTENDANCE_APPROVED,
    title: 'Attendance Approved',
    body: 'Your attendance record has been approved.',
    data: {
      attendanceId,
    },
    recipientIds: [userId],
    priority: 'normal',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
  };
  
  await db.collection('notifications').doc(notification.id).set(notification);
  await sendNotificationToUsers(notification);
}

// Send attendance rejected notification
export async function sendAttendanceRejectedNotification(
  userId: string,
  attendanceId: string,
  reason: string
): Promise<void> {
  const notification: NotificationData = {
    id: uuidv4(),
    type: NotificationType.ATTENDANCE_REJECTED,
    title: 'Attendance Rejected',
    body: `Your attendance record has been rejected. Reason: ${reason}`,
    data: {
      attendanceId,
      reason,
    },
    recipientIds: [userId],
    priority: 'high',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'pending',
  };
  
  await db.collection('notifications').doc(notification.id).set(notification);
  await sendNotificationToUsers(notification);
}

// ========== UTILITY FUNCTIONS ==========

async function getUsersByStoreId(storeId: string): Promise<any[]> {
  const users = await db
    .collection('users')
    .where('storeId', '==', storeId)
    .where('status', '==', 'ACTIVE')
    .get();
  
  return users.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getUsersByFranchiseId(franchiseId: string): Promise<any[]> {
  const users = await db
    .collection('users')
    .where('franchiseId', '==', franchiseId)
    .where('status', '==', 'ACTIVE')
    .get();
  
  return users.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Export router and functions
export const notificationFunctions = {
  router,
  sendNotificationToUsers,
  sendNewUserNotification,
  sendUserActivationNotification,
  sendRoleChangeNotification,
  sendAttendanceApprovalNotification,
  sendAttendanceApprovedNotification,
  sendAttendanceRejectedNotification,
};