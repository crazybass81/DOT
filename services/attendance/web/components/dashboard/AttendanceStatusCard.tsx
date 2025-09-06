'use client'

import { useEffect, useState } from 'react'
import { Clock, User, Calendar, Activity } from 'lucide-react'
import { attendanceAPI, AttendanceStatus } from '@/lib/services/attendance-api.service'

interface AttendanceStatusCardProps {
  employeeId: string
  refreshTrigger?: number
}

export default function AttendanceStatusCard({ employeeId, refreshTrigger }: AttendanceStatusCardProps) {
  const [status, setStatus] = useState<AttendanceStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // 실시간 시간 업데이트
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [])

  // attendance-status Edge Function 호출
  const fetchStatus = async () => {
    try {
      setError(null)
      const statusData = await attendanceAPI.getAttendanceStatus(employeeId)
      setStatus(statusData)
    } catch (err) {
      console.error('Status fetch error:', err)
      setError(err instanceof Error ? err.message : '상태 조회 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [employeeId, refreshTrigger])

  // 30초마다 실시간 폴링
  useEffect(() => {
    const cleanup = attendanceAPI.startStatusPolling(employeeId, (statusData) => {
      setStatus(statusData)
    }, 30000)

    return cleanup
  }, [employeeId])

  const getStatusDisplay = () => {
    if (!status) return { text: '알 수 없음', color: 'gray', bgColor: 'bg-gray-100' }
    
    switch (status.currentStatus) {
      case 'NOT_WORKING':
        return { text: '미출근', color: 'gray-600', bgColor: 'bg-gray-100' }
      case 'WORKING':
        return { text: '근무중', color: 'green-600', bgColor: 'bg-green-100' }
      case 'ON_BREAK':
        return { text: '휴게중', color: 'yellow-600', bgColor: 'bg-yellow-100' }
      case 'COMPLETED':
        return { text: '근무완료', color: 'blue-600', bgColor: 'bg-blue-100' }
      default:
        return { text: '알 수 없음', color: 'gray-600', bgColor: 'bg-gray-100' }
    }
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}시간 ${mins}분`
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="flex items-center mb-4">
            <div className="h-5 w-5 bg-gray-300 rounded mr-2"></div>
            <div className="h-6 bg-gray-300 rounded w-32"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-8 bg-gray-300 rounded w-40"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center mb-4">
          <Activity className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">실시간 근무 상태</h3>
        </div>
        <div className="text-red-500 text-sm">
          오류: {error}
        </div>
        <button 
          onClick={fetchStatus}
          className="mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const statusDisplay = getStatusDisplay()

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="h-5 w-5 mr-2" />
          실시간 근무 상태
        </h3>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusDisplay.bgColor} text-${statusDisplay.color}`}>
          {statusDisplay.text}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 현재 시간 */}
        <div>
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <Clock className="h-4 w-4 mr-1" />
            현재 시각
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {currentTime.toLocaleTimeString('ko-KR')}
          </div>
          <div className="text-sm text-gray-500">
            {currentTime.toLocaleDateString('ko-KR', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              weekday: 'long'
            })}
          </div>
        </div>

        {/* 오늘의 근무 정보 */}
        <div>
          <div className="flex items-center text-sm text-gray-600 mb-1">
            <Calendar className="h-4 w-4 mr-1" />
            오늘의 근무
          </div>
          {status?.today ? (
            <div className="space-y-1">
              <div className="text-sm">
                <span className="text-gray-600">출근:</span> 
                <span className="ml-1 font-medium">
                  {new Date(status.today.checkInTime).toLocaleTimeString('ko-KR')}
                </span>
              </div>
              {status.today.checkOutTime && (
                <div className="text-sm">
                  <span className="text-gray-600">퇴근:</span> 
                  <span className="ml-1 font-medium">
                    {new Date(status.today.checkOutTime).toLocaleTimeString('ko-KR')}
                  </span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-gray-600">근무시간:</span> 
                <span className="ml-1 font-medium">
                  {formatMinutes(status.today.workingMinutes)}
                </span>
              </div>
              {status.today.breakMinutes > 0 && (
                <div className="text-sm">
                  <span className="text-gray-600">휴게시간:</span> 
                  <span className="ml-1 font-medium">
                    {formatMinutes(status.today.breakMinutes)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              아직 출근하지 않았습니다.
            </div>
          )}
        </div>
      </div>

      {/* 현재 휴게중인 경우 추가 정보 표시 */}
      {status?.currentStatus === 'ON_BREAK' && status.today?.currentBreakStart && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              현재 휴게 시작 시간: {new Date(status.today.currentBreakStart).toLocaleTimeString('ko-KR')}
            </div>
            <div className="text-sm font-medium text-yellow-600">
              휴게중...
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')} (30초마다 자동 갱신)
      </div>
    </div>
  )
}