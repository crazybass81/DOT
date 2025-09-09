import { NextRequest, NextResponse } from 'next/server';
import { AttendanceRepository } from '../lib/database/repositories/attendance.repository';
import { AttendanceStatus } from '../lib/database/models/attendance.model';
import { 
  withAuth, 
  validateRequestData, 
  validateOrganizationAccess,
  validateEmployeeAccess,
  AuthenticatedRequest 
} from '../lib/auth/auth-middleware';

const attendanceRepo = new AttendanceRepository();

/**
 * 보안이 강화된 출근 처리 API
 * - 인증된 사용자만 접근 가능
 * - 본인 또는 권한이 있는 사용자만 출근 처리 가능
 * - 입력 데이터 검증 강화
 */

// 출근 처리 엔드포인트
export const checkIn = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const { isValid, errors, data } = validateRequestData(body, [
        'organizationId', 
        'location'
      ]);

      if (!isValid) {
        return NextResponse.json(
          { 
            error: '입력 데이터가 올바르지 않습니다', 
            details: errors,
            code: 'INVALID_INPUT_DATA'
          }, 
          { status: 400 }
        );
      }

      // 조직 접근 권한 검증
      if (!validateOrganizationAccess(request.user.organizationId!, data.organizationId)) {
        return NextResponse.json(
          { 
            error: '해당 조직에 접근할 권한이 없습니다',
            code: 'ORGANIZATION_ACCESS_DENIED'
          }, 
          { status: 403 }
        );
      }

      // 출근 처리 (인증된 사용자의 employeeId 사용)
      const attendance = await attendanceRepo.checkIn(
        request.user.employeeId!,
        data.organizationId,
        data.location,
        data.deviceInfo
      );
      
      return NextResponse.json({
        success: true,
        message: '출근 처리가 완료되었습니다',
        data: {
          ...attendance,
          // 민감한 정보 제거
          employeeId: request.user.employeeId,
        }
      }, { status: 200 });

    } catch (error: any) {
      console.error('보안 출근 처리 에러:', error);
      
      // 알려진 비즈니스 에러
      if (error.message === 'Already checked in today') {
        return NextResponse.json(
          { 
            error: '오늘 이미 출근 처리되었습니다',
            code: 'ALREADY_CHECKED_IN'
          }, 
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { 
          error: '출근 처리 중 오류가 발생했습니다',
          code: 'CHECKIN_ERROR'
        }, 
        { status: 500 }
      );
    }
  },
  { 
    requireEmployeeId: true, 
    requireOrganizationId: true 
  }
);

// 퇴근 처리 엔드포인트
export const checkOut = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const { isValid, errors, data } = validateRequestData(body, ['location']);

      if (!isValid) {
        return NextResponse.json(
          { 
            error: '입력 데이터가 올바르지 않습니다', 
            details: errors,
            code: 'INVALID_INPUT_DATA'
          }, 
          { status: 400 }
        );
      }

      // 퇴근 처리 (인증된 사용자의 employeeId 사용)
      const attendance = await attendanceRepo.checkOut(
        request.user.employeeId!,
        data.location
      );
      
      return NextResponse.json({
        success: true,
        message: '퇴근 처리가 완료되었습니다',
        data: {
          ...attendance,
          employeeId: request.user.employeeId,
        }
      }, { status: 200 });

    } catch (error: any) {
      console.error('보안 퇴근 처리 에러:', error);
      
      if (error.message === 'No check-in record found for today') {
        return NextResponse.json(
          { 
            error: '오늘 출근 기록이 없습니다',
            code: 'NO_CHECKIN_RECORD'
          }, 
          { status: 409 }
        );
      }
      
      if (error.message === 'Already checked out today') {
        return NextResponse.json(
          { 
            error: '오늘 이미 퇴근 처리되었습니다',
            code: 'ALREADY_CHECKED_OUT'
          }, 
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { 
          error: '퇴근 처리 중 오류가 발생했습니다',
          code: 'CHECKOUT_ERROR'
        }, 
        { status: 500 }
      );
    }
  },
  { 
    requireEmployeeId: true, 
    requireOrganizationId: true 
  }
);

// 오늘 출근 기록 조회
export const getTodayAttendance = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedEmployeeId = searchParams.get('employeeId') || request.user.employeeId;

      // 직원 접근 권한 검증 (본인 또는 관리자만)
      if (!validateEmployeeAccess(request.user.employeeId!, requestedEmployeeId!, request.user.role!)) {
        return NextResponse.json(
          { 
            error: '해당 직원의 정보에 접근할 권한이 없습니다',
            code: 'EMPLOYEE_ACCESS_DENIED'
          }, 
          { status: 403 }
        );
      }

      const attendance = await attendanceRepo.getTodayAttendance(requestedEmployeeId!);
      
      if (!attendance) {
        return NextResponse.json(
          { 
            message: '오늘 출근 기록이 없습니다',
            data: null
          }, 
          { status: 200 }
        );
      }

      return NextResponse.json({
        success: true,
        data: attendance,
      }, { status: 200 });

    } catch (error: any) {
      console.error('오늘 출근 기록 조회 에러:', error);
      
      return NextResponse.json(
        { 
          error: '출근 기록 조회 중 오류가 발생했습니다',
          code: 'GET_ATTENDANCE_ERROR'
        }, 
        { status: 500 }
      );
    }
  },
  { 
    requireEmployeeId: true 
  }
);

