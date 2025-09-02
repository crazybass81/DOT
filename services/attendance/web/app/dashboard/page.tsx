'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import { supabase } from '@/lib/supabase-config';
import { toast } from 'react-hot-toast';
import { useRequireApproval } from '@/hooks/useAuthGuard';

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    approval_status: string;
  };
  attendanceToday?: {
    checkIn?: string;
    checkOut?: string;
  };
  stats?: {
    totalWorkDays: number;
    presentDays: number;
    lateDays: number;
    attendanceRate: number;
  };
}

export default function Dashboard() {
  const router = useRouter();
  const auth = useRequireApproval();
  const [attendanceData, setAttendanceData] = useState<{
    checkIn?: string;
    checkOut?: string;
  } | null>(null);
  const [stats] = useState({
    totalWorkDays: 22,
    presentDays: 20,
    lateDays: 2,
    attendanceRate: 91
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load attendance data when user is ready
  useEffect(() => {
    if (auth.user && !auth.isLoading) {
      loadAttendanceData();
    }
  }, [auth.user, auth.isLoading]);

  const loadAttendanceData = async () => {
    if (!auth.user) return;
    
    try {
      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: attendanceRecord } = await supabase
        .from('attendance_records')
        .select('check_in_time, check_out_time')
        .eq('employee_id', auth.user.id)
        .eq('date', today)
        .single();

      setAttendanceData(attendanceRecord ? {
        checkIn: attendanceRecord.check_in_time,
        checkOut: attendanceRecord.check_out_time
      } : null);

    } catch (error: any) {
      console.error('Error loading attendance:', error);
      // Don't show error toast for missing attendance data
    }
  };

  const handleLogout = async () => {
    try {
      await supabaseAuthService.signOut();
      toast.success('로그아웃되었습니다.');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('로그아웃 중 오류가 발생했습니다.');
    }
  };

  const handleAttendance = () => {
    router.push('/attendance');
  };

  // Show loading while auth is being checked
  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // If auth guard redirected or user is not available, don't render
  if (!auth.user || !auth.isAuthenticated || !auth.isApproved) {
    return null;
  }

  const { user } = auth;
  const isAdmin = auth.isAdmin;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
              <span className="text-sm text-gray-500">
                {currentTime.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {currentTime.toLocaleTimeString('ko-KR')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                안녕하세요, <span className="font-medium">{user.name}</span>님
              </span>
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  관리자 페이지
                </button>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Attendance Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">오늘 출퇴근</h3>
              <span className="text-2xl">🕐</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">출근 시간</span>
                <span className="text-sm font-medium text-gray-900">
                  {attendanceData?.checkIn 
                    ? new Date(attendanceData.checkIn).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '미출근'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">퇴근 시간</span>
                <span className="text-sm font-medium text-gray-900">
                  {attendanceData?.checkOut 
                    ? new Date(attendanceData.checkOut).toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : '미퇴근'
                  }
                </span>
              </div>
            </div>
            <button
              onClick={handleAttendance}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              출퇴근 기록
            </button>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">출근율</h3>
              <span className="text-2xl">📊</span>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats?.attendanceRate}%
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats?.attendanceRate}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {stats?.presentDays}/{stats?.totalWorkDays} 일 출근
              </p>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">계정 상태</h3>
              <span className="text-2xl">✅</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">승인 상태</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  승인됨
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">권한</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.role === 'EMPLOYEE' && '직원'}
                  {user.role === 'MANAGER' && '매니저'}
                  {user.role === 'ADMIN' && '관리자'}
                  {user.role === 'MASTER_ADMIN' && '마스터 관리자'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">계정 활성화</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  활성
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">최근 출퇴근 기록</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-4 block">📅</span>
              <p>출퇴근 기록이 없습니다.</p>
              <p className="text-sm mt-2">출퇴근 버튼을 눌러 기록을 시작하세요.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}