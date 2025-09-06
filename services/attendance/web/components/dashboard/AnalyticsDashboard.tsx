'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Building, 
  Clock, 
  Activity,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { attendanceAPI, AnalyticsRequest } from '@/lib/services/attendance-api.service'

interface AnalyticsDashboardProps {
  employeeId: string
  organizationId: string
  userRole: 'worker' | 'admin' | 'owner'
  jwtToken: string
}

type AnalyticsType = 'summary' | 'trends' | 'employee' | 'department' | 'overtime' | 'patterns'

interface AnalyticsData {
  type: AnalyticsType
  data: any
  loading: boolean
  error: string | null
}

export default function AnalyticsDashboard({ 
  employeeId, 
  organizationId, 
  userRole,
  jwtToken 
}: AnalyticsDashboardProps) {
  const [selectedType, setSelectedType] = useState<AnalyticsType>('summary')
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30일 전
    endDate: new Date().toISOString().split('T')[0] // 오늘
  })
  
  const [analytics, setAnalytics] = useState<Record<AnalyticsType, AnalyticsData>>({
    summary: { type: 'summary', data: null, loading: false, error: null },
    trends: { type: 'trends', data: null, loading: false, error: null },
    employee: { type: 'employee', data: null, loading: false, error: null },
    department: { type: 'department', data: null, loading: false, error: null },
    overtime: { type: 'overtime', data: null, loading: false, error: null },
    patterns: { type: 'patterns', data: null, loading: false, error: null },
  })

  // 분석 메뉴 정의 (역할별 접근 제한)
  const analyticsMenus = [
    { 
      type: 'summary' as AnalyticsType, 
      title: '전체 요약', 
      icon: BarChart3, 
      description: '출석률, 근무시간, 지각률 등 전체 현황',
      roles: ['admin', 'owner']
    },
    { 
      type: 'trends' as AnalyticsType, 
      title: '트렌드 분석', 
      icon: TrendingUp, 
      description: '시간별 출석 패턴과 트렌드 변화',
      roles: ['admin', 'owner']
    },
    { 
      type: 'employee' as AnalyticsType, 
      title: '개인 분석', 
      icon: Users, 
      description: '개별 직원의 근무 패턴과 성과',
      roles: ['worker', 'admin', 'owner']
    },
    { 
      type: 'department' as AnalyticsType, 
      title: '부서별 분석', 
      icon: Building, 
      description: '부서별 출석률 및 근무 효율성',
      roles: ['admin', 'owner']
    },
    { 
      type: 'overtime' as AnalyticsType, 
      title: '초과근무 분석', 
      icon: Clock, 
      description: '초과근무 현황과 비용 분석',
      roles: ['admin', 'owner']
    },
    { 
      type: 'patterns' as AnalyticsType, 
      title: '패턴 분석', 
      icon: Activity, 
      description: '근무 패턴과 이상 징후 탐지',
      roles: ['admin', 'owner']
    }
  ].filter(menu => menu.roles.includes(userRole))

  // attendance-analytics Edge Function 호출
  const fetchAnalytics = async (type: AnalyticsType) => {
    setAnalytics(prev => ({
      ...prev,
      [type]: { ...prev[type], loading: true, error: null }
    }))

    try {
      const request: AnalyticsRequest = {
        type,
        organizationId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        ...(type === 'employee' && { employeeId }) // 개인 분석일 경우 employeeId 추가
      }

      const response = await attendanceAPI.getAnalytics(request, jwtToken)

      if (response.success) {
        setAnalytics(prev => ({
          ...prev,
          [type]: { 
            type, 
            data: response.data, 
            loading: false, 
            error: null 
          }
        }))
      } else {
        throw new Error(response.error || '분석 데이터 조회에 실패했습니다.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.'
      setAnalytics(prev => ({
        ...prev,
        [type]: { 
          type, 
          data: null, 
          loading: false, 
          error: errorMessage 
        }
      }))
      console.error(`Analytics ${type} error:`, err)
    }
  }

  // 선택된 분석 타입 변경 시 데이터 로드
  useEffect(() => {
    if (selectedType) {
      fetchAnalytics(selectedType)
    }
  }, [selectedType, dateRange])

  // 데이터 새로고침
  const handleRefresh = () => {
    fetchAnalytics(selectedType)
  }

  // 데이터 내보내기 (개발용)
  const handleExport = () => {
    const currentData = analytics[selectedType]
    if (currentData.data) {
      const dataStr = JSON.stringify(currentData.data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics-${selectedType}-${dateRange.startDate}-${dateRange.endDate}.json`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const currentAnalytics = analytics[selectedType]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          엔터프라이즈 분석 대시보드
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            disabled={currentAnalytics.loading}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${currentAnalytics.loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExport}
            disabled={!currentAnalytics.data}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 날짜 범위 선택 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <label className="text-sm text-gray-600">기간:</label>
          </div>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <span className="text-gray-500">~</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 분석 타입 선택 메뉴 */}
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {analyticsMenus.map((menu) => {
            const Icon = menu.icon
            const isSelected = selectedType === menu.type
            return (
              <button
                key={menu.type}
                onClick={() => setSelectedType(menu.type)}
                className={`
                  p-3 rounded-lg text-center transition-all duration-200
                  ${isSelected 
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }
                `}
              >
                <Icon className="h-6 w-6 mx-auto mb-2" />
                <div className="text-xs font-medium">
                  {menu.title}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택된 분석 설명 */}
      <div className="mb-4">
        {analyticsMenus.find(m => m.type === selectedType) && (
          <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-blue-700">
              {analyticsMenus.find(m => m.type === selectedType)?.description}
            </span>
          </div>
        )}
      </div>

      {/* 분석 결과 표시 */}
      <div className="min-h-64">
        {currentAnalytics.loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">분석 데이터를 불러오는 중...</p>
            </div>
          </div>
        )}

        {currentAnalytics.error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 mb-2">분석 데이터 로드 실패</p>
              <p className="text-gray-500 text-sm mb-4">{currentAnalytics.error}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          </div>
        )}

        {currentAnalytics.data && !currentAnalytics.loading && !currentAnalytics.error && (
          <div className="space-y-6">
            {/* 분석 결과를 JSON 형태로 표시 (개발용) */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                {analyticsMenus.find(m => m.type === selectedType)?.title} 결과
              </h4>
              <div className="bg-white rounded border p-4 max-h-96 overflow-auto">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(currentAnalytics.data, null, 2)}
                </pre>
              </div>
            </div>

            {/* 요약 정보 카드 */}
            {selectedType === 'summary' && currentAnalytics.data.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {currentAnalytics.data.summary.totalEmployees || 0}명
                  </div>
                  <div className="text-sm text-blue-700">총 직원 수</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {currentAnalytics.data.summary.averageAttendanceRate || 0}%
                  </div>
                  <div className="text-sm text-green-700">평균 출석률</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {currentAnalytics.data.summary.averageWorkingHours || 0}시간
                  </div>
                  <div className="text-sm text-yellow-700">평균 근무시간</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {currentAnalytics.data.summary.lateArrivalRate || 0}%
                  </div>
                  <div className="text-sm text-red-700">지각률</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 분석 기능 안내 */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <p className="mb-1">🔍 <strong>6가지 엔터프라이즈급 분석 기능:</strong></p>
          <ul className="space-y-1 ml-4">
            <li>• Summary: 전체 현황 요약 (출석률, 근무시간, 지각률)</li>
            <li>• Trends: 시간별 출석 패턴과 트렌드 변화</li>
            <li>• Employee: 개별 직원 근무 패턴과 성과 분석</li>
            <li>• Department: 부서별 출석률 및 근무 효율성</li>
            <li>• Overtime: 초과근무 현황과 비용 분석</li>
            <li>• Patterns: 근무 패턴과 이상 징후 탐지</li>
          </ul>
          <p className="mt-2 text-gray-400">※ JWT 인증을 통한 보안 강화된 분석 데이터</p>
        </div>
      </div>
    </div>
  )
}