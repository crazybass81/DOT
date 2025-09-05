'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseAuthService } from '@/services/supabaseAuthService';
import { Button, Input, Card } from '@/components/ui';

interface FormData {
  // Step 1 - 기본 정보
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  phone: string;
  
  // Step 2 - 사용자 구분
  userType: 'business' | 'worker' | '';
  
  // Step 3 - 사업자 정보 (사업자인 경우)
  businessType: 'corporation' | 'personal' | '';
  businessName: string;
  businessNumber: string;
  representativeName: string;
  businessAddress: string;
  
  // Step 3 - 근로자 정보 (근로자인 경우)
  organizationCode: string;
  birthdate: string;
  department: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    userType: '',
    businessType: '',
    businessName: '',
    businessNumber: '',
    representativeName: '',
    businessAddress: '',
    organizationCode: '',
    birthdate: '',
    department: ''
  });

  const validateStep1 = () => {
    if (!formData.email || !formData.password || !formData.name) {
      setError('필수 정보를 모두 입력해주세요.');
      return false;
    }
    if (formData.password !== formData.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.userType) {
      setError('사용자 유형을 선택해주세요.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (formData.userType === 'business') {
      if (!formData.businessType || !formData.businessName || !formData.businessNumber) {
        setError('사업자 정보를 모두 입력해주세요.');
        return false;
      }
    } else if (formData.userType === 'worker') {
      if (!formData.organizationCode) {
        setError('조직 코드를 입력해주세요.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handlePrev = () => {
    setError('');
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    
    setError('');
    setLoading(true);

    try {
      // 1. Create auth user
      const authResult = await supabaseAuthService.signUp(formData.email, formData.password);
      
      if (!authResult?.user) {
        throw new Error('회원가입에 실패했습니다.');
      }
      const authUser = authResult.user;

      // 2. Create profile based on user type
      if (formData.userType === 'business') {
        // 사업자 등록 - organization 생성
        const { data: org, error: orgError } = await supabaseAuthService.supabase
          .from('organizations')
          .insert({
            name: formData.businessName,
            biz_type: formData.businessType === 'corporation' ? 'CORP' : 'PERSONAL',
            biz_number: formData.businessNumber,
            metadata: {
              representative_name: formData.representativeName,
              business_address: formData.businessAddress
            }
          })
          .select()
          .single();

        if (orgError) {
          console.error('Organization creation error:', orgError);
          throw new Error('조직 생성 중 오류가 발생했습니다.');
        }

        // Employee 레코드 생성 (owner 역할)
        const { error: empError } = await supabaseAuthService.supabase
          .from('employees')
          .insert({
            user_id: authUser.id,
            organization_id: org?.id,
            email: formData.email,
            name: formData.name,
            phone: formData.phone,
            position: 'owner',
            is_active: true
          });

        if (empError) {
          console.error('Employee creation error:', empError);
          throw new Error('직원 정보 생성 중 오류가 발생했습니다.');
        }

        // 사업자 대시보드로 이동
        router.push('/business-dashboard');
      } else {
        // 근로자 등록
        // 조직 코드로 organization 찾기
        const { data: orgs, error: findOrgError } = await supabaseAuthService.supabase
          .from('organizations')
          .select('id')
          .eq('code', formData.organizationCode);

        if (findOrgError || !orgs || orgs.length === 0) {
          console.error('Organization lookup error:', findOrgError);
          throw new Error('유효하지 않은 조직 코드입니다.');
        }

        const orgId = orgs[0].id;

        // Employee 레코드 생성 (worker 역할)
        const { error: empError } = await supabaseAuthService.supabase
          .from('employees')
          .insert({
            user_id: authUser.id,
            organization_id: orgId,
            email: formData.email,
            name: formData.name,
            phone: formData.phone,
            position: 'worker',
            department: formData.department,
            metadata: {
              birthdate: formData.birthdate
            },
            is_active: true
          });

        if (empError) {
          console.error('Employee creation error:', empError);
          throw new Error('직원 정보 생성 중 오류가 발생했습니다.');
        }

        // 워커 대시보드로 이동
        router.push('/worker-dashboard');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Blob Animations */}
      <div className="absolute inset-0 z-0">
        <div className="blob blob-admin-1"></div>
        <div className="blob blob-admin-2"></div>
        <div className="blob blob-admin-3"></div>
        <div className="blob blob-admin-4"></div>
        <div className="blob blob-admin-5"></div>
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step === currentStep 
                      ? 'bg-blue-600 text-white' 
                      : step < currentStep 
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step < currentStep ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-16 h-1 ${
                      step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <h2 className="text-xl font-semibold">
                {currentStep === 1 && '기본 정보'}
                {currentStep === 2 && '사용자 구분'}
                {currentStep === 3 && (formData.userType === 'business' ? '사업자 정보' : '근로자 정보')}
              </h2>
            </div>
          </div>

          <Card className="bg-white/70 backdrop-blur-sm border border-white/30">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Step 1: 기본 정보 */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Input
                  type="email"
                  label="이메일"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('email', e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <Input
                  type="password"
                  label="비밀번호"
                  value={formData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('password', e.target.value)}
                  placeholder="8자 이상"
                  required
                />
                <Input
                  type="password"
                  label="비밀번호 확인"
                  value={formData.passwordConfirm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('passwordConfirm', e.target.value)}
                  placeholder="비밀번호 재입력"
                  required
                />
                <Input
                  type="text"
                  label="이름"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('name', e.target.value)}
                  placeholder="홍길동"
                  required
                />
                <Input
                  type="tel"
                  label="전화번호"
                  value={formData.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('phone', e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
            )}

            {/* Step 2: 사용자 구분 */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => updateFormData('userType', 'business')}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      formData.userType === 'business'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-4xl mb-2">🏢</div>
                    <div className="font-semibold">사업자</div>
                    <div className="text-xs text-gray-500 mt-1">
                      법인/개인사업자
                    </div>
                  </button>
                  <button
                    onClick={() => updateFormData('userType', 'worker')}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      formData.userType === 'worker'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-4xl mb-2">👤</div>
                    <div className="font-semibold">근로자</div>
                    <div className="text-xs text-gray-500 mt-1">
                      직원/알바
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: 사업자 정보 */}
            {currentStep === 3 && formData.userType === 'business' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateFormData('businessType', 'corporation')}
                    className={`p-3 rounded-md border ${
                      formData.businessType === 'corporation'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    법인사업자
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData('businessType', 'personal')}
                    className={`p-3 rounded-md border ${
                      formData.businessType === 'personal'
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    개인사업자
                  </button>
                </div>
                <Input
                  type="text"
                  label="상호명"
                  value={formData.businessName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('businessName', e.target.value)}
                  placeholder="(주)회사명"
                  required
                />
                <Input
                  type="text"
                  label="사업자등록번호"
                  value={formData.businessNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('businessNumber', e.target.value)}
                  placeholder="000-00-00000"
                  required
                />
                <Input
                  type="text"
                  label="대표자명"
                  value={formData.representativeName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('representativeName', e.target.value)}
                  placeholder="홍길동"
                />
                <Input
                  type="text"
                  label="사업장 주소"
                  value={formData.businessAddress}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('businessAddress', e.target.value)}
                  placeholder="서울시 강남구..."
                />
              </div>
            )}

            {/* Step 3: 근로자 정보 */}
            {currentStep === 3 && formData.userType === 'worker' && (
              <div className="space-y-4">
                <Input
                  type="text"
                  label="조직 코드"
                  value={formData.organizationCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('organizationCode', e.target.value)}
                  placeholder="회사에서 제공받은 코드 입력"
                  required
                />
                <Input
                  type="date"
                  label="생년월일"
                  value={formData.birthdate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('birthdate', e.target.value)}
                />
                <Input
                  type="text"
                  label="부서"
                  value={formData.department}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateFormData('department', e.target.value)}
                  placeholder="개발팀"
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-6 pt-6 border-t">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handlePrev}
                  disabled={loading}
                >
                  이전
                </Button>
              ) : (
                <Link href="/login">
                  <Button type="button" variant="secondary">
                    로그인으로
                  </Button>
                </Link>
              )}
              
              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                >
                  다음
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? '가입 중...' : '가입 완료'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}