/**
 * Enhanced Registration Page - GitHub Reference Style
 * Modern multi-step registration with real-time validation and UI enhancements
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Building2, 
  User, 
  Users, 
  Clock,
  Shield,
  FileText,
  ArrowRight,
  Phone,
  Mail,
  Lock
} from 'lucide-react';
import { OptimizedRealTimeClock } from '@/components/ui/RealTimeClock';
import RegistrationForm from '@/components/forms/RegistrationForm';
import { type RegistrationFormData, type RegistrationResponse } from '@/src/schemas/registration.schema';

type RegistrationStep = 'type-selection' | 'individual-form' | 'business-form' | 'success' | 'verification' | 'error';
type RegistrationType = 'individual' | 'business';

interface QRContext {
  organizationId?: string;
  locationId?: string;
  inviteCode?: string;
}

interface StepInfo {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  progress: number;
}

const REGISTRATION_STEPS: Record<RegistrationType, StepInfo[]> = {
  individual: [
    {
      id: 'type-selection',
      title: '유형 선택',
      description: '회원가입 유형을 선택하세요',
      icon: User,
      progress: 25
    },
    {
      id: 'individual-form',
      title: '개인 정보',
      description: '기본 정보를 입력하세요',
      icon: FileText,
      progress: 75
    },
    {
      id: 'complete',
      title: '완료',
      description: '가입이 완료되었습니다',
      icon: CheckCircle2,
      progress: 100
    }
  ],
  business: [
    {
      id: 'type-selection',
      title: '유형 선택',
      description: '회원가입 유형을 선택하세요',
      icon: Users,
      progress: 20
    },
    {
      id: 'business-form',
      title: '사업자 정보',
      description: '사업자 정보를 입력하세요',
      icon: Building2,
      progress: 60
    },
    {
      id: 'verification',
      title: '서류 확인',
      description: '사업자등록증을 확인하세요',
      icon: Shield,
      progress: 80
    },
    {
      id: 'complete',
      title: '완료',
      description: '가입이 완료되었습니다',
      icon: CheckCircle2,
      progress: 100
    }
  ]
};

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State management
  const [step, setStep] = useState<RegistrationStep>('type-selection');
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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

  // Handle registration type selection
  const handleTypeSelection = useCallback((type: RegistrationType) => {
    setRegistrationType(type);
    setCurrentStepIndex(1);
    if (type === 'individual') {
      setStep('individual-form');
    } else {
      setStep('business-form');
    }
  }, []);

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
        registrationType: registrationType || 'individual',
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
  }, [qrContext, registrationType]);

  // Handle back to form
  const handleBackToForm = () => {
    if (step === 'individual-form' || step === 'business-form') {
      setStep('type-selection');
      setCurrentStepIndex(0);
      setRegistrationType(null);
    } else {
      setStep(registrationType === 'individual' ? 'individual-form' : 'business-form');
    }
    setError('');
    setSuccess(null);
  };

  // Get current step information
  const getCurrentStepInfo = () => {
    if (!registrationType) return null;
    const steps = REGISTRATION_STEPS[registrationType];
    return steps[currentStepIndex] || null;
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    const stepInfo = getCurrentStepInfo();
    return stepInfo ? stepInfo.progress : 0;
  };

  // Handle navigation
  const handleNavigateHome = () => {
    router.push('/');
  };

  const handleNavigateLogin = () => {
    router.push('/login');
  };

  // Render registration type selection
  const renderTypeSelection = () => (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3 font-korean">
            DOT 회원가입
          </h1>
          <p className="text-gray-600 text-lg font-korean">
            어떤 유형으로 가입하시겠습니까?
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Registration Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Individual Registration */}
          <button
            onClick={() => handleTypeSelection('individual')}
            className="group relative p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-korean">개인 회원</h3>
                <p className="text-gray-600 text-sm font-korean mb-4">
                  직원으로 가입하여 출퇴근을 관리하세요
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                    <span className="font-korean">빠른 가입 절차</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                    <span className="font-korean">GPS 기반 출퇴근</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                    <span className="font-korean">실시간 근태 관리</span>
                  </div>
                </div>
              </div>
            </div>
            <ArrowRight className="absolute top-4 right-4 w-5 h-5 text-blue-600 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Business Registration */}
          <button
            onClick={() => handleTypeSelection('business')}
            className="group relative p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:shadow-lg transition-all duration-200 text-left"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2 font-korean">사업자 회원</h3>
                <p className="text-gray-600 text-sm font-korean mb-4">
                  조직을 만들어 직원들을 관리하세요
                </p>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                    <span className="font-korean">조직 관리 기능</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                    <span className="font-korean">직원 초대 시스템</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                    <span className="font-korean">근태 현황 대시보드</span>
                  </div>
                </div>
              </div>
            </div>
            <ArrowRight className="absolute top-4 right-4 w-5 h-5 text-purple-600 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* QR Context Info */}
        {qrContext.organizationId && (
          <div className="mb-6 p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800 font-korean">
                조직 초대를 통한 가입
              </span>
            </div>
            <p className="text-sm text-blue-600 mt-1 font-korean">
              가입 완료 후 해당 조직의 직원으로 등록됩니다
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 space-y-2 font-korean">
          <p>
            이미 계정이 있으시나요?{' '}
            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              로그인
            </a>
          </p>
        </div>
      </div>
    </div>
  );

  // Render form step
  const renderFormStep = () => {
    const isIndividual = step === 'individual-form';
    const stepInfo = getCurrentStepInfo();
    
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          {/* Progress Header */}
          <div className="mb-8">
            {/* Back Button */}
            <button
              onClick={handleBackToForm}
              className="mb-4 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="text-sm font-korean">다른 유형 선택</span>
            </button>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600 font-korean">
                  {stepInfo?.title}
                </span>
                <span className="text-sm text-gray-500 font-korean">
                  {Math.round(getProgressPercentage())}% 완료
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>

            {/* Header */}
            <div className="text-center">
              <div className={`w-16 h-16 bg-gradient-to-br ${isIndividual ? 'from-blue-500 to-indigo-600' : 'from-purple-500 to-pink-600'} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                {isIndividual ? (
                  <User className="w-8 h-8 text-white" />
                ) : (
                  <Building2 className="w-8 h-8 text-white" />
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 font-korean">
                {isIndividual ? '개인 회원가입' : '사업자 회원가입'}
              </h1>
              <p className="text-gray-600 font-korean">
                {isIndividual 
                  ? 'DOT 근태관리 시스템에 가입하여 출퇴근을 편리하게 관리하세요'
                  : '사업자 정보를 입력하여 조직을 만들고 직원들을 관리하세요'
                }
              </p>
            </div>
          </div>

          {/* QR Context Info */}
          {qrContext.organizationId && (
            <div className="mb-6 p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 font-korean">
                  조직 초대를 통한 가입
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1 font-korean">
                가입 완료 후 해당 조직의 직원으로 등록됩니다
              </p>
            </div>
          )}

          {/* Registration Form */}
          <RegistrationForm
            onSubmit={handleRegistrationSubmit}
            loading={loading}
            qrContext={qrContext}
            registrationType={registrationType}
          />
        </div>
      </div>
    );
  };

  // Render based on current step
  const renderContent = () => {
    switch (step) {
      case 'type-selection':
        return renderTypeSelection();
        
      case 'individual-form':
      case 'business-form':
        return renderFormStep();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* GitHub-style background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header with Real-time Clock - GitHub Style */}
        <header className="w-full pt-8 pb-6">
          <div className="max-w-4xl mx-auto px-4">
            <OptimizedRealTimeClock 
              className="mb-6" 
              showIcon={true}
              showSeconds={true}
              format="24h"
            />
            
            {/* Progress indicator for multi-step forms */}
            {registrationType && step !== 'type-selection' && (
              <div className="flex items-center justify-center space-x-4 mt-6">
                {REGISTRATION_STEPS[registrationType].map((stepInfo, index) => {
                  const Icon = stepInfo.icon;
                  const isActive = index === currentStepIndex;
                  const isCompleted = index < currentStepIndex;
                  
                  return (
                    <div
                      key={stepInfo.id}
                      className={`flex items-center space-x-2 ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-blue-100' : isCompleted ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium hidden sm:inline font-korean">
                        {stepInfo.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full">
            {renderContent()}
          </div>
        </main>

        {/* Bottom spacing */}
        <div className="pb-8"></div>
      </div>
    </div>
  );
}