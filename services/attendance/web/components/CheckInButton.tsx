import React, { useState } from 'react';
import { QrCode, MapPin, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { QRScanner } from './QRScanner';
import { QRValidationResult } from '../lib/qr-utils';

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
  const [showDialog, setShowDialog] = useState(false);
  const [checkInMethod, setCheckInMethod] = useState<'gps' | 'qr'>('gps');

  // GPS 기반 출퇴근
  const handleGPSCheckIn = async () => {
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
        method: 'gps',
        location: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
      };

      setCheckedInState(true);
      setShowDialog(false);
      onCheckIn?.(result);
      onSuccess?.(result);
      
    } catch (error) {
      console.error('GPS check-in failed:', error);
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

  // QR 코드 기반 출퇴근
  const handleQRCheckIn = async (validationResult: QRValidationResult) => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    
    try {
      if (!validationResult.valid || !validationResult.data) {
        throw new Error(validationResult.error || 'QR 코드 검증 실패');
      }

      const result = {
        employee_id: employeeId,
        business_id: businessId,
        timestamp: new Date().toISOString(),
        method: 'qr',
        qr_data: validationResult.data,
        attendance_type: validationResult.attendanceType,
        location_verified: validationResult.locationMatch
      };

      setCheckedInState(true);
      setShowDialog(false);
      onCheckIn?.(result);
      onSuccess?.(result);
      
    } catch (error) {
      console.error('QR check-in failed:', error);
      onError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRError = (error: string) => {
    onError?.(error);
  };

  return (
    <>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogTrigger asChild>
          <Button
            disabled={disabled || isLoading}
            className={`${className}`}
            data-testid="check-in-button"
          >
            {isLoading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                처리중...
              </>
            ) : checkedInState ? (
              '퇴근하기'
            ) : (
              '출근하기'
            )}
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {checkedInState ? '퇴근하기' : '출근하기'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={checkInMethod} onValueChange={(value: 'gps' | 'qr') => setCheckInMethod(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gps" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                GPS 위치
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                QR 스캔
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gps" className="space-y-4">
              <div className="text-center space-y-4">
                <div className="text-sm text-gray-600">
                  GPS를 이용하여 현재 위치에서 출퇴근 처리합니다
                </div>
                <Button 
                  onClick={handleGPSCheckIn}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      위치 확인 중...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      GPS로 {checkedInState ? '퇴근' : '출근'}하기
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <div className="text-center text-sm text-gray-600 mb-4">
                QR 코드를 스캔하여 출퇴근 처리합니다
              </div>
              <QRScanner
                onScanSuccess={handleQRCheckIn}
                onScanError={handleQRError}
                enabled={checkInMethod === 'qr' && showDialog}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
};