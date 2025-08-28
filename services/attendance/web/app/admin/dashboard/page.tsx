'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cognitoAuthService } from '@/services/cognitoAuthService';
import { userService } from '@/services/userService';
import AttendanceStats from '@/components/dashboard/AttendanceStats';
import RealtimeAttendance from '@/components/dashboard/RealtimeAttendance';
import AttendanceChart from '@/components/dashboard/AttendanceChart';

export default function AdminDashboard() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication and admin rights
    const checkAuth = () => {
      if (!cognitoAuthService.isAuthenticated()) {
        router.push('/login');
        return;
      }

      const user = userService.getCurrentUser();
      if (!user || !userService.isAdmin()) {
        alert('관리자 권한이 필요합니다');
        router.push('/attendance');
        return;
      }

      setUserName(user.name || user.email);
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    cognitoAuthService.signOut();
    
    // Add delay to ensure localStorage is cleared before redirect
    setTimeout(() => {
      // Force page reload to ensure complete cleanup
      window.location.href = '/login';
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">관리자 대시보드</h1>
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
                안녕하세요, <span className="font-medium">{userName}</span>님
              </span>
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

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8 py-2">
            <a
              href="/admin/dashboard"
              className="py-2 px-1 border-b-2 border-blue-500 text-sm font-medium text-blue-600"
            >
              대시보드
            </a>
            <a
              href="/admin/employees"
              className="py-2 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              직원 관리
            </a>
            <a
              href="/admin/attendance"
              className="py-2 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              근태 기록
            </a>
            <a
              href="/admin/settings"
              className="py-2 px-1 border-b-2 border-transparent text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              설정
            </a>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <button 
            onClick={() => router.push('/admin/approvals')}
            className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg text-center transition-colors relative"
          >
            <div className="absolute top-2 right-2 bg-white text-red-600 text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              2
            </div>
            <span className="text-2xl mb-2 block">👥</span>
            <span className="text-sm font-medium">승인 대기</span>
          </button>
          <button 
            onClick={() => router.push('/admin/manual-attendance')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center transition-colors"
          >
            <span className="text-2xl mb-2 block">✍️</span>
            <span className="text-sm font-medium">수동 출퇴근</span>
          </button>
          <button 
            onClick={() => router.push('/admin/qr-display')}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center transition-colors"
          >
            <span className="text-2xl mb-2 block">🔲</span>
            <span className="text-sm font-medium">QR 코드</span>
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg text-center transition-colors">
            <span className="text-2xl mb-2 block">📊</span>
            <span className="text-sm font-medium">보고서</span>
          </button>
        </div>

        {/* Stats Overview */}
        <AttendanceStats />

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <AttendanceChart />
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">오늘의 알림</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                <span className="text-yellow-500">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">3명 지각</p>
                  <p className="text-xs text-gray-600">오전 9시 이후 출근</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <span className="text-blue-500">ℹ️</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">주간 보고서 준비</p>
                  <p className="text-xs text-gray-600">금요일 오후 5시까지</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-green-500">✅</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">출근율 목표 달성</p>
                  <p className="text-xs text-gray-600">이번 주 95% 이상</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Realtime Attendance Table */}
        <div className="mt-6">
          <RealtimeAttendance />
        </div>
      </main>
    </div>
  );
}