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

  // QR 코드 검출 시작
  const startQRDetection = useCallback(() => {
    if (!videoRef.current || !isScanning) return;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;

    const detectQR = () => {
      if (!videoRef.current || !isScanning) return;

      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (canvas.width === 0 || canvas.height === 0) {
        requestAnimationFrame(detectQR);
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        // 실제 QR 코드 검출 시뮬레이션 (Canvas ImageData 분석)
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = analyzeImageForQR(imageData);
        
        if (qrCode) {
          handleQRResult(qrCode);
          return;
        }
      } catch (error) {
        console.warn('QR 검출 중 오류:', error);
      }
      
      // 계속 감지
      if (isScanning) {
        requestAnimationFrame(detectQR);
      }
    };

    detectQR();
  }, [isScanning, handleQRResult]);

  // 이미지에서 QR 코드 패턴 분석
  const analyzeImageForQR = (imageData: ImageData): string | null => {
    // 실제 QR 코드 감지 알고리즘 시뮬레이션
    // 여기서는 테스트 입력값이 있을 때만 반환
    if (testQRData.trim()) {
      const testData = testQRData.trim();
      setTestQRData(''); // 한 번 사용 후 클리어
      return testData;
    }
    return null;
  };

  // 스캔 시작
  const startScanning = useCallback(async () => {
    if (isScanning || !hasCamera) return;

    try {
      setIsScanning(true);
      setError('');
      
      // 카메라 스트림 시작
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: cameras.length > 1 ? cameras[currentCameraIndex].facingMode || 'environment' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // 비디오 준비 완료 후 QR 검출 시작
        videoRef.current.onloadedmetadata = () => {
          startQRDetection();
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '카메라 시작 중 오류가 발생했습니다';
      setError(errorMessage);
      setIsScanning(false);
      onScanError?.(errorMessage);
    }
  }, [isScanning, hasCamera, cameras, currentCameraIndex, onScanError, startQRDetection]);

  // 스캔 정지
  const stopScanning = useCallback(() => {
    if (!isScanning) return;
    
    setIsScanning(false);
    
    // 비디오 스트림 정지
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  }, [isScanning]);

  // 카메라 전환
  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;

    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // 현재 스트림 정지 후 새 카메라로 재시작
    if (isScanning) {
      stopScanning();
      setTimeout(() => {
        startScanning();
      }, 100);
    }
  }, [cameras, currentCameraIndex, isScanning, stopScanning, startScanning]);

  // 플래시 토글 (임시 구현)
  const toggleFlash = useCallback(async () => {
    if (!hasFlash) return;

    try {
      const newFlashState = !flashEnabled;
      setFlashEnabled(newFlashState);
      // 실제로는 카메라 플래시를 제어
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
      // 임시로 정리 로직 비활성화
      // if (qrScannerRef.current) {
      //   qrScannerRef.current.destroy();
      //   qrScannerRef.current = null;
      // }
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
          
          {/* 임시 테스트 모드 표시 */}
          {!isScanning && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center bg-white bg-opacity-90 p-4 rounded-lg">
                <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600">테스트 모드</p>
                <p className="text-xs text-gray-500">아래에서 QR 데이터를 직접 입력하세요</p>
              </div>
            </div>
          )}
        </div>

        {/* 테스트용 QR 데이터 입력 */}
        <div className="space-y-2">
          <label htmlFor="test-qr-input" className="text-sm font-medium text-gray-700">
            테스트용 QR 데이터 입력
          </label>
          <div className="flex gap-2">
            <input
              id="test-qr-input"
              type="text"
              value={testQRData}
              onChange={(e) => setTestQRData(e.target.value)}
              placeholder="QR 코드 데이터를 입력하세요..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              onClick={handleTestQRSubmit}
              disabled={!testQRData.trim()}
              size="sm"
            >
              테스트
            </Button>
          </div>
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