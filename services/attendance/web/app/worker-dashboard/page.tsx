'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseAuthService } from '@/services/supabaseAuthService'
import { supabase } from '@/lib/supabase-config'
import { Clock, Calendar, FileText, User, LogOut, AlertCircle } from 'lucide-react'

export default function WorkerDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [contract, setContract] = useState<any>(null)
  const [todayAttendance, setTodayAttendance] = useState<any>(null)

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
      const { data: emp } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', currentUser.id)
        .single()

      if (!emp) {
        console.error('Employee 정보 없음')
        router.push('/login')
        return
      }

      setEmployee(emp)

      // 워커가 사업자 대시보드 접근 시도하는 경우 방지
      if (emp.position === 'owner' || emp.position === 'admin') {
        router.push('/business-dashboard')
        return
      }

      // 근로계약 정보 가져오기
      if (emp.organization_id) {
        const { data: contractData } = await supabase
          .from('contracts')
          .select('*')
          .eq('employee_id', emp.id)
          .eq('is_active', true)
          .single()
        
        setContract(contractData)
      }

      // 오늘 출근 기록 확인
      const today = new Date().toISOString().split('T')[0]
      const { data: attendance } = await supabase
        .from('attendances')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('date', today)
        .single()
      
      setTodayAttendance(attendance)
    } catch (error) {
      console.error('Dashboard data loading error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClockIn = async () => {
    try {
      const now = new Date()
      const { error } = await supabase
        .from('attendances')
        .insert({
          employee_id: employee.id,
          organization_id: employee.organization_id,
          date: now.toISOString().split('T')[0],
          clock_in: now.toISOString(),
          status: 'WORKING'
        })

      if (!error) {
        alert('출근 처리되었습니다')
        loadDashboardData()
      }
    } catch (error) {
      console.error('Clock in error:', error)
      alert('출근 처리 실패')
    }
  }

  const handleClockOut = async () => {
    if (!todayAttendance) return
    
    try {
      const now = new Date()
      const { error } = await supabase
        .from('attendances')
        .update({
          clock_out: now.toISOString(),
          status: 'COMPLETED'
        })
        .eq('id', todayAttendance.id)

      if (!error) {
        alert('퇴근 처리되었습니다')
        loadDashboardData()
      }
    } catch (error) {
      console.error('Clock out error:', error)
      alert('퇴근 처리 실패')
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
              <User className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  워커 대시보드
                </h1>
                <p className="text-sm text-gray-600">
                  {employee?.name || user?.name} 님
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
        {/* 근로계약이 없는 경우 */}
        {!contract ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-yellow-800 mb-2">
                  근로계약 대기 중
                </h2>
                <p className="text-yellow-700">
                  아직 근로계약이 체결되지 않았습니다. 
                  사업자가 근로계약을 생성하면 알림을 받게 됩니다.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 출퇴근 버튼 */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                오늘의 근태
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">현재 시각</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {new Date().toLocaleTimeString('ko-KR')}
                  </p>
                </div>
                
                <div className="flex items-center justify-end space-x-4">
                  {!todayAttendance ? (
                    <button
                      onClick={handleClockIn}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      출근하기
                    </button>
                  ) : todayAttendance.clock_out ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">퇴근 완료</p>
                      <p className="text-lg font-medium text-gray-900">
                        {new Date(todayAttendance.clock_out).toLocaleTimeString('ko-KR')}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleClockOut}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      퇴근하기
                    </button>
                  )}
                </div>
              </div>

              {todayAttendance && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">출근 시간</p>
                      <p className="font-medium">
                        {new Date(todayAttendance.clock_in).toLocaleTimeString('ko-KR')}
                      </p>
                    </div>
                    {todayAttendance.clock_out && (
                      <div>
                        <p className="text-sm text-gray-600">퇴근 시간</p>
                        <p className="font-medium">
                          {new Date(todayAttendance.clock_out).toLocaleTimeString('ko-KR')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 계약 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 근로계약 정보 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  근로계약 정보
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-600">직책</dt>
                    <dd className="font-medium text-gray-900">
                      {contract.position || '일반직원'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">계약 시작일</dt>
                    <dd className="font-medium text-gray-900">
                      {new Date(contract.start_date).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">급여 형태</dt>
                    <dd className="font-medium text-gray-900">
                      {contract.wage_type === 'MONTHLY' ? '월급' :
                       contract.wage_type === 'HOURLY' ? '시급' : '연봉'}
                    </dd>
                  </div>
                  {contract.wage && (
                    <div>
                      <dt className="text-sm text-gray-600">급여</dt>
                      <dd className="font-medium text-gray-900">
                        {contract.wage.toLocaleString()}원
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* 이번 달 근태 요약 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  이번 달 근태 요약
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-600">출근일수</dt>
                    <dd className="font-medium text-gray-900">
                      0일
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">지각</dt>
                    <dd className="font-medium text-gray-900">
                      0회
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">결근</dt>
                    <dd className="font-medium text-gray-900">
                      0회
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">총 근무시간</dt>
                    <dd className="font-medium text-gray-900">
                      0시간
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}