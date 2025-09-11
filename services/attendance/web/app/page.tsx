'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Users, Shield, Zap } from 'lucide-react';
import { useAuth, NotAuthenticated } from '@/src/contexts/AuthContext';
import LoginForm from '@/src/components/forms/LoginForm';
import { OptimizedRealTimeClock } from '@/components/ui/RealTimeClock';

export default function Home() {
  const auth = useAuth();
  const router = useRouter();


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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-korean">로딩 중...</p>
        </div>
      </div>
    );
  }

  // Redirect authenticated users - WITH DEBUG LOGGING
  useEffect(() => {
    console.log('🏠 HomePage: Auth State Check:', {
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      user: auth.user,
      userRole: auth.user?.role
    });
    
    if (!auth.isLoading && auth.isAuthenticated && auth.user) {
      const redirectUrl = getRedirectUrlForRole(auth.user.role);
      console.log('🏠 HomePage: Redirecting authenticated user to:', redirectUrl);
      router.push(redirectUrl);
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user, router]);

  return (
    <NotAuthenticated
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-korean">인증된 사용자를 리디렉션 중...</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* GitHub-style background pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        
        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Header with Real-time Clock - GitHub Style */}
          <header className="w-full pt-8 pb-6">
            <div className="max-w-4xl mx-auto px-4">
              <OptimizedRealTimeClock 
                className="mb-6" 
                showIcon={true}
                showSeconds={true}
                format="24h"
              />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
              {/* Glass-morphism Login Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                {/* Brand Header */}
                <div className="text-center mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Building2 className="w-10 h-10 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-3 font-korean">
                    DOT 출석 관리
                  </h1>
                  <p className="text-gray-600 text-lg font-korean">
                    스마트 근태관리 시스템
                  </p>
                  <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mt-4 rounded-full"></div>
                </div>

                {/* Enhanced Login Form */}
                <div className="space-y-6">
                  <LoginForm 
                    onSuccess={(redirectUrl) => {
                      console.log('Login successful, redirecting to:', redirectUrl);
                    }}
                    className="space-y-5"
                  />
                </div>

                {/* Features Highlight - GitHub Style */}
                <div className="mt-8 grid grid-cols-3 gap-4 text-center py-6 border-t border-gray-100">
                  <div className="flex flex-col items-center">
                    <Users className="w-5 h-5 text-blue-600 mb-2" />
                    <span className="text-xs text-gray-600 font-korean">다중 역할</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Shield className="w-5 h-5 text-green-600 mb-2" />
                    <span className="text-xs text-gray-600 font-korean">보안 인증</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Zap className="w-5 h-5 text-yellow-600 mb-2" />
                    <span className="text-xs text-gray-600 font-korean">실시간 동기화</span>
                  </div>
                </div>

                {/* Development Test Accounts */}
                <div className="mt-6 p-4 bg-blue-50/50 backdrop-blur-sm border border-blue-200/50 rounded-xl">
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 font-korean">개발 테스트 계정</h3>
                  <div className="space-y-2 text-xs text-blue-800 font-korean">
                    <div className="flex justify-between items-center">
                      <strong>마스터 관리자:</strong>
                      <code className="bg-blue-100 px-2 py-1 rounded text-xs">Master123!@#</code>
                    </div>
                    <div className="flex justify-between items-center">
                      <strong>사업자:</strong>
                      <code className="bg-blue-100 px-2 py-1 rounded text-xs">Test123!</code>
                    </div>
                  </div>
                </div>

                {/* System Info - GitHub Footer Style */}
                <footer className="mt-8 pt-6 border-t border-gray-100 text-center">
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-sm font-semibold text-gray-700">
                      <Building2 className="w-4 h-4" />
                      <span className="font-korean">DOT Attendance System v2.0</span>
                    </div>
                    <p className="text-xs text-gray-500 font-korean">
                      Powered by Supabase & Next.js
                      <br />
                      Enterprise Grade Security & Performance
                    </p>
                  </div>
                </footer>
              </div>
            </div>
          </main>

          {/* Bottom spacing */}
          <div className="pb-8"></div>
        </div>
      </div>
    </NotAuthenticated>
  );
}