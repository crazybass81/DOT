import { NextRequest, NextResponse } from 'next/server';
import { AttendanceRepository } from '../lib/database/repositories/attendance.repository';
import { AttendanceStatus } from '../lib/database/models/attendance.model';

const attendanceRepo = new AttendanceRepository();

// Helper function to create API response
const createResponse = (statusCode: number, body: any) => {
  return NextResponse.json(body, { status: statusCode });
};

// Check-in endpoint
export async function checkIn(request: NextRequest) {
  try {
    const { employeeId, organizationId, location, deviceInfo } = await request.json();
    
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
}

// Check-out endpoint
export async function checkOut(request: NextRequest) {
  try {
    const { employeeId, location } = await request.json();
    
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
}

// Get today's attendance
export async function getTodayAttendance(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    
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
}

// Get attendance history
export async function getAttendanceHistory(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!employeeId || !startDate || !endDate) {
      return createResponse(400, {
        error: 'Missing required parameters: employeeId, startDate, endDate',
      });
    }

    const history = await attendanceRepo.getAttendanceHistory(employeeId, startDate, endDate);
    
    return createResponse(200, {
      data: history,
      count: history.length,
    });
  } catch (error: any) {
    console.error('Get attendance history error:', error);
    
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// Get organization attendance
export async function getOrganizationAttendance(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    if (!organizationId) {
      return createResponse(400, {
        error: 'Missing required parameter: organizationId',
      });
    }

    const attendance = await attendanceRepo.getOrganizationAttendance(organizationId, date);
    
    return createResponse(200, {
      data: attendance,
      count: attendance.length,
      date,
    });
  } catch (error: any) {
    console.error('Get organization attendance error:', error);
    
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// Update attendance status (admin action)
export async function updateAttendanceStatus(request: NextRequest) {
  try {
    const { employeeId, date, status, approvedBy, notes } = await request.json();
    
    if (!employeeId || !date || !status) {
      return createResponse(400, {
        error: 'Missing required fields: employeeId, date, status',
      });
    }

    if (!Object.values(AttendanceStatus).includes(status)) {
      return createResponse(400, {
        error: `Invalid status. Must be one of: ${Object.values(AttendanceStatus).join(', ')}`,
      });
    }

    const attendance = await attendanceRepo.updateAttendanceStatus(
      employeeId,
      date,
      status,
      approvedBy,
      notes
    );
    
    return createResponse(200, {
      message: 'Attendance status updated successfully',
      data: attendance,
    });
  } catch (error: any) {
    console.error('Update attendance status error:', error);
    
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
}

// Get attendance statistics
export async function getAttendanceStats(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    if (!employeeId || !startDate || !endDate) {
      return createResponse(400, {
        error: 'Missing required parameters: employeeId, startDate, endDate',
      });
    }

    const stats = await attendanceRepo.getAttendanceStats(employeeId, startDate, endDate);
    
    return createResponse(200, {
      data: stats,
    });
  } catch (error: any) {
    console.error('Get attendance stats error:', error);
    
    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
}