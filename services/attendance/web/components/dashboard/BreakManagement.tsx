'use client'

import { useState } from 'react'
import { Coffee, Play, Square, Loader2, AlertCircle, Clock } from 'lucide-react'
import { attendanceAPI, BreakData } from '@/lib/services/attendance-api.service'

interface BreakManagementProps {
  employeeId: string
  currentStatus: 'NOT_WORKING' | 'WORKING' | 'ON_BREAK' | 'COMPLETED'
  currentBreakStart?: string
  totalBreakMinutes?: number
  onStatusChange: () => void
}

export default function BreakManagement({ 
  employeeId, 
  currentStatus, 
  currentBreakStart,
  totalBreakMinutes = 0,
  onStatusChange 
}: BreakManagementProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentBreakDuration, setCurrentBreakDuration] = useState(0)

  // 현재 휴게시간 실시간 계산
  const calculateCurrentBreakDuration = () => {
    if (currentStatus === 'ON_BREAK' && currentBreakStart) {
      const now = new Date()
      const breakStart = new Date(currentBreakStart)
      const minutes = Math.floor((now.getTime() - breakStart.getTime()) / 60000)
      return minutes
    }
    return 0
  }

  // 1초마다 현재 휴게시간 업데이트
  React.useEffect(() => {
    const interval = setInterval(() => {
      if (currentStatus === 'ON_BREAK' && currentBreakStart) {
        setCurrentBreakDuration(calculateCurrentBreakDuration())
      } else {
        setCurrentBreakDuration(0)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentStatus, currentBreakStart])

  // attendance-break Edge Function 호출 - 휴게 시작
  const handleStartBreak = async () => {
    setLoading(true)
    setError(null)

    try {
      const breakData: BreakData = {
        employeeId,
        action: 'START'
      }

      const response = await attendanceAPI.manageBreak(breakData)

      if (response.success) {
        console.log('✅ 휴게 시작:', response.data)
        onStatusChange() // 상태 새로고침 트리거
      } else {
        throw new Error(response.error || '휴게 시작에 실패했습니다.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '휴게 시작 중 오류가 발생했습니다.'
      setError(errorMessage)
      console.error('Break start error:', err)
    } finally {
      setLoading(false)
    }
  }

  // attendance-break Edge Function 호출 - 휴게 종료
  const handleEndBreak = async () => {
    setLoading(true)
    setError(null)

    try {
      const breakData: BreakData = {
        employeeId,
        action: 'END'
      }

      const response = await attendanceAPI.manageBreak(breakData)

      if (response.success) {
        console.log('✅ 휴게 종료:', response.data)
        onStatusChange() // 상태 새로고침 트리거
      } else {
        throw new Error(response.error || '휴게 종료에 실패했습니다.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '휴게 종료 중 오류가 발생했습니다.'
      setError(errorMessage)
      console.error('Break end error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`
  }

  const canStartBreak = currentStatus === 'WORKING'
  const canEndBreak = currentStatus === 'ON_BREAK'
  const isNotWorking = currentStatus === 'NOT_WORKING' || currentStatus === 'COMPLETED'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Coffee className="h-5 w-5 mr-2" />
        휴게시간 관리
      </h3>

      {/* 오류 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        </div>
      )}

      {/* 현재 휴게 상태 표시 */}
      {currentStatus === 'ON_BREAK' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-yellow-800 font-medium mb-1">
                <Clock className="h-4 w-4 mr-1" />
                현재 휴게중
              </div>
              <div className="text-sm text-yellow-700">
                시작: {currentBreakStart ? new Date(currentBreakStart).toLocaleTimeString('ko-KR') : '알 수 없음'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-800">
                {formatMinutes(currentBreakDuration)}
              </div>
              <div className="text-xs text-yellow-600">
                경과 시간
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 오늘의 총 휴게시간 */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">오늘 총 휴게시간</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatMinutes(totalBreakMinutes + currentBreakDuration)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-orange-400 h-2 rounded-full transition-all duration-300" 
            style={{ 
              width: `${Math.min((totalBreakMinutes + currentBreakDuration) / 60 * 100, 100)}%` 
            }}
          />
        </div>
        <div className="text-xs text-gray-500 mt-1">
          권장 휴게시간: 1시간 (60분)
        </div>
      </div>

      {/* 휴게시간 관리 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 휴게 시작 버튼 */}
        <button
          onClick={handleStartBreak}
          disabled={!canStartBreak || loading}
          className={`
            flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-colors
            ${canStartBreak && !loading
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {loading && canStartBreak ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Play className="h-5 w-5 mr-2" />
          )}
          {loading && canStartBreak ? '처리중...' : '휴게 시작'}
        </button>

        {/* 휴게 종료 버튼 */}
        <button
          onClick={handleEndBreak}
          disabled={!canEndBreak || loading}
          className={`
            flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-colors
            ${canEndBreak && !loading
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {loading && canEndBreak ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Square className="h-5 w-5 mr-2" />
          )}
          {loading && canEndBreak ? '처리중...' : '휴게 종료'}
        </button>
      </div>

      {/* 상태별 안내 메시지 */}
      <div className="mt-4 text-sm text-gray-600">
        {isNotWorking && (
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            출근 후 휴게시간을 관리할 수 있습니다.
          </div>
        )}
        {currentStatus === 'WORKING' && (
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            휴게가 필요하시면 '휴게 시작' 버튼을 눌러주세요.
          </div>
        )}
        {currentStatus === 'ON_BREAK' && (
          <div className="flex items-center text-yellow-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            휴게가 끝나면 '휴게 종료' 버튼을 눌러 근무를 재개하세요.
          </div>
        )}
      </div>

      {/* 휴게시간 가이드라인 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">휴게시간 가이드라인</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 4시간 근무 시 30분 이상 휴게</li>
          <li>• 8시간 근무 시 1시간 이상 휴게</li>
          <li>• 휴게시간은 근무시간에서 제외됩니다</li>
          <li>• 여러 번 나누어 휴게 가능</li>
        </ul>
      </div>
    </div>
  )
}