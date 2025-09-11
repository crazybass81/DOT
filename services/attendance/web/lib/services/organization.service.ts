/**
 * DOT 조직 관리 서비스
 * GitHub 스타일 UI/UX 패턴 지원
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface Organization {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  type: string;
  business_registration_number?: string;
  business_registration_document_url?: string;
  business_registration_status: 'pending' | 'approved' | 'rejected';
  business_registration_verified_at?: string;
  business_registration_verified_by?: string;
  primary_location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  work_locations?: WorkLocation[];
  attendance_radius_meters: number;
  work_hours_policy?: WorkHoursPolicy;
  break_time_policy?: BreakTimePolicy;
  organization_settings: Record<string, any>;
  qr_code_data?: string;
  invitation_code: string;
  is_active: boolean;
}

export interface WorkHoursPolicy {
  monday: { start: string; end: string; enabled: boolean };
  tuesday: { start: string; end: string; enabled: boolean };
  wednesday: { start: string; end: string; enabled: boolean };
  thursday: { start: string; end: string; enabled: boolean };
  friday: { start: string; end: string; enabled: boolean };
  saturday: { start: string; end: string; enabled: boolean };
  sunday: { start: string; end: string; enabled: boolean };
  flexible_hours: boolean;
  core_hours?: {
    start: string;
    end: string;
  };
}

export interface BreakTimePolicy {
  lunch_break: {
    duration_minutes: number;
    start_time?: string;
    end_time?: string;
    flexible: boolean;
  };
  additional_breaks: Array<{
    name: string;
    duration_minutes: number;
    start_time?: string;
    end_time?: string;
  }>;
}

export interface WorkLocation {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  allowed_radius_meters: number;
  location_type: 'main' | 'branch' | 'remote' | 'temporary';
  is_active: boolean;
}

export interface Department {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  parent_department_id?: string;
  manager_id?: string;
  is_active: boolean;
}

export interface BusinessRegistration {
  id: string;
  organization_id: string;
  registration_number: string;
  business_name: string;
  business_type?: string;
  address?: string;
  representative_name?: string;
  document_url: string;
  document_file_name?: string;
  document_file_size?: number;
  document_mime_type?: string;
  ocr_result?: Record<string, any>;
  ocr_confidence?: number;
  status: 'pending' | 'approved' | 'rejected' | 'needs_review';
  reviewed_at?: string;
  reviewed_by?: string;
  review_notes?: string;
}

export interface EmployeeInvitation {
  id: string;
  organization_id: string;
  invited_by: string;
  email?: string;
  phone?: string;
  full_name?: string;
  role: 'worker' | 'manager' | 'admin';
  department_id?: string;
  position?: string;
  employee_code?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  invitation_token: string;
  expires_at: string;
  accepted_at?: string;
  rejected_at?: string;
}

export interface CreateOrganizationData {
  name: string;
  type: string;
  business_registration_number?: string;
  primary_address?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  attendance_radius?: number;
  work_hours_policy?: WorkHoursPolicy;
  break_time_policy?: BreakTimePolicy;
}

export interface UploadBusinessRegistrationData {
  organization_id: string;
  registration_number: string;
  business_name: string;
  business_type?: string;
  address?: string;
  representative_name?: string;
  file: File;
}

export class OrganizationService {
  private supabase;

  constructor() {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * 새 조직 생성 (GitHub 스타일 단계별 프로세스)
   */
  async createOrganization(data: CreateOrganizationData, adminId: string): Promise<Organization> {
    try {
      const { data: result, error } = await this.supabase.rpc(
        'create_organization_with_defaults',
        {
          org_name: data.name,
          org_type: data.type,
          admin_id: adminId,
          business_reg_number: data.business_registration_number,
          primary_address: data.primary_address,
          gps_lat: data.gps_latitude,
          gps_lng: data.gps_longitude
        }
      );

      if (error) {
        throw new Error(`조직 생성 실패: ${error.message}`);
      }

      // 추가 설정 업데이트
      if (data.work_hours_policy || data.break_time_policy || data.attendance_radius) {
        await this.updateOrganizationSettings(result, {
          work_hours_policy: data.work_hours_policy,
          break_time_policy: data.break_time_policy,
          attendance_radius_meters: data.attendance_radius || 100
        });
      }

      return await this.getOrganization(result);
    } catch (error) {
      console.error('Organization creation error:', error);
      throw error;
    }
  }

  /**
   * 조직 정보 조회
   */
  async getOrganization(organizationId: string): Promise<Organization> {
    try {
      const { data, error } = await this.supabase
        .from('organizations_v3')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (error) {
        throw new Error(`조직 조회 실패: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Get organization error:', error);
      throw error;
    }
  }

  /**
   * 사용자의 조직 목록 조회
   */
  async getUserOrganizations(userId: string): Promise<Organization[]> {
    try {
      const { data, error } = await this.supabase
        .from('organizations_v3')
        .select(`
          *,
          role_assignments!inner(role, is_active)
        `)
        .eq('role_assignments.identity_id', userId)
        .eq('role_assignments.is_active', true)
        .eq('is_active', true);

      if (error) {
        throw new Error(`사용자 조직 목록 조회 실패: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get user organizations error:', error);
      throw error;
    }
  }

  /**
   * 조직 설정 업데이트
   */
  async updateOrganizationSettings(
    organizationId: string, 
    settings: Partial<Organization>
  ): Promise<Organization> {
    try {
      const { data, error } = await this.supabase
        .from('organizations_v3')
        .update({
          ...settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)
        .select()
        .single();

      if (error) {
        throw new Error(`조직 설정 업데이트 실패: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Update organization settings error:', error);
      throw error;
    }
  }

  /**
   * 사업자등록증 업로드 및 등록
   */
  async uploadBusinessRegistration(data: UploadBusinessRegistrationData): Promise<BusinessRegistration> {
    try {
      // 1. 파일 업로드
      const fileExt = data.file.name.split('.').pop();
      const fileName = `${data.organization_id}_${Date.now()}.${fileExt}`;
      const filePath = `business-registrations/${fileName}`;

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('documents')
        .upload(filePath, data.file);

      if (uploadError) {
        throw new Error(`파일 업로드 실패: ${uploadError.message}`);
      }

      // 2. 공개 URL 생성
      const { data: urlData } = this.supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 3. 데이터베이스 레코드 생성
      const { data: registration, error } = await this.supabase
        .from('business_registrations')
        .insert({
          organization_id: data.organization_id,
          registration_number: data.registration_number,
          business_name: data.business_name,
          business_type: data.business_type,
          address: data.address,
          representative_name: data.representative_name,
          document_url: urlData.publicUrl,
          document_file_name: data.file.name,
          document_file_size: data.file.size,
          document_mime_type: data.file.type,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`사업자등록증 등록 실패: ${error.message}`);
      }

      return registration;
    } catch (error) {
      console.error('Upload business registration error:', error);
      throw error;
    }
  }

  /**
   * 사업장 위치 추가
   */
  async addWorkLocation(location: Omit<WorkLocation, 'id'>): Promise<WorkLocation> {
    try {
      const { data, error } = await this.supabase
        .from('work_locations')
        .insert(location)
        .select()
        .single();

      if (error) {
        throw new Error(`사업장 위치 추가 실패: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Add work location error:', error);
      throw error;
    }
  }

  /**
   * 조직의 사업장 위치 목록 조회
   */
  async getWorkLocations(organizationId: string): Promise<WorkLocation[]> {
    try {
      const { data, error } = await this.supabase
        .from('work_locations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`사업장 위치 조회 실패: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get work locations error:', error);
      throw error;
    }
  }

  /**
   * 부서 생성
   */
  async createDepartment(department: Omit<Department, 'id'>): Promise<Department> {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .insert(department)
        .select()
        .single();

      if (error) {
        throw new Error(`부서 생성 실패: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Create department error:', error);
      throw error;
    }
  }

  /**
   * 조직의 부서 목록 조회
   */
  async getDepartments(organizationId: string): Promise<Department[]> {
    try {
      const { data, error } = await this.supabase
        .from('departments')
        .select(`
          *,
          manager:unified_identities(id, full_name, email)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(`부서 목록 조회 실패: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get departments error:', error);
      throw error;
    }
  }

  /**
   * 직원 초대
   */
  async inviteEmployee(invitation: Omit<EmployeeInvitation, 'id' | 'invitation_token' | 'expires_at' | 'status'>): Promise<EmployeeInvitation> {
    try {
      const invitationToken = this.generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7일 후 만료

      const { data, error } = await this.supabase
        .from('employee_invitations')
        .insert({
          ...invitation,
          invitation_token: invitationToken,
          expires_at: expiresAt.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`직원 초대 실패: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Invite employee error:', error);
      throw error;
    }
  }

  /**
   * 초대 목록 조회
   */
  async getInvitations(organizationId: string): Promise<EmployeeInvitation[]> {
    try {
      const { data, error } = await this.supabase
        .from('employee_invitations')
        .select(`
          *,
          invited_by_user:unified_identities!invited_by(full_name, email),
          department:departments(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`초대 목록 조회 실패: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Get invitations error:', error);
      throw error;
    }
  }

  /**
   * 초대 처리 (수락/거절)
   */
  async processInvitation(invitationToken: string, userId: string, accept: boolean): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc(
        'process_employee_invitation',
        {
          invitation_token: invitationToken,
          user_id: userId,
          accept: accept
        }
      );

      if (error) {
        throw new Error(`초대 처리 실패: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Process invitation error:', error);
      throw error;
    }
  }

  /**
   * QR 코드 생성 (조직용)
   */
  async generateOrganizationQR(organizationId: string): Promise<string> {
    try {
      const qrData = {
        type: 'organization_join',
        organization_id: organizationId,
        timestamp: Date.now()
      };

      const qrDataString = JSON.stringify(qrData);

      // QR 데이터를 조직에 저장
      await this.supabase
        .from('organizations_v3')
        .update({ qr_code_data: qrDataString })
        .eq('id', organizationId);

      return qrDataString;
    } catch (error) {
      console.error('Generate organization QR error:', error);
      throw error;
    }
  }

  /**
   * 조직 통계 조회
   */
  async getOrganizationStats(organizationId: string) {
    try {
      // 직원 수
      const { count: employeeCount } = await this.supabase
        .from('role_assignments')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // 부서 수
      const { count: departmentCount } = await this.supabase
        .from('departments')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      // 대기 중인 초대 수
      const { count: pendingInvitations } = await this.supabase
        .from('employee_invitations')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      // 사업장 수
      const { count: locationCount } = await this.supabase
        .from('work_locations')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      return {
        employees: employeeCount || 0,
        departments: departmentCount || 0,
        pending_invitations: pendingInvitations || 0,
        locations: locationCount || 0
      };
    } catch (error) {
      console.error('Get organization stats error:', error);
      throw error;
    }
  }

  /**
   * 초대 토큰 생성
   */
  private generateInvitationToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

export const organizationService = new OrganizationService();