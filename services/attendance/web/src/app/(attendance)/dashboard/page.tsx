'use client';

import { useState, useEffect } from 'react';
import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance';
import { useToastNotifications } from '@/hooks/useToastNotifications';
import RealtimeAttendance from '@/components/dashboard/RealtimeAttendance';
import AttendanceStats from '@/components/dashboard/AttendanceStats';
import AttendanceCheckInOut from '@/components/attendance/AttendanceCheckInOut';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  organizationId: string;
  role: 'master' | 'admin' | 'worker';
}

export default function AttendanceDashboard() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToastNotifications();

  // 사용자 프로필 로드
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('로그인이 필요합니다');
        }

        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('사용자 정보를 불러올 수 없습니다');
        }

        const data = await response.json();
        setUserProfile(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '사용자 정보 로드 실패';
        setError(errorMessage);
        showToast({
          type: 'error',
          title: '로드 실패',
          message: errorMessage,
          duration: 5000
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [showToast]);

  // 출퇴근 처리 성공 핸들러
  const handleAttendanceSuccess = () => {
    showToast({
      type: 'success',
      title: '처리 완료',
      message: '출퇴근 처리가 완료되었습니다',
      duration: 3000
    });
  };

  // 출퇴근 처리 에러 핸들러
  const handleAttendanceError = (error: string) => {
    showToast({
      type: 'error',
      title: '처리 실패',
      message: error,
      duration: 5000
    });
  };

  // 실시간 알림 핸들러
  const handleRealtimeNotification = (notification: any) => {
    if (notification.type === 'attendance_update') {
      showToast({
        type: 'info',
        title: '실시간 업데이트',
        message: notification.message,
        duration: 4000
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">사용자 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h1>
          <p className="text-gray-600 mb-6">{error || '사용자 정보를 불러올 수 없습니다'}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">출근 관리 대시보드</h1>
              <p className="text-sm text-gray-600 mt-1">
                안녕하세요, {userProfile.full_name}님! 
                ({userProfile.role === 'master' ? '마스터 관리자' : 
                  userProfile.role === 'admin' ? '관리자' : '직원'})
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                오늘 ({new Date().toLocaleDateString('ko-KR', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  weekday: 'long'
                })})
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleTimeString('ko-KR', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Check-in/out + Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Check-in/out Component */}
            <AttendanceCheckInOut
              employeeId={userProfile.id}
              businessId={userProfile.organizationId}
              onSuccess={handleAttendanceSuccess}
              onError={handleAttendanceError}
            />

            {/* Quick Stats */}
            <AttendanceStats
              organizationId={userProfile.organizationId}
              userRole={userProfile.role}
            />
          </div>

          {/* Right Column: Realtime Attendance */}
          <div className="lg:col-span-2">
            <RealtimeAttendance
              organizationId={userProfile.organizationId}
              onNotification={handleRealtimeNotification}
            />
          </div>
        </div>

        {/* Admin/Master Additional Features */}
        {(userProfile.role === 'admin' || userProfile.role === 'master') && (
          <div className="mt-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">관리자 기능</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-blue-600 text-2xl mb-2">📊</div>
                  <div className="text-sm font-medium">출근 통계</div>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-green-600 text-2xl mb-2">👥</div>
                  <div className="text-sm font-medium">직원 관리</div>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-purple-600 text-2xl mb-2">⚙️</div>
                  <div className="text-sm font-medium">설정</div>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="text-red-600 text-2xl mb-2">📝</div>
                  <div className="text-sm font-medium">보고서</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}