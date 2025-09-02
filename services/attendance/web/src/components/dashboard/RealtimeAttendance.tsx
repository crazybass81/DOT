'use client';

import { useState, useCallback } from 'react';
import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance';
import { ConnectionState } from '@/lib/realtime';
import { AttendanceStatus } from '@/lib/database/models/attendance.model';

interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  workHours?: number;
}

interface RealtimeAttendanceProps {
  organizationId: string;
  onNotification?: (notification: any) => void;
}

export default function RealtimeAttendance({ 
  organizationId, 
  onNotification 
}: RealtimeAttendanceProps) {
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Use realtime attendance hook
  const {
    data,
    connectionState,
    isConnected,
    isReconnecting,
    error,
    recentEvents,
    refreshData,
    clearRecentEvents,
    reconnect,
    getEmployeeStatus,
    getTodayRecord
  } = useRealtimeAttendance({
    organizationId,
    debounceMs: 500,
    enableNotifications: true,
    onNotification,
    autoReconnect: true
  });

  // Transform realtime data to display format
  const transformRecords = useCallback((): AttendanceRecord[] => {
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = data.records.filter(record => record.date === today);
    
    return todayRecords.map(record => ({
      employeeId: record.employeeId,
      employeeName: record.employeeId, // TODO: Get actual employee names
      department: record.departmentId || 'Unknown',
      checkInTime: record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : undefined,
      checkOutTime: record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : undefined,
      status: mapAttendanceStatus(record.status),
      workHours: record.actualWorkHours || 0
    }));
  }, [data.records]);

  // Map attendance status to display status
  const mapAttendanceStatus = (status: AttendanceStatus): 'present' | 'absent' | 'late' | 'leave' => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'present';
      case AttendanceStatus.LATE:
        return 'late';
      case AttendanceStatus.ABSENT:
        return 'absent';
      case AttendanceStatus.SICK_LEAVE:
      case AttendanceStatus.VACATION:
        return 'leave';
      default:
        return 'absent';
    }
  };

  const records = transformRecords();

  const filteredRecords = records
    .filter(record => {
      if (filter === 'all') return true;
      if (filter === 'present') return record.status === 'present' || record.status === 'late';
      if (filter === 'absent') return record.status === 'absent';
      return true;
    })
    .filter(record =>
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">출근</span>;
      case 'late':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">지각</span>;
      case 'absent':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">결근</span>;
      case 'leave':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">휴가</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">실시간 출퇴근 현황</h3>
          {/* Connection Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 
              isReconnecting ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`} />
            <span className="text-xs text-gray-500">
              {isConnected ? '연결됨' : isReconnecting ? '재연결 중...' : '연결 끊김'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Recent Events Count */}
          {recentEvents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600">
                최근 업데이트 {recentEvents.length}건
              </span>
              <button
                onClick={clearRecentEvents}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                지우기
              </button>
            </div>
          )}
          
          {/* Refresh Button */}
          <button
            onClick={refreshData}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
            disabled={isReconnecting}
          >
            {isReconnecting ? '연결 중...' : '새로고침'}
          </button>
          
          <div className="text-sm text-gray-500">
            마지막 업데이트: {data.lastUpdated.toLocaleTimeString('ko-KR')}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={reconnect}
              className="text-sm text-red-600 hover:text-red-800 underline"
            >
              재연결
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            전체 ({records.length})
          </button>
          <button
            onClick={() => setFilter('present')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === 'present'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            출근 ({records.filter(r => r.status === 'present' || r.status === 'late').length})
          </button>
          <button
            onClick={() => setFilter('absent')}
            className={`px-3 py-1 rounded-lg text-sm ${
              filter === 'absent'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            결근 ({records.filter(r => r.status === 'absent').length})
          </button>
        </div>
        <input
          type="text"
          placeholder="이름 또는 부서 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">직원</th>
              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">부서</th>
              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">출근시간</th>
              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">퇴근시간</th>
              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">근무시간</th>
              <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">상태</th>
            </tr>
          </thead>
          <tbody>
            {!isConnected && connectionState !== ConnectionState.RECONNECTING ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-red-500">
                  실시간 연결이 끊어졌습니다. 재연결을 시도하세요.
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  {isReconnecting ? '데이터 동기화 중...' : '출퇴근 기록이 없습니다'}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.employeeId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{record.employeeName}</div>
                      <div className="text-xs text-gray-500">{record.employeeId}</div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">{record.department}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {record.checkInTime || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {record.checkOutTime || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {record.workHours ? `${record.workHours}시간` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {getStatusBadge(record.status)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}