// 출근 기록 조회 (권한 기반)
export const getAttendanceHistory = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedEmployeeId = searchParams.get('employeeId') || request.user.employeeId;
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          { 
            error: '시작 날짜와 종료 날짜가 필요합니다',
            code: 'DATE_RANGE_REQUIRED'
          }, 
          { status: 400 }
        );
      }

      // 날짜 형식 검증
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json(
          { 
            error: '날짜는 YYYY-MM-DD 형식이어야 합니다',
            code: 'INVALID_DATE_FORMAT'
          }, 
          { status: 400 }
        );
      }

      // 직원 접근 권한 검증
      if (!validateEmployeeAccess(request.user.employeeId!, requestedEmployeeId!, request.user.role!)) {
        return NextResponse.json(
          { 
            error: '해당 직원의 정보에 접근할 권한이 없습니다',
            code: 'EMPLOYEE_ACCESS_DENIED'
          }, 
          { status: 403 }
        );
      }

      const history = await attendanceRepo.getAttendanceHistory(
        requestedEmployeeId!, 
        startDate, 
        endDate
      );
      
      return NextResponse.json({
        success: true,
        data: history,
        count: history.length,
        period: { startDate, endDate }
      }, { status: 200 });

    } catch (error: any) {
      console.error('출근 기록 조회 에러:', error);
      
      return NextResponse.json(
        { 
          error: '출근 기록 조회 중 오류가 발생했습니다',
          code: 'GET_HISTORY_ERROR'
        }, 
        { status: 500 }
      );
    }
  },
  { 
    requireEmployeeId: true 
  }
);

// 조직 출근 현황 조회 (관리자 전용)
export const getOrganizationAttendance = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organizationId') || request.user.organizationId;
      const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
      
      // 조직 접근 권한 검증
      if (!validateOrganizationAccess(request.user.organizationId!, requestedOrgId!)) {
        return NextResponse.json(
          { 
            error: '해당 조직에 접근할 권한이 없습니다',
            code: 'ORGANIZATION_ACCESS_DENIED'
          }, 
          { status: 403 }
        );
      }

      const attendance = await attendanceRepo.getOrganizationAttendance(requestedOrgId!, date);
      
      return NextResponse.json({
        success: true,
        data: attendance,
        count: attendance.length,
        date,
        organizationId: requestedOrgId
      }, { status: 200 });

    } catch (error: any) {
      console.error('조직 출근 현황 조회 에러:', error);
      
      return NextResponse.json(
        { 
          error: '조직 출근 현황 조회 중 오류가 발생했습니다',
          code: 'GET_ORG_ATTENDANCE_ERROR'
        }, 
        { status: 500 }
      );
    }
  },
  { 
    requireOrganizationId: true,
    allowedRoles: ['ADMIN', 'MANAGER', 'HR']
  }
);

// 출근 상태 업데이트 (관리자 전용)
export const updateAttendanceStatus = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const body = await request.json();
      const { isValid, errors, data } = validateRequestData(body, [
        'employeeId', 
        'date', 
        'status'
      ]);

      if (!isValid) {
        return NextResponse.json(
          { 
            error: '입력 데이터가 올바르지 않습니다', 
            details: errors,
            code: 'INVALID_INPUT_DATA'
          }, 
          { status: 400 }
        );
      }

      // 상태 값 검증
      if (!Object.values(AttendanceStatus).includes(data.status)) {
        return NextResponse.json(
          { 
            error: `유효하지 않은 상태입니다. 가능한 값: ${Object.values(AttendanceStatus).join(', ')}`,
            code: 'INVALID_STATUS'
          }, 
          { status: 400 }
        );
      }

      const attendance = await attendanceRepo.updateAttendanceStatus(
        data.employeeId,
        data.date,
        data.status,
        request.user.employeeId, // 승인자
        data.notes
      );
      
      return NextResponse.json({
        success: true,
        message: '출근 상태가 업데이트되었습니다',
        data: attendance,
        approvedBy: request.user.employeeId
      }, { status: 200 });

    } catch (error: any) {
      console.error('출근 상태 업데이트 에러:', error);
      
      return NextResponse.json(
        { 
          error: '출근 상태 업데이트 중 오류가 발생했습니다',
          code: 'UPDATE_STATUS_ERROR'
        }, 
        { status: 500 }
      );
    }
  },
  { 
    requireEmployeeId: true,
    requireOrganizationId: true,
    allowedRoles: ['ADMIN', 'MANAGER', 'HR']
  }
);

// 출근 통계 조회
export const getAttendanceStats = withAuth(
  async (request: AuthenticatedRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedEmployeeId = searchParams.get('employeeId') || request.user.employeeId;
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          { 
            error: '시작 날짜와 종료 날짜가 필요합니다',
            code: 'DATE_RANGE_REQUIRED'
          }, 
          { status: 400 }
        );
      }

      // 직원 접근 권한 검증
      if (!validateEmployeeAccess(request.user.employeeId!, requestedEmployeeId!, request.user.role!)) {
        return NextResponse.json(
          { 
            error: '해당 직원의 정보에 접근할 권한이 없습니다',
            code: 'EMPLOYEE_ACCESS_DENIED'
          }, 
          { status: 403 }
        );
      }

      const stats = await attendanceRepo.getAttendanceStats(
        requestedEmployeeId!, 
        startDate, 
        endDate
      );
      
      return NextResponse.json({
        success: true,
        data: stats,
        period: { startDate, endDate }
      }, { status: 200 });

    } catch (error: any) {
      console.error('출근 통계 조회 에러:', error);
      
      return NextResponse.json(
        { 
          error: '출근 통계 조회 중 오류가 발생했습니다',
          code: 'GET_STATS_ERROR'
        }, 
        { status: 500 }
      );
    }
  },
  { 
    requireEmployeeId: true 
  }
);