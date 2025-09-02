import React, { useState, useCallback } from 'react';
import { useRealtimeApprovals, ApprovalStatus } from '@/hooks/useRealtimeApprovals';
import { Employee } from '@/lib/supabase-config';

interface RealtimeApprovalsProps {
  organizationId: string;
  onNotification?: (notification: any) => void;
}

interface EmployeeDetails {
  contractType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT';
  salary?: number;
  workSchedule: string;
  department?: string;
  position?: string;
  startDate: string;
  endDate?: string;
}

const RealtimeApprovals: React.FC<RealtimeApprovalsProps> = ({
  organizationId,
  onNotification
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails>({
    contractType: 'FULL_TIME',
    workSchedule: '09:00-18:00',
    startDate: new Date().toISOString().split('T')[0]
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Use realtime approvals hook
  const {
    data,
    connectionState,
    isConnected,
    error,
    recentEvents,
    refreshData,
    clearRecentEvents,
    reconnect,
    getPendingEmployees,
    getEmployeesByStatus,
    getEmployeeById
  } = useRealtimeApprovals({
    organizationId,
    debounceMs: 300,
    enableNotifications: true,
    onNotification,
    onApprovalChange: (event) => {
      console.log('Approval changed:', event);
      
      // Show specific notification for approval changes
      if (onNotification) {
        const message = `${event.employee.name}님이 ${event.newStatus.toLowerCase()}되었습니다`;
        onNotification({
          type: 'approval_update',
          title: '승인 상태 변경',
          message,
          priority: event.newStatus === 'APPROVED' ? 'medium' : 'high',
          data: event
        });
      }
    },
    autoReconnect: true
  });

  const pendingEmployees = getPendingEmployees();

  const handleApprove = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setEmployeeDetails(prev => ({
      ...prev,
      department: employee.department_id || '',
      position: employee.position_id || ''
    }));
    setShowDetailsModal(true);
  }, []);

  const handleReject = useCallback(async (employeeId: string) => {
    const employee = getEmployeeById(employeeId);
    if (!employee) return;

    const reason = prompt(`${employee.name}님의 등록을 거부하는 이유를 입력하세요:`);
    if (!reason) return;

    if (!confirm(`정말 ${employee.name}님의 등록을 거부하시겠습니까?`)) return;

    try {
      setProcessing(true);
      
      // TODO: API call to reject employee
      console.log('Rejecting employee:', employeeId, 'Reason:', reason);
      
      // Show success notification
      if (onNotification) {
        onNotification({
          type: 'approval_update',
          title: '등록 거부 완료',
          message: `${employee.name}님의 등록이 거부되었습니다`,
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Failed to reject employee:', error);
      if (onNotification) {
        onNotification({
          type: 'system_update',
          title: '오류 발생',
          message: '거부 처리 중 오류가 발생했습니다',
          priority: 'high'
        });
      }
    } finally {
      setProcessing(false);
    }
  }, [getEmployeeById, onNotification]);

  const handleFinalApprove = useCallback(async () => {
    if (!selectedEmployee) return;

    try {
      setProcessing(true);
      
      // TODO: API call to approve employee with details
      console.log('Approving employee:', selectedEmployee.id, employeeDetails);
      
      setShowDetailsModal(false);
      setSelectedEmployee(null);
      
      // Show success notification
      if (onNotification) {
        onNotification({
          type: 'approval_update',
          title: '승인 완료',
          message: `${selectedEmployee.name}님의 등록이 승인되었습니다`,
          priority: 'medium'
        });
      }
    } catch (error) {
      console.error('Failed to approve employee:', error);
      if (onNotification) {
        onNotification({
          type: 'system_update',
          title: '오류 발생',
          message: '승인 처리 중 오류가 발생했습니다',
          priority: 'high'
        });
      }
    } finally {
      setProcessing(false);
    }
  }, [selectedEmployee, employeeDetails, onNotification]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getStatusBadge = useCallback((status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">대기중</span>;
      case 'APPROVED':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">승인됨</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">거부됨</span>;
      case 'SUSPENDED':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">정지됨</span>;
      default:
        return null;
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header with Status */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">직원 등록 승인</h2>
          
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-xs text-gray-500">실시간</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Recent Events */}
          {recentEvents.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-600">
                최근 변경 {recentEvents.length}건
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
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">승인 대기</p>
              <p className="text-2xl font-bold text-yellow-600">{data.stats.totalPending}</p>
            </div>
            <span className="text-2xl">⏳</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">승인 완료</p>
              <p className="text-2xl font-bold text-green-600">{data.stats.totalApproved}</p>
            </div>
            <span className="text-2xl">✅</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">거부됨</p>
              <p className="text-2xl font-bold text-red-600">{data.stats.totalRejected}</p>
            </div>
            <span className="text-2xl">❌</span>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">평균 처리시간</p>
              <p className="text-2xl font-bold text-blue-600">{data.stats.averageProcessingTime}h</p>
            </div>
            <span className="text-2xl">⚡</span>
          </div>
        </div>
      </div>

      {/* Pending Approvals List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">
            승인 대기 ({pendingEmployees.length}명)
          </h3>
        </div>
        
        {pendingEmployees.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">승인 대기 중인 직원이 없습니다</p>
          </div>
        ) : (
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {pendingEmployees.map((employee) => (
                <li key={employee.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {employee.email}
                          </p>
                          {employee.phone && (
                            <p className="text-sm text-gray-500">
                              {employee.phone}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="mb-1">
                            {getStatusBadge(employee.approval_status)}
                          </div>
                          <p className="text-xs text-gray-500">
                            신청일: {formatDate(employee.created_at)}
                          </p>
                        </div>
                      </div>
                      {employee.employee_code && (
                        <p className="mt-2 text-sm text-gray-600">
                          사번: {employee.employee_code}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => handleApprove(employee)}
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-gray-400"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => handleReject(employee.id)}
                        disabled={processing}
                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:bg-gray-400"
                      >
                        거부
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Employee Details Modal */}
      {showDetailsModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">직원 상세 정보 입력</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedEmployee.name}님의 근무 정보를 입력해주세요
            </p>

            <div className="space-y-4">
              {/* Contract Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  계약 형태
                </label>
                <select
                  value={employeeDetails.contractType}
                  onChange={(e) => setEmployeeDetails({
                    ...employeeDetails,
                    contractType: e.target.value as EmployeeDetails['contractType']
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="FULL_TIME">정규직</option>
                  <option value="PART_TIME">파트타임</option>
                  <option value="CONTRACT">계약직</option>
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  부서
                </label>
                <input
                  type="text"
                  value={employeeDetails.department || ''}
                  onChange={(e) => setEmployeeDetails({
                    ...employeeDetails,
                    department: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="예: 영업팀"
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  직급
                </label>
                <input
                  type="text"
                  value={employeeDetails.position || ''}
                  onChange={(e) => setEmployeeDetails({
                    ...employeeDetails,
                    position: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="예: 대리"
                />
              </div>

              {/* Work Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  근무 시간
                </label>
                <input
                  type="text"
                  value={employeeDetails.workSchedule}
                  onChange={(e) => setEmployeeDetails({
                    ...employeeDetails,
                    workSchedule: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="예: 09:00-18:00"
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  입사일
                </label>
                <input
                  type="date"
                  value={employeeDetails.startDate}
                  onChange={(e) => setEmployeeDetails({
                    ...employeeDetails,
                    startDate: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleFinalApprove}
                disabled={processing}
                className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {processing ? '처리 중...' : '승인 완료'}
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedEmployee(null);
                }}
                disabled={processing}
                className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeApprovals;