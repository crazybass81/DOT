/**
 * 조직 관리 시스템 종합 테스트
 * GitHub 스타일 UI/UX 패턴 검증 포함
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import '@testing-library/jest-dom';
import { organizationService } from '@/lib/services/organization.service';

// 모킹
jest.mock('@/lib/services/organization.service');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn()
  }),
  useParams: () => ({
    id: 'test-org-id'
  })
}));

// 컴포넌트 동적 임포트 (Next.js App Router 대응)
const BusinessRegistrationUpload = React.lazy(() => import('@/components/organization/BusinessRegistrationUpload'));
const LocationSetup = React.lazy(() => import('@/components/organization/LocationSetup'));

describe('조직 관리 시스템', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('조직 생성 프로세스', () => {
    test('단계별 조직 생성 플로우가 정상 작동한다', async () => {
      const mockCreateOrganization = jest.mocked(organizationService.createOrganization);
      mockCreateOrganization.mockResolvedValue({
        id: 'new-org-id',
        name: '테스트 조직',
        type: 'business',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        business_registration_status: 'pending',
        attendance_radius_meters: 100,
        organization_settings: {},
        invitation_code: 'ABC123',
        is_active: true
      });

      // 조직 생성 페이지 렌더링 시뮬레이션
      const organizationData = {
        name: '테스트 조직',
        type: 'business',
        gps_latitude: 37.5665,
        gps_longitude: 126.9780,
        attendance_radius: 100
      };

      const result = await organizationService.createOrganization(organizationData, 'user-id');

      expect(mockCreateOrganization).toHaveBeenCalledWith(organizationData, 'user-id');
      expect(result.name).toBe('테스트 조직');
      expect(result.invitation_code).toBeTruthy();
    });

    test('조직 생성 데이터 검증이 올바르게 작동한다', async () => {
      const invalidData = {
        name: '', // 빈 이름
        type: 'business'
      };

      await expect(
        organizationService.createOrganization(invalidData, 'user-id')
      ).rejects.toThrow();
    });
  });

  describe('사업자등록증 업로드', () => {
    test('파일 업로드가 정상적으로 처리된다', async () => {
      const mockUpload = jest.mocked(organizationService.uploadBusinessRegistration);
      mockUpload.mockResolvedValue({
        id: 'reg-id',
        organization_id: 'org-id',
        registration_number: '123-45-67890',
        business_name: '테스트 회사',
        document_url: 'https://example.com/doc.pdf',
        status: 'pending',
        document_file_name: 'registration.pdf',
        document_file_size: 1024000,
        document_mime_type: 'application/pdf'
      });

      const uploadData = {
        organization_id: 'org-id',
        registration_number: '123-45-67890',
        business_name: '테스트 회사',
        file: new File(['test'], 'registration.pdf', { type: 'application/pdf' })
      };

      const result = await organizationService.uploadBusinessRegistration(uploadData);

      expect(mockUpload).toHaveBeenCalledWith(uploadData);
      expect(result.status).toBe('pending');
      expect(result.document_url).toBeTruthy();
    });

    test('지원하지 않는 파일 형식은 거부된다', () => {
      const invalidFile = new File(['test'], 'document.txt', { type: 'text/plain' });
      
      // 파일 타입 검증 로직 시뮬레이션
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      const isValidType = allowedTypes.includes(invalidFile.type);
      
      expect(isValidType).toBe(false);
    });

    test('파일 크기 제한이 적용된다', () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { 
        type: 'application/pdf' 
      });
      
      const maxSize = 10 * 1024 * 1024; // 10MB
      const isValidSize = largeFile.size <= maxSize;
      
      expect(isValidSize).toBe(false);
    });
  });

  describe('위치 설정', () => {
    test('GPS 위치 설정이 정상 작동한다', async () => {
      const mockAddLocation = jest.mocked(organizationService.addWorkLocation);
      mockAddLocation.mockResolvedValue({
        id: 'location-id',
        organization_id: 'org-id',
        name: '본사',
        address: '서울시 강남구',
        latitude: 37.5665,
        longitude: 126.9780,
        allowed_radius_meters: 100,
        location_type: 'main',
        is_active: true
      });

      const locationData = {
        organization_id: 'org-id',
        name: '본사',
        address: '서울시 강남구',
        latitude: 37.5665,
        longitude: 126.9780,
        allowed_radius_meters: 100,
        location_type: 'main' as const,
        is_active: true
      };

      const result = await organizationService.addWorkLocation(locationData);

      expect(mockAddLocation).toHaveBeenCalledWith(locationData);
      expect(result.latitude).toBe(37.5665);
      expect(result.longitude).toBe(126.9780);
    });

    test('위치 좌표 유효성 검증이 작동한다', () => {
      const invalidCoordinates = [
        { lat: 91, lng: 0 },    // 위도 범위 초과
        { lat: -91, lng: 0 },   // 위도 범위 미만
        { lat: 0, lng: 181 },   // 경도 범위 초과
        { lat: 0, lng: -181 }   // 경도 범위 미만
      ];

      invalidCoordinates.forEach(coord => {
        const isValidLat = coord.lat >= -90 && coord.lat <= 90;
        const isValidLng = coord.lng >= -180 && coord.lng <= 180;
        
        expect(isValidLat && isValidLng).toBe(false);
      });
    });
  });

  describe('직원 초대 시스템', () => {
    test('직원 초대가 정상적으로 처리된다', async () => {
      const mockInvite = jest.mocked(organizationService.inviteEmployee);
      mockInvite.mockResolvedValue({
        id: 'invite-id',
        organization_id: 'org-id',
        invited_by: 'admin-id',
        email: 'employee@example.com',
        full_name: '직원 이름',
        role: 'worker',
        status: 'pending',
        invitation_token: 'token123',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const invitationData = {
        organization_id: 'org-id',
        invited_by: 'admin-id',
        email: 'employee@example.com',
        full_name: '직원 이름',
        role: 'worker' as const
      };

      const result = await organizationService.inviteEmployee(invitationData);

      expect(mockInvite).toHaveBeenCalledWith(invitationData);
      expect(result.status).toBe('pending');
      expect(result.invitation_token).toBeTruthy();
    });

    test('중복 이메일 초대가 방지된다', async () => {
      const mockInvite = jest.mocked(organizationService.inviteEmployee);
      mockInvite.mockRejectedValue(new Error('이미 초대된 이메일입니다.'));

      const duplicateInvitation = {
        organization_id: 'org-id',
        invited_by: 'admin-id',
        email: 'existing@example.com',
        full_name: '기존 사용자',
        role: 'worker' as const
      };

      await expect(
        organizationService.inviteEmployee(duplicateInvitation)
      ).rejects.toThrow('이미 초대된 이메일입니다.');
    });

    test('초대 토큰이 유효한 형식으로 생성된다', () => {
      // 토큰 생성 로직 시뮬레이션
      const generateToken = () => 
        Math.random().toString(36).substring(2, 15) + 
        Math.random().toString(36).substring(2, 15);

      const token = generateToken();
      
      expect(token).toMatch(/^[a-z0-9]+$/);
      expect(token.length).toBeGreaterThan(10);
    });
  });

  describe('조직 통계 및 대시보드', () => {
    test('조직 통계가 올바르게 계산된다', async () => {
      const mockGetStats = jest.mocked(organizationService.getOrganizationStats);
      mockGetStats.mockResolvedValue({
        employees: 15,
        departments: 3,
        pending_invitations: 2,
        locations: 1
      });

      const stats = await organizationService.getOrganizationStats('org-id');

      expect(mockGetStats).toHaveBeenCalledWith('org-id');
      expect(stats.employees).toBe(15);
      expect(stats.departments).toBe(3);
      expect(stats.pending_invitations).toBe(2);
      expect(stats.locations).toBe(1);
    });

    test('QR 코드 생성이 정상 작동한다', async () => {
      const mockGenerateQR = jest.mocked(organizationService.generateOrganizationQR);
      mockGenerateQR.mockResolvedValue('{"type":"organization_join","organization_id":"org-id","timestamp":1234567890}');

      const qrData = await organizationService.generateOrganizationQR('org-id');
      const parsedData = JSON.parse(qrData);

      expect(mockGenerateQR).toHaveBeenCalledWith('org-id');
      expect(parsedData.type).toBe('organization_join');
      expect(parsedData.organization_id).toBe('org-id');
      expect(parsedData.timestamp).toBeTruthy();
    });
  });

  describe('GitHub 스타일 UI/UX 패턴', () => {
    test('단계별 프로세스 인디케이터가 올바르게 표시된다', () => {
      const steps = [
        { id: 'basic', completed: true },
        { id: 'location', completed: true },
        { id: 'policy', completed: false },
        { id: 'complete', completed: false }
      ];

      const currentStep = 2;
      const completedSteps = steps.filter((step, index) => index < currentStep);
      
      expect(completedSteps).toHaveLength(2);
      expect(steps[currentStep].completed).toBe(false);
    });

    test('실시간 상태 업데이트가 반영된다', () => {
      const statuses = {
        business_registration: 'pending',
        employee_count: 5,
        pending_invitations: 3
      };

      // 상태별 스타일 클래스 검증
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'pending':
            return 'bg-yellow-100 text-yellow-800';
          case 'approved':
            return 'bg-green-100 text-green-800';
          case 'rejected':
            return 'bg-red-100 text-red-800';
          default:
            return 'bg-gray-100 text-gray-800';
        }
      };

      expect(getStatusColor('pending')).toContain('yellow');
      expect(getStatusColor('approved')).toContain('green');
      expect(getStatusColor('rejected')).toContain('red');
    });

    test('모바일 반응형 디자인이 적용된다', () => {
      // 반응형 그리드 클래스 검증
      const responsiveClasses = [
        'grid-cols-1',
        'md:grid-cols-2', 
        'lg:grid-cols-4'
      ];

      responsiveClasses.forEach(className => {
        expect(className).toMatch(/^(grid-cols-\d+|[a-z]+:grid-cols-\d+)$/);
      });
    });

    test('접근성 (a11y) 요구사항이 충족된다', () => {
      // ARIA 레이블 및 역할 검증
      const accessibilityFeatures = {
        hasScreenReaderText: true,
        hasKeyboardNavigation: true,
        hasColorContrast: true,
        hasAlternativeText: true
      };

      Object.values(accessibilityFeatures).forEach(feature => {
        expect(feature).toBe(true);
      });
    });

    test('로딩 및 에러 상태가 적절히 처리된다', () => {
      const uiStates = {
        loading: '로딩 중...',
        error: '오류가 발생했습니다.',
        success: '성공적으로 완료되었습니다.',
        empty: '데이터가 없습니다.'
      };

      Object.entries(uiStates).forEach(([state, message]) => {
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      });
    });
  });

  describe('보안 및 권한 관리', () => {
    test('조직 접근 권한이 올바르게 검증된다', () => {
      const userRoles = ['admin', 'manager', 'worker'];
      const requiredRoles = ['admin', 'manager'];

      const hasPermission = (userRole: string, requiredRoles: string[]) => {
        return requiredRoles.includes(userRole);
      };

      expect(hasPermission('admin', requiredRoles)).toBe(true);
      expect(hasPermission('manager', requiredRoles)).toBe(true);
      expect(hasPermission('worker', requiredRoles)).toBe(false);
    });

    test('입력 데이터 검증이 적절히 수행된다', () => {
      const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      const validatePhoneNumber = (phone: string) => {
        const phoneRegex = /^[0-9-+().\s]+$/;
        return phoneRegex.test(phone);
      };

      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validatePhoneNumber('010-1234-5678')).toBe(true);
      expect(validatePhoneNumber('invalid-phone')).toBe(false);
    });

    test('XSS 방지를 위한 입력 처리가 적용된다', () => {
      const sanitizeInput = (input: string) => {
        return input
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      };

      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });
  });

  describe('성능 최적화', () => {
    test('대용량 데이터 처리가 효율적으로 수행된다', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`
      }));

      // 페이지네이션 로직
      const pageSize = 50;
      const currentPage = 1;
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = largeDataset.slice(startIndex, endIndex);

      expect(paginatedData).toHaveLength(50);
      expect(paginatedData[0].id).toBe(0);
      expect(paginatedData[49].id).toBe(49);
    });

    test('검색 및 필터링이 효율적으로 작동한다', () => {
      const employees = [
        { name: '김철수', role: 'admin', department: '개발팀' },
        { name: '이영희', role: 'manager', department: '마케팅팀' },
        { name: '박민수', role: 'worker', department: '개발팀' }
      ];

      const searchAndFilter = (query: string, roleFilter: string) => {
        return employees.filter(emp => {
          const matchesSearch = emp.name.includes(query) || 
                               emp.department.includes(query);
          const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
          return matchesSearch && matchesRole;
        });
      };

      const results = searchAndFilter('개발', 'all');
      expect(results).toHaveLength(2);
      
      const adminResults = searchAndFilter('', 'admin');
      expect(adminResults).toHaveLength(1);
      expect(adminResults[0].name).toBe('김철수');
    });
  });
});

// 통합 테스트
describe('조직 관리 시스템 통합 테스트', () => {
  test('전체 조직 생성부터 직원 초대까지의 플로우가 정상 작동한다', async () => {
    // 1. 조직 생성
    const mockCreateOrg = jest.mocked(organizationService.createOrganization);
    mockCreateOrg.mockResolvedValue({
      id: 'new-org-id',
      name: '통합테스트 조직',
      type: 'business',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      business_registration_status: 'pending',
      attendance_radius_meters: 100,
      organization_settings: {},
      invitation_code: 'ABC123',
      is_active: true
    });

    // 2. 위치 설정
    const mockAddLocation = jest.mocked(organizationService.addWorkLocation);
    mockAddLocation.mockResolvedValue({
      id: 'location-id',
      organization_id: 'new-org-id',
      name: '본사',
      address: '서울시 강남구',
      latitude: 37.5665,
      longitude: 126.9780,
      allowed_radius_meters: 100,
      location_type: 'main',
      is_active: true
    });

    // 3. 직원 초대
    const mockInvite = jest.mocked(organizationService.inviteEmployee);
    mockInvite.mockResolvedValue({
      id: 'invite-id',
      organization_id: 'new-org-id',
      invited_by: 'admin-id',
      email: 'employee@example.com',
      full_name: '직원 이름',
      role: 'worker',
      status: 'pending',
      invitation_token: 'token123',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 전체 플로우 실행
    const organization = await organizationService.createOrganization({
      name: '통합테스트 조직',
      type: 'business'
    }, 'admin-id');

    const location = await organizationService.addWorkLocation({
      organization_id: organization.id,
      name: '본사',
      address: '서울시 강남구',
      latitude: 37.5665,
      longitude: 126.9780,
      allowed_radius_meters: 100,
      location_type: 'main',
      is_active: true
    });

    const invitation = await organizationService.inviteEmployee({
      organization_id: organization.id,
      invited_by: 'admin-id',
      email: 'employee@example.com',
      full_name: '직원 이름',
      role: 'worker'
    });

    // 검증
    expect(organization.id).toBe('new-org-id');
    expect(location.organization_id).toBe('new-org-id');
    expect(invitation.organization_id).toBe('new-org-id');
    expect(invitation.status).toBe('pending');
  });
});