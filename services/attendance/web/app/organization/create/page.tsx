/**
 * 조직 생성 페이지
 * GitHub 스타일 단계별 프로세스 적용
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  FileText,
  MapPin,
  Settings,
  Users
} from 'lucide-react';
import BusinessRegistrationUpload from '@/components/organization/BusinessRegistrationUpload';
import LocationSetup from '@/components/organization/LocationSetup';
import { organizationService, CreateOrganizationData, WorkHoursPolicy, BreakTimePolicy } from '@/lib/services/organization.service';

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

const defaultWorkHours: WorkHoursPolicy = {
  monday: { start: '09:00', end: '18:00', enabled: true },
  tuesday: { start: '09:00', end: '18:00', enabled: true },
  wednesday: { start: '09:00', end: '18:00', enabled: true },
  thursday: { start: '09:00', end: '18:00', enabled: true },
  friday: { start: '09:00', end: '18:00', enabled: true },
  saturday: { start: '09:00', end: '13:00', enabled: false },
  sunday: { start: '09:00', end: '13:00', enabled: false },
  flexible_hours: false
};

const defaultBreakTime: BreakTimePolicy = {
  lunch_break: {
    duration_minutes: 60,
    start_time: '12:00',
    end_time: '13:00',
    flexible: false
  },
  additional_breaks: []
};

export default function CreateOrganizationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrganizationId, setCreatedOrganizationId] = useState<string | null>(null);

  // 폼 데이터
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    type: 'business',
    business_registration_number: '',
    description: ''
  });

  const [locationInfo, setLocationInfo] = useState({
    primary_address: '',
    gps_latitude: null as number | null,
    gps_longitude: null as number | null,
    attendance_radius: 100
  });

  const [workPolicy, setWorkPolicy] = useState<WorkHoursPolicy>(defaultWorkHours);
  const [breakPolicy, setBreakPolicy] = useState<BreakTimePolicy>(defaultBreakTime);

  const steps: Step[] = [
    {
      id: 'basic',
      title: '기본 정보',
      description: '조직의 기본 정보를 입력하세요',
      icon: <Building2 className="w-5 h-5" />,
      completed: basicInfo.name.trim().length > 0
    },
    {
      id: 'location',
      title: '위치 설정',
      description: '사업장 위치를 설정하세요',
      icon: <MapPin className="w-5 h-5" />,
      completed: locationInfo.gps_latitude !== null && locationInfo.gps_longitude !== null
    },
    {
      id: 'policy',
      title: '근무 정책',
      description: '근무시간과 휴게시간을 설정하세요',
      icon: <Settings className="w-5 h-5" />,
      completed: true // 기본값이 있으므로 항상 완료됨
    },
    {
      id: 'complete',
      title: '완료',
      description: '조직 생성을 완료하세요',
      icon: <CheckCircle className="w-5 h-5" />,
      completed: false
    }
  ];

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0:
        return basicInfo.name.trim().length > 0;
      case 1:
        return locationInfo.gps_latitude !== null && locationInfo.gps_longitude !== null;
      case 2:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceedToNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateOrganization = async () => {
    if (!canProceedToNext()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const organizationData: CreateOrganizationData = {
        name: basicInfo.name.trim(),
        type: basicInfo.type,
        business_registration_number: basicInfo.business_registration_number.trim() || undefined,
        primary_address: locationInfo.primary_address.trim() || undefined,
        gps_latitude: locationInfo.gps_latitude || undefined,
        gps_longitude: locationInfo.gps_longitude || undefined,
        attendance_radius: locationInfo.attendance_radius,
        work_hours_policy: workPolicy,
        break_time_policy: breakPolicy
      };

      const response = await fetch('/api/organization/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(organizationData)
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || '조직 생성에 실패했습니다.');
      }

      const result = await response.json();
      setCreatedOrganizationId(result.data.id);
      setCurrentStep(steps.length - 1);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '조직 생성에 실패했습니다.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocationUpdate = (latitude: number, longitude: number, address?: string) => {
    setLocationInfo(prev => ({
      ...prev,
      gps_latitude: latitude,
      gps_longitude: longitude,
      primary_address: address || prev.primary_address
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 font-korean">
              조직 기본 정보
            </h2>
            <p className="text-gray-600 font-korean">
              새로 생성할 조직의 기본 정보를 입력해주세요.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                  조직명 *
                </label>
                <input
                  type="text"
                  value={basicInfo.name}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="조직명을 입력하세요"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                  조직 유형
                </label>
                <select
                  value={basicInfo.type}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="business">일반 사업체</option>
                  <option value="restaurant">음식점</option>
                  <option value="retail">소매업</option>
                  <option value="service">서비스업</option>
                  <option value="manufacturing">제조업</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 font-korean">
                  사업자등록번호 (선택)
                </label>
                <input
                  type="text"
                  value={basicInfo.business_registration_number}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, business_registration_number: e.target.value }))}
                  placeholder="000-00-00000"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1 font-korean">
                  나중에 사업자등록증과 함께 등록할 수 있습니다.
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 font-korean">
              사업장 위치 설정
            </h2>
            <p className="text-gray-600 font-korean">
              출퇴근 관리를 위한 주 사업장 위치를 설정하세요.
            </p>

            <LocationSetup
              organizationId="temp"
              onLocationsUpdate={(locations) => {
                if (locations.length > 0) {
                  const mainLocation = locations[0];
                  handleLocationUpdate(
                    mainLocation.latitude,
                    mainLocation.longitude,
                    mainLocation.address
                  );
                }
              }}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 font-korean">
              근무 정책 설정
            </h2>
            <p className="text-gray-600 font-korean">
              조직의 근무시간과 휴게시간 정책을 설정하세요.
            </p>

            <div className="space-y-6">
              {/* 근무시간 설정 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-korean">
                  근무시간 설정
                </h3>
                
                <div className="space-y-4">
                  {Object.entries(workPolicy).map(([day, hours]) => {
                    if (day === 'flexible_hours' || day === 'core_hours') return null;
                    
                    const dayLabels: Record<string, string> = {
                      monday: '월요일',
                      tuesday: '화요일',
                      wednesday: '수요일',
                      thursday: '목요일',
                      friday: '금요일',
                      saturday: '토요일',
                      sunday: '일요일'
                    };

                    return (
                      <div key={day} className="flex items-center space-x-4">
                        <div className="w-16">
                          <span className="text-sm font-medium text-gray-700 font-korean">
                            {dayLabels[day]}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={hours.enabled}
                            onChange={(e) => setWorkPolicy(prev => ({
                              ...prev,
                              [day]: { ...hours, enabled: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <input
                            type="time"
                            value={hours.start}
                            onChange={(e) => setWorkPolicy(prev => ({
                              ...prev,
                              [day]: { ...hours, start: e.target.value }
                            }))}
                            disabled={!hours.enabled}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                          />
                          <span className="text-gray-500">~</span>
                          <input
                            type="time"
                            value={hours.end}
                            onChange={(e) => setWorkPolicy(prev => ({
                              ...prev,
                              [day]: { ...hours, end: e.target.value }
                            }))}
                            disabled={!hours.enabled}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 휴게시간 설정 */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 font-korean">
                  휴게시간 설정
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-20">
                      <span className="text-sm font-medium text-gray-700 font-korean">점심시간</span>
                    </div>
                    <input
                      type="time"
                      value={breakPolicy.lunch_break.start_time}
                      onChange={(e) => setBreakPolicy(prev => ({
                        ...prev,
                        lunch_break: { ...prev.lunch_break, start_time: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <span className="text-gray-500">~</span>
                    <input
                      type="time"
                      value={breakPolicy.lunch_break.end_time}
                      onChange={(e) => setBreakPolicy(prev => ({
                        ...prev,
                        lunch_break: { ...prev.lunch_break, end_time: e.target.value }
                      }))}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600 font-korean">기간:</span>
                      <input
                        type="number"
                        value={breakPolicy.lunch_break.duration_minutes}
                        onChange={(e) => setBreakPolicy(prev => ({
                          ...prev,
                          lunch_break: { ...prev.lunch_break, duration_minutes: parseInt(e.target.value) || 60 }
                        }))}
                        min="30"
                        max="120"
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <span className="text-sm text-gray-600">분</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="text-center space-y-6">
            {createdOrganizationId ? (
              <>
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-korean">
                  조직 생성 완료!
                </h2>
                <p className="text-gray-600 font-korean">
                  조직이 성공적으로 생성되었습니다. 이제 직원을 초대하고 근태관리를 시작할 수 있습니다.
                </p>
                <div className="flex justify-center space-x-4">
                  <button
                    onClick={() => router.push(`/organization/${createdOrganizationId}/dashboard`)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-korean"
                  >
                    조직 대시보드로 이동
                  </button>
                  <button
                    onClick={() => router.push(`/organization/${createdOrganizationId}/employees`)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-korean"
                  >
                    직원 초대하기
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 font-korean">
                  조직 생성 준비 완료
                </h2>
                <p className="text-gray-600 font-korean">
                  모든 정보가 입력되었습니다. 조직을 생성하시겠습니까?
                </p>
                
                {/* 설정 요약 */}
                <div className="bg-gray-50 rounded-lg p-6 text-left max-w-md mx-auto">
                  <h3 className="font-semibold text-gray-900 mb-3 font-korean">설정 요약</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-korean">조직명:</span>
                      <span className="text-gray-900 font-korean">{basicInfo.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-korean">유형:</span>
                      <span className="text-gray-900 font-korean">{basicInfo.type}</span>
                    </div>
                    {locationInfo.primary_address && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-korean">위치:</span>
                        <span className="text-gray-900 font-korean">설정됨</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-korean">출퇴근 반경:</span>
                      <span className="text-gray-900">{locationInfo.attendance_radius}m</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateOrganization}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 mx-auto font-korean"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>조직 생성</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 font-korean">
            새 조직 생성
          </h1>
          <p className="text-xl text-gray-600 font-korean">
            몇 가지 단계를 통해 조직을 설정하세요
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* 진행 단계 표시 */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                    index === currentStep
                      ? 'border-blue-600 bg-blue-600 text-white'
                      : index < currentStep
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}>
                    {index < currentStep ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="ml-3 text-left">
                    <p className={`text-sm font-medium ${
                      index === currentStep
                        ? 'text-blue-600'
                        : index < currentStep
                        ? 'text-green-600'
                        : 'text-gray-500'
                    } font-korean`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-gray-500 font-korean">{step.description}</p>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`mx-6 h-0.5 w-16 ${
                      index < currentStep ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 콘텐츠 영역 */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            {renderStepContent()}
          </div>

          {/* 네비게이션 버튼 */}
          {currentStep < steps.length - 1 && (
            <div className="flex justify-between">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex items-center space-x-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-korean"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>이전</span>
              </button>

              <button
                onClick={currentStep === steps.length - 2 ? handleCreateOrganization : handleNext}
                disabled={!canProceedToNext() || isSubmitting}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-korean"
              >
                <span>{currentStep === steps.length - 2 ? '생성' : '다음'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 font-korean">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}