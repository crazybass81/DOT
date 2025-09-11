'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { multiRoleAuthService } from "@/src/services/multiRoleAuthService";
import { userService } from '@/src/services/userService';
import AttendanceStats from '@/components/dashboard/AttendanceStats';
import RealtimeAttendance from '@/components/dashboard/RealtimeAttendance';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import QuickActionPanel from '@/components/dashboard/QuickActionPanel';
import AttendanceChart from '@/components/dashboard/AttendanceChart';
import NotificationSystem, { NotificationProvider, useNotifications } from '@/components/notifications/NotificationSystem';

// Wrapper component to provide notification context
function AdminDashboardContent() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState('default-org'); // TODO: Get from user context

  // Use notifications hook
  const { showNotification, showSuccess, showError, showInfo, setNotificationSystem } = useNotifications();

  useEffect(() => {
    // Check authentication and admin rights
    const checkAuth = async () => {
      // TODO: Implement proper auth check
      // if (!await unifiedAuthService.isAuthenticated()) {
      //   router.push('/login');
      //   return;
      // }

      const user = userService.getCurrentUser();
      if (!user || !userService.isAdmin()) {
        alert('관리자 권한이 필요합니다');
        router.push('/attendance');
        return;
      }

      setUserName(user.name || user.email);
      // TODO: Get actual organization ID from user
      setOrganizationId((user as any).organizationId || 'default-org');
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  // Handle realtime notifications
  const handleRealtimeNotification = (notification: any) => {
    showNotification(notification);
    
    // Show additional success message for important events
    if (notification.priority === 'high') {
      showSuccess('중요 알림', notification.message);
    }
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await unifiedAuthService.signOut();
    
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
    <div className="min-h-screen bg-gray-50">
      {/* GitHub-style Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Left Section */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">D</span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">DOT Admin</h1>
              </div>
              
              {/* Real-time Clock */}
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-mono text-gray-700">
                    {currentTime.toLocaleTimeString('ko-KR')}
                  </span>
                </div>
                <span className="text-gray-500 hidden sm:block">
                  {currentTime.toLocaleDateString('ko-KR', {
                    month: 'short',
                    day: 'numeric',
                    weekday: 'short'
                  })}
                </span>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {/* Search (GitHub-style) */}
              <div className="hidden md:block relative">
                <input
                  type="text"
                  placeholder="직원 검색..."
                  className="w-64 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-8"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-2 top-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 hidden sm:block">
                  <span className="font-medium">{userName}</span>
                </span>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* GitHub-style Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 py-2">
            <a
              href="/admin/dashboard"
              className="flex items-center gap-2 py-2 px-3 border-b-2 border-blue-500 text-sm font-medium text-blue-600 rounded-t-md"
            >
              <span>📊</span>
              대시보드
            </a>
            <a
              href="/admin/employees"
              className="flex items-center gap-2 py-2 px-3 border-b-2 border-transparent text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 rounded-t-md transition-colors"
            >
              <span>👥</span>
              직원 관리
            </a>
            <a
              href="/admin/attendance"
              className="flex items-center gap-2 py-2 px-3 border-b-2 border-transparent text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 rounded-t-md transition-colors"
            >
              <span>🕐</span>
              근태 기록
            </a>
            <a
              href="/admin/reports"
              className="flex items-center gap-2 py-2 px-3 border-b-2 border-transparent text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 rounded-t-md transition-colors"
            >
              <span>📈</span>
              보고서
            </a>
            <a
              href="/admin/settings"
              className="flex items-center gap-2 py-2 px-3 border-b-2 border-transparent text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 rounded-t-md transition-colors"
            >
              <span>⚙️</span>
              설정
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Quick Action Panel */}
          <QuickActionPanel 
            organizationId={organizationId}
            onNotification={handleRealtimeNotification}
          />

          {/* Stats Overview */}
          <AttendanceStats 
            organizationId={organizationId}
            onNotification={handleRealtimeNotification}
          />

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Employee Monitoring (2 columns) */}
            <div className="xl:col-span-2">
              <RealtimeAttendance 
                organizationId={organizationId}
                onNotification={handleRealtimeNotification}
              />
            </div>

            {/* Activity Feed (1 column) */}
            <div className="xl:col-span-1">
              <ActivityFeed 
                organizationId={organizationId}
                onNotification={handleRealtimeNotification}
              />
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AttendanceChart />
            
            {/* Performance Insights */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">성과 인사이트</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <span className="text-green-600">🎯</span>
                      <div>
                        <p className="font-medium text-green-900">출근율 목표 달성</p>
                        <p className="text-sm text-green-700">이번 주 평균 96.2%</p>
                      </div>
                    </div>
                    <span className="text-green-600 font-bold">✅</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <span className="text-blue-600">📈</span>
                      <div>
                        <p className="font-medium text-blue-900">생산성 향상</p>
                        <p className="text-sm text-blue-700">평균 근무시간 최적화</p>
                      </div>
                    </div>
                    <span className="text-blue-600 font-bold">+12%</span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                      <span className="text-purple-600">🏆</span>
                      <div>
                        <p className="font-medium text-purple-900">이번 달 우수 부서</p>
                        <p className="text-sm text-purple-700">개발팀 - 100% 출근율</p>
                      </div>
                    </div>
                    <span className="text-purple-600 font-bold">🥇</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Notification System */}
      <NotificationSystem 
        position="top-right"
        defaultDuration={5000}
        maxNotifications={5}
        enableSounds={true}
      />
    </div>
  );
}

// Main component with notification provider
export default function AdminDashboard() {
  return (
    <NotificationProvider>
      <AdminDashboardContent />
    </NotificationProvider>
  );
}