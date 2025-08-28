import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AttendanceRepository } from '../lib/database/repositories/attendance.repository';
import { AttendanceStatus } from '../lib/database/models/attendance.model';

const attendanceRepo = new AttendanceRepository();

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE',
};

// Helper function to create API response
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
});

// Check-in endpoint
export const checkIn: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const { employeeId, organizationId, location, deviceInfo } = JSON.parse(event.body || '{}');
    
    if (!employeeId || !organizationId) {
      return createResponse(400, {
        error: 'Missing required fields: employeeId, organizationId',
      });
    }

    const attendance = await attendanceRepo.checkIn(employeeId, organizationId, location, deviceInfo);
    
    return createResponse(200, {
      message: 'Check-in successful',
      data: attendance,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    
    if (error.message === 'Already checked in today') {
      return createResponse(409, {
        error: error.message,
      });
    }
    
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Check-out endpoint
export const checkOut: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const { employeeId, location } = JSON.parse(event.body || '{}');
    
    if (!employeeId) {
      return createResponse(400, {
        error: 'Missing required field: employeeId',
      });
    }

    const attendance = await attendanceRepo.checkOut(employeeId, location);
    
    return createResponse(200, {
      message: 'Check-out successful',
      data: attendance,
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    
    if (error.message === 'No check-in record found for today' || 
        error.message === 'Already checked out today') {
      return createResponse(409, {
        error: error.message,
      });
    }
    
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Get today's attendance
export const getTodayAttendance: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const employeeId = event.pathParameters?.employeeId;
    
    if (!employeeId) {
      return createResponse(400, {
        error: 'Missing required parameter: employeeId',
      });
    }

    const attendance = await attendanceRepo.getTodayAttendance(employeeId);
    
    if (!attendance) {
      return createResponse(404, {
        message: 'No attendance record found for today',
      });
    }
    
    return createResponse(200, {
      data: attendance,
    });
  } catch (error: any) {
    console.error('Get today attendance error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Get attendance history
export const getAttendanceHistory: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const employeeId = event.pathParameters?.employeeId;
    const { startDate, endDate } = event.queryStringParameters || {};
    
    if (!employeeId || !startDate || !endDate) {
      return createResponse(400, {
        error: 'Missing required parameters: employeeId, startDate, endDate',
      });
    }

    const records = await attendanceRepo.getAttendanceByEmployeeAndDateRange(
      employeeId,
      startDate,
      endDate
    );
    
    return createResponse(200, {
      data: records,
      count: records.length,
    });
  } catch (error: any) {
    console.error('Get attendance history error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Get attendance by date
export const getAttendanceByDate: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const { date } = event.pathParameters || {};
    const { organizationId } = event.queryStringParameters || {};
    
    if (!date) {
      return createResponse(400, {
        error: 'Missing required parameter: date',
      });
    }

    const records = await attendanceRepo.getAttendanceByDate(date, organizationId);
    
    return createResponse(200, {
      data: records,
      count: records.length,
    });
  } catch (error: any) {
    console.error('Get attendance by date error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Get attendance statistics
export const getAttendanceStatistics: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const employeeId = event.pathParameters?.employeeId;
    const { period } = event.queryStringParameters || {};
    
    if (!employeeId || !period) {
      return createResponse(400, {
        error: 'Missing required parameters: employeeId, period',
      });
    }

    const stats = await attendanceRepo.getAttendanceStatistics(employeeId, period);
    
    return createResponse(200, {
      data: stats,
    });
  } catch (error: any) {
    console.error('Get attendance statistics error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Update attendance status
export const updateAttendanceStatus: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const attendanceId = event.pathParameters?.attendanceId;
    const { employeeId, status, modifiedBy } = JSON.parse(event.body || '{}');
    
    if (!attendanceId || !employeeId || !status) {
      return createResponse(400, {
        error: 'Missing required fields: attendanceId, employeeId, status',
      });
    }

    const updated = await attendanceRepo.updateAttendanceStatus(
      attendanceId,
      employeeId,
      status as AttendanceStatus,
      modifiedBy
    );
    
    return createResponse(200, {
      message: 'Attendance status updated successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Update attendance status error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Batch create attendance records (for admin/import)
export const batchCreateAttendance: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const { records } = JSON.parse(event.body || '{}');
    
    if (!records || !Array.isArray(records) || records.length === 0) {
      return createResponse(400, {
        error: 'Missing or invalid records array',
      });
    }

    await attendanceRepo.batchCreateAttendance(records);
    
    return createResponse(200, {
      message: `Successfully created ${records.length} attendance records`,
    });
  } catch (error: any) {
    console.error('Batch create attendance error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Delete attendance record
export const deleteAttendance: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
    const attendanceId = event.pathParameters?.attendanceId;
    const employeeId = event.queryStringParameters?.employeeId;
    
    if (!attendanceId || !employeeId) {
      return createResponse(400, {
        error: 'Missing required parameters: attendanceId, employeeId',
      });
    }

    await attendanceRepo.deleteAttendance(attendanceId, employeeId);
    
    return createResponse(200, {
      message: 'Attendance record deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete attendance error:', error);
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};