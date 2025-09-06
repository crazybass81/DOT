'use client'

import { useState } from 'react'
import { LogIn, LogOut, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { attendanceAPI, CheckInData } from '@/lib/services/attendance-api.service'

interface CheckInOutButtonsProps {
  employeeId: string
  locationId?: string
  currentStatus: 'NOT_WORKING' | 'WORKING' | 'ON_BREAK' | 'COMPLETED'
  onStatusChange: () => void
}

export default function CheckInOutButtons({ 
  employeeId, 
  locationId, 
  currentStatus, 
  onStatusChange 
}: CheckInOutButtonsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)

  // 위치 정보 가져오기
  const getCurrentLocation = (): Promise<{ latitude: number, longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation이 지원되지 않는 브라우저입니다.'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          resolve({ latitude, longitude })
          setLocationError(null)
        },
        (error) => {
          let message = '위치 정보를 가져올 수 없습니다.'
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = '위치 접근 권한이 거부되었습니다.'
              break
            case error.POSITION_UNAVAILABLE:
              message = '위치 정보가 사용할 수 없습니다.'
              break
            case error.TIMEOUT:
              message = '위치 정보 요청이 시간 초과되었습니다.'
              break
          }
          setLocationError(message)
          reject(new Error(message))
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000
        }
      )
    })
  }

  // attendance-checkin Edge Function 호출
  const handleCheckIn = async () => {
    setLoading(true)
    setError(null)

    try {
      // 위치 정보 가져오기
      const currentLocation = await getCurrentLocation()
      setLocation(currentLocation)

      const checkInData: CheckInData = {
        employeeId,
        locationId: locationId || 'default-location', // 기본 위치 ID 사용
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }

      const response = await attendanceAPI.checkIn(checkInData)

      if (response.success) {
        console.log('✅ 출근 처리 완료:', response.data)
        onStatusChange() // 상태 새로고침 트리거
      } else {
        throw new Error(response.error || '출근 처리에 실패했습니다.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '출근 처리 중 오류가 발생했습니다.'
      setError(errorMessage)
      console.error('Check-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  // attendance-checkout Edge Function 호출
  const handleCheckOut = async () => {
    setLoading(true)
    setError(null)

    try {
      // 위치 정보 가져오기
      const currentLocation = await getCurrentLocation()
      setLocation(currentLocation)

      const checkOutData: CheckInData = {
        employeeId,
        locationId: locationId || 'default-location',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      }

      const response = await attendanceAPI.checkOut(checkOutData)

      if (response.success) {
        console.log('✅ 퇴근 처리 완료:', response.data)
        onStatusChange() // 상태 새로고침 트리거
      } else {
        throw new Error(response.error || '퇴근 처리에 실패했습니다.')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '퇴근 처리 중 오류가 발생했습니다.'
      setError(errorMessage)
      console.error('Check-out error:', err)
    } finally {
      setLoading(false)
    }
  }

  const canCheckIn = currentStatus === 'NOT_WORKING'
  const canCheckOut = currentStatus === 'WORKING' || currentStatus === 'ON_BREAK'
  const isCompleted = currentStatus === 'COMPLETED'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <MapPin className="h-5 w-5 mr-2" />
        출퇴근 관리
      </h3>

      {/* 위치 정보 표시 */}
      {location && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center text-sm text-green-700">
            <MapPin className="h-4 w-4 mr-1" />
            위치 확인됨: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </div>
        </div>
      )}

      {/* 위치 오류 표시 */}
      {locationError && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center text-sm text-yellow-700">
            <AlertCircle className="h-4 w-4 mr-1" />
            {locationError}
          </div>
        </div>
      )}

      {/* 오류 메시지 */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mr-1" />
            {error}
          </div>
        </div>
      )}

      {/* 버튼 영역 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 출근 버튼 */}
        <button
          onClick={handleCheckIn}
          disabled={!canCheckIn || loading}
          className={`
            flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-colors
            ${canCheckIn && !loading
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <LogIn className="h-5 w-5 mr-2" />
          )}
          {loading ? '처리중...' : '출근하기'}
        </button>

        {/* 퇴근 버튼 */}
        <button
          onClick={handleCheckOut}
          disabled={!canCheckOut || loading}
          className={`
            flex-1 flex items-center justify-center px-6 py-4 rounded-lg font-medium transition-colors
            ${canCheckOut && !loading
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <LogOut className="h-5 w-5 mr-2" />
          )}
          {loading ? '처리중...' : '퇴근하기'}
        </button>
      </div>

      {/* 상태별 안내 메시지 */}
      <div className="mt-4 text-sm text-gray-600">
        {isCompleted && (
          <div className="flex items-center text-blue-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            오늘 근무가 완료되었습니다.
          </div>
        )}
        {currentStatus === 'NOT_WORKING' && (
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            출근 버튼을 눌러 근무를 시작하세요.
          </div>
        )}
        {currentStatus === 'WORKING' && (
          <div className="flex items-center text-green-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            현재 근무중입니다. 퇴근 시 퇴근 버튼을 눌러주세요.
          </div>
        )}
        {currentStatus === 'ON_BREAK' && (
          <div className="flex items-center text-yellow-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            현재 휴게중입니다. 휴게 종료 후 퇴근 가능합니다.
          </div>
        )}
      </div>

      {/* 위치 권한 안내 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          ⚠️ 정확한 출퇴근 기록을 위해 위치 접근 권한을 허용해주세요.
          GPS 기반으로 근무지 확인 후 출퇴근이 처리됩니다.
        </p>
      </div>
    </div>
  )
}