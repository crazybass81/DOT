import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import { organizationService } from '@/services/organizationService';

/**
 * 출근 기록 조회 API
 * - 모든 역할 접근 가능
 * - 자신의 기록 또는 관리 권한이 있는 조직의 기록만 조회 가능
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get current authenticated user
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    let query = supabase
      .from('attendance_records')
      .select(`
        id,
        employee_id,
        business_id,
        check_in_time,
        check_out_time,
        work_date,
        check_in_location,
        check_out_location,
        verification_method,
        status,
        notes,
        break_time_minutes,
        overtime_minutes,
        created_at,
        updated_at,
        unified_identities:employee_id (
          id,
          full_name,
          email,
          phone
        ),
        organizations_v3:business_id (
          id,
          name,
          type
        )
      `);

    // Check if user has admin role
    const isAdmin = await supabaseAuthService.hasRole('admin');
    const isMaster = await supabaseAuthService.hasRole('master');
    
    // 마스터 어드민이 아닌 경우, 접근 권한 제한
    if (!isMaster) {
      // 관리자 권한이 있는 조직들 조회
      const userRoles = await organizationService.getUserRoles(currentUser.id);
      
      const managementRoles = ['admin', 'manager', 'franchise_admin'];
      const managedOrganizationIds = userRoles
        .filter(role => managementRoles.includes(role.role))
        .map(role => role.organizationId);

      // 자신의 기록 또는 관리 권한이 있는 조직의 기록만 조회
      if (managedOrganizationIds.length > 0) {
        query = query.or(`employee_id.eq.${currentUser.id},business_id.in.(${managedOrganizationIds.join(',')})`);
      } else {
        // 관리 권한이 없는 경우, 자신의 기록만 조회
        query = query.eq('employee_id', currentUser.id);
      }
    }

    // 필터링 조건 적용
    if (organizationId) {
      query = query.eq('business_id', organizationId);
    }

    if (userId) {
      query = query.eq('employee_id', userId);
    }

    if (startDate) {
      query = query.gte('check_in_time', startDate);
    }

    if (endDate) {
      query = query.lte('check_in_time', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    // 페이지네이션 적용
    query = query.range(offset, offset + limit - 1).order('check_in_time', { ascending: false });

    const { data: attendanceRecords, error } = await query;

    if (error) {
      throw error;
    }

    // 전체 카운트 조회 (페이지네이션용)
    let countQuery = supabase
      .from('attendance_records')
      .select('id', { count: 'exact', head: true });

    if (!isMaster) {
      const userRoles = await organizationService.getUserRoles(currentUser.id);
      const managementRoles = ['admin', 'manager', 'franchise_admin'];
      const managedOrganizationIds = userRoles
        .filter(role => managementRoles.includes(role.role))
        .map(role => role.organizationId);

      if (managedOrganizationIds.length > 0) {
        countQuery = countQuery.or(`employee_id.eq.${currentUser.id},business_id.in.(${managedOrganizationIds.join(',')})`);
      } else {
        countQuery = countQuery.eq('employee_id', currentUser.id);
      }
    }

    if (organizationId) countQuery = countQuery.eq('business_id', organizationId);
    if (userId) countQuery = countQuery.eq('employee_id', userId);
    if (startDate) countQuery = countQuery.gte('check_in_time', startDate);
    if (endDate) countQuery = countQuery.lte('check_in_time', endDate);
    if (status) countQuery = countQuery.eq('status', status);

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }

    return NextResponse.json({
      attendanceRecords,
      totalCount: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('출근 기록 조회 중 오류 발생:', error);
    return NextResponse.json(
      { error: '출근 기록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 출근 기록 생성 API (출근 체크인)
 * - 모든 역할 접근 가능
 * - 자신의 출근 기록만 생성 가능
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current authenticated user
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      business_id,
      check_in_time,
      location,
      verification_method = 'gps',
      notes
    } = body;

    // 필수 필드 검증
    if (!business_id) {
      return NextResponse.json(
        { error: '조직 ID는 필수입니다.' },
        { status: 400 }
      );
    }

    // 해당 조직에서 활성 역할 확인
    const userRoles = await organizationService.getUserRoles(currentUser.id);
    const hasRoleInOrg = userRoles.some(role => 
      role.organizationId === business_id && role.isActive
    );

    if (!hasRoleInOrg) {
      return NextResponse.json(
        { error: '해당 조직에서 활성 역할이 없습니다.' },
        { status: 403 }
      );
    }

    // 당일 이미 출근한 기록이 있는지 확인
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: existingAttendance } = await supabase
      .from('attendance_records')
      .select('id, check_out_time')
      .eq('employee_id', currentUser.id)
      .eq('business_id', business_id)
      .gte('check_in_time', today.toISOString())
      .lt('check_in_time', tomorrow.toISOString())
      .maybeSingle();

    if (existingAttendance && !existingAttendance.check_out_time) {
      return NextResponse.json(
        { error: '이미 출근한 상태입니다. 먼저 퇴근 처리를 해주세요.' },
        { status: 409 }
      );
    }

    const checkInTime = check_in_time || new Date().toISOString();

    const { data: newAttendance, error } = await supabase
      .from('attendance_records')
      .insert({
        employee_id: currentUser.id,
        business_id,
        check_in_time: checkInTime,
        check_in_location: location,
        verification_method,
        notes,
        status: 'active'
      })
      .select(`
        *,
        unified_identities:employee_id (id, full_name, email),
        organizations_v3:business_id (id, name, type)
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      { attendance: newAttendance },
      { status: 201 }
    );
  } catch (error) {
    console.error('출근 체크인 중 오류 발생:', error);
    return NextResponse.json(
      { error: '출근 체크인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 출근 기록 수정 API (퇴근 체크아웃, 휴게시간 등)
 * - 모든 역할 접근 가능
 * - 자신의 기록 또는 관리 권한이 있는 기록만 수정 가능
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current authenticated user
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      id,
      check_out_time,
      check_out_location,
      notes,
      status,
      break_time_minutes,
      overtime_minutes
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '출근 기록 ID는 필수입니다.' },
        { status: 400 }
      );
    }

    // 출근 기록 존재 여부 및 권한 확인
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', id)
      .single();

    if (attendanceError || !attendance) {
      return NextResponse.json(
        { error: '존재하지 않는 출근 기록입니다.' },
        { status: 404 }
      );
    }

    // 권한 검증 (자신의 기록이거나 관리 권한이 있는 경우)
    let hasPermission = attendance.employee_id === currentUser.id;

    if (!hasPermission) {
      const isMaster = await supabaseAuthService.hasRole('master');
      const isAdmin = await supabaseAuthService.hasRole('admin');
      
      if (!isMaster && !isAdmin) {
        const userRoles = await organizationService.getUserRoles(currentUser.id);
        const hasManagementRole = userRoles.some(role => 
          role.organizationId === attendance.business_id && 
          ['admin', 'manager', 'franchise_admin'].includes(role.role) &&
          role.isActive
        );
        hasPermission = hasManagementRole;
      } else {
        hasPermission = true;
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: '해당 출근 기록을 수정할 권한이 없습니다.' },
        { status: 403 }
      );
    }

    const updateData: any = {};
    
    if (check_out_time) {
      updateData.check_out_time = check_out_time;
      updateData.status = 'completed';
    }
    
    if (check_out_location) updateData.check_out_location = check_out_location;
    if (notes !== undefined) updateData.notes = notes;
    if (status) updateData.status = status;
    if (break_time_minutes !== undefined) updateData.break_time_minutes = break_time_minutes;
    if (overtime_minutes !== undefined) updateData.overtime_minutes = overtime_minutes;
    
    updateData.updated_at = new Date().toISOString();

    const { data: updatedAttendance, error } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        unified_identities:employee_id (id, full_name, email),
        organizations_v3:business_id (id, name, type)
      `)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ attendance: updatedAttendance });
  } catch (error) {
    console.error('출근 기록 수정 중 오류 발생:', error);
    return NextResponse.json(
      { error: '출근 기록 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * 출근 기록 삭제 API
 * - ADMIN 이상 권한 필요
 * - 관리 권한이 있는 조직의 기록만 삭제 가능
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const attendanceId = searchParams.get('id');

    // Get current authenticated user
    const currentUser = await supabaseAuthService.getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    if (!attendanceId) {
      return NextResponse.json(
        { error: '출근 기록 ID는 필수입니다.' },
        { status: 400 }
      );
    }

    // 출근 기록 존재 여부 확인
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (attendanceError || !attendance) {
      return NextResponse.json(
        { error: '존재하지 않는 출근 기록입니다.' },
        { status: 404 }
      );
    }

    // 권한 검증 (마스터 어드민이 아닌 경우)
    const isMaster = await supabaseAuthService.hasRole('master');
    
    if (!isMaster) {
      const userRoles = await organizationService.getUserRoles(currentUser.id);
      const hasPermission = userRoles.some(role => 
        role.organizationId === attendance.business_id && 
        ['admin', 'manager', 'franchise_admin'].includes(role.role) &&
        role.isActive
      );

      if (!hasPermission) {
        return NextResponse.json(
          { error: '해당 출근 기록을 삭제할 권한이 없습니다.' },
          { status: 403 }
        );
      }
    }

    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', attendanceId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: '출근 기록이 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('출근 기록 삭제 중 오류 발생:', error);
    return NextResponse.json(
      { error: '출근 기록 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}