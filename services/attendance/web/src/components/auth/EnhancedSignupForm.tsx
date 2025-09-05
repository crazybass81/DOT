'use client';

import React, { useState } from 'react';
import { useSignupStep } from '../../contexts/SignupStepContext';

interface EnhancedSignupFormProps {
  initialStep?: number;
}

const EnhancedSignupForm: React.FC<EnhancedSignupFormProps> = ({
  initialStep = 1
}) => {
  const {
    formData,
    currentStep,
    errors,
    updateField,
    nextStep,
    prevStep,
    validateCurrentStep
  } = useSignupStep(initialStep);

  const [showParentConsent, setShowParentConsent] = useState(false);

  // 생년월일 변경 처리
  const handleBirthdateChange = (value: string) => {
    updateField('birthdate', value);
    
    if (value) {
      const birthYear = new Date(value).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      
      const isMinor = age < 18;
      updateField('isMinor', isMinor);
      
      // 15-17세는 부모 동의 필요
      setShowParentConsent(age >= 15 && age <= 17);
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      nextStep();
    }
  };

  const renderStep1 = () => (
    <div data-testid="step-1">
      <h2>기본 정보 입력</h2>
      
      <div>
        <label htmlFor="email">이메일</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => updateField('email', e.target.value)}
        />
        {errors.email && <span className="error">{errors.email}</span>}
      </div>

      <div>
        <label htmlFor="password">비밀번호</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => updateField('password', e.target.value)}
        />
        {errors.password && <span className="error">{errors.password}</span>}
      </div>

      <div>
        <label htmlFor="passwordConfirm">비밀번호 확인</label>
        <input
          id="passwordConfirm"
          type="password"
          value={formData.passwordConfirm}
          onChange={(e) => updateField('passwordConfirm', e.target.value)}
        />
        {errors.passwordConfirm && <span className="error">{errors.passwordConfirm}</span>}
      </div>

      <button onClick={handleNext}>다음</button>
    </div>
  );

  const renderStep2 = () => (
    <div data-testid="step-2">
      <h2>신원 확인</h2>
      
      <div>
        <label htmlFor="name">이름</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
        />
        {errors.name && <span className="error">{errors.name}</span>}
      </div>

      <div>
        <label htmlFor="phone">전화번호</label>
        <input
          id="phone"
          type="tel"
          value={formData.phone}
          onChange={(e) => updateField('phone', e.target.value)}
        />
        {errors.phone && <span className="error">{errors.phone}</span>}
      </div>

      <div>
        <label htmlFor="birthdate">생년월일</label>
        <input
          id="birthdate"
          type="date"
          value={formData.birthdate}
          onChange={(e) => handleBirthdateChange(e.target.value)}
        />
        {errors.birthdate && <span className="error">{errors.birthdate}</span>}
      </div>

      {showParentConsent && (
        <div className="parent-consent-notice">
          <p>부모님 동의가 필요합니다</p>
          <p>만 15-17세 사용자는 법정대리인의 동의가 필요합니다.</p>
        </div>
      )}

      {formData.isMinor && (
        <div className="minor-notice">
          <p>미성년자 회원가입 안내</p>
        </div>
      )}

      <button onClick={prevStep}>이전</button>
      <button onClick={handleNext}>다음</button>
    </div>
  );

  const renderStep3 = () => (
    <div data-testid="step-3">
      <h2>사용자 유형 선택</h2>
      
      <div className="user-type-selection">
        <div>
          <input
            type="radio"
            id="worker"
            name="userType"
            value="worker"
            checked={formData.userType === 'worker'}
            onChange={(e) => updateField('userType', e.target.value as any)}
          />
          <label htmlFor="worker">근로자</label>
        </div>

        <div>
          <input
            type="radio"
            id="personal-business"
            name="userType"
            value="personal-business"
            checked={formData.userType === 'personal-business'}
            onChange={(e) => updateField('userType', e.target.value as any)}
          />
          <label htmlFor="personal-business">개인사업자</label>
        </div>

        <div>
          <input
            type="radio"
            id="corporation"
            name="userType"
            value="corporation"
            checked={formData.userType === 'corporation'}
            onChange={(e) => updateField('userType', e.target.value as any)}
          />
          <label htmlFor="corporation">법인</label>
        </div>

        <div>
          <input
            type="radio"
            id="franchise"
            name="userType"
            value="franchise"
            checked={formData.userType === 'franchise'}
            onChange={(e) => updateField('userType', e.target.value as any)}
          />
          <label htmlFor="franchise">프랜차이즈</label>
        </div>
      </div>

      {errors.userType && <span className="error">{errors.userType}</span>}

      <button onClick={prevStep}>이전</button>
      <button onClick={handleNext}>다음</button>
    </div>
  );

  const renderStep4 = () => (
    <div data-testid="step-4">
      <h2>상세 정보 입력</h2>
      
      {formData.userType === 'worker' && (
        <div>
          <p>근로자 추가 정보</p>
          <div>
            <label htmlFor="workerEmployeeId">사원번호 (선택)</label>
            <input
              id="workerEmployeeId"
              type="text"
              value={formData.workerEmployeeId || ''}
              onChange={(e) => updateField('workerEmployeeId', e.target.value)}
            />
          </div>
        </div>
      )}

      {formData.userType === 'personal-business' && (
        <div>
          <div>
            <label htmlFor="businessRegistrationNumber">사업자등록번호</label>
            <input
              id="businessRegistrationNumber"
              type="text"
              value={formData.businessRegistrationNumber || ''}
              onChange={(e) => updateField('businessRegistrationNumber', e.target.value)}
            />
            {errors.businessRegistrationNumber && (
              <span className="error">{errors.businessRegistrationNumber}</span>
            )}
          </div>
          <div>
            <label htmlFor="businessName">사업체명</label>
            <input
              id="businessName"
              type="text"
              value={formData.businessName || ''}
              onChange={(e) => updateField('businessName', e.target.value)}
            />
            {errors.businessName && <span className="error">{errors.businessName}</span>}
          </div>
        </div>
      )}

      {formData.userType === 'corporation' && (
        <div>
          <div>
            <label htmlFor="corporationRegistrationNumber">법인등록번호</label>
            <input
              id="corporationRegistrationNumber"
              type="text"
              value={formData.corporationRegistrationNumber || ''}
              onChange={(e) => updateField('corporationRegistrationNumber', e.target.value)}
            />
            {errors.corporationRegistrationNumber && (
              <span className="error">{errors.corporationRegistrationNumber}</span>
            )}
          </div>
          <div>
            <label htmlFor="corporationName">법인명</label>
            <input
              id="corporationName"
              type="text"
              value={formData.corporationName || ''}
              onChange={(e) => updateField('corporationName', e.target.value)}
            />
            {errors.corporationName && <span className="error">{errors.corporationName}</span>}
          </div>
          <div>
            <label htmlFor="representativeName">대표자명</label>
            <input
              id="representativeName"
              type="text"
              value={formData.representativeName || ''}
              onChange={(e) => updateField('representativeName', e.target.value)}
            />
            {errors.representativeName && <span className="error">{errors.representativeName}</span>}
          </div>
        </div>
      )}

      {formData.userType === 'franchise' && (
        <div>
          <div>
            <label htmlFor="franchiseCode">프랜차이즈 코드</label>
            <input
              id="franchiseCode"
              type="text"
              value={formData.franchiseCode || ''}
              onChange={(e) => updateField('franchiseCode', e.target.value)}
            />
            {errors.franchiseCode && <span className="error">{errors.franchiseCode}</span>}
          </div>
          <div>
            <label htmlFor="storeName">매장명</label>
            <input
              id="storeName"
              type="text"
              value={formData.storeName || ''}
              onChange={(e) => updateField('storeName', e.target.value)}
            />
            {errors.storeName && <span className="error">{errors.storeName}</span>}
          </div>
        </div>
      )}

      <button onClick={prevStep}>이전</button>
      <button onClick={handleNext}>다음</button>
    </div>
  );

  const renderStep5 = () => (
    <div data-testid="step-5">
      <h2>정보 확인 및 동의</h2>
      
      <div className="info-confirmation">
        <h3>입력한 정보</h3>
        <p>이메일: {formData.email}</p>
        <p>이름: {formData.name}</p>
        <p>전화번호: {formData.phone}</p>
        <p>생년월일: {formData.birthdate}</p>
        <p>사용자 유형: {formData.userType}</p>
      </div>

      <div className="agreements">
        <div>
          <input
            type="checkbox"
            id="termsAgreed"
            checked={formData.termsAgreed}
            onChange={(e) => updateField('termsAgreed', e.target.checked)}
          />
          <label htmlFor="termsAgreed">이용약관에 동의합니다</label>
          {errors.termsAgreed && <span className="error">{errors.termsAgreed}</span>}
        </div>

        <div>
          <input
            type="checkbox"
            id="privacyAgreed"
            checked={formData.privacyAgreed}
            onChange={(e) => updateField('privacyAgreed', e.target.checked)}
          />
          <label htmlFor="privacyAgreed">개인정보처리방침에 동의합니다</label>
          {errors.privacyAgreed && <span className="error">{errors.privacyAgreed}</span>}
        </div>

        <div>
          <input
            type="checkbox"
            id="marketingAgreed"
            checked={formData.marketingAgreed}
            onChange={(e) => updateField('marketingAgreed', e.target.checked)}
          />
          <label htmlFor="marketingAgreed">마케팅 수신에 동의합니다 (선택)</label>
        </div>
      </div>

      <button onClick={prevStep}>이전</button>
      <button onClick={handleNext}>회원가입 완료</button>
    </div>
  );

  const renderStep6 = () => (
    <div data-testid="step-6">
      <h2>회원가입 완료</h2>
      <p>회원가입이 완료되었습니다!</p>
      <p>환영합니다, {formData.name}님!</p>
      
      <div className="completion-info">
        <p>가입한 사용자 유형: {formData.userType}</p>
        {formData.isMinor && <p>미성년자로 등록되었습니다.</p>}
      </div>

      <button onClick={() => {/* 대시보드로 이동 */}}>
        대시보드로 이동
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      case 6:
        return renderStep6();
      default:
        return renderStep1();
    }
  };

  return (
    <div className="enhanced-signup-form">
      <div className="step-indicator">
        <span>단계 {currentStep} / 6</span>
      </div>
      
      {renderCurrentStep()}
    </div>
  );
};

export default EnhancedSignupForm;