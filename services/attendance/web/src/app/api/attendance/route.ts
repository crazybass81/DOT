import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRBAC } from '@/middleware/rbac-middleware';
import { RoleType } from '@/types/multi-role';

/**
 * 출근 기록 조회 API
 * - 모든 역할 접근 가능
 * - 자신의 기록 또는 관리 권한이 있는 조직의 기록만 조회 가능
 */
export async function GET(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const userId = searchParams.get('userId');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const status = searchParams.get('status');
      const limit = parseInt(searchParams.get('limit') || '50');
      const offset = parseInt(searchParams.get('offset') || '0');

      try {
        let query = supabase
          .from('attendance')
          .select(`
            id,
            user_id,
            organization_id,
            check_in_time,
            check_out_time,
            break_start_time,
            break_end_time,
            total_hours,
            overtime_hours,
            location_lat,
            location_lng,
            location_address,
            notes,
            status,
            approved_by,
            created_at,
            updated_at,
            users (
              id,
              name,
              email,
              phone
            ),
            organizations (
              id,
              name,
              type
            )
          `);

        // 마스터 어드민이 아닌 경우, 접근 권한 제한
        if (!user.is_master_admin) {
          // 관리자 권한이 있는 조직들 조회
          const userRolesQuery = await supabase
            .from('user_roles')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (userRolesQuery.error) {
            throw userRolesQuery.error;
          }

          const managementRoles = [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE];
          const managedOrganizationIds = userRolesQuery.data
            .filter(role => managementRoles.includes(role.role))
            .map(role => role.organization_id);

          // 자신의 기록 또는 관리 권한이 있는 조직의 기록만 조회
          if (managedOrganizationIds.length > 0) {
            query = query.or(`user_id.eq.${user.id},organization_id.in.(${managedOrganizationIds.join(',')})`);
          } else {
            // 관리 권한이 없는 경우, 자신의 기록만 조회
            query = query.eq('user_id', user.id);
          }
        }

        // 필터링 조건 적용
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        if (userId) {
          query = query.eq('user_id', userId);
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
          .from('attendance')
          .select('id', { count: 'exact', head: true });

        if (!user.is_master_admin) {
          const userRolesQuery = await supabase
            .from('user_roles')
            .select('organization_id, role')
            .eq('user_id', user.id)
            .eq('is_active', true);

          const managementRoles = [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE];
          const managedOrganizationIds = userRolesQuery.data
            .filter(role => managementRoles.includes(role.role))
            .map(role => role.organization_id);

          if (managedOrganizationIds.length > 0) {
            countQuery = countQuery.or(`user_id.eq.${user.id},organization_id.in.(${managedOrganizationIds.join(',')})`);
          } else {
            countQuery = countQuery.eq('user_id', user.id);
          }
        }

        if (organizationId) countQuery = countQuery.eq('organization_id', organizationId);
        if (userId) countQuery = countQuery.eq('user_id', userId);
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
    },
    {
      requiredRoles: [RoleType.WORKER, RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
      action: 'read',
      enableAuditLog: true,
      enableCache: false // 실시간 데이터이므로 캐시 비활성화
    }
  )(request);
}

/**
 * 출근 기록 생성 API (출근 체크인)
 * - 모든 역할 접근 가능
 * - 자신의 출근 기록만 생성 가능
 */
export async function POST(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();

      try {
        const body = await request.json();
        const {
          organization_id,
          check_in_time,
          location_lat,
          location_lng,
          location_address,
          notes
        } = body;

        // 필수 필드 검증
        if (!organization_id) {
          return NextResponse.json(
            { error: '조직 ID는 필수입니다.' },
            { status: 400 }
          );
        }

        // 해당 조직에서 활성 역할 확인
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('id, role, hourly_wage, start_date, end_date')
          .eq('user_id', user.id)
          .eq('organization_id', organization_id)
          .eq('is_active', true)
          .single();

        if (roleError || !userRole) {
          return NextResponse.json(
            { error: '해당 조직에서 활성 역할이 없습니다.' },
            { status: 403 }
          );
        }

        // 시간 기반 역할 유효성 검증
        const now = new Date();
        const startDate = userRole.start_date ? new Date(userRole.start_date) : null;
        const endDate = userRole.end_date ? new Date(userRole.end_date) : null;

        if (startDate && now < startDate) {
          return NextResponse.json(
            { error: '역할 시작일이 아직 도래하지 않았습니다.' },
            { status: 403 }
          );
        }

        if (endDate && now > endDate) {
          return NextResponse.json(
            { error: '역할 종료일이 지났습니다.' },
            { status: 403 }
          );
        }

        // 당일 이미 출근한 기록이 있는지 확인
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const { data: existingAttendance } = await supabase
          .from('attendance')
          .select('id, check_out_time')
          .eq('user_id', user.id)
          .eq('organization_id', organization_id)
          .gte('check_in_time', today.toISOString())
          .lt('check_in_time', tomorrow.toISOString())
          .single();

        if (existingAttendance && !existingAttendance.check_out_time) {
          return NextResponse.json(
            { error: '이미 출근한 상태입니다. 먼저 퇴근 처리를 해주세요.' },
            { status: 409 }
          );
        }

        const checkInTime = check_in_time || new Date().toISOString();

        const { data: newAttendance, error } = await supabase
          .from('attendance')
          .insert({
            user_id: user.id,
            organization_id,
            check_in_time: checkInTime,
            location_lat,
            location_lng,
            location_address,
            notes,
            status: 'checked_in'
          })
          .select(`
            *,
            users (id, name, email),
            organizations (id, name, type)
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
    },
    {
      requiredRoles: [RoleType.WORKER, RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
      action: 'write',
      enableAuditLog: true
    }
  )(request);
}

/**
 * 출근 기록 수정 API (퇴근 체크아웃, 휴게시간 등)
 * - 모든 역할 접근 가능
 * - 자신의 기록 또는 관리 권한이 있는 기록만 수정 가능
 */
export async function PUT(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();

      try {
        const body = await request.json();
        const {
          id,
          check_out_time,
          break_start_time,
          break_end_time,
          location_lat,
          location_lng,
          location_address,
          notes,
          status
        } = body;

        if (!id) {
          return NextResponse.json(
            { error: '출근 기록 ID는 필수입니다.' },
            { status: 400 }
          );
        }

        // 출근 기록 존재 여부 및 권한 확인
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance')
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
        let hasPermission = attendance.user_id === user.id;

        if (!hasPermission && !user.is_master_admin) {
          const managerRoleQuery = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', attendance.organization_id)
            .in('role', [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE])
            .eq('is_active', true)
            .single();

          hasPermission = !managerRoleQuery.error;
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
          updateData.status = 'checked_out';
          
          // 총 근무 시간 계산
          const checkIn = new Date(attendance.check_in_time);
          const checkOut = new Date(check_out_time);
          let totalMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
          
          // 휴게시간 제외
          if (attendance.break_start_time && attendance.break_end_time) {
            const breakStart = new Date(attendance.break_start_time);
            const breakEnd = new Date(attendance.break_end_time);
            const breakMinutes = Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60));
            totalMinutes -= breakMinutes;
          }
          
          const totalHours = Math.max(0, totalMinutes / 60);
          updateData.total_hours = parseFloat(totalHours.toFixed(2));
          
          // 초과 근무 계산 (8시간 기준)
          if (totalHours > 8) {
            updateData.overtime_hours = parseFloat((totalHours - 8).toFixed(2));
          }
        }
        
        if (break_start_time) updateData.break_start_time = break_start_time;
        if (break_end_time) updateData.break_end_time = break_end_time;
        if (location_lat) updateData.location_lat = location_lat;
        if (location_lng) updateData.location_lng = location_lng;
        if (location_address) updateData.location_address = location_address;
        if (notes) updateData.notes = notes;
        if (status) updateData.status = status;
        
        updateData.updated_at = new Date().toISOString();

        const { data: updatedAttendance, error } = await supabase
          .from('attendance')
          .update(updateData)
          .eq('id', id)
          .select(`
            *,
            users (id, name, email),
            organizations (id, name, type)
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
    },
    {
      requiredRoles: [RoleType.WORKER, RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
      action: 'write',
      enableAuditLog: true
    }
  )(request);
}

/**
 * 출근 기록 삭제 API
 * - ADMIN 이상 권한 필요
 * - 관리 권한이 있는 조직의 기록만 삭제 가능
 */
export async function DELETE(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);
      const attendanceId = searchParams.get('id');

      try {
        if (!attendanceId) {
          return NextResponse.json(
            { error: '출근 기록 ID는 필수입니다.' },
            { status: 400 }
          );
        }

        // 출근 기록 존재 여부 확인
        const { data: attendance, error: attendanceError } = await supabase
          .from('attendance')
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
        if (!user.is_master_admin) {
          const hasPermission = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', attendance.organization_id)
            .in('role', [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE])
            .eq('is_active', true)
            .single();

          if (hasPermission.error) {
            return NextResponse.json(
              { error: '해당 출근 기록을 삭제할 권한이 없습니다.' },
              { status: 403 }
            );
          }
        }

        const { error } = await supabase
          .from('attendance')
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
    },
    {
      requiredRoles: [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
      action: 'delete',
      enableAuditLog: true
    }
  )(request);
}