'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { multiRoleAuthService } from "@/src/services/multiRoleAuthService";
import { Clock, MapPin, Calendar, Activity, LogIn, LogOut, Loader2, AlertCircle, User } from 'lucide-react';

interface Location {
  lat: number;
  lng: number;
}

interface AttendanceStatus {
  isCheckedIn: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  workDuration?: number;
  weeklyAttendance?: number;
  monthlyHours?: number;
  lateCount?: number;
  earlyLeaveCount?: number;
}

interface WeeklyStats {
  totalDays: number;
  workingDays: number;
  lateCount: number;
  earlyLeaveCount: number;
}

interface MonthlyStats {
  totalHours: number;
  averageHours: number;
  overtimeHours: number;
}

export default function AttendancePage() {
  const router = useRouter();
  
  // Check if mobile and redirect
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const screenWidth = window.innerWidth;
      
      // If mobile device or small screen, redirect to mobile version
      if (isMobile || screenWidth < 768) {
        router.push('/attendance/mobile');
      }
    };
    
    checkMobile();
  }, [router]);
  
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [nearestLocation, setNearestLocation] = useState<any>(null);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>({
    isCheckedIn: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [workHours, setWorkHours] = useState({ hours: 0, minutes: 0 });
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({ totalDays: 7, workingDays: 5, lateCount: 0, earlyLeaveCount: 0 });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ totalHours: 160, averageHours: 8, overtimeHours: 12 });
  const [user, setUser] = useState<any>(null);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (loc1: Location, loc2: Location): number => {
    const R = 6371000; // Earth radius in meters
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
    const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate work hours if checked in
  useEffect(() => {
    if (attendanceStatus.isCheckedIn && attendanceStatus.checkInTime) {
      const timer = setInterval(() => {
        const checkIn = new Date(attendanceStatus.checkInTime!);
        const now = new Date();
        const diff = now.getTime() - checkIn.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setWorkHours({ hours, minutes });
      }, 60000); // Update every minute

      return () => clearInterval(timer);
    }
  }, [attendanceStatus]);

  // Get user's current location
  useEffect(() => {
    console.log('[GPS Debug] Starting location detection...');
    
    if (!('geolocation' in navigator)) {
      console.error('[GPS Debug] Geolocation not supported');
      setError('이 브라우저는 위치 서비스를 지원하지 않습니다');
      return;
    }

    // 먼저 getCurrentPosition으로 즉시 위치 가져오기 시도
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[GPS Debug] Initial position obtained:', position.coords);
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(newLocation);
        
        // Load business info when location is available
        loadBusinessInfo(newLocation);
      },
      (error) => {
        console.error('[GPS Debug] Initial position error:', error);
        
        // 에러 타입별 상세 메시지
        let errorMessage = '위치 정보를 가져올 수 없습니다';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다. GPS를 켜주세요.';
            break;
          case error.TIMEOUT:
            errorMessage = '위치 요청 시간이 초과되었습니다. 다시 시도해주세요.';
            break;
        }
        setError(errorMessage);
        
        // 폴백: 테스트용 기본 위치 설정 (서울시청)
        console.log('[GPS Debug] Using fallback location');
        const fallbackLocation = {
          lat: 37.5665,
          lng: 126.9780
        };
        setCurrentLocation(fallbackLocation);
      },
      {
        enableHighAccuracy: false, // 모바일에서 더 빠른 응답을 위해 false로 변경
        timeout: 30000, // 30초로 증가
        maximumAge: 60000 // 1분간 캐시 허용
      }
    );

    // watchPosition으로 지속적인 업데이트
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        console.log('[GPS Debug] Position updated:', position.coords);
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentLocation(newLocation);
        
        // Load business info when location is available
        loadBusinessInfo(newLocation);
      },
      (error) => {
        console.warn('[GPS Debug] Watch position error:', error);
        // watchPosition 에러는 무시 (이미 getCurrentPosition으로 처리)
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000
      }
    );

    return () => {
      console.log('[GPS Debug] Clearing watch');
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Load business info function
  const loadBusinessInfo = async (userLocation: Location) => {
    try {
      const info = await businessService.getBusinessInfo();
      setBusinessInfo(info);
      
      const nearest = await businessService.getNearestLocation(userLocation);
      if (nearest) {
        setNearestLocation(nearest);
        const dist = calculateDistance(userLocation, { lat: nearest.lat, lng: nearest.lng });
        setDistance(dist);
      }
    } catch (error) {
      console.error('Failed to load business info:', error);
    }
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const isAuthenticated = await unifiedAuthService.isAuthenticated();
      if (!isAuthenticated) {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleCheckIn = async () => {
    if (!currentLocation) {
      setError('위치 정보를 가져오는 중입니다...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 먼저 체크인 가능 여부 확인
      const checkInValidation = await businessService.canCheckIn(currentLocation);
      
      if (!checkInValidation.allowed) {
        setError(checkInValidation.message);
        setLoading(false);
        return;
      }

      const result = await apiService.checkIn({
        location: currentLocation,
        verificationMethod: 'gps'
      });

      setAttendanceStatus({
        isCheckedIn: true,
        checkInTime: result.checkInTime,
        workDuration: 0
      });

      alert('출근 처리가 완료되었습니다!');
    } catch (err: any) {
      setError(err.message || '출근 처리에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentLocation) {
      setError('위치 정보를 가져오는 중입니다...');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await apiService.checkOut({
        location: currentLocation
      });

      setAttendanceStatus({
        isCheckedIn: false,
        checkInTime: attendanceStatus.checkInTime,
        checkOutTime: result.checkOutTime,
        workDuration: result.workDurationMinutes
      });

      alert(`퇴근 처리가 완료되었습니다! 근무시간: ${result.workHours}시간 ${result.workMinutes}분`);
    } catch (err: any) {
      setError(err.message || '퇴근 처리에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('[DEBUG] handleLogout called');
    await unifiedAuthService.signOut();
    
    // Add delay to ensure localStorage is cleared before redirect
    setTimeout(() => {
      console.log('[DEBUG] Redirecting to login page');
      // Force page reload to ensure complete cleanup
      window.location.href = '/login';
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">DOT 근태관리</h1>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Time Display */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-500">현재 시각</p>
            <p className="text-3xl font-bold text-gray-900">
              {currentTime.toLocaleTimeString('ko-KR')}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {currentTime.toLocaleDateString('ko-KR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
        </div>

        {/* Attendance Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">출퇴근 상태</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">상태</p>
              <p className={`text-xl font-bold ${attendanceStatus.isCheckedIn ? 'text-green-600' : 'text-gray-600'}`}>
                {attendanceStatus.isCheckedIn ? '근무중' : '퇴근'}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">출근 시간</p>
              <p className="text-xl font-bold">
                {attendanceStatus.checkInTime 
                  ? new Date(attendanceStatus.checkInTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                  : '-'}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-500">근무 시간</p>
              <p className="text-xl font-bold">
                {attendanceStatus.isCheckedIn 
                  ? `${workHours.hours}시간 ${workHours.minutes}분`
                  : attendanceStatus.workDuration 
                    ? `${Math.floor(attendanceStatus.workDuration / 60)}시간 ${attendanceStatus.workDuration % 60}분`
                    : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Location Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">위치 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">현재 위치</span>
              <span className="text-sm font-medium">
                {currentLocation 
                  ? '위치 확인 완료'
                  : '위치 확인 중...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">가장 가까운 사업장</span>
              <span className="text-sm font-medium">
                {nearestLocation?.name || '확인 중...'}
              </span>
            </div>
            {nearestLocation && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">주소</span>
                <span className="text-xs text-gray-600 text-right max-w-[200px]">
                  {nearestLocation.address}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">사업장과의 거리</span>
              <span className={`text-sm font-medium ${distance && distance <= (nearestLocation?.radius || 100) ? 'text-green-600' : 'text-red-600'}`}>
                {distance !== null ? `${distance}m` : '계산 중...'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">체크인 가능 여부</span>
              <span className={`text-sm font-medium ${distance && distance <= (nearestLocation?.radius || 100) ? 'text-green-600' : 'text-amber-600'}`}>
                {distance !== null 
                  ? distance <= (nearestLocation?.radius || 100) ? '✓ 출퇴근 가능' : `⚠ ${(nearestLocation?.radius || 100)}m 이내로 접근 필요`
                  : '확인 중...'}
              </span>
            </div>
          </div>

          {!nearestLocation && (
            <div className="mt-4 p-3 bg-amber-50 rounded-md">
              <p className="text-sm text-amber-800">
                사업장 위치를 찾을 수 없습니다.
                <a href="/attendance/setup" className="ml-2 underline">설정 확인</a>
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-red-800">{error}</p>
            {error.includes('권한') && (
              <button
                onClick={() => {
                  setError('');
                  window.location.reload();
                }}
                className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                위치 권한 재요청
              </button>
            )}
          </div>
        )}
        
        {/* GPS 권한 안내 */}
        {!currentLocation && !error && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-blue-800 mb-2">📍 위치 정보를 가져오는 중입니다...</p>
            <p className="text-xs text-blue-600">
              모바일에서 GPS가 켜져 있는지 확인하세요.
              <br />
              브라우저에서 위치 권한을 요청하면 '허용'을 선택해주세요.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          {!attendanceStatus.isCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={loading || !currentLocation || !nearestLocation || (distance !== null && distance > (nearestLocation?.radius || 100))}
              className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '처리 중...' : '출근하기'}
            </button>
          ) : (
            <button
              onClick={handleCheckOut}
              disabled={loading || !currentLocation}
              className="flex-1 bg-red-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '처리 중...' : '퇴근하기'}
            </button>
          )}
        </div>

        {/* All Business Locations (Debug Info) */}
        {businessInfo && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">등록된 모든 사업장</h3>
            <div className="space-y-2">
              {businessInfo.locations.map((loc: any, idx: number) => (
                <div key={idx} className="text-xs text-gray-600 flex justify-between">
                  <span>{loc.name}</span>
                  <span className="text-gray-400">{loc.radius}m 반경</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <a href="/attendance/history" className="text-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <span className="text-2xl mb-2 block">📊</span>
            <span className="text-sm text-gray-700">근태 기록</span>
          </a>
          <a href="/attendance/setup" className="text-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <span className="text-2xl mb-2 block">⚙️</span>
            <span className="text-sm text-gray-700">위치 설정</span>
          </a>
          <a href="/auth/mfa-setup" className="text-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <span className="text-2xl mb-2 block">🔐</span>
            <span className="text-sm text-gray-700">보안 설정</span>
          </a>
          <a href="/auth/change-password" className="text-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
            <span className="text-2xl mb-2 block">🔑</span>
            <span className="text-sm text-gray-700">비밀번호 변경</span>
          </a>
        </div>
      </main>
    </div>
  );
}