#!/usr/bin/env ts-node

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  path.join(__dirname, '../service-account-key.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`,
    storageBucket: `${serviceAccount.project_id}.appspot.com`,
  });
} else {
  console.warn('Service account key not found. Using default credentials.');
  admin.initializeApp();
}

const db = admin.firestore();

// ========== MIGRATION FUNCTIONS ==========

interface MigrationResult {
  success: boolean;
  message: string;
  data?: any;
}

class DatabaseMigrator {
  
  async runAllMigrations(): Promise<void> {
    console.log('🚀 Starting database migrations and seeding...\n');
    
    try {
      // Run migrations in order
      await this.createIndexes();
      await this.setupCollections();
      await this.seedSystemData();
      await this.seedSampleData();
      await this.setupSecurityRules();
      
      console.log('\n✅ All migrations completed successfully!');
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    }
  }

  // Create necessary Firestore indexes
  async createIndexes(): Promise<MigrationResult> {
    console.log('📊 Creating Firestore indexes...');
    
    // Note: Firestore indexes are typically created via Firebase CLI
    // This function documents the required indexes
    
    const requiredIndexes = [
      {
        collection: 'users',
        fields: ['storeId', 'status', 'role'],
        description: 'Query active users by store and role'
      },
      {
        collection: 'users',
        fields: ['franchiseId', 'status', 'role'],
        description: 'Query active users by franchise and role'
      },
      {
        collection: 'attendance',
        fields: ['userId', 'timestamp'],
        description: 'Query user attendance by date'
      },
      {
        collection: 'attendance',
        fields: ['storeId', 'status', 'timestamp'],
        description: 'Query store attendance by status and date'
      },
      {
        collection: 'attendance_sessions',
        fields: ['userId', 'date'],
        description: 'Query user sessions by date'
      },
      {
        collection: 'attendance_sessions',
        fields: ['storeId', 'date'],
        description: 'Query store sessions by date'
      },
      {
        collection: 'notifications',
        fields: ['recipientIds', 'createdAt'],
        description: 'Query user notifications by date'
      },
    ];
    
    console.log('Required indexes:');
    requiredIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.collection}: [${index.fields.join(', ')}] - ${index.description}`);
    });
    
    console.log('\n⚠️  Create these indexes manually using Firebase CLI:');
    console.log('   firebase firestore:indexes');
    
    return { success: true, message: 'Index documentation complete' };
  }

  // Setup collection structure and initial documents
  async setupCollections(): Promise<MigrationResult> {
    console.log('🏗️  Setting up collections...');
    
    const batch = db.batch();
    
    // Create system settings document
    const systemSettingsRef = db.collection('settings').doc('global');
    batch.set(systemSettingsRef, {
      appVersion: '1.0.0',
      maintenanceMode: false,
      maintenanceMessage: '',
      attendanceRadius: 100,
      maxCheckInWindow: 30,
      maxCheckOutWindow: 30,
      requirePhotoCheckIn: true,
      requirePhotoCheckOut: false,
      enableBiometricAuth: true,
      enableQRCheckIn: true,
      qrCodeExpiry: 5,
      maxOfflineDays: 7,
      syncInterval: 15,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create notification templates
    const notificationTemplatesRef = db.collection('settings').doc('notification_templates');
    batch.set(notificationTemplatesRef, {
      attendanceApproval: {
        title: 'Attendance Approval Required',
        body: 'New attendance record requires your approval',
      },
      attendanceApproved: {
        title: 'Attendance Approved',
        body: 'Your attendance record has been approved',
      },
      attendanceRejected: {
        title: 'Attendance Rejected',
        body: 'Your attendance record has been rejected',
      },
      userActivation: {
        title: 'Account Activated',
        body: 'Your DOT Attendance account has been activated',
      },
      scheduleReminder: {
        title: 'Schedule Reminder',
        body: 'Don\'t forget to check in for your shift',
      },
      lateCheckIn: {
        title: 'Late Check-in Alert',
        body: 'You are late for your scheduled shift',
      },
      missingCheckOut: {
        title: 'Missing Check-out',
        body: 'Please remember to check out at the end of your shift',
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await batch.commit();
    
    return { success: true, message: 'Collections setup complete' };
  }

  // Seed system data (roles, permissions, etc.)
  async seedSystemData(): Promise<MigrationResult> {
    console.log('🌱 Seeding system data...');
    
    const batch = db.batch();
    
    // Create role permissions document
    const rolePermissionsRef = db.collection('settings').doc('role_permissions');
    batch.set(rolePermissionsRef, {
      USER: [
        'attendance.check_in',
        'attendance.check_out',
        'attendance.view_own',
        'profile.view_own',
        'profile.update_own',
      ],
      ADMIN: [
        'attendance.check_in',
        'attendance.check_out',
        'attendance.view_own',
        'attendance.view_store',
        'attendance.manage_store',
        'users.view_store',
        'users.manage_store',
        'reports.view_store',
        'reports.generate_store',
        'settings.view_store',
        'settings.update_store',
        'profile.view_own',
        'profile.update_own',
      ],
      MASTER_ADMIN: [
        'attendance.check_in',
        'attendance.check_out',
        'attendance.view_own',
        'attendance.view_franchise',
        'attendance.manage_franchise',
        'users.view_franchise',
        'users.manage_franchise',
        'reports.view_franchise',
        'reports.generate_franchise',
        'settings.view_franchise',
        'settings.update_franchise',
        'stores.manage_franchise',
        'profile.view_own',
        'profile.update_own',
      ],
      SUPER_ADMIN: [
        'attendance.*',
        'users.*',
        'reports.*',
        'settings.*',
        'stores.*',
        'franchises.*',
        'system.admin',
        'profile.*',
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create default working hours template
    const defaultWorkingHours = {
      monday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
      tuesday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
      wednesday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
      thursday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
      friday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
      saturday: { startTime: '10:00', endTime: '14:00', isWorkingDay: false, breaks: [] },
      sunday: { startTime: '10:00', endTime: '14:00', isWorkingDay: false, breaks: [] },
    };
    
    const workingHoursRef = db.collection('settings').doc('default_working_hours');
    batch.set(workingHoursRef, {
      ...defaultWorkingHours,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    await batch.commit();
    
    return { success: true, message: 'System data seeding complete' };
  }

  // Seed sample data for testing
  async seedSampleData(): Promise<MigrationResult> {
    console.log('🎭 Seeding sample data...');
    
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Skipping sample data in production environment');
      return { success: true, message: 'Sample data skipped in production' };
    }
    
    const batch = db.batch();
    
    // Create sample franchise
    const franchiseId = uuidv4();
    const franchiseRef = db.collection('franchises').doc(franchiseId);
    batch.set(franchiseRef, {
      name: 'DOT Sample Franchise',
      description: 'Sample franchise for testing',
      ownerId: 'sample_owner',
      adminIds: ['sample_admin'],
      phoneNumber: '+1234567890',
      email: 'franchise@dotattendance.com',
      address: '123 Main Street',
      city: 'Sample City',
      state: 'CA',
      zipCode: '90210',
      country: 'USA',
      isActive: true,
      licenseNumber: 'DOT-SAMPLE-001',
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      storeIds: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Create sample stores
    const storeIds = [];
    for (let i = 1; i <= 3; i++) {
      const storeId = uuidv4();
      storeIds.push(storeId);
      
      const storeRef = db.collection('stores').doc(storeId);
      batch.set(storeRef, {
        name: `DOT Store ${i}`,
        franchiseId,
        description: `Sample store ${i} for testing`,
        status: 'ACTIVE',
        location: {
          latitude: 34.0522 + (i * 0.01),
          longitude: -118.2437 + (i * 0.01),
          radiusMeters: 100,
          address: `${100 + i} Sample Street`,
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210',
          country: 'USA',
        },
        workingHours: {
          monday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
          tuesday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
          wednesday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
          thursday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
          friday: { startTime: '09:00', endTime: '17:00', isWorkingDay: true, breaks: ['12:00-13:00'] },
          saturday: { startTime: '10:00', endTime: '14:00', isWorkingDay: false, breaks: [] },
          sunday: { startTime: '10:00', endTime: '14:00', isWorkingDay: false, breaks: [] },
        },
        managerId: null,
        adminIds: [],
        phoneNumber: `+123456789${i}`,
        email: `store${i}@dotattendance.com`,
        departments: ['Sales', 'Customer Service', 'Management'],
        maxCapacity: 50,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    // Update franchise with store IDs
    batch.update(franchiseRef, { storeIds });
    
    // Create sample users
    const userRoles = ['SUPER_ADMIN', 'MASTER_ADMIN', 'ADMIN', 'USER'];
    const sampleUsers = [];
    
    for (let i = 0; i < userRoles.length; i++) {
      const role = userRoles[i];
      const userId = `sample_${role.toLowerCase()}_${uuidv4().substring(0, 8)}`;
      
      const userRef = db.collection('users').doc(userId);
      const userData = {
        email: `${role.toLowerCase()}@dotattendance.com`,
        firstName: 'Sample',
        lastName: role.charAt(0) + role.slice(1).toLowerCase(),
        displayName: `Sample ${role.charAt(0) + role.slice(1).toLowerCase()}`,
        role,
        status: 'ACTIVE',
        storeId: role === 'USER' || role === 'ADMIN' ? storeIds[0] : null,
        franchiseId: role !== 'SUPER_ADMIN' ? franchiseId : null,
        managedStoreIds: role === 'ADMIN' ? [storeIds[0]] : 
                        role === 'MASTER_ADMIN' ? storeIds : null,
        managedFranchiseIds: role === 'MASTER_ADMIN' ? [franchiseId] : null,
        employeeId: `EMP${String(i + 1).padStart(4, '0')}`,
        department: 'Management',
        position: role.charAt(0) + role.slice(1).toLowerCase(),
        phoneNumber: `+1234567${String(i).padStart(3, '0')}`,
        biometricEnabled: false,
        preferences: {
          notifications: true,
          theme: 'light',
          language: 'en',
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      
      batch.set(userRef, userData);
      sampleUsers.push({ id: userId, ...userData });
    }
    
    await batch.commit();
    
    return {
      success: true,
      message: 'Sample data seeding complete',
      data: {
        franchiseId,
        storeIds,
        users: sampleUsers.map(u => ({ id: u.id, email: u.email, role: u.role })),
      },
    };
  }

  // Setup security rules (documentation)
  async setupSecurityRules(): Promise<MigrationResult> {
    console.log('🔒 Security rules setup...');
    
    console.log('Firestore security rules are already defined in firestore.rules');
    console.log('Deploy rules using: firebase deploy --only firestore:rules');
    
    return { success: true, message: 'Security rules documentation complete' };
  }

  // Create QR codes for sample stores
  async createSampleQRCodes(): Promise<MigrationResult> {
    console.log('📱 Creating sample QR codes...');
    
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Skipping QR code generation in production');
      return { success: true, message: 'QR code generation skipped in production' };
    }
    
    const storesSnapshot = await db.collection('stores').limit(5).get();
    const batch = db.batch();
    
    for (const storeDoc of storesSnapshot.docs) {
      const storeId = storeDoc.id;
      const qrCodeId = uuidv4();
      
      const qrCodeRef = db.collection('qr_codes').doc(qrCodeId);
      batch.set(qrCodeRef, {
        storeId,
        type: 'ATTENDANCE',
        data: {
          storeId,
          action: 'check_in',
        },
        isActive: true,
        expiresAt: null, // Permanent QR code
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        usageCount: 0,
        maxUsage: null,
      });
      
      // Update store with QR code ID
      batch.update(storeDoc.ref, {
        qrCodeId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    await batch.commit();
    
    return { success: true, message: 'Sample QR codes created' };
  }

  // Cleanup old data (for re-running migrations)
  async cleanup(): Promise<MigrationResult> {
    console.log('🧹 Cleaning up old data...');
    
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Cleanup skipped in production environment');
      return { success: true, message: 'Cleanup skipped in production' };
    }
    
    const collections = [
      'users', 'stores', 'franchises', 'attendance',
      'attendance_sessions', 'notifications', 'qr_codes', 'audit_logs'
    ];
    
    const batch = db.batch();
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName)
        .where('createdAt', '>', new Date(0))
        .limit(500)
        .get();
      
      snapshot.docs.forEach(doc => {
        // Only delete sample/test data
        const data = doc.data();
        if (data.email?.includes('dotattendance.com') || 
            data.name?.includes('Sample') ||
            data.name?.includes('DOT Store')) {
          batch.delete(doc.ref);
        }
      });
    }
    
    await batch.commit();
    
    return { success: true, message: 'Cleanup complete' };
  }
}

// ========== COMMAND LINE INTERFACE ==========

async function main() {
  const migrator = new DatabaseMigrator();
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'migrate':
        await migrator.runAllMigrations();
        break;
      case 'seed':
        await migrator.seedSampleData();
        break;
      case 'cleanup':
        await migrator.cleanup();
        break;
      case 'qr-codes':
        await migrator.createSampleQRCodes();
        break;
      case 'indexes':
        await migrator.createIndexes();
        break;
      default:
        console.log('Usage: npm run migrate [command]');
        console.log('Commands:');
        console.log('  migrate   - Run all migrations and seeding');
        console.log('  seed      - Seed sample data only');
        console.log('  cleanup   - Clean up sample data');
        console.log('  qr-codes  - Create sample QR codes');
        console.log('  indexes   - Show required indexes');
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseMigrator };