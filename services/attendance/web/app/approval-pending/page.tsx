'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-config';
import { toast } from 'react-hot-toast';

interface EmployeeStatus {
  id: string;
  name: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  approved_at?: string;
  rejected_at?: string;
}

export default function ApprovalPendingPage() {
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dots, setDots] = useState('');

  // Animated dots for loading effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const checkApprovalStatus = useCallback(async () => {
    try {
      const employeeId = sessionStorage.getItem('pendingEmployeeId');
      if (!employeeId) {
        setError('등록 정보를 찾을 수 없습니다.');
        setLoading(false);
        return;
      }

      const { data: employeeData, error: fetchError } = await supabase
        .from('employees')
        .select('id, name, approval_status, rejection_reason, approved_at, rejected_at')
        .eq('id', employeeId)
        .single();

      if (fetchError) {
        console.error('Error fetching employee:', fetchError);
        setError('승인 상태를 확인할 수 없습니다.');
        return;
      }

      if (!employeeData) {
        setError('등록 정보를 찾을 수 없습니다.');
        return;
      }

      setEmployee(employeeData);

      // Handle approval status changes
      if (employeeData.approval_status === 'APPROVED') {
        toast.success('승인이 완료되었습니다! 대시보드로 이동합니다.');
        // Clear the pending employee ID
        sessionStorage.removeItem('pendingEmployeeId');
        // Redirect to dashboard after a brief delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else if (employeeData.approval_status === 'REJECTED') {
        toast.error('등록이 거절되었습니다.');
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error checking approval status:', error);
      setError('승인 상태 확인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }, [router]);

  // Initial load
  useEffect(() => {
    checkApprovalStatus();
  }, [checkApprovalStatus]);

  // Poll for status updates every 5 seconds
  useEffect(() => {
    if (!employee || employee.approval_status !== 'PENDING') {
      return;
    }

    const interval = setInterval(() => {
      checkApprovalStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [employee, checkApprovalStatus]);

  const handleGoHome = () => {
    router.push('/');
  };

  const handleRetry = () => {
    setError('');
    setLoading(true);
    checkApprovalStatus();
  };

  const handleRegisterAgain = () => {
    // Clear the pending employee ID and go back to registration
    sessionStorage.removeItem('pendingEmployeeId');
    router.push('/register');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">확인 중{dots}</h2>
          <p className="text-gray-600">
            승인 상태를 확인하고 있습니다.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">오류 발생</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 시도
            </button>
            <button
              onClick={handleGoHome}
              className="w-full px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">등록 정보 없음</h2>
          <p className="text-gray-600 mb-6">
            등록 정보를 찾을 수 없습니다.<br />
            다시 등록해 주세요.
          </p>
          <button
            onClick={handleRegisterAgain}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            등록하기
          </button>
        </div>
      </div>
    );
  }

  // Approved status
  if (employee.approval_status === 'APPROVED') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">승인 완료!</h2>
          <p className="text-gray-600 mb-2">
            안녕하세요, <strong>{employee.name}</strong>님!
          </p>
          <p className="text-sm text-gray-500 mb-6">
            {employee.approved_at && new Date(employee.approved_at).toLocaleString('ko-KR')}에 승인되었습니다.
          </p>
          <div className="w-full bg-green-100 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              이제 출퇴근 기록이 가능합니다!<br />
              대시보드로 자동 이동됩니다.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    );
  }

  // Rejected status
  if (employee.approval_status === 'REJECTED') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">등록 거절됨</h2>
          <p className="text-gray-600 mb-2">
            안녕하세요, <strong>{employee.name}</strong>님.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {employee.rejected_at && new Date(employee.rejected_at).toLocaleString('ko-KR')}에 거절되었습니다.
          </p>
          
          {employee.rejection_reason && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-red-800 mb-2">거절 사유:</h4>
              <p className="text-sm text-red-700">{employee.rejection_reason}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={handleRegisterAgain}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              다시 등록하기
            </button>
            <button
              onClick={handleGoHome}
              className="w-full px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pending status (default)
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">승인 대기 중{dots}</h2>
        <p className="text-gray-600 mb-2">
          안녕하세요, <strong>{employee.name}</strong>님!
        </p>
        <p className="text-sm text-gray-500 mb-6">
          관리자 승인을 기다리고 있습니다.<br />
          승인 완료 시 자동으로 알려드립니다.
        </p>
        
        <div className="w-full bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
            <span className="text-sm text-yellow-800 font-medium">자동 확인 중</span>
          </div>
          <p className="text-xs text-yellow-700">
            5초마다 승인 상태를 확인합니다
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleRetry}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            지금 확인하기
          </button>
          <button
            onClick={handleGoHome}
            className="w-full px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            홈으로
          </button>
        </div>
      </div>
    </div>
  );
}