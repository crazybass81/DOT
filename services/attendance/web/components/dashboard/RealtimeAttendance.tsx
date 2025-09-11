'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase/client';
import { Employee, AttendanceRecord } from '@/src/lib/supabase/types';

interface RealtimeAttendanceProps {
  organizationId: string;
  onNotification?: (notification: any) => void;
}

interface EmployeeStatus extends Employee {
  todayRecord?: AttendanceRecord;
  isOnline: boolean;
  workingHours: string;
  statusColor: string;
  statusIcon: string;
}

export default function RealtimeAttendance({ organizationId, onNotification }: RealtimeAttendanceProps) {
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'checkIn'>('name');

  useEffect(() => {
    loadEmployeeStatuses();
    setupRealtimeSubscription();
  }, [organizationId]);

  const loadEmployeeStatuses = async () => {
    try {
      setLoading(true);
      
      // Get employees with today's attendance records
      const today = new Date().toISOString().split('T')[0];
      
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select(`
          *,
          departments(name),
          positions(name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .eq('approval_status', 'APPROVED');

      if (employeesError) throw employeesError;

      // Get today's attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('date', today);

      if (attendanceError) throw attendanceError;

      // Combine employee data with attendance records
      const employeeStatuses: EmployeeStatus[] = employeesData.map(employee => {
        const todayRecord = attendanceData.find(record => record.employee_id === employee.id);
        
        let isOnline = false;
        let workingHours = '00:00';
        let statusColor = 'gray';
        let statusIcon = '⚪';

        if (todayRecord) {
          const checkInTime = todayRecord.check_in_time;
          const checkOutTime = todayRecord.check_out_time;
          
          if (checkInTime && !checkOutTime) {
            isOnline = true;
            statusColor = 'green';
            statusIcon = '🟢';
            
            // Calculate working hours
            const checkIn = new Date(`${today}T${checkInTime}`);
            const now = new Date();
            const diffMs = now.getTime() - checkIn.getTime();
            const hours = Math.floor(diffMs / (1000 * 60 * 60));
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            workingHours = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          } else if (checkInTime && checkOutTime) {
            statusColor = 'blue';
            statusIcon = '🔵';
            workingHours = todayRecord.work_hours ? `${todayRecord.work_hours.toFixed(1)}h` : '완료';
          } else {
            statusColor = 'red';
            statusIcon = '🔴';
          }
        }

        return {
          ...employee,
          todayRecord,
          isOnline,
          workingHours,
          statusColor,
          statusIcon
        };
      });

      setEmployees(employeeStatuses);
    } catch (error) {
      console.error('Error loading employee statuses:', error);
      onNotification?.({
        type: 'error',
        message: '직원 상태 로드 중 오류가 발생했습니다.',
        priority: 'high'
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_records',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('Attendance change:', payload);
          loadEmployeeStatuses(); // Reload data on changes
          
          onNotification?.({
            type: 'info',
            message: `출퇴근 기록이 업데이트되었습니다.`,
            priority: 'normal'
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const filteredEmployees = employees
    .filter(employee => {
      const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           employee.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (statusFilter === 'all') return matchesSearch;
      if (statusFilter === 'online') return matchesSearch && employee.isOnline;
      if (statusFilter === 'offline') return matchesSearch && !employee.isOnline && !employee.todayRecord;
      if (statusFilter === 'completed') return matchesSearch && employee.todayRecord?.check_out_time;
      
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return a.statusColor.localeCompare(b.statusColor);
        case 'checkIn':
          const aTime = a.todayRecord?.check_in_time || '99:99';
          const bTime = b.todayRecord?.check_in_time || '99:99';
          return aTime.localeCompare(bTime);
        default:
          return 0;
      }
    });

  const handleQuickAction = async (employeeId: string, action: 'check-in' | 'check-out' | 'manual-edit') => {
    try {
      switch (action) {
        case 'check-in':
          // Implement manual check-in
          break;
        case 'check-out':
          // Implement manual check-out
          break;
        case 'manual-edit':
          // Navigate to manual edit
          window.location.href = `/admin/manual-attendance?employee=${employeeId}`;
          break;
      }
    } catch (error) {
      console.error('Quick action error:', error);
      onNotification?.({
        type: 'error',
        message: '작업 실행 중 오류가 발생했습니다.',
        priority: 'high'
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">실시간 직원 모니터링</h3>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
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
          <h3 className="text-lg font-semibold text-gray-900">실시간 직원 모니터링</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              총 {employees.length}명 • 출근 {employees.filter(e => e.isOnline).length}명
            </span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="직원 이름 또는 이메일 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 상태</option>
              <option value="online">출근 중</option>
              <option value="completed">퇴근 완료</option>
              <option value="offline">미출근</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'checkIn')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">이름순</option>
              <option value="status">상태순</option>
              <option value="checkIn">출근시간순</option>
            </select>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="divide-y divide-gray-200">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 text-lg mb-2">👥</div>
            <p className="text-gray-500">검색 결과가 없습니다.</p>
          </div>
        ) : (
          filteredEmployees.map((employee) => (
            <div key={employee.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Status Indicator */}
                  <div className="flex flex-col items-center">
                    <span className="text-lg">{employee.statusIcon}</span>
                    <span className="text-xs text-gray-500">
                      {employee.isOnline ? '출근' : employee.todayRecord?.check_out_time ? '퇴근' : '미출근'}
                    </span>
                  </div>

                  {/* Employee Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{employee.name}</h4>
                      <span className="text-sm text-gray-500">#{employee.employee_code || employee.id.slice(-6)}</span>
                      {employee.role === 'ADMIN' && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">관리자</span>
                      )}
                      {employee.role === 'MANAGER' && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">매니저</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>{employee.email}</span>
                      {employee.departments?.name && (
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {employee.departments.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center gap-4">
                  {/* Time Info */}
                  <div className="text-right">
                    {employee.todayRecord?.check_in_time && (
                      <div className="text-sm font-medium text-gray-900">
                        출근: {employee.todayRecord.check_in_time.slice(0, 5)}
                      </div>
                    )}
                    {employee.todayRecord?.check_out_time && (
                      <div className="text-sm text-gray-600">
                        퇴근: {employee.todayRecord.check_out_time.slice(0, 5)}
                      </div>
                    )}
                    {employee.isOnline && (
                      <div className="text-sm text-green-600 font-medium">
                        근무: {employee.workingHours}
                      </div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-1">
                    {!employee.todayRecord?.check_in_time && (
                      <button
                        onClick={() => handleQuickAction(employee.id, 'check-in')}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                        title="수동 출근"
                      >
                        ✅
                      </button>
                    )}
                    {employee.isOnline && (
                      <button
                        onClick={() => handleQuickAction(employee.id, 'check-out')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="수동 퇴근"
                      >
                        🏁
                      </button>
                    )}
                    <button
                      onClick={() => handleQuickAction(employee.id, 'manual-edit')}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                      title="기록 수정"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {filteredEmployees.length}명 표시 (전체 {employees.length}명)
          </span>
          <div className="flex items-center gap-4">
            <span>🟢 출근: {employees.filter(e => e.isOnline).length}명</span>
            <span>🔵 퇴근: {employees.filter(e => e.todayRecord?.check_out_time).length}명</span>
            <span>🔴 미출근: {employees.filter(e => !e.todayRecord).length}명</span>
          </div>
        </div>
      </div>
    </div>
  );
}