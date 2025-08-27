'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmSignIn, updatePassword } from '@aws-amplify/auth';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('비밀번호는 8자 이상, 대소문자, 숫자, 특수문자를 포함해야 합니다');
      return;
    }

    setLoading(true);

    try {
      if (isFirstLogin) {
        // First login - Cognito forces password change
        await confirmSignIn({ challengeResponse: newPassword });
      } else {
        // Regular password change
        await updatePassword({
          oldPassword: currentPassword,
          newPassword: newPassword
        });
      }
      
      // Success - redirect to main page
      router.push('/attendance');
    } catch (err: any) {
      console.error('Password change error:', err);
      setError(err.message || '비밀번호 변경에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            비밀번호 변경
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isFirstLogin ? '첫 로그인입니다. 새 비밀번호를 설정해주세요.' : '보안을 위해 정기적으로 비밀번호를 변경해주세요.'}
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}
          
          <div className="space-y-4">
            {!isFirstLogin && (
              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700">
                  현재 비밀번호
                </label>
                <input
                  id="current-password"
                  name="current-password"
                  type="password"
                  required={!isFirstLogin}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="현재 비밀번호"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
            )}
            
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                새 비밀번호
              </label>
              <input
                id="new-password"
                name="new-password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="새 비밀번호 (8자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                새 비밀번호 확인
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="새 비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">비밀번호 요구사항:</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>최소 8자 이상</li>
              <li>대문자 포함 (A-Z)</li>
              <li>소문자 포함 (a-z)</li>
              <li>숫자 포함 (0-9)</li>
              <li>특수문자 포함 (@$!%*?&)</li>
            </ul>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}