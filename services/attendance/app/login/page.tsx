'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cognitoAuthService } from '@/services/cognitoAuthService';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await cognitoAuthService.directSignIn(email, password);
      if (result && result.success) {
        router.push('/');
      } else {
        setError('로그인에 실패했습니다');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fillTestAccount = (accountType: string) => {
    switch (accountType) {
      case 'employee':
        setEmail('employee1@dotattendance.com');
        setPassword('TestPass123!');
        break;
      case 'admin':
        setEmail('admin@dotattendance.com');
        setPassword('AdminPass123!');
        break;
      case 'superadmin':
        setEmail('superadmin@dotattendance.com');
        setPassword('SuperAdmin123!');
        break;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            관리자 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            DOT 근태관리 시스템 · 관리자 전용
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>

          <div className="flex items-center justify-center">
            <a 
              href="/auth/reset-password"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              비밀번호를 잊으셨나요?
            </a>
          </div>

          {/* Admin Test Accounts */}
          <div className="mt-6 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-3">관리자 테스트 계정 (클릭하여 자동 입력)</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillTestAccount('admin')}
                className="text-left p-3 bg-white rounded-md shadow-sm hover:bg-blue-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">👔 사업장 관리자</p>
                    <p className="text-xs text-gray-600">admin@dotattendance.com</p>
                  </div>
                  <span className="text-xs text-blue-600">클릭</span>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => fillTestAccount('superadmin')}
                className="text-left p-3 bg-white rounded-md shadow-sm hover:bg-blue-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">🏢 서비스 관리자</p>
                    <p className="text-xs text-gray-600">superadmin@dotattendance.com</p>
                  </div>
                  <span className="text-xs text-blue-600">클릭</span>
                </div>
              </button>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>테스트 비밀번호:</strong>
              </p>
              <ul className="text-xs text-gray-500 mt-1">
                <li>• 관리자: AdminPass123!</li>
                <li>• 서비스관리자: SuperAdmin123!</li>
              </ul>
              <p className="text-xs text-green-600 mt-2">
                ✅ AWS Cognito에 실제 계정 등록 완료
              </p>
            </div>
          </div>

          {/* Notice for Employees */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 text-center">
              💡 일반 직원은 QR 코드 스캔으로 바로 출퇴근할 수 있습니다
            </p>
            <div className="mt-2 text-center">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                QR 스캔 페이지로 이동 →
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}