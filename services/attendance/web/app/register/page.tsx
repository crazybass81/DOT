'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-config';
import { toast } from 'react-hot-toast';

interface FormData {
  name: string;
  phone: string;
  birthDate: string;
  accountNumber: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    birthDate: '',
    accountNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'success'>('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.phone || !formData.birthDate) {
      setError('필수 정보를 모두 입력해주세요');
      return;
    }

    // Phone number validation
    const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/;
    if (!phoneRegex.test(formData.phone.replace(/-/g, ''))) {
      setError('올바른 전화번호 형식이 아닙니다');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get business info from session
      const businessId = sessionStorage.getItem('qrBusinessId');
      const locationId = sessionStorage.getItem('qrLocationId');

      // Create employee record with PENDING approval status
      const { data: employee, error } = await supabase
        .from('employees')
        .insert({
          organization_id: businessId || '00000000-0000-0000-0000-000000000001', // Default org
          branch_id: locationId || '00000000-0000-0000-0000-000000000002', // Default branch
          department_id: '00000000-0000-0000-0000-000000000003', // Default department
          position_id: '00000000-0000-0000-0000-000000000004', // Default position
          name: formData.name,
          email: '', // Will be updated when user creates auth account
          phone: formData.phone,
          date_of_birth: formData.birthDate,
          approval_status: 'PENDING',
          role: 'EMPLOYEE',
          is_master_admin: false,
          is_active: false,
          device_id: btoa(navigator.userAgent), // Simple device fingerprint
          qr_registered_device_id: btoa(navigator.userAgent)
        })
        .select()
        .single();

      if (error) {
        console.error('Registration error:', error);
        throw new Error(error.message || '등록 실패');
      }

      // Store employee ID for approval status checking
      sessionStorage.setItem('pendingEmployeeId', employee.id);
      
      // Redirect to approval pending page
      router.push('/approval-pending');
      
      // Clear business session storage
      sessionStorage.removeItem('qrBusinessId');
      sessionStorage.removeItem('qrLocationId');
      
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.message || '등록 중 오류가 발생했습니다';
      setError(errorMessage);
      // Show toast notification
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">등록 신청 완료!</h2>
          <p className="text-gray-600 mb-6">
            관리자 승인 후 출퇴근 기록이 가능합니다.<br />
            승인 완료 시 문자로 안내드립니다.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">직원 등록</h1>
        <p className="text-gray-600 mb-6">
          정보를 입력하면 관리자 승인 후 출퇴근이 가능합니다
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="홍길동"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="010-1234-5678"
              maxLength={13}
              required
            />
          </div>

          {/* Birth Date */}
          <div>
            <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700 mb-1">
              생년월일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="birthDate"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Account Number */}
          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
              계좌번호 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              type="text"
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="은행명 계좌번호"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-white font-medium transition-colors ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? '등록 중...' : '등록 신청'}
          </button>
        </form>

        {/* Privacy Notice */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>개인정보 수집 안내</strong><br />
            입력하신 정보는 근태 관리 목적으로만 사용되며,
            관련 법령에 따라 안전하게 보호됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}