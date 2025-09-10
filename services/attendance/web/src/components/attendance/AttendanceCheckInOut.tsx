'use client';

import { useState, useCallback, useEffect } from 'react';
import { validateWithSchema } from '@/lib/validation';
import { CheckInSchema, CheckOutSchema } from '@/schemas/attendance';
import { useToastNotifications } from '@/hooks/useToastNotifications';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

interface AttendanceCheckInOutProps {
  employeeId: string;
  businessId: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface TodayRecord {
  id: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'active' | 'completed' | 'cancelled';
}

export default function AttendanceCheckInOut({
  employeeId,
  businessId,
  onSuccess,
  onError
}: AttendanceCheckInOutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<'gps' | 'qr' | 'manual'>('gps');

  const { showToast } = useToastNotifications();

  // 오늘의 출근 기록 확인
  const checkTodayRecord = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(
        `/api/attendance?employee_id=${employeeId}&business_id=${businessId}&work_date=${today}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          setTodayRecord(data.data[0]);
        } else {
          setTodayRecord(null);
        }
      }
    } catch (error) {
      console.error('오늘 기록 확인 실패:', error);
    }
  }, [employeeId, businessId]);

  // 위치 정보 가져오기
  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    if (!navigator.geolocation) {
      throw new Error('위치 서비스를 지원하지 않는 브라우저입니다');
    }

    setLocationLoading(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      // 주소 변환 (Reverse Geocoding) - 선택사항
      try {
        const geocodeResponse = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.latitude}&longitude=${location.longitude}&localityLanguage=ko`
        );
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          location.address = `${geocodeData.locality || ''} ${geocodeData.principalSubdivision || ''}`.trim();
        }
      } catch (geocodeError) {
        console.warn('주소 변환 실패:', geocodeError);
      }

      setCurrentLocation(location);
      return location;
    } catch (error) {
      throw new Error(
        error instanceof GeolocationPositionError 
          ? getLocationErrorMessage(error)
          : '위치 정보를 가져올 수 없습니다'
      );
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // 위치 오류 메시지 변환
  const getLocationErrorMessage = (error: GeolocationPositionError): string => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return '위치 접근 권한이 거부되었습니다';
      case error.POSITION_UNAVAILABLE:
        return '위치 정보를 사용할 수 없습니다';
      case error.TIMEOUT:
        return '위치 정보 요청 시간이 초과되었습니다';
      default:
        return '위치 정보를 가져오는 중 오류가 발생했습니다';
    }
  };

  // 출근 처리
  const handleCheckIn = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      let location: LocationData | null = null;

      if (verificationMethod === 'gps') {
        location = await getCurrentLocation();
      }

      const checkInData = {
        employee_id: employeeId,
        business_id: businessId,
        verification_method: verificationMethod,
        ...(location && { check_in_location: location }),
        notes: `${verificationMethod} 방식으로 출근 처리`
      };

      // 입력 데이터 검증
      const validation = validateWithSchema(CheckInSchema, checkInData);
      if (!validation.success) {
        throw new Error(`입력 데이터 오류: ${validation.errors.join(', ')}`);
      }

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(checkInData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '출근 처리 실패');
      }

      if (result.success) {
        setTodayRecord({
          id: result.data.id,
          check_in_time: result.data.check_in_time,
          check_out_time: null,
          status: 'active'
        });

        showToast({
          type: 'success',
          title: '출근 완료',
          message: `${new Date().toLocaleTimeString('ko-KR')}에 출근이 완료되었습니다`,
          duration: 5000
        });

        onSuccess?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '출근 처리 중 오류가 발생했습니다';
      
      showToast({
        type: 'error',
        title: '출근 실패',
        message: errorMessage,
        duration: 8000
      });

      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, businessId, verificationMethod, isLoading, getCurrentLocation, onSuccess, onError, showToast]);

  // 퇴근 처리
  const handleCheckOut = useCallback(async () => {
    if (isLoading || !todayRecord) return;

    setIsLoading(true);

    try {
      let location: LocationData | null = null;

      if (verificationMethod === 'gps') {
        location = await getCurrentLocation();
      }

      const checkOutData = {
        attendance_id: todayRecord.id,
        verification_method: verificationMethod,
        ...(location && { check_out_location: location }),
        break_time_minutes: 60, // 기본 휴게시간
        overtime_minutes: 0,    // 기본값
        notes: `${verificationMethod} 방식으로 퇴근 처리`
      };

      // 입력 데이터 검증
      const validation = validateWithSchema(CheckOutSchema, checkOutData);
      if (!validation.success) {
        throw new Error(`입력 데이터 오류: ${validation.errors.join(', ')}`);
      }

      const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(checkOutData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '퇴근 처리 실패');
      }

      if (result.success) {
        setTodayRecord(prev => prev ? {
          ...prev,
          check_out_time: result.data.check_out_time,
          status: 'completed'
        } : null);

        showToast({
          type: 'success',
          title: '퇴근 완료',
          message: `${new Date().toLocaleTimeString('ko-KR')}에 퇴근이 완료되었습니다`,
          duration: 5000
        });

        onSuccess?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '퇴근 처리 중 오류가 발생했습니다';
      
      showToast({
        type: 'error',
        title: '퇴근 실패',
        message: errorMessage,
        duration: 8000
      });

      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [todayRecord, verificationMethod, isLoading, getCurrentLocation, onSuccess, onError, showToast]);

  // 컴포넌트 초기화
  useEffect(() => {
    checkTodayRecord();
  }, [checkTodayRecord]);

  const isCheckedIn = todayRecord && todayRecord.check_in_time && !todayRecord.check_out_time;
  const isCheckedOut = todayRecord && todayRecord.check_out_time;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">출퇴근 체크</h2>
        <p className="text-gray-600">
          오늘 ({new Date().toLocaleDateString('ko-KR')})
        </p>
      </div>

      {/* 인증 방법 선택 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          인증 방법 선택
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="gps"
              checked={verificationMethod === 'gps'}
              onChange={(e) => setVerificationMethod(e.target.value as 'gps')}
              className="mr-2"
            />
            <span className="text-sm">GPS 위치</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="qr"
              checked={verificationMethod === 'qr'}
              onChange={(e) => setVerificationMethod(e.target.value as 'qr')}
              className="mr-2"
            />
            <span className="text-sm">QR 코드</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="manual"
              checked={verificationMethod === 'manual'}
              onChange={(e) => setVerificationMethod(e.target.value as 'manual')}
              className="mr-2"
            />
            <span className="text-sm">수동</span>
          </label>
        </div>
      </div>

      {/* 현재 위치 정보 */}
      {verificationMethod === 'gps' && currentLocation && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">현재 위치</h4>
          <div className="text-sm text-blue-700">
            <div>위도: {currentLocation.latitude.toFixed(6)}</div>
            <div>경도: {currentLocation.longitude.toFixed(6)}</div>
            {currentLocation.address && <div>주소: {currentLocation.address}</div>}
            {currentLocation.accuracy && <div>정확도: ±{Math.round(currentLocation.accuracy)}m</div>}
          </div>
        </div>
      )}

      {/* 오늘의 출퇴근 현황 */}
      {todayRecord && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">오늘의 출퇴근 현황</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">출근시간:</span>
              <span className="font-medium">
                {todayRecord.check_in_time 
                  ? new Date(todayRecord.check_in_time).toLocaleTimeString('ko-KR')
                  : '-'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">퇴근시간:</span>
              <span className="font-medium">
                {todayRecord.check_out_time 
                  ? new Date(todayRecord.check_out_time).toLocaleTimeString('ko-KR')
                  : '-'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">상태:</span>
              <span className={`font-medium ${
                todayRecord.status === 'active' ? 'text-blue-600' :
                todayRecord.status === 'completed' ? 'text-green-600' :
                'text-gray-600'
              }`}>
                {todayRecord.status === 'active' ? '근무 중' :
                 todayRecord.status === 'completed' ? '근무 완료' :
                 '대기'
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 출퇴근 버튼 */}
      <div className="space-y-4">
        {!isCheckedIn && !isCheckedOut && (
          <button
            onClick={handleCheckIn}
            disabled={isLoading || locationLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                출근 처리 중...
              </div>
            ) : locationLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                위치 확인 중...
              </div>
            ) : (
              '출근하기'
            )}
          </button>
        )}

        {isCheckedIn && (
          <button
            onClick={handleCheckOut}
            disabled={isLoading || locationLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                퇴근 처리 중...
              </div>
            ) : locationLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                위치 확인 중...
              </div>
            ) : (
              '퇴근하기'
            )}
          </button>
        )}

        {isCheckedOut && (
          <div className="w-full bg-gray-100 text-gray-600 font-semibold py-4 px-6 rounded-lg text-center">
            오늘 근무가 완료되었습니다
          </div>
        )}
      </div>

      {/* 새로고침 버튼 */}
      <button
        onClick={checkTodayRecord}
        className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
      >
        출퇴근 현황 새로고침
      </button>
    </div>
  );
}