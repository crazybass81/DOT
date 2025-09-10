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
    if (!params.data || !deviceInfo || !isMobile) return;

    const processQRCode = async () => {
      try {
        setLoading(true);
        setStatus('checking');
        setMessage('QR 코드 확인 중...');

        // URL에서 QR 데이터 디코딩
        const qrData = decodeURIComponent(params.data as string);

        // Validate QR code
        const isValid = qrCodeService.validateQRCode(qrData);
        if (!isValid) {
          throw new Error('QR 코드가 만료되었거나 유효하지 않습니다');
        }

        // Parse QR data
        const parsedData = qrCodeService.parseQRCode(qrData);
        if (!parsedData) {
          throw new Error('QR 코드를 읽을 수 없습니다');
        }

        // Authenticate with QR
        const authResult = await qrAuthService.authenticateWithQR(
          JSON.stringify(parsedData),
          deviceInfo
        );

        if (authResult.isNewUser) {
          // New user - redirect to registration
          sessionStorage.setItem('qrBusinessId', authResult.businessId || '');
          sessionStorage.setItem('qrLocationId', authResult.locationId || '');
          router.push('/register');
          return;
        }

        // Existing user - proceed with GPS check and attendance
        setStatus('gps');
        setMessage('GPS 위치 확인 중...');

        // Get GPS location
        const location = await getGPSLocation();
        setCurrentLocation(location);

        // Load nearest business location
        const nearest = await businessService.getNearestLocation(location);
        if (!nearest) {
          throw new Error('등록된 사업장이 없습니다');
        }
        
        setNearestLocation(nearest);
        const dist = calculateDistance(location, { lat: nearest.lat, lng: nearest.lng });
        setDistance(dist);

        // Check if within allowed radius
        if (dist > nearest.radius) {
          throw new Error(`사업장 ${nearest.radius}m 이내에서만 출퇴근 가능합니다 (현재 거리: ${dist}m)`);
        }

        // Process attendance
        setStatus('processing');
        setMessage('출퇴근 처리 중...');

        const result = await apiService.checkIn({
          location: location,
          verificationMethod: 'qr' as 'qr'
        } as any);

        setStatus('success');
        setMessage('출근 처리가 완료되었습니다!');

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/');
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
  }, [params.data, deviceInfo, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Web Redirect State */}
        {status === 'web-redirect' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">모바일 전용 기능</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">웹에서 사용 가능한 기능:</h3>
              <ul className="text-sm text-blue-800 text-left space-y-1">
                <li>• 직원 근태 관리 대시보드</li>
                <li>• 출퇴근 기록 조회 및 승인</li>
                <li>• 근무 보고서 생성</li>
                <li>• 직원 정보 관리</li>
              </ul>
            </div>
            
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-[1.02]"
            >
              로그인 페이지로 이동
            </button>
            
            <p className="text-sm text-gray-500 mt-3">잠시 후 자동으로 이동합니다...</p>
          </div>
        )}

        {/* Loading State */}
        {(loading || status === 'checking' || status === 'gps' || status === 'processing') && status !== 'web-redirect' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {status === 'checking' && 'QR 코드 확인 중'}
              {status === 'gps' && 'GPS 위치 확인 중'}
              {status === 'processing' && '출퇴근 처리 중'}
              {loading && !status && 'QR 코드 처리 중'}
            </h2>
            <p className="text-gray-600 mb-4">{message}</p>
            
            {/* Show location info when available */}
            {currentLocation && nearestLocation && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>{nearestLocation.name}</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  현재 거리: {distance}m (허용: {nearestLocation.radius}m)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">출근 완료!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            
            {nearestLocation && (
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-green-800">{nearestLocation.name}</p>
                <p className="text-xs text-green-600 mt-1">
                  거리: {distance}m · {new Date().toLocaleTimeString('ko-KR')}
                </p>
              </div>
            )}
            
            <p className="text-sm text-gray-500">잠시 후 메인 화면으로 이동합니다...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">오류 발생</h2>
            <p className="text-red-600 mb-6">{error}</p>
            
            {/* Show location info if available for debugging */}
            {currentLocation && nearestLocation && (
              <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>{nearestLocation.name}</strong>
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  현재 거리: {distance}m (허용: {nearestLocation.radius}m)
                </p>
              </div>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              처음으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}