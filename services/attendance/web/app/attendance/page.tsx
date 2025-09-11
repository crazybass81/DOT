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

  // Load business info function - mock implementation for now
  const loadBusinessInfo = async (userLocation: Location) => {
    try {
      // Mock business info for testing
      const mockBusinessInfo = {
        locations: [
          {
            id: '1',
            name: '본사',
            address: '서울시 강남구 테헤란로 123',
            lat: 37.5665,
            lng: 126.9780,
            radius: 100
          }
        ]
      };
      
      setBusinessInfo(mockBusinessInfo);
      
      // Find nearest location
      const nearest = mockBusinessInfo.locations[0];
      setNearestLocation(nearest);
      const dist = calculateDistance(userLocation, { lat: nearest.lat, lng: nearest.lng });
      setDistance(dist);
    } catch (error) {
      console.error('Failed to load business info:', error);
    }
  };

  // Check authentication and load user
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await multiRoleAuthService.getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
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
      // Check if user is within allowed radius
      if (distance !== null && distance > (nearestLocation?.radius || 100)) {
        setError(`사업장에서 ${nearestLocation?.radius || 100}m 이내로 접근해주세요. (현재 거리: ${distance}m)`);
        setLoading(false);
        return;
      }

      // Mock successful check-in
      const currentTime = new Date().toISOString();
      setAttendanceStatus({
        isCheckedIn: true,
        checkInTime: currentTime,
        workDuration: 0
      });

      // Show success message
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = '✅ 출근 처리가 완료되었습니다!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);

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
      // Calculate work duration
      const checkInTime = new Date(attendanceStatus.checkInTime!);
      const checkOutTime = new Date();
      const workDurationMs = checkOutTime.getTime() - checkInTime.getTime();
      const workDurationMinutes = Math.floor(workDurationMs / (1000 * 60));
      const workHours = Math.floor(workDurationMinutes / 60);
      const workMinutes = workDurationMinutes % 60;

      setAttendanceStatus({
        isCheckedIn: false,
        checkInTime: attendanceStatus.checkInTime,
        checkOutTime: checkOutTime.toISOString(),
        workDuration: workDurationMinutes
      });

      // Show success message with work duration
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
      notification.textContent = `✅ 퇴근 처리 완료! 근무시간: ${workHours}시간 ${workMinutes}분`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 4000);

    } catch (err: any) {
      setError(err.message || '퇴근 처리에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('[DEBUG] handleLogout called');
    await multiRoleAuthService.signOut();
    
    // Add delay to ensure localStorage is cleared before redirect
    setTimeout(() => {
      console.log('[DEBUG] Redirecting to login page');
      // Force page reload to ensure complete cleanup
      window.location.href = '/login';
    }, 100);
  };

  // Format time function for Korean timezone
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ko-KR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Clean Header with minimal info */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {user?.name || '직원'}
                </h1>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* GitHub-style Large Clock Display */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
            <div className="mb-2">
              <Clock className="w-6 h-6 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-1">현재 시간</p>
            </div>
            <div className="text-5xl md:text-6xl font-mono font-bold text-gray-900 mb-2">
              {formatTime(currentTime)}
            </div>
            <p className="text-lg text-gray-600">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white border border-gray-200">
            <div className={`w-2 h-2 rounded-full ${attendanceStatus.isCheckedIn ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-700">
              {attendanceStatus.isCheckedIn ? '근무중' : '미출근'}
            </span>
          </div>
        </div>

        {/* Main Action Button - GitHub style large and centered */}
        <div className="mb-8">
          {!attendanceStatus.isCheckedIn ? (
            <button
              onClick={handleCheckIn}
              disabled={loading || !currentLocation || !nearestLocation || (distance !== null && distance > (nearestLocation?.radius || 100))}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-6 px-8 rounded-2xl text-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:hover:scale-100 shadow-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>처리 중...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <LogIn className="w-6 h-6" />
                  <span>출근하기</span>
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={handleCheckOut}
              disabled={loading || !currentLocation}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-6 px-8 rounded-2xl text-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:hover:scale-100 shadow-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>처리 중...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <LogOut className="w-6 h-6" />
                  <span>퇴근하기</span>
                </div>
              )}
            </button>
          )}
        </div>

        {/* Today's Work Status */}
        {attendanceStatus.isCheckedIn && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              오늘의 근무 현황
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">출근 시간</p>
                <p className="text-lg font-semibold text-gray-900">
                  {attendanceStatus.checkInTime 
                    ? new Date(attendanceStatus.checkInTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">예상 퇴근</p>
                <p className="text-lg font-semibold text-gray-900">
                  {attendanceStatus.checkInTime 
                    ? new Date(new Date(attendanceStatus.checkInTime).getTime() + 8 * 60 * 60 * 1000).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : '-'}
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 mb-1">누적 근무</p>
                <p className="text-lg font-semibold text-blue-700">
                  {workHours.hours}시간 {workHours.minutes}분
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Weekly/Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              이번 주
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">출근 일수</span>
                <span className="font-semibold text-gray-900">{weeklyStats.workingDays}/{weeklyStats.totalDays}일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">지각</span>
                <span className={`font-semibold ${weeklyStats.lateCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {weeklyStats.lateCount}회
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">조퇴</span>
                <span className={`font-semibold ${weeklyStats.earlyLeaveCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {weeklyStats.earlyLeaveCount}회
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              이번 달
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">총 근무시간</span>
                <span className="font-semibold text-gray-900">{monthlyStats.totalHours}시간</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">일평균 근무</span>
                <span className="font-semibold text-gray-900">{monthlyStats.averageHours}시간</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">초과근무</span>
                <span className={`font-semibold ${monthlyStats.overtimeHours > 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                  {monthlyStats.overtimeHours}시간
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Status - Minimal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            위치 확인
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {nearestLocation?.name || '사업장 확인 중...'}
              </p>
              <p className="text-xs text-gray-500">
                {distance !== null 
                  ? `현재 위치에서 ${distance}m`
                  : '위치 계산 중...'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              distance !== null && distance <= (nearestLocation?.radius || 100)
                ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {distance !== null && distance <= (nearestLocation?.radius || 100) 
                ? '출퇴근 가능' 
                : '범위 밖'}
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
            {error.includes('권한') && (
              <button
                onClick={() => {
                  setError('');
                  window.location.reload();
                }}
                className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
              >
                위치 권한 재요청
              </button>
            )}
          </div>
        )}

        {/* GPS Loading Message */}
        {!currentLocation && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <p className="text-sm text-blue-800">위치 정보를 가져오는 중입니다...</p>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              GPS를 켜고 위치 권한을 허용해주세요.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}