import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
  BatchGetCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TABLE_NAMES, GSI_NAMES } from '../dynamodb-client';
import { AttendanceRecord, AttendanceStatus, Employee, Schedule, AttendanceStatistics } from '../models/attendance.model';

export class AttendanceRepository {
  private tableName = TABLE_NAMES.ATTENDANCE;

  // Create new attendance record
  async createAttendance(data: Omit<AttendanceRecord, 'attendanceId' | 'createdAt' | 'updatedAt'>): Promise<AttendanceRecord> {
    const attendanceId = uuidv4();
    const now = new Date().toISOString();
    
    const record: AttendanceRecord = {
      ...data,
      attendanceId,
      createdAt: now,
      updatedAt: now,
      // Generate composite keys for GSIs
      employeeDate: `EMPLOYEE#${data.employeeId}#DATE#${data.date}`,
      dateStatus: `DATE#${data.date}#STATUS#${data.status}`,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        PK: `ATTENDANCE#${attendanceId}`,
        SK: `EMPLOYEE#${data.employeeId}`,
        ...record,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    });

    await dynamoDBClient.send(command);
    return record;
  }

  // Get attendance by ID
  async getAttendanceById(attendanceId: string, employeeId: string): Promise<AttendanceRecord | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        PK: `ATTENDANCE#${attendanceId}`,
        SK: `EMPLOYEE#${employeeId}`,
      },
    });

    const result = await dynamoDBClient.send(command);
    if (!result.Item) return null;
    
    const { PK, SK, ...attendance } = result.Item;
    return attendance as AttendanceRecord;
  }

  // Get attendance records by employee and date range
  async getAttendanceByEmployeeAndDateRange(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.EMPLOYEE_DATE_INDEX,
      KeyConditionExpression: 'employeeDate = :pk AND #date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: {
        '#date': 'date',
      },
      ExpressionAttributeValues: {
        ':pk': `EMPLOYEE#${employeeId}`,
        ':startDate': startDate,
        ':endDate': endDate,
      },
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []).map(item => {
      const { PK, SK, ...attendance } = item;
      return attendance as AttendanceRecord;
    });
  }

  // Get all attendance records for a specific date
  async getAttendanceByDate(date: string, organizationId?: string): Promise<AttendanceRecord[]> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: GSI_NAMES.DATE_STATUS_INDEX,
      KeyConditionExpression: 'begins_with(dateStatus, :datePrefix)',
      FilterExpression: organizationId ? 'organizationId = :orgId' : undefined,
      ExpressionAttributeValues: {
        ':datePrefix': `DATE#${date}`,
        ...(organizationId && { ':orgId': organizationId }),
      },
    });

    const result = await dynamoDBClient.send(command);
    return (result.Items || []).map(item => {
      const { PK, SK, ...attendance } = item;
      return attendance as AttendanceRecord;
    });
  }

  // Check-in operation
  async checkIn(
    employeeId: string,
    organizationId: string,
    location?: { latitude: number; longitude: number },
    deviceInfo?: any
  ): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if already checked in today
    const existing = await this.getTodayAttendance(employeeId);
    if (existing && existing.checkInTime) {
      throw new Error('Already checked in today');
    }

    const attendanceData = {
      employeeId,
      organizationId,
      date: today,
      checkInTime: now,
      status: AttendanceStatus.PRESENT,
      checkInLocation: location ? {
        ...location,
        timestamp: now,
      } : undefined,
      deviceInfo,
    };

    return this.createAttendance(attendanceData);
  }

  // Check-out operation
  async checkOut(
    employeeId: string,
    location?: { latitude: number; longitude: number }
  ): Promise<AttendanceRecord> {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Get today's attendance record
    const attendance = await this.getTodayAttendance(employeeId);
    if (!attendance) {
      throw new Error('No check-in record found for today');
    }
    if (attendance.checkOutTime) {
      throw new Error('Already checked out today');
    }

    // Calculate work hours
    const checkInTime = new Date(attendance.checkInTime!);
    const checkOutTime = new Date(now);
    const workHoursMs = checkOutTime.getTime() - checkInTime.getTime();
    const actualWorkHours = Math.round((workHoursMs / (1000 * 60 * 60)) * 100) / 100;

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `ATTENDANCE#${attendance.attendanceId}`,
        SK: `EMPLOYEE#${employeeId}`,
      },
      UpdateExpression: 'SET checkOutTime = :checkOut, actualWorkHours = :hours, checkOutLocation = :location, updatedAt = :now',
      ExpressionAttributeValues: {
        ':checkOut': now,
        ':hours': actualWorkHours,
        ':location': location ? { ...location, timestamp: now } : null,
        ':now': now,
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoDBClient.send(command);
    const { PK, SK, ...updated } = result.Attributes!;
    return updated as AttendanceRecord;
  }

  // Get today's attendance for an employee
  async getTodayAttendance(employeeId: string): Promise<AttendanceRecord | null> {
    const today = new Date().toISOString().split('T')[0];
    const records = await this.getAttendanceByEmployeeAndDateRange(employeeId, today, today);
    return records.length > 0 ? records[0] : null;
  }

  // Update attendance status
  async updateAttendanceStatus(
    attendanceId: string,
    employeeId: string,
    status: AttendanceStatus,
    modifiedBy?: string
  ): Promise<AttendanceRecord> {
    const now = new Date().toISOString();
    
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        PK: `ATTENDANCE#${attendanceId}`,
        SK: `EMPLOYEE#${employeeId}`,
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :now, modifiedBy = :modifiedBy',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':now': now,
        ':modifiedBy': modifiedBy || null,
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await dynamoDBClient.send(command);
    const { PK, SK, ...updated } = result.Attributes!;
    return updated as AttendanceRecord;
  }

  // Batch create attendance records
  async batchCreateAttendance(records: Omit<AttendanceRecord, 'attendanceId' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
    const now = new Date().toISOString();
    const items = records.map(record => ({
      PutRequest: {
        Item: {
          PK: `ATTENDANCE#${uuidv4()}`,
          SK: `EMPLOYEE#${record.employeeId}`,
          ...record,
          attendanceId: uuidv4(),
          createdAt: now,
          updatedAt: now,
          employeeDate: `EMPLOYEE#${record.employeeId}#DATE#${record.date}`,
          dateStatus: `DATE#${record.date}#STATUS#${record.status}`,
        },
      },
    }));

    // DynamoDB BatchWrite supports max 25 items at once
    const chunks = [];
    for (let i = 0; i < items.length; i += 25) {
      chunks.push(items.slice(i, i + 25));
    }

    for (const chunk of chunks) {
      const command = new BatchWriteCommand({
        RequestItems: {
          [this.tableName]: chunk,
        },
      });
      await dynamoDBClient.send(command);
    }
  }

  // Get attendance statistics for an employee
  async getAttendanceStatistics(
    employeeId: string,
    period: string // YYYY-MM or YYYY
  ): Promise<AttendanceStatistics> {
    let startDate: string;
    let endDate: string;

    if (period.length === 7) { // YYYY-MM
      startDate = `${period}-01`;
      const [year, month] = period.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${period}-${lastDay}`;
    } else { // YYYY
      startDate = `${period}-01-01`;
      endDate = `${period}-12-31`;
    }

    const records = await this.getAttendanceByEmployeeAndDateRange(employeeId, startDate, endDate);
    
    const stats: AttendanceStatistics = {
      employeeId,
      period,
      totalDays: records.length,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      leaveDays: 0,
      totalWorkHours: 0,
      overtimeHours: 0,
      attendanceRate: 0,
    };

    let totalCheckInMinutes = 0;
    let totalCheckOutMinutes = 0;
    let checkInCount = 0;
    let checkOutCount = 0;

    records.forEach(record => {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          stats.presentDays++;
          break;
        case AttendanceStatus.ABSENT:
          stats.absentDays++;
          break;
        case AttendanceStatus.LATE:
          stats.lateDays++;
          stats.presentDays++; // Late is still present
          break;
        case AttendanceStatus.SICK_LEAVE:
        case AttendanceStatus.VACATION:
          stats.leaveDays++;
          break;
      }

      if (record.actualWorkHours) {
        stats.totalWorkHours += record.actualWorkHours;
      }
      if (record.overtimeHours) {
        stats.overtimeHours += record.overtimeHours;
      }

      // Calculate average times
      if (record.checkInTime) {
        const time = new Date(record.checkInTime);
        totalCheckInMinutes += time.getHours() * 60 + time.getMinutes();
        checkInCount++;
      }
      if (record.checkOutTime) {
        const time = new Date(record.checkOutTime);
        totalCheckOutMinutes += time.getHours() * 60 + time.getMinutes();
        checkOutCount++;
      }
    });

    // Calculate averages
    if (checkInCount > 0) {
      const avgMinutes = Math.round(totalCheckInMinutes / checkInCount);
      const hours = Math.floor(avgMinutes / 60);
      const minutes = avgMinutes % 60;
      stats.averageCheckInTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    if (checkOutCount > 0) {
      const avgMinutes = Math.round(totalCheckOutMinutes / checkOutCount);
      const hours = Math.floor(avgMinutes / 60);
      const minutes = avgMinutes % 60;
      stats.averageCheckOutTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    // Calculate attendance rate
    const workingDays = stats.totalDays - stats.leaveDays;
    if (workingDays > 0) {
      stats.attendanceRate = Math.round((stats.presentDays / workingDays) * 10000) / 100;
    }

    return stats;
  }

  // Delete attendance record
  async deleteAttendance(attendanceId: string, employeeId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        PK: `ATTENDANCE#${attendanceId}`,
        SK: `EMPLOYEE#${employeeId}`,
      },
    });

    await dynamoDBClient.send(command);
  }
}