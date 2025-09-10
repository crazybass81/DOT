/**
 * Individual User Registration Page
 * Production-ready registration with comprehensive validation and error handling
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertTriangle, ArrowLeft, Building2 } from 'lucide-react';
import RegistrationForm from '@/components/forms/RegistrationForm';
import { type RegistrationFormData, type RegistrationResponse } from '@/src/schemas/registration.schema';

type RegistrationStep = 'form' | 'success' | 'verification' | 'error';

interface QRContext {
  organizationId?: string;
  locationId?: string;
  inviteCode?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [step, setStep] = useState<RegistrationStep>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<{
    userId: string;
    email: string;
    requiresVerification: boolean;
    verificationMethod?: 'email' | 'phone' | 'none';
  } | null>(null);
  
  // QR context from URL params or session storage
  const [qrContext, setQrContext] = useState<QRContext>({});

  // Initialize QR context on component mount
  useEffect(() => {
    const context: QRContext = {};
    
    // Get from URL search params first
    const orgId = searchParams.get('org');
    const locationId = searchParams.get('location');
    const inviteCode = searchParams.get('invite');
    
    if (orgId) context.organizationId = orgId;
    if (locationId) context.locationId = locationId;
    if (inviteCode) context.inviteCode = inviteCode;
    
    // Fall back to session storage if not in URL
    if (!context.organizationId) {
      const sessionOrgId = sessionStorage.getItem('qrBusinessId') || sessionStorage.getItem('qrOrganizationId');
      if (sessionOrgId) context.organizationId = sessionOrgId;
    }
    
    if (!context.locationId) {
      const sessionLocationId = sessionStorage.getItem('qrLocationId');
      if (sessionLocationId) context.locationId = sessionLocationId;
    }
    
    setQrContext(context);
  }, [searchParams]);

  // Handle form submission
  const handleRegistrationSubmit = useCallback(async (formData: RegistrationFormData) => {
    setLoading(true);
    setError('');

    try {
      const requestData = {
        name: formData.name,
        phone: formData.phone.replace(/-/g, ''), // Remove formatting
        birthDate: formData.birthDate,
        email: formData.email || undefined,
        password: formData.password,
        accountNumber: formData.accountNumber || undefined,
        qrContext: Object.keys(qrContext).length > 0 ? qrContext : undefined,
      };

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result: RegistrationResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error.message || '등록에 실패했습니다');
      }

      // Success - store result and update step
      setSuccess(result.data);
      
      if (result.data.requiresVerification) {
        setStep('verification');
      } else {
        setStep('success');
      }

      // Clean up session storage
      sessionStorage.removeItem('qrBusinessId');
      sessionStorage.removeItem('qrOrganizationId');
      sessionStorage.removeItem('qrLocationId');

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || '등록 중 오류가 발생했습니다');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }, [qrContext]);

  // Handle back to form
  const handleBackToForm = () => {
    setStep('form');
    setError('');
    setSuccess(null);
  };

  // Handle navigation
  const handleNavigateHome = () => {
    router.push('/');
  };

  const handleNavigateLogin = () => {
    router.push('/login');
  };

  // Render based on current step
  const renderContent = () => {
    switch (step) {
      case 'form':
        return (
          <div className="w-full max-w-lg mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">개인 회원가입</h1>
                <p className="text-gray-600">
                  DOT 근태관리 시스템에 가입하여 출퇴근을 편리하게 관리하세요
                </p>
              </div>

              {/* QR Context Info */}
              {qrContext.organizationId && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      조직 초대를 통한 가입
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    가입 완료 후 해당 조직의 직원으로 등록됩니다
                  </p>
                </div>
              )}

              {/* Registration Form */}
              <RegistrationForm
                onSubmit={handleRegistrationSubmit}
                loading={loading}
                qrContext={qrContext}
              />
            </div>
          </div>
        );

      case 'verification':
        return (
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">이메일 인증 필요</h2>
              <div className="space-y-4 text-left">
                <p className="text-gray-600">
                  회원가입이 완료되었습니다! 계정을 활성화하려면 이메일 인증이 필요합니다.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>인증 이메일 발송:</strong> {success?.email}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  • 이메일함을 확인하여 인증 링크를 클릭해주세요<br />
                  • 스팸함도 함께 확인해보세요<br />
                  • 인증 완료 후 로그인이 가능합니다
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleNavigateLogin}
                  className="flex-1 btn-primary"
                >
                  로그인 페이지로
                </button>
                <button
                  onClick={handleNavigateHome}
                  className="flex-1 btn-secondary"
                >
                  홈으로
                </button>
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">가입 완료!</h2>
              <div className="space-y-4 text-left">
                <p className="text-gray-600">
                  DOT 근태관리 시스템 가입이 완료되었습니다.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    <strong>등록 계정:</strong> {success?.email}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  • 바로 로그인하여 서비스를 이용하실 수 있습니다<br />
                  • 관리자 승인이 필요한 조직의 경우 승인 후 이용 가능합니다<br />
                  • 문의사항이 있으시면 고객센터로 연락주세요
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleNavigateLogin}
                  className="flex-1 btn-primary"
                >
                  로그인하기
                </button>
                <button
                  onClick={handleNavigateHome}
                  className="flex-1 btn-secondary"
                >
                  홈으로
                </button>
              </div>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">가입 실패</h2>
              <div className="space-y-4 text-left">
                <p className="text-gray-600">
                  회원가입 중 오류가 발생했습니다.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">
                    <strong>오류 내용:</strong> {error}
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  • 입력하신 정보를 다시 확인해주세요<br />
                  • 문제가 계속되면 고객센터로 문의해주세요<br />
                  • 이미 가입된 정보일 수 있으니 로그인을 시도해보세요
                </p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBackToForm}
                  className="flex-1 btn-primary"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  다시 시도
                </button>
                <button
                  onClick={handleNavigateLogin}
                  className="flex-1 btn-secondary"
                >
                  로그인
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-admin-1 opacity-20"></div>
        <div className="blob blob-admin-2 opacity-15"></div>
        <div className="blob blob-admin-3 opacity-10"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 w-full">
        {renderContent()}
      </div>
    </div>
  );
}