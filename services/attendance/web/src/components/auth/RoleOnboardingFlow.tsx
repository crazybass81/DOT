'use client';

import React, { useState, useEffect } from 'react';
import { businessVerificationService } from '../../services/businessVerificationService';

interface RoleOnboardingFlowProps {
  userType: 'worker' | 'personal-business' | 'corporation' | 'franchise';
  initialStep?: number;
}

interface OrganizationInfo {
  id: string;
  name: string;
  code: string;
  description: string;
}

interface BusinessInfo {
  registrationNumber: string;
  businessName: string;
  representativeName: string;
  address: string;
  isValid: boolean;
}

const RoleOnboardingFlow: React.FC<RoleOnboardingFlowProps> = ({
  userType,
  initialStep = 1
}) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizationInfo, setOrganizationInfo] = useState<OrganizationInfo | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    organizationCode: '',
    businessRegistrationNumber: '',
    corporationRegistrationNumber: '',
    franchiseCode: '',
    businessName: '',
    representativeName: '',
    address: '',
    storeName: '',
    industry: ''
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  // 조직 코드 검색
  const searchOrganization = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Mock organization search
      await new Promise(resolve => setTimeout(resolve, 1000)); // 로딩 시뮬레이션
      
      if (code === 'ORG-123') {
        setOrganizationInfo({
          id: '1',
          name: '테스트 회사',
          code: code,
          description: '테스트용 회사입니다'
        });
      } else {
        setError('조직을 찾을 수 없습니다');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 사업자등록번호 검증
  const verifyBusinessRegistration = async (registrationNumber: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await businessVerificationService.verifyBusinessRegistration(registrationNumber);
      
      if (result.isValid) {
        setBusinessInfo({
          registrationNumber,
          businessName: result.businessName || '',
          representativeName: result.representativeName || '',
          address: '',
          isValid: true
        });
        updateField('businessName', result.businessName || '');
        updateField('representativeName', result.representativeName || '');
      } else {
        setError(result.error || '유효하지 않은 사업자등록번호입니다');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 법인등록번호 검증
  const verifyCorporationRegistration = async (registrationNumber: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await businessVerificationService.verifyCorporationRegistration(registrationNumber);
      
      if (result.isValid) {
        updateField('businessName', result.businessName || '');
        updateField('representativeName', result.representativeName || '');
      } else {
        setError(result.error || '유효하지 않은 법인등록번호입니다');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 프랜차이즈 코드 검증
  const verifyFranchiseCode = async (code: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (code === 'FRAN-001') {
        // Mock franchise verification success
      } else {
        setError('유효하지 않은 프랜차이즈 코드입니다');
      }
    } catch (error) {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // 사업자등록번호 자동 검증 (입력 완료 시)
  useEffect(() => {
    if (formData.businessRegistrationNumber && formData.businessRegistrationNumber.length === 12) {
      verifyBusinessRegistration(formData.businessRegistrationNumber);
    }
  }, [formData.businessRegistrationNumber]);

  // 법인등록번호 자동 검증
  useEffect(() => {
    if (formData.corporationRegistrationNumber && formData.corporationRegistrationNumber.length === 13) {
      verifyCorporationRegistration(formData.corporationRegistrationNumber);
    }
  }, [formData.corporationRegistrationNumber]);

  const getTotalSteps = () => {
    switch (userType) {
      case 'worker': return 3;
      case 'personal-business': return 3;
      case 'corporation': return 3;
      case 'franchise': return 3;
      default: return 3;
    }
  };

  const renderWorkerOnboarding = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2>근로자 온보딩</h2>
            <p>조직 코드를 입력하세요</p>
            
            <div>
              <label htmlFor="organizationCode">조직 코드</label>
              <input
                id="organizationCode"
                type="text"
                value={formData.organizationCode}
                onChange={(e) => updateField('organizationCode', e.target.value)}
                placeholder="예: ORG-123"
              />
              <button 
                onClick={() => searchOrganization(formData.organizationCode)}
                disabled={!formData.organizationCode || isLoading}
              >
                조직 찾기
              </button>
            </div>

            {isLoading && <p>검색 중...</p>}
            
            {organizationInfo && (
              <div>
                <p>조직명: {organizationInfo.name}</p>
                <p>{organizationInfo.description}</p>
                <button onClick={nextStep}>가입 요청</button>
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div>
            <h3>가입 요청 전송</h3>
            <p>관리자 승인을 기다리고 있습니다...</p>
            <button onClick={nextStep}>완료</button>
          </div>
        );
      case 3:
        return (
          <div>
            <h3>온보딩 완료</h3>
            <p>관리자 승인 후 근무를 시작할 수 있습니다.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderPersonalBusinessOnboarding = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2>개인사업자 온보딩</h2>
            <p>사업체 정보를 등록하세요</p>
            <p>개인사업자로 등록하시면 직원을 관리하고 근태를 체크할 수 있습니다.</p>
            
            <div>
              <label htmlFor="businessRegistrationNumber">사업자등록번호</label>
              <input
                id="businessRegistrationNumber"
                type="text"
                value={formData.businessRegistrationNumber}
                onChange={(e) => updateField('businessRegistrationNumber', e.target.value)}
                placeholder="000-00-00000"
              />
              {isLoading && <p>검증 중...</p>}
            </div>

            <div>
              <label htmlFor="businessName">사업체명</label>
              <input
                id="businessName"
                type="text"
                value={formData.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="representativeName">대표자명</label>
              <input
                id="representativeName"
                type="text"
                value={formData.representativeName}
                onChange={(e) => updateField('representativeName', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="address">사업장 주소</label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>

            <button onClick={nextStep} disabled={!businessInfo?.isValid}>
              다음
            </button>
          </div>
        );
      case 2:
        return (
          <div>
            <h3>조직 설정</h3>
            <p>사업체 설정을 완료하세요</p>
            <button onClick={nextStep}>조직 설정 완료</button>
          </div>
        );
      case 3:
        return (
          <div>
            <h3>설정 완료</h3>
            <p>설정이 완료되었습니다!</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderCorporationOnboarding = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2>법인 온보딩</h2>
            <p>법인 정보를 등록하세요</p>
            
            <div>
              <label htmlFor="corporationRegistrationNumber">법인등록번호</label>
              <input
                id="corporationRegistrationNumber"
                type="text"
                value={formData.corporationRegistrationNumber}
                onChange={(e) => updateField('corporationRegistrationNumber', e.target.value)}
                placeholder="0000000000000"
              />
              {isLoading && <p>법인 정보 검증 중...</p>}
            </div>

            <div>
              <label htmlFor="businessName">법인명</label>
              <input
                id="businessName"
                type="text"
                value={formData.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="representativeName">대표자명</label>
              <input
                id="representativeName"
                type="text"
                value={formData.representativeName}
                onChange={(e) => updateField('representativeName', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="address">본사 주소</label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="industry">업종</label>
              <input
                id="industry"
                type="text"
                value={formData.industry}
                onChange={(e) => updateField('industry', e.target.value)}
              />
            </div>

            <button onClick={nextStep}>다음</button>
          </div>
        );
      case 2:
        return (
          <div>
            <h3>법인 설정 완료</h3>
            <button onClick={nextStep}>완료</button>
          </div>
        );
      case 3:
        return (
          <div>
            <h3>온보딩 완료</h3>
            <p>법인 등록이 완료되었습니다.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderFranchiseOnboarding = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2>프랜차이즈 온보딩</h2>
            <p>프랜차이즈 정보를 등록하세요</p>
            
            <div>
              <label htmlFor="franchiseCode">프랜차이즈 코드</label>
              <input
                id="franchiseCode"
                type="text"
                value={formData.franchiseCode}
                onChange={(e) => updateField('franchiseCode', e.target.value)}
                placeholder="FRAN-001"
              />
              <button 
                onClick={() => verifyFranchiseCode(formData.franchiseCode)}
                disabled={!formData.franchiseCode || isLoading}
              >
                코드 확인
              </button>
            </div>

            {formData.franchiseCode === 'FRAN-001' && !error && (
              <div>
                <p>프랜차이즈 본부: 테스트 브랜드</p>
              </div>
            )}

            <div>
              <label htmlFor="storeName">매장명</label>
              <input
                id="storeName"
                type="text"
                value={formData.storeName}
                onChange={(e) => updateField('storeName', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="address">매장 주소</label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="representativeName">점주명</label>
              <input
                id="representativeName"
                type="text"
                value={formData.representativeName}
                onChange={(e) => updateField('representativeName', e.target.value)}
              />
            </div>

            <button onClick={nextStep}>다음</button>
          </div>
        );
      case 2:
        return (
          <div>
            <h3>매장 설정</h3>
            <button onClick={nextStep}>완료</button>
          </div>
        );
      case 3:
        return (
          <div>
            <h3>온보딩 완료</h3>
            <p>프랜차이즈 매장 등록이 완료되었습니다.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const renderCurrentStep = () => {
    switch (userType) {
      case 'worker':
        return renderWorkerOnboarding();
      case 'personal-business':
        return renderPersonalBusinessOnboarding();
      case 'corporation':
        return renderCorporationOnboarding();
      case 'franchise':
        return renderFranchiseOnboarding();
      default:
        return null;
    }
  };

  return (
    <div className="role-onboarding-flow">
      <div className="progress-indicator">
        <span>{currentStep} / {getTotalSteps()} 단계</span>
      </div>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {renderCurrentStep()}

      <div className="navigation-buttons">
        {currentStep > 1 && (
          <button onClick={prevStep}>이전</button>
        )}
        
        {currentStep === 1 && userType === 'worker' && (
          <button className="skip-button">건너뛰기</button>
        )}
      </div>
    </div>
  );
};

export default RoleOnboardingFlow;