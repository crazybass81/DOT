/**
 * Korean Organization Service
 * Enhanced organization management with Korean business registration support
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { 
  KoreanOrganizationCreation,
  KoreanBusinessRegistration,
  WorkplaceLocation,
  EmployeeInvitation,
  validateKoreanBusinessNumber,
  validateKoreanCorporateNumber
} from '../../schemas/korean-business.schema'

export interface KoreanOrganizationCreateResult {
  success: boolean
  organizationId?: string
  invitationCode?: string
  qrCodeData?: string
  error?: string
  details?: any
}

export interface DocumentUploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  error?: string
}

export interface BusinessVerificationResult {
  success: boolean
  verificationStatus: 'verified' | 'rejected' | 'pending'
  verificationNotes?: string
  error?: string
}

export interface EmployeeInvitationResult {
  success: boolean
  invitationId?: string
  invitationUrl?: string
  qrCodeData?: string
  error?: string
}

export class KoreanOrganizationService {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * 한국 사업자 등록정보와 함께 조직 생성
   */
  async createOrganization(request: KoreanOrganizationCreation): Promise<KoreanOrganizationCreateResult> {
    try {
      // 1. 사업자등록번호 유효성 검사
      const businessNumberValid = validateKoreanBusinessNumber(request.businessRegistration.businessNumber)
      if (!businessNumberValid) {
        return {
          success: false,
          error: '유효하지 않은 사업자등록번호입니다'
        }
      }

      // 2. 법인등록번호 검사 (있는 경우)
      if (request.businessRegistration.corporateNumber) {
        const corporateNumberValid = validateKoreanCorporateNumber(request.businessRegistration.corporateNumber)
        if (!corporateNumberValid) {
          return {
            success: false,
            error: '유효하지 않은 법인등록번호입니다'
          }
        }
      }

      // 3. 중복 사업자등록번호 확인
      const duplicate = await this.checkDuplicateBusinessNumber(request.businessRegistration.businessNumber)
      if (duplicate) {
        return {
          success: false,
          error: '이미 등록된 사업자등록번호입니다'
        }
      }

      // 4. 트랜잭션으로 조직, 사업자 정보, 사업장 위치 생성
      const result = await this.supabase.rpc('create_korean_organization', {
        p_organization_data: {
          name: request.organizationName,
          type: request.organizationType,
          description: request.description,
          parent_organization_id: request.parentOrganizationId,
          settings: {
            attendancePolicy: request.attendancePolicy,
            adminSettings: request.adminSettings,
            invitationSettings: request.invitationSettings
          }
        },
        p_business_data: request.businessRegistration,
        p_workplace_locations: request.workplaceLocations,
        p_metadata: request.metadata
      })

      if (result.error) {
        return {
          success: false,
          error: `조직 생성 실패: ${result.error.message}`
        }
      }

      // 5. 조직 초대 코드 생성
      const invitationCode = await this.generateInvitationCode(result.data.organization_id)
      const qrCodeData = await this.generateQRCodeData(result.data.organization_id, invitationCode)

      return {
        success: true,
        organizationId: result.data.organization_id,
        invitationCode,
        qrCodeData
      }

    } catch (error) {
      console.error('Korean organization creation error:', error)
      return {
        success: false,
        error: `서버 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }
    }
  }

  /**
   * 사업자등록증 파일 업로드
   */
  async uploadBusinessCertificate(
    organizationId: string,
    file: File,
    documentType: 'business_certificate' | 'corporate_seal'
  ): Promise<DocumentUploadResult> {
    try {
      // 파일 유효성 검사
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      if (!validMimeTypes.includes(file.type)) {
        return {
          success: false,
          error: 'JPG, PNG, GIF, PDF 파일만 업로드 가능합니다'
        }
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB
        return {
          success: false,
          error: '파일 크기는 10MB 이하여야 합니다'
        }
      }

      // 파일명 생성 (조직ID_문서타입_타임스탬프)
      const timestamp = Date.now()
      const extension = file.name.split('.').pop()
      const fileName = `${organizationId}_${documentType}_${timestamp}.${extension}`
      const filePath = `business-documents/${fileName}`

      // Supabase Storage에 업로드
      const { data, error } = await this.supabase.storage
        .from('business-certificates')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        return {
          success: false,
          error: `파일 업로드 실패: ${error.message}`
        }
      }

      // 공개 URL 생성
      const { data: publicUrl } = this.supabase.storage
        .from('business-certificates')
        .getPublicUrl(filePath)

      // DB에 문서 정보 저장
      const { error: dbError } = await this.supabase
        .from('business_documents')
        .insert({
          organization_id: organizationId,
          document_type: documentType,
          file_name: fileName,
          file_url: publicUrl.publicUrl,
          file_size: file.size,
          mime_type: file.type,
          verification_status: 'pending',
          uploaded_at: new Date()
        })

      if (dbError) {
        // 업로드된 파일 삭제
        await this.supabase.storage
          .from('business-certificates')
          .remove([filePath])

        return {
          success: false,
          error: `DB 저장 실패: ${dbError.message}`
        }
      }

      return {
        success: true,
        fileUrl: publicUrl.publicUrl,
        fileName
      }

    } catch (error) {
      console.error('Document upload error:', error)
      return {
        success: false,
        error: `서버 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }
    }
  }

  /**
   * 사업자등록증 검증 처리
   */
  async verifyBusinessDocument(
    documentId: string,
    status: 'verified' | 'rejected',
    notes?: string
  ): Promise<BusinessVerificationResult> {
    try {
      const { data, error } = await this.supabase
        .from('business_documents')
        .update({
          verification_status: status,
          verification_notes: notes,
          verified_at: new Date()
        })
        .eq('id', documentId)
        .select('organization_id')
        .single()

      if (error) {
        return {
          success: false,
          verificationStatus: 'pending',
          error: `검증 처리 실패: ${error.message}`
        }
      }

      // 조직 전체 검증 상태 업데이트
      if (status === 'verified') {
        await this.updateOrganizationVerificationStatus(data.organization_id)
      }

      return {
        success: true,
        verificationStatus: status,
        verificationNotes: notes
      }

    } catch (error) {
      console.error('Document verification error:', error)
      return {
        success: false,
        verificationStatus: 'pending',
        error: `서버 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }
    }
  }

  /**
   * GPS 기반 사업장 위치 추가
   */
  async addWorkplaceLocation(
    organizationId: string,
    location: WorkplaceLocation
  ): Promise<{ success: boolean; locationId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('workplace_locations')
        .insert({
          organization_id: organizationId,
          name: location.name,
          address: location.address,
          latitude: location.coordinates.latitude,
          longitude: location.coordinates.longitude,
          check_in_radius: location.checkInRadius,
          business_hours: location.businessHours,
          is_active: location.isActive,
          metadata: location.metadata
        })
        .select('id')
        .single()

      if (error) {
        return {
          success: false,
          error: `사업장 위치 등록 실패: ${error.message}`
        }
      }

      return {
        success: true,
        locationId: data.id
      }

    } catch (error) {
      console.error('Workplace location creation error:', error)
      return {
        success: false,
        error: `서버 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }
    }
  }

  /**
   * 직원 초대 생성 (QR 코드 포함)
   */
  async createEmployeeInvitation(invitation: EmployeeInvitation): Promise<EmployeeInvitationResult> {
    try {
      // 초대 토큰 생성
      const invitationToken = this.generateInvitationToken()
      
      // DB에 초대 정보 저장
      const { data, error } = await this.supabase
        .from('employee_invitations')
        .insert({
          organization_id: invitation.organizationId,
          inviter_user_id: invitation.inviterUserId,
          invitee_name: invitation.inviteeName,
          invitee_email: invitation.inviteeEmail,
          invitee_phone: invitation.inviteePhone,
          role: invitation.role,
          department: invitation.department,
          position: invitation.position,
          workplace_location_id: invitation.workplaceLocationId,
          invitation_message: invitation.invitationMessage,
          invitation_token: invitationToken,
          expires_at: invitation.expiresAt,
          status: 'pending',
          metadata: invitation.metadata
        })
        .select('id')
        .single()

      if (error) {
        return {
          success: false,
          error: `초대 생성 실패: ${error.message}`
        }
      }

      // 초대 URL 생성
      const invitationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationToken}`
      
      // QR 코드 데이터 생성
      const qrCodeData = JSON.stringify({
        type: 'employee_invitation',
        token: invitationToken,
        organizationId: invitation.organizationId,
        inviteeRole: invitation.role,
        expiresAt: invitation.expiresAt.toISOString()
      })

      return {
        success: true,
        invitationId: data.id,
        invitationUrl,
        qrCodeData
      }

    } catch (error) {
      console.error('Employee invitation creation error:', error)
      return {
        success: false,
        error: `서버 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }
    }
  }

  /**
   * 조직 대시보드 데이터 조회
   */
  async getOrganizationDashboard(organizationId: string) {
    try {
      // 병렬로 대시보드 데이터 조회
      const [
        organizationData,
        employeeStats,
        attendanceStats,
        workplaceLocations,
        pendingInvitations,
        recentDocuments
      ] = await Promise.all([
        this.getOrganizationDetails(organizationId),
        this.getEmployeeStats(organizationId),
        this.getAttendanceStats(organizationId),
        this.getWorkplaceLocations(organizationId),
        this.getPendingInvitations(organizationId),
        this.getRecentDocuments(organizationId)
      ])

      return {
        success: true,
        data: {
          organization: organizationData.data,
          employeeStats: employeeStats.data,
          attendanceStats: attendanceStats.data,
          workplaceLocations: workplaceLocations.data,
          pendingInvitations: pendingInvitations.data,
          recentDocuments: recentDocuments.data
        }
      }

    } catch (error) {
      console.error('Dashboard data fetch error:', error)
      return {
        success: false,
        error: `대시보드 데이터 조회 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      }
    }
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  private async checkDuplicateBusinessNumber(businessNumber: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('korean_business_registrations')
        .select('id')
        .eq('business_number', businessNumber)
        .maybeSingle()

      return !error && !!data
    } catch {
      return false
    }
  }

  private async generateInvitationCode(organizationId: string): Promise<string> {
    // 8자리 영숫자 조합 생성
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length))
    }

    // DB에 코드 저장
    await this.supabase
      .from('organization_invitation_codes')
      .upsert({
        organization_id: organizationId,
        invitation_code: code,
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후 만료
      })

    return code
  }

  private async generateQRCodeData(organizationId: string, invitationCode: string): Promise<string> {
    return JSON.stringify({
      type: 'organization_invitation',
      organizationId,
      invitationCode,
      timestamp: Date.now(),
      version: '1.0'
    })
  }

  private generateInvitationToken(): string {
    // 32자리 랜덤 토큰 생성
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  private async updateOrganizationVerificationStatus(organizationId: string): Promise<void> {
    // 모든 필수 문서가 검증되었는지 확인
    const { data: documents } = await this.supabase
      .from('business_documents')
      .select('verification_status')
      .eq('organization_id', organizationId)

    const allVerified = documents?.every(doc => doc.verification_status === 'verified') ?? false

    if (allVerified) {
      await this.supabase
        .from('organizations_v3')
        .update({
          business_verification_status: 'verified',
          verified_at: new Date()
        })
        .eq('id', organizationId)
    }
  }

  private async getOrganizationDetails(organizationId: string) {
    const { data, error } = await this.supabase
      .from('organizations_v3')
      .select(`
        *,
        korean_business_registrations (*),
        business_documents (*)
      `)
      .eq('id', organizationId)
      .single()

    return { data, error }
  }

  private async getEmployeeStats(organizationId: string) {
    const { data, error } = await this.supabase
      .rpc('get_organization_employee_stats', { org_id: organizationId })

    return { data, error }
  }

  private async getAttendanceStats(organizationId: string) {
    const { data, error } = await this.supabase
      .rpc('get_organization_attendance_stats', { org_id: organizationId })

    return { data, error }
  }

  private async getWorkplaceLocations(organizationId: string) {
    const { data, error } = await this.supabase
      .from('workplace_locations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    return { data, error }
  }

  private async getPendingInvitations(organizationId: string) {
    const { data, error } = await this.supabase
      .from('employee_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())

    return { data, error }
  }

  private async getRecentDocuments(organizationId: string) {
    const { data, error } = await this.supabase
      .from('business_documents')
      .select('*')
      .eq('organization_id', organizationId)
      .order('uploaded_at', { ascending: false })
      .limit(5)

    return { data, error }
  }
}

// Export singleton factory
export const createKoreanOrganizationService = (supabaseClient: SupabaseClient): KoreanOrganizationService => {
  return new KoreanOrganizationService(supabaseClient)
}