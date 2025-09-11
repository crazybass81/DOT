'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Home, RefreshCw, Mail } from 'lucide-react';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const message = searchParams.get('message') || '알 수 없는 오류가 발생했습니다.';
    setErrorMessage(decodeURIComponent(message));
  }, [searchParams]);

  const handleResendEmail = () => {
    // 인증메일 재발송 기능
    window.location.href = '/signup?resend=true';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
            {/* 에러 아이콘 */}
            <div className="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 text-red-600 mb-6">
              <AlertCircle className="h-10 w-10" />
            </div>

            {/* 제목 */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4 font-korean">
              인증 오류
            </h1>

            {/* 에러 메시지 */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-800 text-sm">
                {errorMessage}
              </p>
            </div>

            {/* 해결 방법 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
              <h3 className="text-blue-800 font-semibold mb-2">해결 방법:</h3>
              <ul className="text-blue-700 text-sm text-left space-y-1">
                <li>• 이메일 링크가 만료되었을 수 있습니다</li>
                <li>• 브라우저 캐시를 삭제하고 다시 시도해보세요</li>
                <li>• 다른 브라우저에서 링크를 클릭해보세요</li>
                <li>• 인증메일을 다시 요청해보세요</li>
              </ul>
            </div>

            {/* 버튼들 */}
            <div className="space-y-3">
              <button
                onClick={handleResendEmail}
                className="w-full inline-flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
              >
                <Mail className="h-5 w-5 mr-2" />
                인증메일 재발송
              </button>
              
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                새로 회원가입
              </Link>
              
              <Link
                href="/"
                className="w-full inline-flex items-center justify-center py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                <Home className="h-5 w-5 mr-2" />
                홈페이지로 이동
              </Link>
            </div>

            {/* 고객지원 정보 */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-korean">
                문제가 계속 발생하면 고객지원팀에 문의해주세요
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}