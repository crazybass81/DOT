/**
 * 직원 관리 페이지
 * GitHub 스타일 UI/UX 패턴 적용
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Phone,
  Building,
  Search,
  Filter,
  MoreHorizontal,
  Shield,
  Calendar,
  QrCode,
  Download,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { organizationService, EmployeeInvitation } from '@/lib/services/organization.service';

interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: 'worker' | 'manager' | 'admin';
  department?: string;
  position?: string;
  employee_code?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

interface InvitationWithDetails extends EmployeeInvitation {
  invited_by_user?: {
    full_name: string;
    email: string;
  };
  department?: {
    name: string;
  };
}

export default function EmployeesPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [invitations, setInvitations] = useState<InvitationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'employees' | 'invitations'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // 초대 폼 상태
  const [inviteForm, setInviteForm] = useState({
    email: '',
    phone: '',
    full_name: '',
    role: 'worker' as 'worker' | 'manager' | 'admin',
    department_id: '',
    position: '',
    employee_code: ''
  });
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 직원 목록과 초대 목록을 병렬로 가져오기
      const [employeesResponse, invitationsResponse] = await Promise.all([
        fetch(`/api/organization/${organizationId}/employees`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        }),
        fetch(`/api/organization/${organizationId}/invitations`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
      ]);

      if (!employeesResponse.ok || !invitationsResponse.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.');
      }

      const [employeesResult, invitationsResult] = await Promise.all([
        employeesResponse.json(),
        invitationsResponse.json()
      ]);

      setEmployees(employeesResult.data || []);
      setInvitations(invitationsResult.data || []);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '데이터를 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email.trim() || !inviteForm.full_name.trim()) {
      setError('이메일과 이름은 필수 입력 항목입니다.');
      return;
    }

    setIsInviting(true);
    setError(null);

    try {
      const invitationData = {
        organization_id: organizationId,
        invited_by: 'current-user-id', // 실제로는 현재 사용자 ID
        email: inviteForm.email.trim(),
        phone: inviteForm.phone.trim() || undefined,
        full_name: inviteForm.full_name.trim(),
        role: inviteForm.role,
        department_id: inviteForm.department_id || undefined,
        position: inviteForm.position.trim() || undefined,
        employee_code: inviteForm.employee_code.trim() || undefined
      };

      const invitation = await organizationService.inviteEmployee(invitationData);
      
      // 초대 목록 새로고침
      setInvitations(prev => [invitation, ...prev]);
      
      // 폼 초기화
      setInviteForm({
        email: '',
        phone: '',
        full_name: '',
        role: 'worker',
        department_id: '',
        position: '',
        employee_code: ''
      });
      
      setShowInviteModal(false);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '직원 초대에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsInviting(false);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (employee.employee_code && employee.employee_code.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = selectedRole === 'all' || employee.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return '관리자';
      case 'manager':
        return '매니저';
      case 'worker':
        return '직원';
      default:
        return role;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기 중';
      case 'accepted':
        return '수락됨';
      case 'rejected':
        return '거절됨';
      case 'expired':
        return '만료됨';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-korean">직원 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-korean">
                  직원 관리
                </h1>
                <p className="text-gray-600 font-korean">
                  조직의 직원을 관리하고 새로운 직원을 초대하세요
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-korean"
            >
              <UserPlus className="w-4 h-4" />
              <span>직원 초대</span>
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('employees')}
                className={`py-4 px-1 border-b-2 font-medium text-sm font-korean ${
                  activeTab === 'employees'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                직원 목록 ({employees.length})
              </button>
              <button
                onClick={() => setActiveTab('invitations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm font-korean ${
                  activeTab === 'invitations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                초대 현황 ({invitations.length})
                {invitations.filter(inv => inv.status === 'pending').length > 0 && (
                  <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                    {invitations.filter(inv => inv.status === 'pending').length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* 검색 및 필터 */}
          {activeTab === 'employees' && (
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="이름, 이메일, 직원코드로 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">모든 역할</option>
                  <option value="admin">관리자</option>
                  <option value="manager">매니저</option>
                  <option value="worker">직원</option>
                </select>
              </div>
            </div>
          )}

          {/* 콘텐츠 */}
          <div className="p-6">
            {activeTab === 'employees' ? (
              <div className="space-y-4">
                {filteredEmployees.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2 font-korean">
                      {searchQuery || selectedRole !== 'all' ? '검색 결과가 없습니다' : '등록된 직원이 없습니다'}
                    </h3>
                    <p className="text-gray-600 font-korean">
                      {searchQuery || selectedRole !== 'all' 
                        ? '다른 검색어나 필터를 시도해보세요' 
                        : '새로운 직원을 초대하여 시작하세요'
                      }
                    </p>
                    {!searchQuery && selectedRole === 'all' && (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-korean"
                      >
                        직원 초대하기
                      </button>
                    )}
                  </div>
                ) : (
                  filteredEmployees.map((employee) => (
                    <div key={employee.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold">
                              {employee.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 font-korean">{employee.full_name}</h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="w-3 h-3" />
                              <span>{employee.email}</span>
                              {employee.phone && (
                                <>
                                  <span>•</span>
                                  <Phone className="w-3 h-3" />
                                  <span>{employee.phone}</span>
                                </>
                              )}
                            </div>
                            {(employee.department || employee.position) && (
                              <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                                <Building className="w-3 h-3" />
                                <span className="font-korean">
                                  {employee.department && employee.position 
                                    ? `${employee.department} • ${employee.position}`
                                    : employee.department || employee.position
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs rounded-full border font-korean ${
                            employee.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            employee.role === 'manager' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-green-100 text-green-800 border-green-200'
                          }`}>
                            {getRoleLabel(employee.role)}
                          </span>
                          {employee.employee_code && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border">
                              {employee.employee_code}
                            </span>
                          )}
                          <span className={`w-2 h-2 rounded-full ${
                            employee.is_active ? 'bg-green-500' : 'bg-gray-400'
                          }`} title={employee.is_active ? '활성' : '비활성'} />
                          <button className="p-1 text-gray-400 hover:text-gray-600">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2 font-korean">
                      초대 내역이 없습니다
                    </h3>
                    <p className="text-gray-600 font-korean">
                      새로운 직원을 초대하여 조직을 확장하세요
                    </p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-korean"
                    >
                      직원 초대하기
                    </button>
                  </div>
                ) : (
                  invitations.map((invitation) => (
                    <div key={invitation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            {invitation.status === 'pending' ? (
                              <Clock className="w-5 h-5 text-yellow-600" />
                            ) : invitation.status === 'accepted' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : invitation.status === 'rejected' ? (
                              <XCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 font-korean">
                              {invitation.full_name || invitation.email}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <Mail className="w-3 h-3" />
                              <span>{invitation.email}</span>
                              {invitation.phone && (
                                <>
                                  <span>•</span>
                                  <Phone className="w-3 h-3" />
                                  <span>{invitation.phone}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                              <span className="font-korean">
                                초대일: {new Date(invitation.created_at).toLocaleDateString('ko-KR')}
                              </span>
                              <span>•</span>
                              <span className="font-korean">
                                만료일: {new Date(invitation.expires_at).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs rounded-full border font-korean ${getStatusColor(invitation.status)}`}>
                            {getStatusLabel(invitation.status)}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full border font-korean ${
                            invitation.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                            invitation.role === 'manager' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-green-100 text-green-800 border-green-200'
                          }`}>
                            {getRoleLabel(invitation.role)}
                          </span>
                          {invitation.status === 'pending' && (
                            <button
                              className="p-1 text-blue-600 hover:text-blue-800"
                              title="초대 재전송"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 직원 초대 모달 */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 font-korean">
                    직원 초대
                  </h2>
                  <button
                    onClick={() => setShowInviteModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">닫기</span>
                    ✕
                  </button>
                </div>

                <form onSubmit={handleInviteEmployee} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                      이메일 *
                    </label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="직원의 이메일을 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                      이름 *
                    </label>
                    <input
                      type="text"
                      value={inviteForm.full_name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="직원의 이름을 입력하세요"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                      전화번호
                    </label>
                    <input
                      type="tel"
                      value={inviteForm.phone}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="전화번호 (선택사항)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                        역할
                      </label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="worker">직원</option>
                        <option value="manager">매니저</option>
                        <option value="admin">관리자</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                        직원코드
                      </label>
                      <input
                        type="text"
                        value={inviteForm.employee_code}
                        onChange={(e) => setInviteForm(prev => ({ ...prev, employee_code: e.target.value }))}
                        placeholder="EMP001"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                      직책
                    </label>
                    <input
                      type="text"
                      value={inviteForm.position}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="예: 대리, 과장"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {error && (
                    <div className="text-red-600 text-sm font-korean">{error}</div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-korean"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-korean"
                    >
                      {isInviting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>초대 중...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>초대 보내기</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}