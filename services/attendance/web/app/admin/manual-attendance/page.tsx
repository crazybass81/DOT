'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { unifiedAuthService } from '@/services/unifiedAuthService';
import { userService } from '@/services/userService';

interface Employee {
  id: string;
  name: string;
  department: string;
  status: 'not_checked' | 'checked_in' | 'checked_out';
  checkInTime?: string;
  checkOutTime?: string;
}

export default function ManualAttendancePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [attendanceTime, setAttendanceTime] = useState('');
  const [attendanceType, setAttendanceType] = useState<'check_in' | 'check_out'>('check_in');
  const [reason, setReason] = useState('');

  useEffect(() => {
    // Check admin authentication
    if (!await unifiedAuthService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = userService.getCurrentUser();
    if (!user || !userService.isAdmin()) {
      alert('관리자 권한이 필요합니다');
      router.push('/');
      return;
    }

    loadEmployees();
  }, [router, selectedDate]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      // TODO: API 호출로 직원 목록 가져오기
      const mockEmployees: Employee[] = [
        {
          id: 'emp-001',
          name: '김철수',
          department: '주방',
          status: 'checked_in',
          checkInTime: '09:00'
        },
        {
          id: 'emp-002',
          name: '이영희',
          department: '홀',
          status: 'not_checked'
        },
        {
          id: 'emp-003',
          name: '박민수',
          department: '주방',
          status: 'checked_out',
          checkInTime: '09:05',
          checkOutTime: '18:00'
        },
        {
          id: 'emp-004',
          name: '정수진',
          department: '홀',
          status: 'checked_in',
          checkInTime: '08:55'
        },
        {
          id: 'emp-005',
          name: '최동욱',
          department: '배달',
          status: 'not_checked'
        }
      ];
      setEmployees(mockEmployees);
    } catch (error) {
      console.error('Failed to load employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAttendanceModal = (employee: Employee, type: 'check_in' | 'check_out') => {
    setSelectedEmployee(employee);
    setAttendanceType(type);
    setAttendanceTime(new Date().toTimeString().slice(0, 5));
    setReason('');
    setShowModal(true);
  };

  const handleManualAttendance = async () => {
    if (!selectedEmployee || !attendanceTime || !reason) {
      alert('모든 필수 정보를 입력해주세요');
      return;
    }

    try {
      setLoading(true);
      
      // TODO: API 호출로 수동 출퇴근 처리
      console.log('Manual attendance:', {
        employeeId: selectedEmployee.id,
        type: attendanceType,
        time: attendanceTime,
        date: selectedDate,
        reason: reason,
        approvedBy: userService.getCurrentUser()?.id
      });

      // 로컬 상태 업데이트
      setEmployees(prev => prev.map(emp => {
        if (emp.id === selectedEmployee.id) {
          if (attendanceType === 'check_in') {
            return { ...emp, status: 'checked_in', checkInTime: attendanceTime };
          } else {
            return { ...emp, status: 'checked_out', checkOutTime: attendanceTime };
          }
        }
        return emp;
      }));

      setShowModal(false);
      alert(`${selectedEmployee.name}님의 ${attendanceType === 'check_in' ? '출근' : '퇴근'}이 수동으로 처리되었습니다.`);
    } catch (error) {
      console.error('Manual attendance error:', error);
      alert('처리 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: Employee['status']) => {
    switch (status) {
      case 'checked_in':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">출근</span>;
      case 'checked_out':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">퇴근</span>;
      default:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">미출근</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">수동 출퇴근 관리</h1>
              <p className="text-sm text-gray-500 mt-1">관리자가 직접 출퇴근을 확인하고 처리합니다</p>
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">날짜 선택:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <button
              onClick={loadEmployees}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">직원 목록</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">직원</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">부서</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">상태</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">출근 시간</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">퇴근 시간</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">수동 처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                        <div className="text-xs text-gray-500">ID: {employee.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{employee.department}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(employee.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {employee.checkInTime || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="text-sm text-gray-900">
                          {employee.checkOutTime || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          {employee.status === 'not_checked' && (
                            <button
                              onClick={() => openAttendanceModal(employee, 'check_in')}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                            >
                              출근 처리
                            </button>
                          )}
                          {employee.status === 'checked_in' && (
                            <button
                              onClick={() => openAttendanceModal(employee, 'check_out')}
                              className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                            >
                              퇴근 처리
                            </button>
                          )}
                          {employee.status === 'checked_out' && (
                            <span className="text-xs text-gray-500">완료</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Notice */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>⚠️ 주의사항:</strong> 수동 출퇴근 처리는 특별한 사유가 있을 때만 사용해주세요.
            모든 수동 처리 기록은 시스템에 저장됩니다.
          </p>
        </div>
      </main>

      {/* Modal */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              수동 {attendanceType === 'check_in' ? '출근' : '퇴근'} 처리
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">직원</label>
                <p className="text-sm text-gray-900">{selectedEmployee.name} ({selectedEmployee.department})</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {attendanceType === 'check_in' ? '출근' : '퇴근'} 시간 <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={attendanceTime}
                  onChange={(e) => setAttendanceTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="수동 처리 사유를 입력하세요 (예: QR 장비 고장, 긴급 호출 등)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-600">
                  <strong>처리자:</strong> {userService.getCurrentUser()?.name}<br />
                  <strong>처리일시:</strong> {new Date().toLocaleString('ko-KR')}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleManualAttendance}
                disabled={loading || !reason}
                className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? '처리 중...' : '확인'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}