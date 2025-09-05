'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAuthService } from '@/services/supabaseAuthService'
import { supabase } from '@/lib/supabase-config'
import { Building2, Users, FileText, Settings, LogOut } from 'lucide-react'

export default function BusinessDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // 현재 사용자 정보 가져오기
      const currentUser = await supabaseAuthService.getCurrentUser()
      if (!currentUser) {
        router.push('/login')
        return
      }
      
      setUser(currentUser)

      // employee 정보 가져오기
      const { data: employee } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      if (!employee) {
        console.error('Employee 정보 없음')
        router.push('/login')
        return
      }

      // 권한 확인 (owner 또는 admin만 접근 가능)
      if (employee.position !== 'owner' && employee.position !== 'admin') {
        router.push('/worker-dashboard')
        return
      }

      // 조직 정보 가져오기
      if (employee.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', employee.organization_id)
          .single()
        
        setOrganization(org)

        // 조직 직원 목록 가져오기
        const { data: empList } = await supabase
          .from('employees')
          .select('*')
          .eq('organization_id', employee.organization_id)
          .order('created_at', { ascending: false })
        
        setEmployees(empList || [])
      }
    } catch (error) {
      console.error('Dashboard data loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabaseAuthService.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">대시보드 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  사업자 대시보드
                </h1>
                {organization && (
                  <p className="text-sm text-gray-600">{organization.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-1" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* 조직 정보가 없는 경우 */}
        {!organization ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">
              조직 설정 필요
            </h2>
            <p className="text-yellow-700 mb-4">
              아직 조직이 설정되지 않았습니다. 사업자 정보를 등록해주세요.
            </p>
            <button
              onClick={() => router.push('/onboarding/business-setup')}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              사업자 정보 등록
            </button>
          </div>
        ) : (
          <>
            {/* 통계 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">전체 직원</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {employees.length}
                    </p>
                  </div>
                  <Users className="h-12 w-12 text-indigo-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">활성 계약</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {employees.filter(e => e.is_active).length}
                    </p>
                  </div>
                  <FileText className="h-12 w-12 text-green-600 opacity-20" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">사업자 유형</p>
                    <p className="text-xl font-bold text-gray-900">
                      {(() => {
                        const type = organization.biz_type || organization.metadata?.business_type
                        if (type === 'CORP') return '법인'
                        if (type === 'FRANCHISE') return '가맹본부'
                        return '개인사업자'
                      })()}
                    </p>
                  </div>
                  <Settings className="h-12 w-12 text-gray-600 opacity-20" />
                </div>
              </div>
            </div>

            {/* 직원 목록 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  직원 목록
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          이름
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          이메일
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          역할
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          가입일
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {employee.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {employee.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              employee.position === 'owner' ? 'bg-purple-100 text-purple-800' :
                              employee.position === 'admin' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {employee.position === 'owner' ? '대표' :
                               employee.position === 'admin' ? '관리자' : '직원'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              employee.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {employee.is_active ? '활성' : '비활성'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(employee.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {employees.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            등록된 직원이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* 빠른 메뉴 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <button
                onClick={() => alert('직원 추가 기능 준비중')}
                className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
              >
                <Users className="h-8 w-8 text-indigo-600 mb-3" />
                <h3 className="text-lg font-medium text-gray-900">직원 추가</h3>
                <p className="text-sm text-gray-600 mt-1">
                  새로운 직원을 등록하고 근로계약을 생성합니다
                </p>
              </button>

              <button
                onClick={() => alert('근태 관리 기능 준비중')}
                className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
              >
                <FileText className="h-8 w-8 text-green-600 mb-3" />
                <h3 className="text-lg font-medium text-gray-900">근태 관리</h3>
                <p className="text-sm text-gray-600 mt-1">
                  직원들의 출퇴근 기록을 확인하고 관리합니다
                </p>
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}