'use client';

import React, { useState } from 'react';
import { AttendanceService } from '@/lib/services/attendance';
import { GeolocationPosition } from '@/lib/services/location-verification';

interface CheckInButtonProps {
  employeeId: string;
  businessId: string;
  isCheckedIn: boolean;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function CheckInButton({
  employeeId,
  businessId,
  isCheckedIn,
  onSuccess,
  onError,
}: CheckInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const attendanceService = new AttendanceService();

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          let errorMessage: string;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 권한이 거부되었습니다';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 사용할 수 없습니다';
              break;
            case error.TIMEOUT:
              errorMessage = '위치 정보 요청 시간이 초과되었습니다';
              break;
            default:
              errorMessage = '알 수 없는 오류가 발생했습니다';
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    setIsLoading(true);
    
    try {
      const location = await getCurrentLocation();
      
      const result = await attendanceService.checkIn({
        employeeId,
        businessId,
        location,
        verificationMethod: 'gps',
      });

      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || '출근 처리 실패');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    
    try {
      const location = await getCurrentLocation();
      
      const result = await attendanceService.checkOut({
        employeeId,
        businessId,
        location,
      });

      if (result.success) {
        onSuccess?.(result);
      } else {
        onError?.(result.error || '퇴근 처리 실패');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <button
        disabled
        className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed"
      >
        처리중...
      </button>
    );
  }

  if (isCheckedIn) {
    return (
      <button
        onClick={handleCheckOut}
        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
      >
        퇴근하기
      </button>
    );
  }

  return (
    <button
      onClick={handleCheckIn}
      className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
    >
      출근하기
    </button>
  );
}