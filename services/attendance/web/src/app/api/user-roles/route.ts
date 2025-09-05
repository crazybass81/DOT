import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRBAC } from '@/middleware/rbac-middleware';
import { RoleType } from '@/types/auth';

/**
 * 사용자 역할 목록 조회 API
 * - ADMIN 이상 권한 필요
 * - 자신이 속한 조직의 사용자 역할만 조회 가능 (마스터 어드민 제외)
 */
export async function GET(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');
      const userId = searchParams.get('userId');
      const role = searchParams.get('role');
      const isActive = searchParams.get('isActive');

      try {
        let query = supabase
          .from('user_roles')
          .select(`
            id,
            user_id,
            organization_id,
            role,
            is_active,
            start_date,
            end_date,
            hourly_wage,
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

        // 마스터 어드민이 아닌 경우, 자신이 속한 조직의 역할만 조회 가능
        if (!user.is_master_admin) {
          const userRolesQuery = await supabase
            .from('user_roles')
            .select('organization_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .in('role', [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE]);

          if (userRolesQuery.error) {
            throw userRolesQuery.error;
          }

          const organizationIds = userRolesQuery.data.map(role => role.organization_id);
          
          if (organizationIds.length === 0) {
            return NextResponse.json({ userRoles: [] });
          }

          query = query.in('organization_id', organizationIds);
        }

        // 필터링 조건 적용
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        if (role) {
          query = query.eq('role', role);
        }
        
        if (isActive !== null && isActive !== undefined) {
          query = query.eq('is_active', isActive === 'true');
        }

        const { data: userRoles, error } = await query.order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        return NextResponse.json({ userRoles });
      } catch (error) {
        console.error('사용자 역할 조회 중 오류 발생:', error);
        return NextResponse.json(
          { error: '사용자 역할 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.ADMIN, RoleType.MANAGER, RoleType.FRANCHISE],
      action: 'read',
      enableAuditLog: true,
      enableCache: true
    }
  )(request);
}

/**
 * 새 사용자 역할 생성 API
 * - MANAGER 이상 권한 필요
 * - 자신보다 낮은 권한의 역할만 생성 가능
 */
export async function POST(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();

      try {
        const body = await request.json();
        const {
          user_id,
          organization_id,
          role,
          start_date,
          end_date,
          hourly_wage
        } = body;

        // 필수 필드 검증
        if (!user_id || !organization_id || !role) {
          return NextResponse.json(
            { error: '사용자 ID, 조직 ID, 역할은 필수입니다.' },
            { status: 400 }
          );
        }

        // 역할 권한 계층 검증
        const roleHierarchy = {
          [RoleType.FRANCHISE]: 4,
          [RoleType.MANAGER]: 3,
          [RoleType.ADMIN]: 2,
          [RoleType.WORKER]: 1
        };

        // 마스터 어드민이 아닌 경우, 권한 검증
        if (!user.is_master_admin) {
          // 해당 조직에서의 권한 확인
          const currentUserRoleQuery = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('organization_id', organization_id)
            .eq('is_active', true)
            .in('role', [RoleType.MANAGER, RoleType.FRANCHISE])
            .single();

          if (currentUserRoleQuery.error) {
            return NextResponse.json(
              { error: '해당 조직에 대한 권한이 없습니다.' },
              { status: 403 }
            );
          }

          const currentUserRole = currentUserRoleQuery.data.role;
          
          // 자신보다 높거나 같은 권한의 역할은 생성할 수 없음
          if (roleHierarchy[role] >= roleHierarchy[currentUserRole]) {
            return NextResponse.json(
              { error: '자신보다 높거나 같은 권한의 역할을 생성할 수 없습니다.' },
              { status: 403 }
            );
          }
        }

        // 사용자 존재 여부 확인
        const { data: targetUser, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user_id)
          .single();

        if (userError || !targetUser) {
          return NextResponse.json(
            { error: '존재하지 않는 사용자입니다.' },
            { status: 404 }
          );
        }

        // 조직 존재 여부 확인
        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', organization_id)
          .single();

        if (orgError || !organization) {
          return NextResponse.json(
            { error: '존재하지 않는 조직입니다.' },
            { status: 404 }
          );
        }

        // 중복 역할 확인 (같은 조직에서 같은 역할)
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', user_id)
          .eq('organization_id', organization_id)
          .eq('role', role)
          .eq('is_active', true)
          .single();

        if (existingRole) {
          return NextResponse.json(
            { error: '해당 사용자는 이미 이 조직에서 동일한 역할을 가지고 있습니다.' },
            { status: 409 }
          );
        }

        const { data: newUserRole, error } = await supabase
          .from('user_roles')
          .insert({
            user_id,
            organization_id,
            role,
            start_date: start_date || new Date().toISOString(),
            end_date,
            hourly_wage,
            is_active: true,
            created_by: user.id
          })
          .select(`
            *,
            users (id, name, email, phone),
            organizations (id, name, type)
          `)
          .single();

        if (error) {
          throw error;
        }

        return NextResponse.json(
          { userRole: newUserRole },
          { status: 201 }
        );
      } catch (error) {
        console.error('사용자 역할 생성 중 오류 발생:', error);
        return NextResponse.json(
          { error: '사용자 역할 생성 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.MANAGER, RoleType.FRANCHISE],
      action: 'write',
      enableAuditLog: true
    }
  )(request);
}

/**
 * 사용자 역할 수정 API
 * - MANAGER 이상 권한 필요
 */
export async function PUT(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();

      try {
        const body = await request.json();
        const {
          id,
          is_active,
          start_date,
          end_date,
          hourly_wage
        } = body;

        if (!id) {
          return NextResponse.json(
            { error: '사용자 역할 ID는 필수입니다.' },
            { status: 400 }
          );
        }

        // 역할 존재 여부 및 권한 확인
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('id', id)
          .single();

        if (roleError || !userRole) {
          return NextResponse.json(
            { error: '존재하지 않는 사용자 역할입니다.' },
            { status: 404 }
          );
        }

        // 마스터 어드민이 아닌 경우, 권한 검증
        if (!user.is_master_admin) {
          const hasPermission = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', userRole.organization_id)
            .in('role', [RoleType.MANAGER, RoleType.FRANCHISE])
            .eq('is_active', true)
            .single();

          if (hasPermission.error) {
            return NextResponse.json(
              { error: '해당 사용자 역할을 수정할 권한이 없습니다.' },
              { status: 403 }
            );
          }
        }

        const updateData: any = {};
        if (is_active !== undefined) updateData.is_active = is_active;
        if (start_date) updateData.start_date = start_date;
        if (end_date) updateData.end_date = end_date;
        if (hourly_wage !== undefined) updateData.hourly_wage = hourly_wage;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedUserRole, error } = await supabase
          .from('user_roles')
          .update(updateData)
          .eq('id', id)
          .select(`
            *,
            users (id, name, email, phone),
            organizations (id, name, type)
          `)
          .single();

        if (error) {
          throw error;
        }

        return NextResponse.json({ userRole: updatedUserRole });
      } catch (error) {
        console.error('사용자 역할 수정 중 오류 발생:', error);
        return NextResponse.json(
          { error: '사용자 역할 수정 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.MANAGER, RoleType.FRANCHISE],
      action: 'write',
      enableAuditLog: true
    }
  )(request);
}

/**
 * 사용자 역할 삭제 API
 * - MANAGER 이상 권한 필요
 */
export async function DELETE(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);
      const userRoleId = searchParams.get('id');

      try {
        if (!userRoleId) {
          return NextResponse.json(
            { error: '사용자 역할 ID는 필수입니다.' },
            { status: 400 }
          );
        }

        // 역할 존재 여부 확인
        const { data: userRole, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('id', userRoleId)
          .single();

        if (roleError || !userRole) {
          return NextResponse.json(
            { error: '존재하지 않는 사용자 역할입니다.' },
            { status: 404 }
          );
        }

        // 마스터 어드민이 아닌 경우, 권한 검증
        if (!user.is_master_admin) {
          const hasPermission = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', userRole.organization_id)
            .in('role', [RoleType.MANAGER, RoleType.FRANCHISE])
            .eq('is_active', true)
            .single();

          if (hasPermission.error) {
            return NextResponse.json(
              { error: '해당 사용자 역할을 삭제할 권한이 없습니다.' },
              { status: 403 }
            );
          }
        }

        // 출근 기록이 있는지 확인
        const { data: attendanceRecords } = await supabase
          .from('attendance')
          .select('id')
          .eq('user_id', userRole.user_id)
          .eq('organization_id', userRole.organization_id)
          .limit(1);

        if (attendanceRecords && attendanceRecords.length > 0) {
          // 출근 기록이 있는 경우, 비활성화만 수행
          const { error } = await supabase
            .from('user_roles')
            .update({ 
              is_active: false,
              end_date: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', userRoleId);

          if (error) {
            throw error;
          }

          return NextResponse.json({
            message: '출근 기록이 존재하여 역할을 비활성화했습니다.'
          });
        } else {
          // 출근 기록이 없는 경우, 완전 삭제
          const { error } = await supabase
            .from('user_roles')
            .delete()
            .eq('id', userRoleId);

          if (error) {
            throw error;
          }

          return NextResponse.json({
            message: '사용자 역할이 성공적으로 삭제되었습니다.'
          });
        }
      } catch (error) {
        console.error('사용자 역할 삭제 중 오류 발생:', error);
        return NextResponse.json(
          { error: '사용자 역할 삭제 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.MANAGER, RoleType.FRANCHISE],
      action: 'delete',
      enableAuditLog: true
    }
  )(request);
}