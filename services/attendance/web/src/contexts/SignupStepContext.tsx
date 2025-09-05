// Phase 2.1: 회원가입 단계 관리 컨텍스트
// TDD: 6단계 회원가입 플로우 상태 관리

'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

/**
 * 회원가입 단계별 데이터 타입
 */
export interface SignupFormData {
  // Step 1: 기본 정보
  email: string;
  password: string;
  passwordConfirm: string;
  name: string;
  phone: string;
  
  // Step 2: 나이 및 본인인증
  birthdate: string;
  isMinor: boolean;
  isVerified: boolean;
  parentPhone?: string;
  parentVerified?: boolean;
  
  // Step 3: 사용자 구분
  userType: 'worker' | 'personal-business' | 'corporation' | 'franchise' | '';
  
  // Step 4: 세부 정보
  // 근로자
  organizationCode?: string;
  department?: string;
  
  // 개인사업자
  businessNumber?: string;
  businessName?: string;
  businessVerified?: boolean;
  
  // 법인
  corporationName?: string;
  corporationNumber?: string;
  representativeName?: string;
  businessAddress?: string;
  
  // 가맹본부
  franchiseName?: string;
  brandName?: string;
  franchiseCount?: number;
  franchiseAddress?: string;
  
  // Step 5: 동의
  privacyAgreed: boolean;
  termsAgreed: boolean;
  laborInfoAgreed: boolean;
  marketingAgreed: boolean; // 선택
  
  // Step 6: 완료
  isCompleted: boolean;
  userId?: string;
  assignedRoles?: string[];
}

/**
 * 회원가입 상태
 */
export interface SignupState {
  currentStep: number;
  formData: SignupFormData;
  errors: Record<string, string>;
  loading: boolean;
}

/**
 * 회원가입 액션 타입
 */
export type SignupAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'UPDATE_FORM_DATA'; payload: Partial<SignupFormData> }
  | { type: 'SET_ERROR'; payload: { field: string; message: string } }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET_FORM' };

/**
 * 초기 상태
 */
const initialState: SignupState = {
  currentStep: 1,
  formData: {
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    phone: '',
    birthdate: '',
    isMinor: false,
    isVerified: false,
    userType: '',
    privacyAgreed: false,
    termsAgreed: false,
    laborInfoAgreed: false,
    marketingAgreed: false,
    isCompleted: false
  },
  errors: {},
  loading: false
};

/**
 * 리듀서
 */
function signupReducer(state: SignupState, action: SignupAction): SignupState {
  switch (action.type) {
    case 'SET_STEP':
      return {
        ...state,
        currentStep: Math.max(1, Math.min(6, action.payload)),
        errors: {} // 단계 변경 시 에러 초기화
      };
      
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(6, state.currentStep + 1),
        errors: {}
      };
      
    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(1, state.currentStep - 1),
        errors: {}
      };
      
    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          ...action.payload
        }
      };
      
    case 'SET_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.field]: action.payload.message
        }
      };
      
    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: {}
      };
      
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
      
    case 'RESET_FORM':
      return initialState;
      
    default:
      return state;
  }
}

/**
 * 컨텍스트 타입
 */
interface SignupContextType {
  state: SignupState;
  dispatch: React.Dispatch<SignupAction>;
  // 편의 함수들
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<SignupFormData>) => void;
  setError: (field: string, message: string) => void;
  clearErrors: () => void;
  setLoading: (loading: boolean) => void;
  resetForm: () => void;
  // 검증 함수들
  validateCurrentStep: () => boolean;
  canProceedToNextStep: () => boolean;
}

/**
 * 컨텍스트 생성
 */
const SignupStepContext = createContext<SignupContextType | undefined>(undefined);

/**
 * 프로바이더 컴포넌트
 */
