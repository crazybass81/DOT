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
  onCheckIn,
  onError,
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

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

      setIsCheckedIn(true);
      onCheckIn?.(result);
      
    } catch (error) {
      console.error('Check-in failed:', error);
      onError?.(error as Error);
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
      ) : isCheckedIn ? (
        '퇴근하기'
      ) : (
        '출근하기'
      )}
    </button>
  );
};