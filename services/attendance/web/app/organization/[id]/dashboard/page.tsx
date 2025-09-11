/**
 * 조직 관리 대시보드 페이지
 * GitHub 스타일 UI/UX 패턴 적용
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  MapPin, 
  FileText,
  Settings,
  Plus,
  QrCode,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  UserPlus,
  Mail
} from 'lucide-react';
import { Organization } from '@/lib/services/organization.service';
import BusinessRegistrationUpload from '@/components/organization/BusinessRegistrationUpload';

interface OrganizationStats {
  employees: number;
  departments: number;
  pending_invitations: number;
  locations: number;
}

interface OrganizationData extends Organization {
  stats: OrganizationStats;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: number;
  status?: 'pending' | 'completed' | 'warning';
}

export default function OrganizationDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBusinessRegistration, setShowBusinessRegistration] = useState(false);

  useEffect(() => {
    fetchOrganizationData();
  }, [organizationId]);

  const fetchOrganizationData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/organization/${organizationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('조직을 찾을 수 없습니다.');
        } else if (response.status === 403) {
          throw new Error('조직에 대한 접근 권한이 없습니다.');
        }
        throw new Error('조직 정보를 불러오는데 실패했습니다.');
      }

      const result = await response.json();
      setOrganization(result.data);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '조직 정보를 불러오는데 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBusinessRegistrationUpload = () => {
    setShowBusinessRegistration(false);
    fetchOrganizationData(); // 데이터 새로고침
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-korean">조직 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 font-korean">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-korean"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!organization) return null;

  const quickActions: QuickAction[] = [
    {
      id: 'invite-employees',
      title: '직원 초대',
      description: '새로운 직원을 조직에 초대하세요',
      icon: <UserPlus className="w-6 h-6" />,
      href: `/organization/${organizationId}/employees/invite`,
      badge: organization.stats.pending_invitations,
      status: organization.stats.pending_invitations > 0 ? 'pending' : undefined
    },
    {
      id: 'manage-locations',
      title: '위치 관리',
      description: '사업장 위치를 추가하거나 수정하세요',
      icon: <MapPin className="w-6 h-6" />,
      href: `/organization/${organizationId}/locations`,
      badge: organization.stats.locations
    },
    {
      id: 'qr-code',
      title: 'QR 코드',
      description: '출퇴근용 QR 코드를 생성하고 관리하세요',
      icon: <QrCode className="w-6 h-6" />,
      href: `/organization/${organizationId}/qr-code`
    },
    {
      id: 'business-registration',
      title: '사업자등록증',
      description: '사업자등록증을 업로드하고 관리하세요',
      icon: <FileText className="w-6 h-6" />,
      href: '#',
      status: organization.business_registration_status === 'pending' ? 'pending' : 
             organization.business_registration_status === 'approved' ? 'completed' : 'warning'
    }
  ];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending':
        return '검토 중';
      case 'approved':
        return '승인됨';
      case 'rejected':
        return '거절됨';
      default:
        return '미등록';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 font-korean">
                  {organization.name}
                </h1>
                <p className="text-gray-600 font-korean">
                  조직 관리 대시보드
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full border font-korean ${getStatusColor(organization.business_registration_status)}`}>
                    사업자등록증 {getStatusLabel(organization.business_registration_status)}
                  </span>
                  {organization.invitation_code && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200 font-korean">
                      초대코드: {organization.invitation_code}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => router.push(`/organization/${organizationId}/settings`)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-korean"
            >
              <Settings className="w-4 h-4" />
              <span>설정</span>
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 font-korean">전체 직원</p>
                <p className="text-2xl font-bold text-gray-900">{organization.stats.employees}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-green-600 font-korean">활성 사용자</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 font-korean">부서</p>
                <p className="text-2xl font-bold text-gray-900">{organization.stats.departments}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-gray-500 font-korean">등록된 부서</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 font-korean">사업장</p>
                <p className="text-2xl font-bold text-gray-900">{organization.stats.locations}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-gray-500 font-korean">등록된 위치</span>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 font-korean">대기 중인 초대</p>
                <p className="text-2xl font-bold text-gray-900">{organization.stats.pending_invitations}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-xs text-yellow-600 font-korean">처리 대기</span>
            </div>
          </div>
        </div>

        {/* 빠른 작업 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 font-korean">
              빠른 작업
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <div
                key={action.id}
                className="relative group cursor-pointer"
                onClick={() => {
                  if (action.id === 'business-registration') {
                    setShowBusinessRegistration(true);
                  } else {
                    router.push(action.href);
                  }
                }}
              >
                <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      action.status === 'pending' ? 'bg-yellow-100' :
                      action.status === 'completed' ? 'bg-green-100' :
                      action.status === 'warning' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      <div className={`${
                        action.status === 'pending' ? 'text-yellow-600' :
                        action.status === 'completed' ? 'text-green-600' :
                        action.status === 'warning' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {action.icon}
                      </div>
                    </div>
                    {action.badge !== undefined && action.badge > 0 && (
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1 font-korean">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 font-korean">
                    {action.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 조직 정보 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-korean">
              조직 정보
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 font-korean">조직 유형:</span>
                <span className="text-gray-900 font-korean">{organization.type}</span>
              </div>
              {organization.business_registration_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600 font-korean">사업자등록번호:</span>
                  <span className="text-gray-900">{organization.business_registration_number}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 font-korean">생성일:</span>
                <span className="text-gray-900">
                  {new Date(organization.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-korean">출퇴근 허용 반경:</span>
                <span className="text-gray-900">{organization.attendance_radius_meters}m</span>
              </div>
              {organization.primary_location && (
                <div>
                  <span className="text-gray-600 font-korean">주 사업장:</span>
                  <p className="text-gray-900 text-sm mt-1 font-korean">
                    {organization.primary_location.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 근무 정책 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 font-korean">
              근무 정책
            </h3>
            {organization.work_hours_policy ? (
              <div className="space-y-3">
                {Object.entries(organization.work_hours_policy).map(([day, hours]) => {
                  if (day === 'flexible_hours' || day === 'core_hours') return null;
                  
                  const dayLabels: Record<string, string> = {
                    monday: '월요일',
                    tuesday: '화요일',
                    wednesday: '수요일',
                    thursday: '목요일',
                    friday: '금요일',
                    saturday: '토요일',
                    sunday: '일요일'
                  };

                  if (typeof hours === 'object' && 'enabled' in hours) {
                    return (
                      <div key={day} className="flex justify-between text-sm">
                        <span className="text-gray-600 font-korean">{dayLabels[day]}:</span>
                        <span className={`${hours.enabled ? 'text-gray-900' : 'text-gray-400'} font-korean`}>
                          {hours.enabled ? `${hours.start} - ${hours.end}` : '휴무'}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
                
                {organization.break_time_policy?.lunch_break && (
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 font-korean">점심시간:</span>
                      <span className="text-gray-900 font-korean">
                        {organization.break_time_policy.lunch_break.start_time} - {organization.break_time_policy.lunch_break.end_time}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm font-korean">
                근무 정책이 설정되지 않았습니다.
              </p>
            )}
          </div>
        </div>

        {/* 사업자등록증 업로드 모달 */}
        {showBusinessRegistration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 font-korean">
                    사업자등록증 업로드
                  </h2>
                  <button
                    onClick={() => setShowBusinessRegistration(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">닫기</span>
                    ✕
                  </button>
                </div>
                <BusinessRegistrationUpload
                  organizationId={organizationId}
                  onUploadSuccess={handleBusinessRegistrationUpload}
                  onUploadError={(error) => {
                    console.error('Business registration upload error:', error);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}