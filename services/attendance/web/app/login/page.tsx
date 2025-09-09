'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/contexts/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  
  const { signIn, loading, error, isAuthenticated, clearError } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Clear errors when inputs change
  useEffect(() => {
    setLocalError(null);
    clearError();
  }, [email, password, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setLocalError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setLocalError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setLocalError(result.error || '로그인에 실패했습니다.');
      }
    } catch (err) {
      setLocalError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoType: 'admin' | 'employee') => {
    const demoCredentials = {
      admin: {
        email: 'admin@dotattendance.com',
        password: 'admin123!',
      },
      employee: {
        email: 'employee@dotattendance.com',
        password: 'employee123!',
      },
    };

    const { email: demoEmail, password: demoPassword } = demoCredentials[demoType];
    setEmail(demoEmail);
    setPassword(demoPassword);

    setIsSubmitting(true);
    const result = await signIn(demoEmail, demoPassword);
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      setLocalError(result.error || '데모 로그인에 실패했습니다.');
    }
    setIsSubmitting(false);
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">DOT 출근관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            계정에 로그인하여 출근 관리를 시작하세요
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">로그인</h2>
            <p className="text-sm text-gray-600 mt-1">
              이메일과 비밀번호를 입력하여 로그인하세요
            </p>
          </div>

          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  disabled={loading || isSubmitting}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading || isSubmitting || !email || !password}
            >
              {(loading || isSubmitting) ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* Demo Login Buttons */}
          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">데모 계정</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleDemoLogin('admin')}
                disabled={loading || isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                관리자 데모
              </button>
              <button
                onClick={() => handleDemoLogin('employee')}
                disabled={loading || isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                직원 데모
              </button>
            </div>
          </div>

          {/* Additional Links */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <a href="/register" className="text-indigo-600 hover:text-indigo-500 font-medium">
                회원가입
              </a>
            </p>
            <p className="text-xs text-gray-500">
              비밀번호를 잊으셨나요?{' '}
              <a href="/auth/reset-password" className="text-indigo-600 hover:text-indigo-500">
                비밀번호 재설정
              </a>
            </p>
          </div>
        </div>

        {/* System Status */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            시스템 상태: 정상 운영 중
          </p>
        </div>
      </div>
    </div>
  );
}