export function SignupStepProvider({ 
  children,
  initialStep = 1 
}: { 
  children: ReactNode;
  initialStep?: number;
}) {
  const [state, dispatch] = useReducer(signupReducer, {
    ...initialState,
    currentStep: initialStep
  });

  // 편의 함수들
  const setStep = (step: number) => {
    dispatch({ type: 'SET_STEP', payload: step });
  };

  const nextStep = () => {
    dispatch({ type: 'NEXT_STEP' });
  };

  const prevStep = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  const updateFormData = (data: Partial<SignupFormData>) => {
    dispatch({ type: 'UPDATE_FORM_DATA', payload: data });
  };

  const setError = (field: string, message: string) => {
    dispatch({ type: 'SET_ERROR', payload: { field, message } });
  };

  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
  };

  // 단계별 검증 로직
  const validateCurrentStep = (): boolean => {
    const { formData } = state;
    clearErrors();

    switch (state.currentStep) {
      case 1: // 기본 정보
        if (!formData.email) {
          setError('email', '이메일을 입력해주세요');
          return false;
        }
        if (!formData.email.includes('@') || !formData.email.includes('.')) {
          setError('email', '올바른 이메일 형식을 입력해주세요');
          return false;
        }
        if (!formData.password) {
          setError('password', '비밀번호를 입력해주세요');
          return false;
        }
        if (formData.password.length < 8) {
          setError('password', '비밀번호는 8자 이상이어야 합니다');
          return false;
        }
        if (formData.password !== formData.passwordConfirm) {
          setError('passwordConfirm', '비밀번호가 일치하지 않습니다');
          return false;
        }
        if (!formData.name) {
          setError('name', '이름을 입력해주세요');
          return false;
        }
        return true;

      case 2: // 나이 및 본인인증
        if (!formData.birthdate) {
          setError('birthdate', '생년월일을 입력해주세요');
          return false;
        }
        
        const birthDate = new Date(formData.birthdate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        if (age < 15) {
          setError('birthdate', '만 15세 이상만 가입할 수 있습니다');
          return false;
        }
        
        if (!formData.isVerified) {
          setError('verification', '본인인증을 완료해주세요');
          return false;
        }
        
        if (age < 18 && !formData.parentVerified) {
          setError('parentVerified', '부모님 동의가 필요합니다');
          return false;
        }
        
        return true;

      case 3: // 사용자 구분
        if (!formData.userType) {
          setError('userType', '사용자 유형을 선택해주세요');
          return false;
        }
        return true;

      case 4: // 세부 정보
        switch (formData.userType) {
          case 'worker':
            if (!formData.organizationCode) {
              setError('organizationCode', '조직 코드를 입력해주세요');
              return false;
            }
            return true;
            
          case 'personal-business':
            if (!formData.businessNumber) {
              setError('businessNumber', '사업자등록번호를 입력해주세요');
              return false;
            }
            if (!formData.businessVerified) {
              setError('businessNumber', '사업자등록번호 검증을 완료해주세요');
              return false;
            }
            if (!formData.businessName) {
              setError('businessName', '상호명을 입력해주세요');
              return false;
            }
            return true;
            
          case 'corporation':
            if (!formData.corporationName) {
              setError('corporationName', '법인명을 입력해주세요');
              return false;
            }
            if (!formData.representativeName) {
              setError('representativeName', '대표자명을 입력해주세요');
              return false;
            }
            return true;
            
          case 'franchise':
            if (!formData.franchiseName) {
              setError('franchiseName', '가맹본부명을 입력해주세요');
              return false;
            }
            if (!formData.brandName) {
              setError('brandName', '브랜드명을 입력해주세요');
              return false;
            }
            return true;
            
          default:
            return false;
        }

      case 5: // 동의
        if (!formData.privacyAgreed) {
          setError('privacy', '개인정보 처리방침 동의가 필요합니다');
          return false;
        }
        if (!formData.termsAgreed) {
          setError('terms', '서비스 이용약관 동의가 필요합니다');
          return false;
        }
        if (!formData.laborInfoAgreed) {
          setError('laborInfo', '근로관련 정보 수집 동의가 필요합니다');
          return false;
        }
        return true;

      case 6: // 완료
        return formData.isCompleted;

      default:
        return true;
    }
  };

  const canProceedToNextStep = (): boolean => {
    return validateCurrentStep() && !state.loading;
  };

  const contextValue: SignupContextType = {
    state,
    dispatch,
    setStep,
    nextStep,
    prevStep,
    updateFormData,
    setError,
    clearErrors,
    setLoading,
    resetForm,
    validateCurrentStep,
    canProceedToNextStep
  };

  return (
    <SignupStepContext.Provider value={contextValue}>
      {children}
    </SignupStepContext.Provider>
  );
}

/**
 * 훅
 */
export function useSignupStep() {
  const context = useContext(SignupStepContext);
  if (context === undefined) {
    throw new Error('useSignupStep must be used within a SignupStepProvider');
  }
  return context;
}