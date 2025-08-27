'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);
  
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩중...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            DOT Marketing
          </h1>
          <p className="text-lg text-gray-600">
            스토어와 크리에이터를 연결하는 AI 매칭 플랫폼
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={() => signIn('google')}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 hover:shadow-md transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium">Google 계정으로 시작하기</span>
          </button>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">✨</span>
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">
                  API 키 설정 불필요!
                </p>
                <p className="text-blue-700">
                  Google 계정만 있으면 바로 시작할 수 있습니다.
                  복잡한 설정 없이 즉시 분석을 시작하세요.
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-2">
              🚀 글로벌 서비스 준비 완료
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• YouTube 크리에이터 10,000+ 검색/일 (무료)</li>
              <li>• Google Maps 장소 정보 실시간 분석</li>
              <li>• AI 기반 최적 매칭 알고리즘</li>
              <li>• 다국어 지원 (한국어, English)</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>로그인 시 Google의 YouTube Data API 사용 권한에 동의하게 됩니다.</p>
        <p>개인 정보는 안전하게 보호됩니다.</p>
      </div>
    </div>
  );
}