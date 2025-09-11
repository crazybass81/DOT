'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase/client';

interface QuickActionPanelProps {
  organizationId: string;
  onNotification?: (notification: any) => void;
}

interface ActionCounts {
  pendingApprovals: number;
  lateEmployees: number;
  absentEmployees: number;
  overtimeRequests: number;
}

export default function QuickActionPanel({ organizationId, onNotification }: QuickActionPanelProps) {
  const [counts, setCounts] = useState<ActionCounts>({
    pendingApprovals: 0,
    lateEmployees: 0,
    absentEmployees: 0,
    overtimeRequests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActionCounts();
    setupRealtimeSubscription();
  }, [organizationId]);

  const loadActionCounts = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Get pending employee approvals
      const { data: pendingEmployees, error: pendingError } = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('approval_status', 'PENDING')
        .eq('is_active', true);

      if (pendingError) throw pendingError;

      // Get today's attendance records for late and absent analysis
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('date', today);

      if (attendanceError) throw attendanceError;

      // Get total active employees
      const { data: allEmployees, error: employeesError } = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('approval_status', 'APPROVED');

      if (employeesError) throw employeesError;

      const lateEmployees = attendanceRecords.filter(record => record.is_late).length;
      const presentEmployees = attendanceRecords.filter(record => record.check_in_time).length;
      const absentEmployees = allEmployees.length - presentEmployees;

      // Get overtime requests (mock data for now - can be replaced with real overtime request table)
      const overtimeRequests = Math.floor(Math.random() * 3); // Mock data

      setCounts({
        pendingApprovals: pendingEmployees.length,
        lateEmployees,
        absentEmployees,
        overtimeRequests
      });
    } catch (error) {
      console.error('Error loading action counts:', error);
      onNotification?.({
        type: 'error',
        message: '액션 카운트 로드 중 오류가 발생했습니다.',
        priority: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('quick-actions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employees',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          loadActionCounts(); // Reload counts on employee changes
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `organization_id=eq.${organizationId}`
        },
        () => {
          loadActionCounts(); // Reload counts on attendance changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const quickActions = [
    {
      id: 'approvals',
      title: '승인 대기',
      icon: '👥',
      count: counts.pendingApprovals,
      color: 'red',
      href: '/admin/approvals',
      description: '직원 등록 승인',
      urgent: counts.pendingApprovals > 0
    },
    {
      id: 'manual-attendance',
      title: '수동 출퇴근',
      icon: '✍️',
      count: null,
      color: 'blue',
      href: '/admin/manual-attendance',
      description: '출퇴근 수동 처리',
      urgent: false
    },
    {
      id: 'late-employees',
      title: '지각 관리',
      icon: '⏰',
      count: counts.lateEmployees,
      color: 'yellow',
      href: '/admin/attendance?filter=late',
      description: '오늘 지각자',
      urgent: counts.lateEmployees > 3
    },
    {
      id: 'absent-employees',
      title: '미출근 관리',
      icon: '❌',
      count: counts.absentEmployees,
      color: 'gray',
      href: '/admin/attendance?filter=absent',
      description: '오늘 미출근자',
      urgent: counts.absentEmployees > 5
    },
    {
      id: 'qr-display',
      title: 'QR 코드',
      icon: '🔲',
      count: null,
      color: 'green',
      href: '/admin/qr-display',
      description: 'QR 출퇴근 코드',
      urgent: false
    },
    {
      id: 'overtime',
      title: '연장근무',
      icon: '🌙',
      count: counts.overtimeRequests,
      color: 'purple',
      href: '/admin/overtime',
      description: '연장근무 요청',
      urgent: counts.overtimeRequests > 0
    },
    {
      id: 'reports',
      title: '보고서',
      icon: '📊',
      count: null,
      color: 'indigo',
      href: '/admin/reports',
      description: '근태 보고서',
      urgent: false
    },
    {
      id: 'settings',
      title: '설정',
      icon: '⚙️',
      count: null,
      color: 'gray',
      href: '/admin/settings',
      description: '시스템 설정',
      urgent: false
    }
  ];

  const getColorClasses = (color: string, urgent: boolean) => {
    const baseClasses = 'group relative bg-white rounded-lg shadow-sm border-2 p-6 hover:shadow-lg transition-all duration-200 cursor-pointer';
    
    if (urgent) {
      switch (color) {
        case 'red':
          return `${baseClasses} border-red-200 hover:border-red-300 bg-red-50`;
        case 'yellow':
          return `${baseClasses} border-yellow-200 hover:border-yellow-300 bg-yellow-50`;
        case 'gray':
          return `${baseClasses} border-gray-200 hover:border-gray-300 bg-gray-50`;
        default:
          return `${baseClasses} border-red-200 hover:border-red-300 bg-red-50`;
      }
    }
    
    switch (color) {
      case 'red':
        return `${baseClasses} border-red-200 hover:border-red-300`;
      case 'blue':
        return `${baseClasses} border-blue-200 hover:border-blue-300`;
      case 'green':
        return `${baseClasses} border-green-200 hover:border-green-300`;
      case 'yellow':
        return `${baseClasses} border-yellow-200 hover:border-yellow-300`;
      case 'purple':
        return `${baseClasses} border-purple-200 hover:border-purple-300`;
      case 'indigo':
        return `${baseClasses} border-indigo-200 hover:border-indigo-300`;
      case 'gray':
        return `${baseClasses} border-gray-200 hover:border-gray-300`;
      default:
        return `${baseClasses} border-gray-200 hover:border-gray-300`;
    }
  };

  const getTextColor = (color: string, urgent: boolean) => {
    if (urgent) {
      switch (color) {
        case 'red':
          return 'text-red-800';
        case 'yellow':
          return 'text-yellow-800';
        case 'gray':
          return 'text-gray-800';
        default:
          return 'text-red-800';
      }
    }
    
    switch (color) {
      case 'red':
        return 'text-red-600';
      case 'blue':
        return 'text-blue-600';
      case 'green':
        return 'text-green-600';
      case 'yellow':
        return 'text-yellow-600';
      case 'purple':
        return 'text-purple-600';
      case 'indigo':
        return 'text-indigo-600';
      case 'gray':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">빠른 액션</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          실시간 업데이트
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <div
            key={action.id}
            onClick={() => window.location.href = action.href}
            className={getColorClasses(action.color, action.urgent)}
          >
            {/* Urgent indicator */}
            {action.urgent && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            )}
            
            {/* Count badge */}
            {action.count !== null && action.count > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold shadow-lg">
                {action.count > 99 ? '99+' : action.count}
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <span className="text-3xl">{action.icon}</span>
              {action.urgent && (
                <span className="text-red-500 text-sm font-medium animate-pulse">긴급</span>
              )}
            </div>
            
            <h3 className={`text-lg font-semibold ${getTextColor(action.color, action.urgent)} mb-1`}>
              {action.title}
            </h3>
            
            <p className="text-sm text-gray-600">
              {action.description}
            </p>

            {/* Hover effect arrow */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Urgent Actions Summary */}
      {(counts.pendingApprovals > 0 || counts.lateEmployees > 3 || counts.absentEmployees > 5) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600">🚨</span>
            <h3 className="text-red-800 font-semibold">즉시 조치 필요</h3>
          </div>
          <div className="space-y-1 text-sm text-red-700">
            {counts.pendingApprovals > 0 && (
              <p>• {counts.pendingApprovals}건의 직원 승인 대기</p>
            )}
            {counts.lateEmployees > 3 && (
              <p>• {counts.lateEmployees}명의 지각자 발생 (관리 기준 초과)</p>
            )}
            {counts.absentEmployees > 5 && (
              <p>• {counts.absentEmployees}명의 미출근자 (관리 기준 초과)</p>
            )}
          </div>
        </div>
      )}

      {/* Success Message */}
      {counts.pendingApprovals === 0 && counts.lateEmployees <= 2 && counts.absentEmployees <= 3 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <span className="text-green-600">✅</span>
            <p className="text-green-800 font-medium">모든 관리 지표가 정상 범위입니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}