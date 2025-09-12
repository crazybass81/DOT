import React, { useState } from 'react';

interface CheckInButtonProps {
  employeeId: string;
  businessId: string;
  isCheckedIn?: boolean;
  onCheckIn?: (result: any) => void;
  onSuccess?: (result: any) => void;
  onError?: (error: Error | string) => void;
  disabled?: boolean;
  className?: string;
}

export const CheckInButton: React.FC<CheckInButtonProps> = ({
  employeeId,
  businessId,
  isCheckedIn = false,
  onCheckIn,
  onSuccess,
  onError,
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [checkedInState, setCheckedInState] = useState(isCheckedIn);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    
    try {
      // Get user location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const result = {
        employee_id: employeeId,
        business_id: businessId,
        timestamp: new Date().toISOString(),
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      };

      setCheckedInState(true);
      onCheckIn?.(result);
      onSuccess?.(result);
      
    } catch (error) {
      console.error('Check-in failed:', error);
      // Convert geolocation error to Korean message
      if (error && typeof error === 'object' && 'code' in error && error.code === 1) {
        onError?.('위치 권한이 거부되었습니다');
      } else {
        onError?.(error as Error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      data-testid="check-in-button"
    >
      {isLoading ? (
        '처리중...'
      ) : checkedInState ? (
        '퇴근하기'
      ) : (
        '출근하기'
      )}
    </button>
  );
};