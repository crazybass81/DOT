import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRBAC } from '@/middleware/rbac-middleware';
import { RoleType } from '@/types/multi-role';
import { OrganizationType, OrganizationStatus } from '@/types/organization.types';

/**
 * 조직 목록 조회 API (마스터 어드민 전용 확장 기능 포함)
 * - ADMIN 이상 권한 필요
 * - 마스터 어드민은 모든 조직 조회 가능 (검색, 필터, 정렬, 페이징 지원)
 * - 일반 사용자는 자신이 속한 조직만 조회 가능
 */
export async function GET(request: NextRequest) {
  return withRBAC(
    async (request: NextRequest, user: any) => {
      const supabase = createClient();
      const { searchParams } = new URL(request.url);

      try {
        // 기본 쿼리 파라미터 추출
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const search = searchParams.get('search');
        const sortField = searchParams.get('sortField') || 'created_at';
        const sortDirection = searchParams.get('sortDirection') || 'desc';
        const organizationId = searchParams.get('organizationId');

        // 필터 파라미터
        const statusFilters = searchParams.getAll('status') as OrganizationStatus[];
        const typeFilters = searchParams.getAll('type') as OrganizationType[];
        const employeeMin = searchParams.get('employeeMin');
        const employeeMax = searchParams.get('employeeMax');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const parentOrganizationId = searchParams.get('parentOrganizationId');

        // 마스터 어드민 여부 확인
        const isMasterAdmin = user.isMasterAdmin || user.is_master_admin;

        let query = supabase
          .from('organizations')
          .select(`
            id,
            name,
            type,
            business_registration_number,
            address,
            phone,
            status,
            parent_organization_id,
            created_at,
            updated_at,
            created_by
          `, { count: 'exact' });

        // 마스터 어드민이 아닌 경우, 자신이 속한 조직만 조회 가능
        if (!isMasterAdmin) {
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
            return NextResponse.json({ 
              organizations: [],
              total: 0,
              page,
              pageSize,
              totalPages: 0,
              hasNextPage: false,
              hasPreviousPage: false
            });
          }

          query = query.in('id', organizationIds);
        }

        // 특정 조직 ID로 필터링
        if (organizationId) {
          query = query.eq('id', organizationId);
        }

        // 검색 필터 (조직명 또는 사업자번호)
        if (search && search.trim()) {
          query = query.or(`name.ilike.%${search}%,business_registration_number.ilike.%${search}%`);
        }

        // 상태 필터
        if (statusFilters.length > 0) {
          query = query.in('status', statusFilters);
        }

        // 타입 필터
        if (typeFilters.length > 0) {
          query = query.in('type', typeFilters);
        }

        // 상위 조직 필터
        if (parentOrganizationId) {
          query = query.eq('parent_organization_id', parentOrganizationId);
        }

        // 날짜 범위 필터
        if (startDate) {
          query = query.gte('created_at', `${startDate}T00:00:00.000Z`);
        }
        if (endDate) {
          query = query.lte('created_at', `${endDate}T23:59:59.999Z`);
        }

        // 정렬
        const ascending = sortDirection === 'asc';
        if (sortField === 'name') {
          query = query.order('name', { ascending });
        } else if (sortField === 'type') {
          query = query.order('type', { ascending });
        } else if (sortField === 'status') {
          query = query.order('status', { ascending });
        } else if (sortField === 'employeeCount') {
          // 직원수는 서브쿼리로 정렬해야 하므로 나중에 처리
          query = query.order('created_at', { ascending: false });
        } else {
          query = query.order('created_at', { ascending });
        }

        // 페이징
        const offset = (page - 1) * pageSize;
        query = query.range(offset, offset + pageSize - 1);

        const { data: organizations, count, error } = await query;

        if (error) {
          throw error;
        }

        // 각 조직의 직원 수 조회 (마스터 어드민인 경우에만)
        let enrichedOrganizations = organizations || [];
        if (isMasterAdmin && enrichedOrganizations.length > 0) {
          const organizationIds = enrichedOrganizations.map(org => org.id);
          
          const { data: employeeCounts } = await supabase
            .from('user_roles')
            .select('organization_id')
            .in('organization_id', organizationIds)
            .eq('is_active', true);

          // 조직별 직원 수 계산
          const employeeCountMap = (employeeCounts || []).reduce((acc: Record<string, number>, role) => {
            acc[role.organization_id] = (acc[role.organization_id] || 0) + 1;
            return acc;
          }, {});

          enrichedOrganizations = enrichedOrganizations.map(org => ({
            ...org,
            employeeCount: employeeCountMap[org.id] || 0
          }));

          // 직원수로 정렬하는 경우
          if (sortField === 'employeeCount') {
            enrichedOrganizations.sort((a, b) => {
              const aCount = a.employeeCount || 0;
              const bCount = b.employeeCount || 0;
              return ascending ? aCount - bCount : bCount - aCount;
            });
          }

          // 직원수 필터링
          if (employeeMin || employeeMax) {
            enrichedOrganizations = enrichedOrganizations.filter(org => {
              const count = org.employeeCount || 0;
              const min = employeeMin ? parseInt(employeeMin) : 0;
              const max = employeeMax ? parseInt(employeeMax) : Infinity;
              return count >= min && count <= max;
            });
          }
        }

        // 페이징 정보 계산
        const total = count || 0;
        const totalPages = Math.ceil(total / pageSize);
        const hasNextPage = page < totalPages;
        const hasPreviousPage = page > 1;

        return NextResponse.json({
          organizations: enrichedOrganizations,
          total,
          page,
          pageSize,
          totalPages,
          hasNextPage,
          hasPreviousPage
        });

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
        const isMasterAdmin = user.isMasterAdmin || user.is_master_admin;
        if (!isMasterAdmin && parent_organization_id) {
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
            status: OrganizationStatus.ACTIVE,
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
          phone,
          status
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
        const isMasterAdmin = user.isMasterAdmin || user.is_master_admin;
        if (!isMasterAdmin) {
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
        if (status && isMasterAdmin) updateData.status = status; // 상태는 마스터 어드민만 변경 가능
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
        const isMasterAdmin = user.isMasterAdmin || user.is_master_admin;
        if (!isMasterAdmin) {
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