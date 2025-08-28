'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AttendanceSuccessPage() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceType] = useState<'checkIn' | 'checkOut'>('checkIn'); // TODO: Get from session

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Auto redirect after 5 seconds
    const redirectTimer = setTimeout(() => {
      router.push('/');
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(redirectTimer);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          {attendanceType === 'checkIn' ? '출근 완료!' : '퇴근 완료!'}
        </h1>
        
        <p className="text-center text-gray-600 mb-6">
          {attendanceType === 'checkIn' 
            ? '오늘도 좋은 하루 되세요! 😊' 
            : '오늘 하루도 수고하셨습니다! 👏'}
        </p>

        {/* Time Display */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-1">
              {attendanceType === 'checkIn' ? '출근 시간' : '퇴근 시간'}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {currentTime.toLocaleTimeString('ko-KR', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit' 
              })}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {currentTime.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
        </div>

        {/* Auto Redirect Notice */}
        <p className="text-center text-sm text-gray-500 mb-4">
          5초 후 자동으로 홈으로 이동합니다
        </p>

        {/* Manual Button */}
        <button
          onClick={() => router.push('/')}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          확인
        </button>
      </div>
    </div>
  );
}