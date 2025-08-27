'use client';

import { useState, useEffect } from 'react';
import { CheckInButton } from '@/components/CheckInButton';
import { AttendanceService } from '@/lib/services/attendance';

export default function AttendancePage() {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Mock employee/business IDs (replace with real auth later)
  const employeeId = 'emp_123';
  const businessId = 'biz_456';
  
  const attendanceService = new AttendanceService();

  useEffect(() => {
    // Check initial attendance status
    checkAttendanceStatus();
  }, []);

  const checkAttendanceStatus = async () => {
    try {
      const status = await attendanceService.getAttendanceStatus(employeeId);
      setIsCheckedIn(status.isCheckedIn);
      setCheckInTime(status.checkInTime);
    } catch (err) {
      console.error('Failed to get attendance status:', err);
    }
  };

  const handleSuccess = (result: any) => {
    setMessage(result.message || '처리가 완료되었습니다');
    setError('');
    checkAttendanceStatus(); // Refresh status
    
    // Clear message after 5 seconds
    setTimeout(() => setMessage(''), 5000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setMessage('');
    
    // Clear error after 5 seconds
    setTimeout(() => setError(''), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            DOT 근태관리
          </h1>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </p>
        </header>

        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Status Display */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
                isCheckedIn ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {isCheckedIn ? (
                  <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                {isCheckedIn ? '근무 중' : '출근 전'}
              </h2>
              
              {checkInTime && (
                <p className="text-gray-600">
                  출근 시간: {checkInTime.toLocaleTimeString('ko-KR')}
                </p>
              )}
            </div>

            {/* Check-in/out Button */}
            <div className="flex justify-center mb-6">
              <CheckInButton
                employeeId={employeeId}
                businessId={businessId}
                isCheckedIn={isCheckedIn}
                onSuccess={handleSuccess}
                onError={handleError}
              />
            </div>

            {/* Messages */}
            {message && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
                {message}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Additional Info */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">검증 방법</h3>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                GPS 위치 확인 (반경 50m)
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            <button className="bg-white rounded-lg shadow p-4 text-center hover:shadow-lg transition-shadow">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-sm text-gray-700">근태 현황</span>
            </button>
            
            <button className="bg-white rounded-lg shadow p-4 text-center hover:shadow-lg transition-shadow">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-700">근무 일정</span>
            </button>
            
            <a href="/attendance/setup" className="bg-white rounded-lg shadow p-4 text-center hover:shadow-lg transition-shadow block">
              <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-gray-700">위치 설정</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}