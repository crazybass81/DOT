'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cognitoAuthService } from '@/services/cognitoAuthService';
import { userService } from '@/services/userService';

interface PendingUser {
  userId: string;
  name: string;
  phone: string;
  birthDate: string;
  accountNumber?: string;
  businessId: string;
  locationId: string;
  requestedAt: string;
  deviceFingerprint: string;
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

export default function ApprovalsPage() {
  const router = useRouter();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails>({
    contractType: 'FULL_TIME',
    workSchedule: '09:00-18:00',
    startDate: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    // Check auth and admin rights
    if (!cognitoAuthService.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const user = userService.getCurrentUser();
    if (!user || (!userService.isAdmin() && !userService.isBusinessAdmin())) {
      alert('관리자 권한이 필요합니다');
      router.push('/attendance');
      return;
    }

    fetchPendingUsers();
  }, [router]);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      const mockData: PendingUser[] = [
        {
          userId: '1',
          name: '김철수',
          phone: '010-1234-5678',
          birthDate: '1990-01-01',
          accountNumber: '국민은행 123-456-789',
          businessId: 'biz-001',
          locationId: 'loc-001',
          requestedAt: new Date().toISOString(),
          deviceFingerprint: 'device-001'
        },
        {
          userId: '2',
          name: '이영희',
          phone: '010-9876-5432',
          birthDate: '1995-05-15',
          businessId: 'biz-001',
          locationId: 'loc-001',
          requestedAt: new Date(Date.now() - 86400000).toISOString(),
          deviceFingerprint: 'device-002'
        }
      ];
      setPendingUsers(mockData);
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (user: PendingUser) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleReject = async (userId: string) => {
    if (!confirm('정말 거부하시겠습니까?')) return;

    try {
      // TODO: API call to reject user
      console.log('Rejecting user:', userId);
      
      // Remove from list
      setPendingUsers(prev => prev.filter(u => u.userId !== userId));
      alert('등록이 거부되었습니다');
    } catch (error) {
      console.error('Failed to reject user:', error);
      alert('거부 처리 중 오류가 발생했습니다');
    }
  };

  const handleFinalApprove = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      // TODO: API call to approve user with employee details
      console.log('Approving user:', selectedUser.userId, employeeDetails);
      
      // Remove from pending list
      setPendingUsers(prev => prev.filter(u => u.userId !== selectedUser.userId));
      setShowDetailsModal(false);
      setSelectedUser(null);
      alert(`${selectedUser.name}님의 등록이 승인되었습니다`);
    } catch (error) {
      console.error('Failed to approve user:', error);
      alert('승인 처리 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">직원 등록 승인</h1>
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
        {loading && !showDetailsModal ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">승인 대기 중인 직원이 없습니다</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg font-medium text-gray-900">
                승인 대기 ({pendingUsers.length}명)
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {pendingUsers.map((user) => (
                  <li key={user.userId} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {user.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {user.phone}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              생년월일: {user.birthDate}
                            </p>
                            <p className="text-xs text-gray-500">
                              신청일: {formatDate(user.requestedAt)}
                            </p>
                          </div>
                        </div>
                        {user.accountNumber && (
                          <p className="mt-2 text-sm text-gray-600">
                            계좌: {user.accountNumber}
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex gap-2">
                        <button
                          onClick={() => handleApprove(user)}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                        >
                          승인
                        </button>
                        <button
                          onClick={() => handleReject(user.userId)}
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                        >
                          거부
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Employee Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">직원 상세 정보 입력</h2>
            <p className="text-sm text-gray-600 mb-4">
              {selectedUser.name}님의 근무 정보를 입력해주세요
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

              {/* Salary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  급여 (선택)
                </label>
                <input
                  type="number"
                  value={employeeDetails.salary || ''}
                  onChange={(e) => setEmployeeDetails({
                    ...employeeDetails,
                    salary: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="월급여 (원)"
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

              {/* End Date (for contract) */}
              {employeeDetails.contractType === 'CONTRACT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    계약 종료일
                  </label>
                  <input
                    type="date"
                    value={employeeDetails.endDate || ''}
                    onChange={(e) => setEmployeeDetails({
                      ...employeeDetails,
                      endDate: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleFinalApprove}
                disabled={loading}
                className="flex-1 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {loading ? '처리 중...' : '승인 완료'}
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedUser(null);
                }}
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