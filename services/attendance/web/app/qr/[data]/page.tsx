'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { validateQRForAttendance, QRValidationResult, QRData } from '../../../lib/qr-utils';
import { CheckCircle, XCircle, Loader2, Smartphone, MapPin, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export default function QRHandlerPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'checking' | 'gps' | 'processing' | 'success' | 'error' | 'web-redirect'>('checking');
  const [message, setMessage] = useState('');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Calculate distance using Haversine formula
  const calculateDistance = (loc1: Location, loc2: { latitude: number; longitude: number }): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  // Get GPS location
  const getGPSLocation = async (): Promise<Location> => {
    if (!('geolocation' in navigator)) {
      throw new Error('이 기기는 GPS를 지원하지 않습니다');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          if (error.code === 1) {
            reject(new Error('GPS 권한이 필요합니다. 설정에서 위치 권한을 허용해주세요.'));
          } else {
            reject(new Error('위치를 확인할 수 없습니다'));
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    });
  };

  // Check if device is mobile
  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      setIsMobile(isMobileDevice);
      
      if (!isMobileDevice) {
        setStatus('web-redirect');
        setMessage('이 기능은 모바일 전용입니다. 웹에서는 관리자 대시보드를 이용해주세요.');
        setLoading(false);
        // 3초 후 홈으로 리디렉트
        setTimeout(() => {
          router.push('/');
        }, 3000);
        return;
      }
    };
    
    checkDevice();
  }, [router]);

  useEffect(() => {
    if (!params.data || !isMobile) return;

    const processQRCode = async () => {
      try {
        setLoading(true);
        setStatus('checking');
        setMessage('QR 코드 확인 중...');

        // URL에서 QR 데이터 디코딩
        const encryptedQRData = decodeURIComponent(params.data as string);

        // GPS 위치 먼저 가져오기
        setStatus('gps');
        setMessage('GPS 위치 확인 중...');
        
        const location = await getGPSLocation();
        setCurrentLocation(location);

        // QR 코드 검증 (위치 정보 포함)
        const validationResult: QRValidationResult = validateQRForAttendance(encryptedQRData, location);
        
        if (!validationResult.valid) {
          throw new Error(validationResult.error || 'QR 코드 검증에 실패했습니다');
        }

        if (!validationResult.data) {
          throw new Error('QR 코드 데이터를 읽을 수 없습니다');
        }

        setQrData(validationResult.data);

        // 조직 QR 코드인 경우 거리 계산
        if (validationResult.data.type === 'organization') {
          const orgData = validationResult.data as any;
          const dist = calculateDistance(location, orgData.location);
          setDistance(dist);
          
          if (!validationResult.locationMatch) {
            throw new Error(`허용된 위치에서 벗어났습니다 (현재 거리: ${dist}m, 허용 반경: ${orgData.location.radius}m)`);
          }
        }

        // 출퇴근 처리
        setStatus('processing');
        setMessage('출퇴근 처리 중...');

        // TODO: 실제 백엔드 API 연동
        // 현재는 시뮬레이션으로 처리
        await new Promise(resolve => setTimeout(resolve, 1500));

        const attendanceResult = {
          success: true,
          method: 'qr',
          qr_data: validationResult.data,
          location: location,
          timestamp: new Date().toISOString(),
          location_verified: validationResult.locationMatch
        };

        console.log('QR 출퇴근 처리 결과:', attendanceResult);

        setStatus('success');
        setMessage('출퇴근 처리가 완료되었습니다!');

        // 2초 후 대시보드로 리디렉트
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);

      } catch (error: any) {
        console.error('QR processing error:', error);
        setError(error.message || 'QR 코드 처리 중 오류가 발생했습니다');
        setStatus('error');
      } finally {
        setLoading(false);
      }
    };

    processQRCode();
  }, [params.data, isMobile, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Smartphone className="w-6 h-6" />
            QR 출퇴근 처리
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Web Redirect State */}
          {status === 'web-redirect' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-10 h-10 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">모바일 전용 기능</h2>
                <p className="text-gray-600 mb-4">{message}</p>
              </div>
              
              <Alert>
                <AlertDescription>
                  <div className="text-left space-y-2">
                    <p className="font-semibold">웹에서 사용 가능한 기능:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• QR 코드 생성기</li>
                      <li>• 근태 관리 대시보드</li>
                      <li>• 출퇴근 기록 조회</li>
                      <li>• 직원 정보 관리</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={() => router.push('/')}
                className="w-full"
              >
                홈으로 이동
              </Button>
              
              <p className="text-sm text-gray-500">잠시 후 자동으로 이동합니다...</p>
            </div>
          )}

          {/* Loading States */}
          {(loading || status === 'checking' || status === 'gps' || status === 'processing') && status !== 'web-redirect' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {status === 'checking' && 'QR 코드 확인 중'}
                  {status === 'gps' && 'GPS 위치 확인 중'}
                  {status === 'processing' && '출퇴근 처리 중'}
                  {loading && !status && 'QR 코드 처리 중'}
                </h2>
                <p className="text-gray-600">{message}</p>
              </div>
              
              {/* QR 데이터 표시 */}
              {qrData && (
                <Alert>
                  <AlertDescription>
                    <div className="flex items-center gap-2">
                      {qrData.type === 'organization' ? (
                        <Building2 className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                      <span className="text-sm">
                        {qrData.type === 'organization' 
                          ? `조직: ${(qrData as any).name}` 
                          : `직원: ${(qrData as any).name}`
                        }
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 위치 정보 표시 */}
              {currentLocation && qrData?.type === 'organization' && distance !== null && (
                <Alert>
                  <MapPin className="w-4 h-4" />
                  <AlertDescription>
                    현재 거리: {distance}m (허용: {(qrData as any).location.radius}m)
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">출퇴근 완료!</h2>
                <p className="text-gray-600">{message}</p>
              </div>
              
              {qrData && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {qrData.type === 'organization' ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                        <span className="font-medium">
                          {qrData.type === 'organization' 
                            ? (qrData as any).name 
                            : `${(qrData as any).name} (${(qrData as any).position})`
                          }
                        </span>
                      </div>
                      {distance !== null && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>거리: {distance}m</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{new Date().toLocaleString('ko-KR')}</span>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <p className="text-sm text-gray-500">잠시 후 대시보드로 이동합니다...</p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">처리 실패</h2>
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
              
              {/* 디버깅 정보 */}
              {currentLocation && qrData && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2 text-sm">
                      <div>QR 유형: {qrData.type === 'organization' ? '조직' : '직원'}</div>
                      {distance !== null && qrData.type === 'organization' && (
                        <div>거리: {distance}m / 허용: {(qrData as any).location.radius}m</div>
                      )}
                      <div>위치: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}</div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                onClick={() => router.push('/')}
                variant="outline"
                className="w-full"
              >
                처음으로 돌아가기
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}