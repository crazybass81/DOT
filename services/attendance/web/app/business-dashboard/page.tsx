'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import { Card, Button, Tabs } from '@/components/ui';
import { Building2, Users, BarChart3, Settings, LogOut, UserPlus, Clock, Calendar, TrendingUp } from 'lucide-react';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department?: string;
  is_active: boolean;
  created_at: string;
}

interface Organization {
  id: string;
  name: string;
  metadata?: any;
  biz_type?: string;
}

interface DashboardData {
  employees: Employee[];
  organization: Organization | null;
  stats: {
    totalEmployees: number;
    activeToday: number;
    onTime: number;
    late: number;
  };
}

export default function BusinessDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    employees: [],
    organization: null,
    stats: {
      totalEmployees: 0,
      activeToday: 0,
      onTime: 0,
      late: 0
    }
  });
  const [activeTab, setActiveTab] = useState('개요');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const currentUser = await supabaseAuthService.getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      // Get employee info with organization
      const { data: employee } = await supabaseAuthService.supabase
        .from('employees')
        .select('*, organization:organizations(*)')
        .eq('user_id', currentUser.id)
        .single();

      if (!employee) {
        console.error('Employee 정보 없음');
        router.push('/login');
        return;
      }

      // 권한 확인 (owner 또는 admin만 접근 가능)
      if (employee.position !== 'owner' && employee.position !== 'admin') {
        router.push('/worker-dashboard');
        return;
      }

      // Get all employees in the organization
      let employees: Employee[] = [];
      if (employee.organization_id) {
        const { data } = await supabaseAuthService.supabase
          .from('employees')
          .select('*')
          .eq('organization_id', employee.organization_id)
          .order('created_at', { ascending: false });
        employees = data || [];
      }

      setDashboardData({
        employees,
        organization: employee.organization || null,
        stats: {
          totalEmployees: employees.length,
          activeToday: Math.floor(employees.length * 0.8), // Mock data
          onTime: Math.floor(employees.length * 0.6),
          late: Math.floor(employees.length * 0.2)
        }
      });
    } catch (error) {
      console.error('Dashboard data loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseAuthService.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Blob Animations */}
      <div className="absolute inset-0 z-0">
        <div className="blob blob-admin-1"></div>
        <div className="blob blob-admin-2"></div>
        <div className="blob blob-admin-3"></div>
        <div className="blob blob-admin-4"></div>
        <div className="blob blob-admin-5"></div>
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-sm border-b border-white/30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {dashboardData.organization?.name || 'DOT 사업자 대시보드'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {(() => {
                      const type = dashboardData.organization?.biz_type || dashboardData.organization?.metadata?.business_type;
                      if (type === 'CORP' || type === 'corporation') return '법인사업자';
                      if (type === 'FRANCHISE') return '가맹본부';
                      return '개인사업자';
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <Button onClick={handleLogout} variant="secondary" size="sm">
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white/50 backdrop-blur-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Tabs 
              tabs={['개요', '직원관리', '출퇴근', '통계', '설정']} 
              activeTab={activeTab} 
              onTabChange={setActiveTab} 
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!dashboardData.organization ? (
            <Card className="bg-yellow-50 border-yellow-200">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                조직 설정 필요
              </h2>
              <p className="text-yellow-700 mb-4">
                아직 조직이 설정되지 않았습니다. 사업자 정보를 등록해주세요.
              </p>
              <Button onClick={() => router.push('/onboarding/business-setup')}>
                사업자 정보 등록
              </Button>
            </Card>
          ) : (
            <>
              {activeTab === '개요' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">전체 직원</p>
                          <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalEmployees}</p>
                        </div>
                        <Users className="w-10 h-10 text-blue-500" />
                      </div>
                    </Card>
                    <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">오늘 출근</p>
                          <p className="text-3xl font-bold text-green-600">{dashboardData.stats.activeToday}</p>
                        </div>
                        <Clock className="w-10 h-10 text-green-500" />
                      </div>
                    </Card>
                    <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">정시 출근</p>
                          <p className="text-3xl font-bold text-blue-600">{dashboardData.stats.onTime}</p>
                        </div>
                        <Calendar className="w-10 h-10 text-blue-500" />
                      </div>
                    </Card>
                    <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">지각</p>
                          <p className="text-3xl font-bold text-orange-600">{dashboardData.stats.late}</p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-orange-500" />
                      </div>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">최근 활동</h2>
                      <Button size="sm" variant="secondary">전체 보기</Button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">김직원</p>
                            <p className="text-sm text-gray-500">출근 - 08:55 AM</p>
                          </div>
                        </div>
                        <span className="text-sm text-green-600">정시</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">이직원</p>
                            <p className="text-sm text-gray-500">출근 - 09:15 AM</p>
                          </div>
                        </div>
                        <span className="text-sm text-orange-600">지각</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <div>
                            <p className="font-medium">박직원</p>
                            <p className="text-sm text-gray-500">퇴근 - 18:00 PM</p>
                          </div>
                        </div>
                        <span className="text-sm text-blue-600">퇴근</span>
                      </div>
                    </div>
                  </Card>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card 
                      className="bg-white/70 backdrop-blur-sm border border-white/30 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setActiveTab('직원관리')}
                    >
                      <div className="flex items-center space-x-4">
                        <UserPlus className="w-10 h-10 text-blue-500" />
                        <div>
                          <h3 className="font-semibold text-gray-900">직원 추가</h3>
                          <p className="text-sm text-gray-600">새 직원을 등록하고 계약을 생성합니다</p>
                        </div>
                      </div>
                    </Card>
                    <Card 
                      className="bg-white/70 backdrop-blur-sm border border-white/30 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setActiveTab('출퇴근')}
                    >
                      <div className="flex items-center space-x-4">
                        <Clock className="w-10 h-10 text-green-500" />
                        <div>
                          <h3 className="font-semibold text-gray-900">근태 관리</h3>
                          <p className="text-sm text-gray-600">직원들의 출퇴근 기록을 확인합니다</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {activeTab === '직원관리' && (
                <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">직원 목록</h2>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      직원 추가
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-700">이름</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">이메일</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">직급</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">부서</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">상태</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-700">가입일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardData.employees.map((employee) => (
                          <tr key={employee.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">{employee.name}</td>
                            <td className="py-3 px-4">{employee.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                employee.position === 'owner' ? 'bg-purple-100 text-purple-800' :
                                employee.position === 'admin' ? 'bg-blue-100 text-blue-800' :
                                employee.position === 'manager' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {employee.position === 'owner' ? '대표' :
                                 employee.position === 'admin' ? '관리자' :
                                 employee.position === 'manager' ? '매니저' : '직원'}
                              </span>
                            </td>
                            <td className="py-3 px-4">{employee.department || '-'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                employee.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {employee.is_active ? '활성' : '비활성'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500">
                              {new Date(employee.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                        {dashboardData.employees.length === 0 && (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-gray-500">
                              등록된 직원이 없습니다
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {activeTab === '출퇴근' && (
                <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">출퇴근 관리</h2>
                  <p className="text-gray-600">출퇴근 관리 기능이 곧 추가됩니다.</p>
                </Card>
              )}

              {activeTab === '통계' && (
                <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    <BarChart3 className="inline w-5 h-5 mr-2" />
                    통계 대시보드
                  </h2>
                  <p className="text-gray-600">상세 통계 기능이 곧 추가됩니다.</p>
                </Card>
              )}

              {activeTab === '설정' && (
                <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    <Settings className="inline w-5 h-5 mr-2" />
                    설정
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">조직 정보</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-500">조직명:</span> {dashboardData.organization?.name}</p>
                        <p><span className="text-gray-500">사업자 유형:</span> {
                          (() => {
                            const type = dashboardData.organization?.biz_type || dashboardData.organization?.metadata?.business_type;
                            if (type === 'CORP' || type === 'corporation') return '법인사업자';
                            if (type === 'FRANCHISE') return '가맹본부';
                            return '개인사업자';
                          })()
                        }</p>
                        {dashboardData.organization?.metadata?.business_number && (
                          <p><span className="text-gray-500">사업자등록번호:</span> {dashboardData.organization.metadata.business_number}</p>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">조직 코드</h3>
                      <p className="text-sm text-gray-600">근로자들이 회원가입 시 사용할 코드입니다.</p>
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <code className="text-blue-800 font-mono">
                          {dashboardData.organization?.metadata?.code || dashboardData.organization?.id?.slice(0, 8)}
                        </code>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}