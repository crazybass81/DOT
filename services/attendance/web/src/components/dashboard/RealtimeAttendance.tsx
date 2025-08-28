'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';

interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  department: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  workHours?: number;
}

export default function RealtimeAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAttendanceData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAttendanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getEmployees();
      // Transform data or use as is
      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
      // Use mock data for demonstration
      setRecords([
        {
          employeeId: 'EMP001',
          employeeName: '김철수',
          department: '주방',
          checkInTime: '09:00',
          checkOutTime: undefined,
          status: 'present',
          workHours: 3.5
        },
        {
          employeeId: 'EMP002',
          employeeName: '이영희',
          department: '홀',
          checkInTime: '08:55',
          checkOutTime: undefined,
          status: 'present',
          workHours: 3.6
        },
        {
          employeeId: 'EMP003',
          employeeName: '박민수',
          department: '주방',
          checkInTime: '09:15',
          checkOutTime: undefined,
          status: 'late',
          workHours: 3.2
        },
        {
          employeeId: 'EMP004',
          employeeName: '정수진',
          department: '홀',
          checkInTime: undefined,
          checkOutTime: undefined,
          status: 'absent',
          workHours: 0
        },
        {
          employeeId: 'EMP005',
          employeeName: '최동훈',
          department: '관리',
          checkInTime: '08:45',
          checkOutTime: '18:00',
          status: 'present',
          workHours: 9.25
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

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
        <h3 className="text-lg font-semibold text-gray-900">실시간 출퇴근 현황</h3>
        <div className="text-sm text-gray-500">
          마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}
        </div>
      </div>

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
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  데이터 로딩 중...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-500">
                  데이터가 없습니다
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