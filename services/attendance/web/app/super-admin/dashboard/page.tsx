'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { multiRoleAuthService } from "@/src/services/multiRoleAuthService";
import { userService } from '@/src/services/userService';

interface BusinessStats {
  businessId: string;
  businessName: string;
  totalEmployees: number;
  activeEmployees: number;
  checkedInToday: number;
  pendingApprovals: number;
  lastActivity: string;
}

interface SystemMetrics {
  totalBusinesses: number;
  totalUsers: number;
  activeToday: number;
  newRegistrations: number;
  systemHealth: 'healthy' | 'warning' | 'error';
  serverLoad: number;
  apiResponseTime: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessStats[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalBusinesses: 0,
    totalUsers: 0,
    activeToday: 0,
    newRegistrations: 0,
    systemHealth: 'healthy',
    serverLoad: 0,
    apiResponseTime: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');

  useEffect(() => {
    // Check super admin authentication  
    const checkAuth = async () => {
      // TODO: Implement proper auth check
      // if (!await unifiedAuthService.isAuthenticated()) {
      //   router.push('/login');
      //   return;
      // }
    };
    
    checkAuth();

    const user = userService.getCurrentUser();
    if (!user || !userService.isSuperAdmin()) {
      alert('서비스 관리자 권한이 필요합니다');
      router.push('/');
      return;
    }

    fetchDashboardData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // TODO: Replace with actual API calls
      const mockBusinesses: BusinessStats[] = [
        {
          businessId: 'biz-001',
          businessName: '테크놀로지 컴퍼니',
          totalEmployees: 45,
          activeEmployees: 42,
          checkedInToday: 38,
          pendingApprovals: 2,
          lastActivity: new Date().toISOString()
        },
        {
          businessId: 'biz-002',
          businessName: '스타트업 허브',
          totalEmployees: 23,
          activeEmployees: 20,
          checkedInToday: 18,
          pendingApprovals: 1,
          lastActivity: new Date(Date.now() - 300000).toISOString()
        },
        {
          businessId: 'biz-003',
          businessName: '디자인 스튜디오',
          totalEmployees: 15,
          activeEmployees: 15,
          checkedInToday: 12,
          pendingApprovals: 0,
          lastActivity: new Date(Date.now() - 600000).toISOString()
        }
      ];

      const mockMetrics: SystemMetrics = {
        totalBusinesses: 3,
        totalUsers: 83,
        activeToday: 68,
        newRegistrations: 5,
        systemHealth: 'healthy',
        serverLoad: 35,
        apiResponseTime: 120
      };

      setBusinesses(mockBusinesses);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatLastActivity = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    
    return `${Math.floor(hours / 24)}일 전`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">서비스 관리자 대시보드</h1>
              <p className="text-sm text-gray-500 mt-1">전체 시스템 모니터링 및 관리</p>
            </div>
            <div className="flex gap-4">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="today">오늘</option>
                <option value="week">이번 주</option>
                <option value="month">이번 달</option>
              </select>
              <button
                onClick={() => await unifiedAuthService.signOut()}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* System Health Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">시스템 상태:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getHealthColor(metrics.systemHealth)}`}>
                  {metrics.systemHealth === 'healthy' ? '정상' : metrics.systemHealth === 'warning' ? '주의' : '오류'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">서버 부하:</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${metrics.serverLoad > 70 ? 'bg-red-500' : metrics.serverLoad > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${metrics.serverLoad}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{metrics.serverLoad}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">API 응답:</span>
                <span className={`text-sm font-medium ${metrics.apiResponseTime > 500 ? 'text-red-600' : metrics.apiResponseTime > 200 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {metrics.apiResponseTime}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">전체 사업장</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.totalBusinesses}</p>
                  </div>
                  <div className="text-3xl">🏢</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">전체 사용자</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
                  </div>
                  <div className="text-3xl">👥</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">오늘 활성</p>
                    <p className="text-3xl font-bold text-green-600">{metrics.activeToday}</p>
                  </div>
                  <div className="text-3xl">✅</div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">신규 등록</p>
                    <p className="text-3xl font-bold text-blue-600">{metrics.newRegistrations}</p>
                  </div>
                  <div className="text-3xl">🆕</div>
                </div>
              </div>
            </div>

            {/* Business List */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">사업장 현황</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        사업장명
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        전체 직원
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        활성 직원
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        오늘 출근
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        승인 대기
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        마지막 활동
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        작업
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {businesses.map((business) => (
                      <tr key={business.businessId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {business.businessName}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {business.businessId}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900">{business.totalEmployees}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900">{business.activeEmployees}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center">
                            <span className="text-sm font-medium text-green-600">
                              {business.checkedInToday}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">
                              ({Math.round((business.checkedInToday / business.activeEmployees) * 100)}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {business.pendingApprovals > 0 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              {business.pendingApprovals}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-xs text-gray-500">
                            {formatLastActivity(business.lastActivity)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => router.push(`/super-admin/business/${business.businessId}`)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            상세보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <button className="p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <h3 className="font-semibold text-gray-900">시스템 설정</h3>
                <p className="text-sm text-gray-600 mt-1">전체 시스템 구성 관리</p>
              </button>
              <button className="p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <h3 className="font-semibold text-gray-900">사용량 분석</h3>
                <p className="text-sm text-gray-600 mt-1">상세 사용 통계 및 분석</p>
              </button>
              <button className="p-6 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                <h3 className="font-semibold text-gray-900">시스템 로그</h3>
                <p className="text-sm text-gray-600 mt-1">시스템 이벤트 및 오류 로그</p>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}