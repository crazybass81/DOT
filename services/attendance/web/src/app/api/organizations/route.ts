import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRBAC } from '@/middleware/rbac-middleware';
import { RoleType } from '@/types/multi-role';

/**
 * 조직 목록 조회 API
 * - ADMIN 이상 권한 필요
 * - 자신이 속한 조직만 조회 가능 (마스터 어드민 제외)
 */
export async function GET(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('organizationId');

      try {
        let query = supabase
          .from('organizations')
          .select(`
            id,
            name,
            type,
            business_registration_number,
            address,
            phone,
            created_at,
            updated_at
          `);

        // 마스터 어드민이 아닌 경우, 자신이 속한 조직만 조회 가능
        if (!user.is_master_admin) {
          const userRolesQuery = await supabase
            .from('user_roles')
            .select('organization_id')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (userRolesQuery.error) {
            throw userRolesQuery.error;
          }

          const organizationIds = userRolesQuery.data.map(role => role.organization_id);
          
          if (organizationIds.length === 0) {
            return NextResponse.json({ organizations: [] });
          }

          query = query.in('id', organizationIds);
        }

        // 특정 조직 ID로 필터링
        if (organizationId) {
          query = query.eq('id', organizationId);
        }

        const { data: organizations, error } = await query.order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        return NextResponse.json({ organizations });
      } catch (error) {
        console.error('조직 조회 중 오류 발생:', error);
        return NextResponse.json(
          { error: '조직 조회 중 오류가 발생했습니다.' },
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
 * 새 조직 생성 API
 * - MASTER_ADMIN 또는 FRANCHISE 권한 필요
 */
export async function POST(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();

      try {
        const body = await request.json();
        const {
          name,
          type,
          business_registration_number,
          address,
          phone,
          parent_organization_id
        } = body;

        // 필수 필드 검증
        if (!name || !type) {
          return NextResponse.json(
            { error: '조직명과 유형은 필수입니다.' },
            { status: 400 }
          );
        }

        // 비즈니스 등록번호 중복 검사
        if (business_registration_number) {
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('business_registration_number', business_registration_number)
            .single();

          if (existingOrg) {
            return NextResponse.json(
              { error: '이미 등록된 사업자등록번호입니다.' },
              { status: 409 }
            );
          }
        }

        // 마스터 어드민이 아닌 경우, 상위 조직 검증
        if (!user.is_master_admin && parent_organization_id) {
          const hasPermission = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', parent_organization_id)
            .in('role', [RoleType.FRANCHISE])
            .eq('is_active', true)
            .single();

          if (hasPermission.error) {
            return NextResponse.json(
              { error: '상위 조직에 대한 권한이 없습니다.' },
              { status: 403 }
            );
          }
        }

        const { data: newOrganization, error } = await supabase
          .from('organizations')
          .insert({
            name,
            type,
            business_registration_number,
            address,
            phone,
            parent_organization_id,
            created_by: user.id
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return NextResponse.json(
          { organization: newOrganization },
          { status: 201 }
        );
      } catch (error) {
        console.error('조직 생성 중 오류 발생:', error);
        return NextResponse.json(
          { error: '조직 생성 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.FRANCHISE],
      action: 'write',
      enableAuditLog: true
    }
  )(request);
}

/**
 * 조직 정보 수정 API
 * - 해당 조직의 MANAGER 이상 권한 필요
 */
export async function PUT(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();

      try {
        const body = await request.json();
        const {
          id,
          name,
          type,
          business_registration_number,
          address,
          phone
        } = body;

        if (!id) {
          return NextResponse.json(
            { error: '조직 ID는 필수입니다.' },
            { status: 400 }
          );
        }

        // 조직 존재 여부 확인
        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', id)
          .single();

        if (orgError || !organization) {
          return NextResponse.json(
            { error: '존재하지 않는 조직입니다.' },
            { status: 404 }
          );
        }

        // 권한 검증 (마스터 어드민이 아닌 경우)
        if (!user.is_master_admin) {
          const hasPermission = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', id)
            .in('role', [RoleType.MANAGER, RoleType.FRANCHISE])
            .eq('is_active', true)
            .single();

          if (hasPermission.error) {
            return NextResponse.json(
              { error: '해당 조직을 수정할 권한이 없습니다.' },
              { status: 403 }
            );
          }
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        if (type) updateData.type = type;
        if (business_registration_number) updateData.business_registration_number = business_registration_number;
        if (address) updateData.address = address;
        if (phone) updateData.phone = phone;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedOrganization, error } = await supabase
          .from('organizations')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return NextResponse.json({ organization: updatedOrganization });
      } catch (error) {
        console.error('조직 수정 중 오류 발생:', error);
        return NextResponse.json(
          { error: '조직 수정 중 오류가 발생했습니다.' },
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
 * 조직 삭제 API
 * - MASTER_ADMIN 또는 해당 조직의 FRANCHISE 권한 필요
 */
export async function DELETE(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);
      const organizationId = searchParams.get('id');

      try {
        if (!organizationId) {
          return NextResponse.json(
            { error: '조직 ID는 필수입니다.' },
            { status: 400 }
          );
        }

        // 조직 존재 여부 확인
        const { data: organization, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('id', organizationId)
          .single();

        if (orgError || !organization) {
          return NextResponse.json(
            { error: '존재하지 않는 조직입니다.' },
            { status: 404 }
          );
        }

        // 권한 검증 (마스터 어드민이 아닌 경우)
        if (!user.is_master_admin) {
          const hasPermission = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_id', user.id)
            .eq('organization_id', organizationId)
            .eq('role', RoleType.FRANCHISE)
            .eq('is_active', true)
            .single();

          if (hasPermission.error) {
            return NextResponse.json(
              { error: '해당 조직을 삭제할 권한이 없습니다.' },
              { status: 403 }
            );
          }
        }

        // 하위 조직 존재 여부 확인
        const { data: childOrganizations } = await supabase
          .from('organizations')
          .select('id')
          .eq('parent_organization_id', organizationId);

        if (childOrganizations && childOrganizations.length > 0) {
          return NextResponse.json(
            { error: '하위 조직이 존재하여 삭제할 수 없습니다.' },
            { status: 409 }
          );
        }

        // 활성 사용자 존재 여부 확인
        const { data: activeUsers } = await supabase
          .from('user_roles')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (activeUsers && activeUsers.length > 0) {
          return NextResponse.json(
            { error: '활성 사용자가 존재하여 삭제할 수 없습니다.' },
            { status: 409 }
          );
        }

        const { error } = await supabase
          .from('organizations')
          .delete()
          .eq('id', organizationId);

        if (error) {
          throw error;
        }

        return NextResponse.json(
          { message: '조직이 성공적으로 삭제되었습니다.' },
          { status: 200 }
        );
      } catch (error) {
        console.error('조직 삭제 중 오류 발생:', error);
        return NextResponse.json(
          { error: '조직 삭제 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    },
    {
      requiredRoles: [RoleType.FRANCHISE],
      action: 'delete',
      enableAuditLog: true
    }
  )(request);
}