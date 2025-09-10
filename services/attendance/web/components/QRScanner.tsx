'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
// import QrScanner from 'qr-scanner'; // 임시로 주석 처리
import { Camera, CameraOff, Flashlight, FlashlightOff, RotateCcw, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { validateQRForAttendance, QRValidationResult } from '../lib/qr-utils';

interface QRScannerProps {
  onScanSuccess: (result: QRValidationResult) => void;
  onScanError?: (error: string) => void;
  enabled?: boolean;
  className?: string;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  enabled = true,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const qrScannerRef = useRef<QrScanner | null>(null); // 임시 비활성화
  
  const [isScanning, setIsScanning] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [error, setError] = useState<string>('');
  const [cameras, setCameras] = useState<any[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [testQRData, setTestQRData] = useState<string>('');

  // 현재 위치 가져오기
  const getCurrentLocation = useCallback((): Promise<{latitude: number; longitude: number}> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('브라우저에서 위치 서비스를 지원하지 않습니다'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          let message = '위치 정보를 가져올 수 없습니다';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = '위치 권한이 거부되었습니다';
              break;
            case error.POSITION_UNAVAILABLE:
              message = '위치 정보를 사용할 수 없습니다';
              break;
            case error.TIMEOUT:
              message = '위치 정보 요청이 시간 초과되었습니다';
              break;
          }
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    });
  }, []);

  // QR 코드 처리 (임시 구현)
  const handleQRResult = useCallback(async (qrData: string) => {
    try {
      // 현재 위치 가져오기
      const currentLocation = await getCurrentLocation();
      
      // QR 코드 검증
      const validationResult = validateQRForAttendance(qrData, currentLocation);
      
      if (validationResult.valid) {
        onScanSuccess(validationResult);
        setError('');
      } else {
        setError(validationResult.error || 'QR 코드 처리 중 오류가 발생했습니다');
        onScanError?.(validationResult.error || 'QR 코드 처리 실패');
      }
    } catch (locationError) {
      // 위치 정보 없이도 QR 검증 시도
      const validationResult = validateQRForAttendance(qrData);
      
      if (validationResult.valid) {
        onScanSuccess({
          ...validationResult,
          locationMatch: false // 위치 검증 불가
        });
        setError('위치 정보 없이 처리되었습니다');
      } else {
        setError(validationResult.error || 'QR 코드 처리 중 오류가 발생했습니다');
        onScanError?.(validationResult.error || 'QR 코드 처리 실패');
      }
    }
  }, [onScanSuccess, onScanError, getCurrentLocation]);

  // 테스트 QR 데이터 처리
  const handleTestQRSubmit = useCallback(() => {
    if (testQRData.trim()) {
      handleQRResult(testQRData.trim());
    }
  }, [testQRData, handleQRResult]);

  // 카메라 초기화 (임시 구현)
  const initializeCamera = useCallback(async () => {
    try {
      // 카메라 권한 확인
      const hasPermission = await checkCameraPermission();
      setHasCamera(hasPermission);

      if (!hasPermission) {
        setError('카메라를 사용할 수 없습니다. 브라우저 설정에서 카메라 권한을 확인해주세요.');
        return;
      }

      // 임시로 카메라 정보 설정
      setCameras([{ id: 'default', label: 'Default Camera' }]);
      setHasFlash(false); // 임시로 플래시 비지원

      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '카메라 초기화 중 오류가 발생했습니다';
      setError(errorMessage);
      onScanError?.(errorMessage);
    }
  }, [onScanError]);

  // 카메라 권한 확인 (임시 구현)
  const checkCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Camera permission check failed:', err);
      return false;
    }
  }, []);

  // 스캔 시작
  const startScanning = useCallback(async () => {
    if (!qrScannerRef.current || isScanning) return;

    try {
      await qrScannerRef.current.start();
      setIsScanning(true);
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '스캔 시작 중 오류가 발생했습니다';
      setError(errorMessage);
      onScanError?.(errorMessage);
    }
  }, [isScanning, onScanError]);

  // 스캔 정지
  const stopScanning = useCallback(() => {
    if (!qrScannerRef.current || !isScanning) return;

    qrScannerRef.current.stop();
    setIsScanning(false);
  }, [isScanning]);

  // 카메라 전환
  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;

    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);

    if (qrScannerRef.current) {
      await qrScannerRef.current.setCamera(cameras[nextIndex].id);
    }
  }, [cameras, currentCameraIndex]);

  // 플래시 토글
  const toggleFlash = useCallback(async () => {
    if (!qrScannerRef.current || !hasFlash) return;

    try {
      const newFlashState = !flashEnabled;
      await qrScannerRef.current.setFlash(newFlashState);
      setFlashEnabled(newFlashState);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '플래시 제어 중 오류가 발생했습니다';
      setError(errorMessage);
    }
  }, [flashEnabled, hasFlash]);

  // 컴포넌트 마운트시 카메라 초기화
  useEffect(() => {
    if (enabled) {
      initializeCamera();
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }
    };
  }, [enabled, initializeCamera]);

  // enabled 상태 변경시 스캔 제어
  useEffect(() => {
    if (enabled && hasCamera) {
      startScanning();
    } else {
      stopScanning();
    }
  }, [enabled, hasCamera, startScanning, stopScanning]);

  if (!enabled) {
    return null;
  }

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          QR 코드 스캐너
        </CardTitle>
        <CardDescription>
          출근/퇴근을 위해 QR 코드를 스캔해주세요
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          
          {/* 스캔 가이드 오버레이 */}
          {isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-white rounded-lg relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          <Button
            variant={isScanning ? "destructive" : "default"}
            onClick={isScanning ? stopScanning : startScanning}
            disabled={!hasCamera}
          >
            {isScanning ? (
              <>
                <CameraOff className="w-4 h-4 mr-2" />
                스캔 정지
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                스캔 시작
              </>
            )}
          </Button>

          {cameras.length > 1 && (
            <Button
              variant="outline"
              onClick={switchCamera}
              disabled={!isScanning}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              카메라 전환
            </Button>
          )}

          {hasFlash && (
            <Button
              variant="outline"
              onClick={toggleFlash}
              disabled={!isScanning}
            >
              {flashEnabled ? (
                <>
                  <FlashlightOff className="w-4 h-4 mr-2" />
                  플래시 끄기
                </>
              ) : (
                <>
                  <Flashlight className="w-4 h-4 mr-2" />
                  플래시 켜기
                </>
              )}
            </Button>
          )}
        </div>

        {!hasCamera && (
          <Alert>
            <AlertDescription>
              카메라 권한이 필요합니다. 브라우저 설정에서 카메라 접근을 허용해주세요.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};