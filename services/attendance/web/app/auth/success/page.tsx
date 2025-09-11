'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Home, User } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';

export default function AuthSuccessPage() {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // 5초 후 자동으로 홈페이지로 이동
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
            {/* 성공 아이콘 */}
            <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 text-green-600 mb-6">
              <CheckCircle className="h-10 w-10" />
            </div>

            {/* 제목 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4 font-korean">
              이메일 인증 완료!
            </h1>

            {/* 사용자 정보 */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <User className="h-5 w-5 text-blue-600" />
                <span className="text-blue-800 font-medium">
                  {user?.email || 'Loading...'}
                </span>
              </div>
              <p className="text-blue-700 text-sm">
                계정이 성공적으로 인증되었습니다
              </p>
            </div>

            {/* 메시지 */}
            <p className="text-gray-600 mb-8 font-korean">
              환영합니다! 이제 DOT 출석 관리 시스템을 사용하실 수 있습니다.
              <br />
              <span className="text-sm text-gray-500">
                {countdown}초 후 자동으로 대시보드로 이동합니다.
              </span>
            </p>

            {/* 버튼들 */}
            <div className="space-y-3">
              <Link
                href="/dashboard"
                className="w-full inline-flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                <Home className="h-5 w-5 mr-2" />
                대시보드로 이동
              </Link>
              
              <Link
                href="/"
                className="w-full inline-flex items-center justify-center py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                홈페이지로 이동
              </Link>
            </div>

            {/* 추가 정보 */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center space-x-2 text-sm font-semibold text-gray-700">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-korean">DOT Attendance System v2.0</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-korean">
                계정 설정이 완료되었습니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}