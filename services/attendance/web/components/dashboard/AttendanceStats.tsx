'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase/client';

interface AttendanceStatsProps {
  organizationId: string;
  onNotification?: (notification: any) => void;
}

interface StatsData {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  attendanceRate: number;
  avgWorkHours: number;
  overtimeHours: number;
  pendingApprovals: number;
}

export default function AttendanceStats({ organizationId, onNotification }: AttendanceStatsProps) {
  const [stats, setStats] = useState<StatsData>({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    attendanceRate: 0,
    avgWorkHours: 0,
    overtimeHours: 0,
    pendingApprovals: 0
  });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadStats();
    setupRealtimeSubscription();
  }, [organizationId, period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Get total active employees
      const { data: employees, error: employeesError } = await supabase
        .from('employees')
        .select('id, approval_status')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (employeesError) throw employeesError;

      const totalEmployees = employees.filter(e => e.approval_status === 'APPROVED').length;
      const pendingApprovals = employees.filter(e => e.approval_status === 'PENDING').length;

      // Get today's attendance records
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('date', today);

      if (attendanceError) throw attendanceError;

      // Calculate stats
      const presentToday = attendanceRecords.filter(record => record.check_in_time).length;
      const absentToday = totalEmployees - presentToday;
      const lateToday = attendanceRecords.filter(record => record.is_late).length;
      const attendanceRate = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0;
      
      const totalWorkHours = attendanceRecords.reduce((sum, record) => {
        return sum + (record.work_hours || 0);
      }, 0);
      
      const avgWorkHours = presentToday > 0 ? totalWorkHours / presentToday : 0;
      
      const overtimeHours = attendanceRecords.reduce((sum, record) => {
        return sum + (record.overtime_hours || 0);
      }, 0);

      setStats({
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        attendanceRate,
        avgWorkHours,
        overtimeHours,
        pendingApprovals
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      onNotification?.({
        type: 'error',
        message: '통계 데이터 로드 중 오류가 발생했습니다.',
        priority: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          loadStats(); // Reload stats on any attendance changes
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          loadStats(); // Reload stats on employee changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatColor = (value: number, type: 'percentage' | 'count') => {
    if (type === 'percentage') {
      if (value >= 90) return 'text-green-600';
      if (value >= 75) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-900';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">출근 통계</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { key: 'today', label: '오늘' },
              { key: 'week', label: '이번 주' },
              { key: 'month', label: '이번 달' }
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => setPeriod(option.key as 'today' | 'week' | 'month')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  period === option.key
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 직원</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
              <p className="text-xs text-gray-500 mt-1">승인된 직원 수</p>
            </div>
            <div className="text-3xl">👥</div>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">오늘 출근</p>
              <p className="text-2xl font-bold text-green-600">{stats.presentToday}</p>
              <p className="text-xs text-gray-500 mt-1">출근 완료 직원</p>
            </div>
            <div className="text-3xl">🟢</div>
          </div>
        </div>

        {/* Attendance Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">출근율</p>
              <p className={`text-2xl font-bold ${getStatColor(stats.attendanceRate, 'percentage')}`}>
                {stats.attendanceRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">오늘 기준</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>

        {/* Late Today */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">지각</p>
              <p className="text-2xl font-bold text-red-600">{stats.lateToday}</p>
              <p className="text-xs text-gray-500 mt-1">오늘 지각자</p>
            </div>
            <div className="text-3xl">⏰</div>
          </div>
        </div>

        {/* Average Work Hours */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">평균 근무시간</p>
              <p className="text-2xl font-bold text-blue-600">{stats.avgWorkHours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500 mt-1">오늘 기준</p>
            </div>
            <div className="text-3xl">🕰️</div>
          </div>
        </div>

        {/* Overtime Hours */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 연장근무</p>
              <p className="text-2xl font-bold text-orange-600">{stats.overtimeHours.toFixed(1)}h</p>
              <p className="text-xs text-gray-500 mt-1">오늘 누적</p>
            </div>
            <div className="text-3xl">🌙</div>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">미출근</p>
              <p className="text-2xl font-bold text-gray-600">{stats.absentToday}</p>
              <p className="text-xs text-gray-500 mt-1">오늘 미출근자</p>
            </div>
            <div className="text-3xl">🔴</div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">승인 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</p>
              <p className="text-xs text-gray-500 mt-1">직원 등록 승인</p>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
          {stats.pendingApprovals > 0 && (
            <button
              onClick={() => window.location.href = '/admin/approvals'}
              className="mt-3 w-full text-sm bg-yellow-50 text-yellow-700 py-2 rounded-md hover:bg-yellow-100 transition-colors"
            >
              승인 처리하기
            </button>
          )}
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">빠른 인사이트</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-600">✅</span>
              <span className="text-sm font-medium text-green-800">양호</span>
            </div>
            <p className="text-xs text-green-700">
              출근율 {stats.attendanceRate.toFixed(1)}%로 목표 달성
            </p>
          </div>
          
          {stats.lateToday > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-sm font-medium text-yellow-800">주의</span>
              </div>
              <p className="text-xs text-yellow-700">
                {stats.lateToday}명 지각 - 관리 필요
              </p>
            </div>
          )}
          
          {stats.pendingApprovals > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-600">📢</span>
                <span className="text-sm font-medium text-blue-800">액션 필요</span>
              </div>
              <p className="text-xs text-blue-700">
                {stats.pendingApprovals}의 승인 대기 요청
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}