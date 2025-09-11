'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase/client';

interface ActivityItem {
  id: string;
  type: 'check_in' | 'check_out' | 'approval' | 'manual_edit' | 'system';
  employeeName: string;
  employeeId: string;
  message: string;
  timestamp: string;
  details?: any;
  priority: 'low' | 'normal' | 'high';
}

interface ActivityFeedProps {
  organizationId: string;
  onNotification?: (notification: any) => void;
}

export default function ActivityFeed({ organizationId, onNotification }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'check_in' | 'check_out' | 'approval' | 'manual'>('all');

  useEffect(() => {
    loadActivities();
    setupRealtimeSubscription();
  }, [organizationId]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Get recent attendance records with employee info
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select(`
          *,
          employees!inner(name, employee_code)
        `)
        .eq('organization_id', organizationId)
        .gte('created_at', `${today}T00:00:00`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (attendanceError) throw attendanceError;

      // Get recent employee approvals
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('*')
        .eq('organization_id', organizationId)
        .not('approved_at', 'is', null)
        .gte('approved_at', `${today}T00:00:00`)
        .order('approved_at', { ascending: false })
        .limit(20);

      if (employeeError) throw employeeError;

      // Convert to activity items
      const attendanceActivities: ActivityItem[] = attendanceData.map(record => {
        let type: ActivityItem['type'] = 'check_in';
        let message = '';
        let priority: ActivityItem['priority'] = 'normal';

        if (record.check_out_time && !record.check_in_time) {
          type = 'check_out';
          message = `${record.employees.name}님이 퇴근했습니다`;
        } else if (record.check_in_time) {
          type = 'check_in';
          message = `${record.employees.name}님이 출근했습니다`;
          if (record.is_late) {
            message += ' (지각)';
            priority = 'high';
          }
        }

        return {
          id: record.id,
          type,
          employeeName: record.employees.name,
          employeeId: record.employee_id,
          message,
          timestamp: record.created_at,
          details: {
            method: record.check_in_method || record.check_out_method,
            time: record.check_in_time || record.check_out_time,
            location: record.check_in_location || record.check_out_location
          },
          priority
        };
      });

      const approvalActivities: ActivityItem[] = employeeData.map(employee => ({
        id: `approval-${employee.id}`,
        type: 'approval' as const,
        employeeName: employee.name,
        employeeId: employee.id,
        message: `${employee.name}님의 직원 등록이 승인되었습니다`,
        timestamp: employee.approved_at!,
        details: {
          role: employee.role,
          department: employee.department_id
        },
        priority: 'normal' as const
      }));

      // Combine and sort all activities
      const allActivities = [...attendanceActivities, ...approvalActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(allActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      onNotification?.({
        type: 'error',
        message: '활동 피드 로드 중 오류가 발생했습니다.',
        priority: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
          filter: `organization_id=eq.${organizationId}`
        },
        async (payload) => {
          console.log('New attendance record:', payload);
          
          // Get employee info for the new record
          const { data: employee } = await supabase
            .from('employees')
            .select('name, employee_code')
            .eq('id', payload.new.employee_id)
            .single();

          if (employee) {
            const newActivity: ActivityItem = {
              id: payload.new.id,
              type: payload.new.check_out_time ? 'check_out' : 'check_in',
              employeeName: employee.name,
              employeeId: payload.new.employee_id,
              message: payload.new.check_out_time 
                ? `${employee.name}님이 퇴근했습니다`
                : `${employee.name}님이 출근했습니다${payload.new.is_late ? ' (지각)' : ''}`,
              timestamp: payload.new.created_at,
              details: {
                method: payload.new.check_in_method || payload.new.check_out_method,
                time: payload.new.check_in_time || payload.new.check_out_time
              },
              priority: payload.new.is_late ? 'high' : 'normal'
            };

            setActivities(prev => [newActivity, ...prev].slice(0, 50));
            
            onNotification?.({
              type: 'info',
              message: newActivity.message,
              priority: newActivity.priority
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employees',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          if (payload.new.approved_at && !payload.old.approved_at) {
            const newActivity: ActivityItem = {
              id: `approval-${payload.new.id}`,
              type: 'approval',
              employeeName: payload.new.name,
              employeeId: payload.new.id,
              message: `${payload.new.name}님의 직원 등록이 승인되었습니다`,
              timestamp: payload.new.approved_at,
              details: {
                role: payload.new.role,
                department: payload.new.department_id
              },
              priority: 'normal'
            };

            setActivities(prev => [newActivity, ...prev].slice(0, 50));
            
            onNotification?.({
              type: 'success',
              message: newActivity.message,
              priority: 'normal'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'check_in':
        return '🟢';
      case 'check_out':
        return '🔵';
      case 'approval':
        return '✅';
      case 'manual_edit':
        return '✏️';
      case 'system':
        return '⚙️';
      default:
        return '📝';
    }
  };

  const getActivityColor = (priority: ActivityItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'normal':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-500 bg-white';
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return time.toLocaleDateString('ko-KR');
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    if (filter === 'manual') return activity.type === 'manual_edit';
    return activity.type === filter;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실시간 활동</h3>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">실시간 활동</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-500">실시간</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: '전체', count: activities.length },
            { key: 'check_in', label: '출근', count: activities.filter(a => a.type === 'check_in').length },
            { key: 'check_out', label: '퇴근', count: activities.filter(a => a.type === 'check_out').length },
            { key: 'approval', label: '승인', count: activities.filter(a => a.type === 'approval').length }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setFilter(option.key as any)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === option.key
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label} ({option.count})
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-lg mb-2">📝</div>
            <p className="text-gray-500">활동이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`p-4 border-l-4 ${getActivityColor(activity.priority)} hover:bg-gray-50 transition-colors`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-1">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                      {activity.details?.method && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {activity.details.method}
                        </span>
                      )}
                      {activity.details?.time && (
                        <span className="text-xs text-gray-600">
                          {activity.details.time.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = `/admin/employees/${activity.employeeId}`}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    상세
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredActivities.length}개 활동 표시
          </span>
          <button
            onClick={() => window.location.href = '/admin/activity-log'}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            전체 로그 보기
          </button>
        </div>
      </div>
    </div>
  );
}