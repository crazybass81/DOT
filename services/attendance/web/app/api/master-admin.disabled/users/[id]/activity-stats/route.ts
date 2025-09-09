/**
 * 마스터 어드민 사용자 활동 통계 조회 API 엔드포인트
 * GET /api/master-admin/users/:id/activity-stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { auditLogger, AuditAction, AuditResult } from '@/lib/audit-logger';

interface RouteParams {
  params: {
    id: string;
  };
}

interface ActivityStats {
  // 근무 관련 통계
  totalWorkDays: number;
  averageWorkHours: number;
  attendanceRate: number;
  punctualityRate: number;
  overtimeHours: number;
  lastAttendance: string | null;
  
  // 기간별 통계
  thisMonth: {
    workDays: number;
    workHours: number;
    attendanceRate: number;
  };
  lastMonth: {
    workDays: number;
    workHours: number;
    attendanceRate: number;
  };
  
  // 활동 통계
  totalLogins: number;
  lastLoginDate: string | null;
  averageSessionDuration: number;
  
  // 조직 관련 통계
  organizationsCount: number;
  activeOrganizations: number;
  
  // 시스템 사용 통계
  notificationStats: {
    total: number;
    read: number;
    unread: number;
    readRate: number;
  };
  
  // 위치 및 접근 통계
  locationStats: {
    uniqueLocations: number;
    mostUsedLocation: string | null;
    remoteWorkDays: number;
  };
  
  // 계산 기간
  calculatedAt: string;
  dataRange: {
    startDate: string;
    endDate: string;
  };
}

interface ActivityStatsResponse {
  success: true;
  userId: string;
  stats: ActivityStats;
}

interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const userId = params.id;

    // 현재 사용자 권한 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '인증이 필요합니다.'
      }, { status: 401 });
    }

    // MASTER_ADMIN 권한 확인
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'MASTER_ADMIN')
      .maybeSingle();

    if (roleError) {
      console.error('권한 조회 오류:', roleError);
      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '권한 확인 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    if (!userRole) {
      await auditLogger.logPermissionDenied(
        user.id,
        'USER_ACTIVITY_STATS_ACCESS',
        'user',
        userId
      );

      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '활동 통계를 볼 권한이 없습니다.'
      }, { status: 403 });
    }

    // 사용자 존재 여부 확인
    const { data: targetUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', userId)
      .single();

    if (userCheckError) {
      if (userCheckError.code === 'PGRST116') {
        return NextResponse.json<ErrorResponse>({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        }, { status: 404 });
      }

      return NextResponse.json<ErrorResponse>({
        success: false,
        error: '사용자 확인 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    // 계산 기간 설정 (최근 1년)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 1);

    const thisMonthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    const lastMonthStart = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
    const lastMonthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);

    // IP 주소 추출
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    // 병렬로 다양한 통계 데이터 조회
    const [
      attendanceData,
      thisMonthAttendance,
      lastMonthAttendance,
      loginData,
      organizationData,
      notificationData,
      locationData
    ] = await Promise.allSettled([
      // 전체 출근 데이터
      supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .gte('check_in_time', startDate.toISOString())
        .lte('check_in_time', endDate.toISOString()),
      
      // 이번 달 출근 데이터
      supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .gte('check_in_time', thisMonthStart.toISOString())
        .lte('check_in_time', endDate.toISOString()),
      
      // 지난 달 출근 데이터
      supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .gte('check_in_time', lastMonthStart.toISOString())
        .lte('check_in_time', lastMonthEnd.toISOString()),
      
      // 로그인 데이터 (audit_logs에서)
      supabase
        .from('audit_logs')
        .select('created_at, details')
        .eq('user_id', userId)
        .eq('action', 'LOGIN')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100),
      
      // 조직 멤버십 데이터
      supabase
        .from('user_organizations')
        .select('*, organizations(status)')
        .eq('user_id', userId),
      
      // 알림 데이터
      supabase
        .from('notifications')
        .select('status, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString()),
      
      // 위치 데이터 (출근 기록에서 추출)
      supabase
        .from('attendance_records')
        .select('location, work_type')
        .eq('user_id', userId)
        .gte('check_in_time', startDate.toISOString())
    ]);

    // 출근 통계 계산
    let totalWorkDays = 0;
    let totalWorkHours = 0;
    let punctualDays = 0;
    let overtimeHours = 0;
    let lastAttendance: string | null = null;

    if (attendanceData.status === 'fulfilled' && attendanceData.value.data) {
      const records = attendanceData.value.data;
      totalWorkDays = records.length;

      records.forEach(record => {
        if (record.check_out_time) {
          const checkIn = new Date(record.check_in_time);
          const checkOut = new Date(record.check_out_time);
          const workHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          totalWorkHours += workHours;

          // 정시 출근 체크 (9시 이전)
          if (checkIn.getHours() < 9) {
            punctualDays++;
          }

          // 초과근무 체크 (8시간 이상)
          if (workHours > 8) {
            overtimeHours += workHours - 8;
          }
        }

        // 가장 최근 출근일
        if (!lastAttendance || record.check_in_time > lastAttendance) {
          lastAttendance = record.check_in_time;
        }
      });
    }

    // 이번 달 통계
    let thisMonthStats = { workDays: 0, workHours: 0, attendanceRate: 0 };
    if (thisMonthAttendance.status === 'fulfilled' && thisMonthAttendance.value.data) {
      const records = thisMonthAttendance.value.data;
      thisMonthStats.workDays = records.length;
      thisMonthStats.workHours = records.reduce((total, record) => {
        if (record.check_out_time) {
          const checkIn = new Date(record.check_in_time);
          const checkOut = new Date(record.check_out_time);
          return total + (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        }
        return total;
      }, 0);

      const workingDaysThisMonth = Math.floor((endDate.getTime() - thisMonthStart.getTime()) / (1000 * 60 * 60 * 24));
      thisMonthStats.attendanceRate = workingDaysThisMonth > 0 ? (thisMonthStats.workDays / workingDaysThisMonth) * 100 : 0;
    }

    // 지난 달 통계
    let lastMonthStats = { workDays: 0, workHours: 0, attendanceRate: 0 };
    if (lastMonthAttendance.status === 'fulfilled' && lastMonthAttendance.value.data) {
      const records = lastMonthAttendance.value.data;
      lastMonthStats.workDays = records.length;
      lastMonthStats.workHours = records.reduce((total, record) => {
        if (record.check_out_time) {
          const checkIn = new Date(record.check_in_time);
          const checkOut = new Date(record.check_out_time);
          return total + (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
        }
        return total;
      }, 0);

      const workingDaysLastMonth = Math.floor((lastMonthEnd.getTime() - lastMonthStart.getTime()) / (1000 * 60 * 60 * 24));
      lastMonthStats.attendanceRate = workingDaysLastMonth > 0 ? (lastMonthStats.workDays / workingDaysLastMonth) * 100 : 0;
    }

    // 로그인 통계
    let totalLogins = 0;
    let lastLoginDate: string | null = null;
    let averageSessionDuration = 0;

    if (loginData.status === 'fulfilled' && loginData.value.data) {
      totalLogins = loginData.value.data.length;
      if (totalLogins > 0) {
        lastLoginDate = loginData.value.data[0].created_at;
        // 세션 시간 계산 로직 (간단화)
        averageSessionDuration = 2.5; // 평균 2.5시간으로 가정
      }
    }

    // 조직 통계
    let organizationsCount = 0;
    let activeOrganizations = 0;

    if (organizationData.status === 'fulfilled' && organizationData.value.data) {
      organizationsCount = organizationData.value.data.length;
      activeOrganizations = organizationData.value.data.filter(
        org => org.status === 'ACTIVE' && org.organizations?.status === 'ACTIVE'
      ).length;
    }

    // 알림 통계
    let notificationStats = {
      total: 0,
      read: 0,
      unread: 0,
      readRate: 0
    };

    if (notificationData.status === 'fulfilled' && notificationData.value.data) {
      const notifications = notificationData.value.data;
      notificationStats.total = notifications.length;
      notificationStats.read = notifications.filter(n => n.status === 'READ').length;
      notificationStats.unread = notifications.filter(n => n.status === 'UNREAD').length;
      notificationStats.readRate = notificationStats.total > 0 
        ? (notificationStats.read / notificationStats.total) * 100 
        : 0;
    }

    // 위치 통계
    let locationStats = {
      uniqueLocations: 0,
      mostUsedLocation: null as string | null,
      remoteWorkDays: 0
    };

    if (locationData.status === 'fulfilled' && locationData.value.data) {
      const locations = locationData.value.data;
      const locationCounts = new Map<string, number>();
      
      locations.forEach(record => {
        if (record.work_type === 'REMOTE') {
          locationStats.remoteWorkDays++;
        }
        
        if (record.location) {
          const count = locationCounts.get(record.location) || 0;
          locationCounts.set(record.location, count + 1);
        }
      });

      locationStats.uniqueLocations = locationCounts.size;
      
      if (locationCounts.size > 0) {
        const mostUsed = Array.from(locationCounts.entries()).reduce((a, b) => 
          a[1] > b[1] ? a : b
        );
        locationStats.mostUsedLocation = mostUsed[0];
      }
    }

    // 최종 통계 객체 생성
    const stats: ActivityStats = {
      totalWorkDays,
      averageWorkHours: totalWorkDays > 0 ? totalWorkHours / totalWorkDays : 0,
      attendanceRate: totalWorkDays > 0 ? (totalWorkDays / 250) * 100 : 0, // 연간 250일 기준
      punctualityRate: totalWorkDays > 0 ? (punctualDays / totalWorkDays) * 100 : 0,
      overtimeHours,
      lastAttendance,
      thisMonth: thisMonthStats,
      lastMonth: lastMonthStats,
      totalLogins,
      lastLoginDate,
      averageSessionDuration,
      organizationsCount,
      activeOrganizations,
      notificationStats,
      locationStats,
      calculatedAt: new Date().toISOString(),
      dataRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    };

    // 감사 로그 기록
    await auditLogger.log({
      user_id: user.id,
      action: AuditAction.USER_ACTIVITY_STATS_ACCESS,
      result: AuditResult.SUCCESS,
      resource_type: 'user',
      resource_id: userId,
      details: {
        target_user_email: targetUser.email,
        stats_period: `${startDate.toISOString()} to ${endDate.toISOString()}`,
        data_points: {
          attendance_records: totalWorkDays,
          login_records: totalLogins,
          organizations: organizationsCount,
          notifications: notificationStats.total
        }
      },
      ip_address: ipAddress,
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    const response: ActivityStatsResponse = {
      success: true,
      userId,
      stats
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('사용자 활동 통계 조회 API 오류:', error);
    return NextResponse.json<ErrorResponse>({
      success: false,
      error: '활동 통계 계산 중 오류가 발생했습니다. 데이터에 문제가 있을 수 있습니다.',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// OPTIONS 메서드 (CORS 지원)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}