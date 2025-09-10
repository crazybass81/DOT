'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import { useAuth, NotAuthenticated } from '@/src/contexts/AuthContext';
import LoginForm from '@/src/components/forms/LoginForm';

export default function Home() {
  const auth = useAuth();
  const router = useRouter();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated && auth.user) {
      const redirectUrl = getRedirectUrlForRole(auth.user.role);
      router.push(redirectUrl);
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user, router]);

  const getRedirectUrlForRole = (role: string) => {
    switch (role) {
      case 'master':
        return '/super-admin/dashboard';
      case 'admin':
        return '/admin/dashboard';
      case 'manager':
        return '/manager/dashboard';
      case 'worker':
      default:
        return '/attendance';
    }
  };

  // Show loading state while checking auth
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <NotAuthenticated
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">인증된 사용자를 리디렉션 중...</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blob blob-admin-1 opacity-20"></div>
          <div className="blob blob-admin-2 opacity-15"></div>
          <div className="blob blob-admin-3 opacity-10"></div>
        </div>
        
        {/* Login Container */}
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">DOT 근태관리</h1>
              <p className="text-gray-600">
                근태관리 시스템에 로그인하세요
              </p>
            </div>

            {/* Login Form */}
            <LoginForm 
              onSuccess={(redirectUrl) => {
                console.log('Login successful, redirecting to:', redirectUrl);
              }}
            />

            {/* Test Accounts Info */}
            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">테스트 계정</h3>
              <div className="space-y-1 text-xs text-blue-800">
                <div>
                  <strong>마스터 관리자:</strong> archt723@gmail.com / Master123!@#
                </div>
                <div>
                  <strong>사업자:</strong> crazybass81@naver.com / Test123!
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                DOT Attendance Management System v2.0
                <br />
                Powered by Supabase & Next.js
              </p>
            </div>
          </div>
        </div>
      </div>
    </NotAuthenticated>
  );
}