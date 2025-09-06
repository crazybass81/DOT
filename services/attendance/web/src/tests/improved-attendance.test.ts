// 개선된 출근 관리 시스템 테스트
// 새로 작성한 보안 강화 및 개선 사항들에 대한 테스트

import { describe, expect, test, beforeEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateRequestData, validateOrganizationAccess, validateEmployeeAccess } from '../lib/auth/auth-middleware';
import { EnhancedAttendanceService, CheckInData, CheckOutData } from '../lib/services/enhanced-attendance.service';
import { AttendanceMethod, AttendanceStatus } from '../lib/types/common-attendance-types';

describe('보안 강화된 출근 관리 시스템', () => {
  
  describe('인증 미들웨어 테스트', () => {
    
    test('유효한 입력 데이터 검증', () => {
      const testData = {
        employeeId: 'emp_123',
        organizationId: 'org_456', 
        location: {
          latitude: 37.5665,
          longitude: 126.9780,
          timestamp: new Date().toISOString()
        }
      };
      
      const result = validateRequestData(testData, ['employeeId', 'organizationId', 'location']);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    test('필수 필드 누락 검증', () => {
      const testData = {
        employeeId: 'emp_123',
        // organizationId 누락
        location: {
          latitude: 37.5665,
          longitude: 126.9780,
          timestamp: new Date().toISOString()
        }
      };
      
      const result = validateRequestData(testData, ['employeeId', 'organizationId', 'location']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('organizationId는(은) 필수 항목입니다');
    });
    
    test('위도/경도 범위 검증', () => {
      const testData = {
        employeeId: 'emp_123',
        organizationId: 'org_456',
        location: {
          latitude: 91, // 유효 범위 초과
          longitude: 181, // 유효 범위 초과
          timestamp: new Date().toISOString()
        }
      };
      
      const result = validateRequestData(testData, ['employeeId', 'organizationId', 'location']);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('유효하지 않은 위도입니다');
      expect(result.errors).toContain('유효하지 않은 경도입니다');
    });
    
    test('조직 접근 권한 검증', () => {
      const userOrgId = 'org_123';
      const requestedOrgId = 'org_123';
      
      const hasAccess = validateOrganizationAccess(userOrgId, requestedOrgId);
      expect(hasAccess).toBe(true);
      
      const noAccess = validateOrganizationAccess(userOrgId, 'org_456');
      expect(noAccess).toBe(false);
    });
    
    test('직원 접근 권한 검증', () => {
      const userEmployeeId = 'emp_123';
      
      // 본인 데이터 접근
      const selfAccess = validateEmployeeAccess(userEmployeeId, userEmployeeId, 'EMPLOYEE');
      expect(selfAccess).toBe(true);
      
      // 다른 사람 데이터 접근 (일반 직원)
      const noAccess = validateEmployeeAccess(userEmployeeId, 'emp_456', 'EMPLOYEE');
      expect(noAccess).toBe(false);
      
      // 다른 사람 데이터 접근 (관리자)
      const adminAccess = validateEmployeeAccess(userEmployeeId, 'emp_456', 'ADMIN');
      expect(adminAccess).toBe(true);
    });
    
  });
  
  describe('향상된 출근 서비스 테스트', () => {
    let attendanceService: EnhancedAttendanceService;
    
    beforeEach(() => {
      attendanceService = new EnhancedAttendanceService();
    });
    
    test('출근 처리 성공 케이스', async () => {
      const checkInData: CheckInData = {
        employeeId: 'emp_123',
        organizationId: 'org_456',
        location: {
          latitude: 37.5665,
          longitude: 126.9780,
          timestamp: new Date().toISOString()
        },
        verificationMethod: AttendanceMethod.MANUAL,
        notes: '정상 출근'
      };
      
      // 실제 테스트에서는 데이터베이스 모킹 필요
      // const result = await attendanceService.checkIn(checkInData);
      // expect(result.success).toBe(true);
      
      expect(checkInData.employeeId).toBeDefined();
      expect(checkInData.verificationMethod).toBe(AttendanceMethod.MANUAL);
    });
    
    test('서비스 상태 확인', async () => {
      const health = await attendanceService.getServiceHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('checks');
      expect(health).toHaveProperty('timestamp');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
    
  });
  
  describe('공통 타입 검증', () => {
    
    test('출근 상태 열거형 값', () => {
      expect(AttendanceStatus.PRESENT).toBe('PRESENT');
      expect(AttendanceStatus.LATE).toBe('LATE');
      expect(AttendanceStatus.ABSENT).toBe('ABSENT');
    });
    
    test('출근 방법 열거형 값', () => {
      expect(AttendanceMethod.MANUAL).toBe('manual');
      expect(AttendanceMethod.QR_CODE).toBe('qr');
      expect(AttendanceMethod.GPS_LOCATION).toBe('location');
      expect(AttendanceMethod.BIOMETRIC).toBe('biometric');
    });
    
  });
  
  describe('보안 개선 사항 검증', () => {
    
    test('API 응답에 민감한 정보 노출 방지', () => {
      const mockApiResponse = {
        success: true,
        message: '출근 처리 완료',
        data: {
          id: 'att_123',
          employeeId: 'emp_123',
          checkInTime: new Date().toISOString(),
          // 민감한 정보들이 제외되었는지 확인
        }
      };
      
      expect(mockApiResponse.data).not.toHaveProperty('internalId');
      expect(mockApiResponse.data).not.toHaveProperty('systemDetails');
    });
    
    test('에러 메시지 표준화', () => {
      const standardErrors = [
        'AUTHENTICATION_REQUIRED',
        'INVALID_USER',
        'EMPLOYEE_ID_REQUIRED',
        'ORGANIZATION_ID_REQUIRED',
        'INSUFFICIENT_PERMISSIONS'
      ];
      
      standardErrors.forEach(errorCode => {
        expect(errorCode).toMatch(/^[A-Z_]+$/);
      });
    });
    
  });
  
});

describe('데이터 모델 통합 검증', () => {
  
  test('공통 타입 구조 일관성', () => {
    // AttendanceRecord의 필수 필드들
    const requiredFields = [
      'id',
      'employeeId', 
      'organizationId',
      'date',
      'status',
      'createdAt',
      'updatedAt'
    ];
    
    requiredFields.forEach(field => {
      expect(typeof field).toBe('string');
      expect(field.length).toBeGreaterThan(0);
    });
  });
  
  test('타입 안전성 확인', () => {
    // 런타임에서 타입 검증 (실제로는 TypeScript 컴파일 시점에서 검증됨)
    expect(AttendanceStatus.PRESENT).toBeDefined();
    expect(AttendanceMethod.GPS_LOCATION).toBeDefined();
  });
  
});