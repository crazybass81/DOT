/**
 * Individual User Registration Form Component
 * Production-ready form with Zod validation and proper error handling
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, User, Phone, Calendar, Mail, Lock, CreditCard, AlertCircle, CheckCircle, Building2, FileText, MapPin } from 'lucide-react';
import { 
  RegistrationFormSchema, 
  formatPhoneNumber, 
  validatePasswordStrength,
  type RegistrationFormData 
} from '@/src/schemas/registration.schema';
import { z } from 'zod';

type RegistrationType = 'individual' | 'business' | null;

interface RegistrationFormProps {
  onSubmit: (data: RegistrationFormData) => Promise<void>;
  loading?: boolean;
  registrationType?: RegistrationType;
  qrContext?: {
    organizationId?: string;
    locationId?: string;
    inviteCode?: string;
  };
}

interface FieldError {
  message: string;
}

interface FormErrors {
  [key: string]: FieldError | undefined;
}

export default function RegistrationForm({ onSubmit, loading = false, registrationType = 'individual', qrContext }: RegistrationFormProps) {
  // Form state
  const [formData, setFormData] = useState<RegistrationFormData>({
    name: '',
    phone: '',
    birthDate: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountNumber: '',
    businessName: registrationType === 'business' ? '' : undefined,
    businessNumber: registrationType === 'business' ? '' : undefined,
    businessAddress: registrationType === 'business' ? '' : undefined,
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToMarketing: false,
    qrContext,
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [isValidating, setIsValidating] = useState(false);

  // Field validation
  const validateField = useCallback((name: string, value: any) => {
    try {
      // Create partial schema for single field validation
      const fieldSchema = RegistrationFormSchema.pick({ [name]: true } as any);
      fieldSchema.parse({ [name]: value });
      
      // Clear error if validation passes
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors[0];
        setErrors(prev => ({
          ...prev,
          [name]: { message: fieldError.message },
        }));
      }
    }
  }, []);

  // Handle field changes
  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));

    // Format phone number on change
    if (name === 'phone' && typeof value === 'string') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, phone: formatted }));
    }

    // Validate field if it has been touched
    if (touchedFields.has(name)) {
      validateField(name, value);
    }
  }, [touchedFields, validateField]);

  // Handle field blur (mark as touched)
  const handleFieldBlur = useCallback((name: string, value: any) => {
    setTouchedFields(prev => new Set(prev).add(name));
    validateField(name, value);
  }, [validateField]);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;

    setIsValidating(true);

    try {
      // Validate entire form
      const validatedData = RegistrationFormSchema.parse(formData);
      
      // Clear all errors
      setErrors({});
      
      // Submit form
      await onSubmit(validatedData);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.errors.forEach((err) => {
          const fieldName = err.path[0] as string;
          newErrors[fieldName] = { message: err.message };
        });
        setErrors(newErrors);
        
        // Mark all fields with errors as touched
        const errorFields = new Set(Object.keys(newErrors));
        setTouchedFields(prev => new Set([...prev, ...errorFields]));
      }
    } finally {
      setIsValidating(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!formData.password) return null;
    return validatePasswordStrength(formData.password);
  };

  const passwordStrength = getPasswordStrength();

  // Get today's date for max birth date
  const maxBirthDate = new Date().toISOString().split('T')[0];
  
  // Get date 80 years ago for min birth date
  const minBirthDate = new Date(new Date().setFullYear(new Date().getFullYear() - 80))
    .toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Name Field */}
      <div className="space-y-2">
        <label htmlFor="name" className="label flex items-center gap-2">
          <User className="w-4 h-4" />
          이름 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          onBlur={(e) => handleFieldBlur('name', e.target.value)}
          className={`input ${errors.name ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="홍길동"
          maxLength={20}
          required
        />
        {errors.name && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Phone Field */}
      <div className="space-y-2">
        <label htmlFor="phone" className="label flex items-center gap-2">
          <Phone className="w-4 h-4" />
          휴대폰 번호 <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => handleFieldChange('phone', e.target.value)}
          onBlur={(e) => handleFieldBlur('phone', e.target.value)}
          className={`input ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="010-1234-5678"
          maxLength={13}
          required
        />
        {errors.phone && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.phone.message}
          </p>
        )}
      </div>

      {/* Birth Date Field */}
      <div className="space-y-2">
        <label htmlFor="birthDate" className="label flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          생년월일 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="birthDate"
          value={formData.birthDate}
          onChange={(e) => handleFieldChange('birthDate', e.target.value)}
          onBlur={(e) => handleFieldBlur('birthDate', e.target.value)}
          className={`input ${errors.birthDate ? 'border-red-500 focus:ring-red-500' : ''}`}
          max={maxBirthDate}
          min={minBirthDate}
          required
        />
        {errors.birthDate && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.birthDate.message}
          </p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <label htmlFor="email" className="label flex items-center gap-2">
          <Mail className="w-4 h-4" />
          이메일 <span className="text-gray-400">(선택)</span>
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          onBlur={(e) => handleFieldBlur('email', e.target.value)}
          className={`input ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder="user@example.com"
          maxLength={100}
        />
        {errors.email && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="password" className="label flex items-center gap-2">
          <Lock className="w-4 h-4" />
          비밀번호 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            value={formData.password}
            onChange={(e) => handleFieldChange('password', e.target.value)}
            onBlur={(e) => handleFieldBlur('password', e.target.value)}
            className={`input pr-12 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            maxLength={128}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Password Strength Indicator */}
        {passwordStrength && formData.password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full flex-1 ${
                    i < (passwordStrength.isValid ? 4 : passwordStrength.errors.length > 3 ? 1 : passwordStrength.errors.length > 1 ? 2 : 3)
                      ? passwordStrength.isValid ? 'bg-green-500' : 'bg-yellow-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            {!passwordStrength.isValid && passwordStrength.errors.length > 0 && (
              <div className="space-y-1">
                {passwordStrength.errors.map((error, index) => (
                  <p key={index} className="text-xs text-orange-600">• {error}</p>
                ))}
              </div>
            )}
          </div>
        )}
        
        {errors.password && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="label flex items-center gap-2">
          <Lock className="w-4 h-4" />
          비밀번호 확인 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            value={formData.confirmPassword}
            onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
            onBlur={(e) => handleFieldBlur('confirmPassword', e.target.value)}
            className={`input pr-12 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
            placeholder="비밀번호를 다시 입력하세요"
            maxLength={128}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Business Fields for Business Registration */}
      {registrationType === 'business' && (
        <>
          {/* Business Name Field */}
          <div className="space-y-2">
            <label htmlFor="businessName" className="label flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              사업자명/법인명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="businessName"
              value={formData.businessName || ''}
              onChange={(e) => handleFieldChange('businessName', e.target.value)}
              onBlur={(e) => handleFieldBlur('businessName', e.target.value)}
              className={`input ${errors.businessName ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="(주)도트테크놀로지"
              maxLength={100}
              required
            />
            {errors.businessName && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.businessName.message}
              </p>
            )}
          </div>

          {/* Business Registration Number Field */}
          <div className="space-y-2">
            <label htmlFor="businessNumber" className="label flex items-center gap-2">
              <FileText className="w-4 h-4" />
              사업자등록번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="businessNumber"
              value={formData.businessNumber || ''}
              onChange={(e) => handleFieldChange('businessNumber', e.target.value)}
              onBlur={(e) => handleFieldBlur('businessNumber', e.target.value)}
              className={`input ${errors.businessNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="123-45-67890"
              maxLength={12}
              required
            />
            {errors.businessNumber && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.businessNumber.message}
              </p>
            )}
            <p className="text-xs text-gray-500">
              사업자등록번호 10자리를 입력하세요 (예: 123-45-67890)
            </p>
          </div>

          {/* Business Address Field */}
          <div className="space-y-2">
            <label htmlFor="businessAddress" className="label flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              사업장 주소 <span className="text-gray-400">(선택)</span>
            </label>
            <input
              type="text"
              id="businessAddress"
              value={formData.businessAddress || ''}
              onChange={(e) => handleFieldChange('businessAddress', e.target.value)}
              onBlur={(e) => handleFieldBlur('businessAddress', e.target.value)}
              className={`input ${errors.businessAddress ? 'border-red-500 focus:ring-red-500' : ''}`}
              placeholder="서울특별시 강남구 테헤란로 123"
              maxLength={200}
            />
            {errors.businessAddress && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.businessAddress.message}
              </p>
            )}
          </div>
        </>
      )}

      {/* Account Number Field */}
      <div className="space-y-2">
        <label htmlFor="accountNumber" className="label flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          계좌번호 <span className="text-gray-400">(선택)</span>
        </label>
        <input
          type="text"
          id="accountNumber"
          value={formData.accountNumber}
          onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
          onBlur={(e) => handleFieldBlur('accountNumber', e.target.value)}
          className={`input ${errors.accountNumber ? 'border-red-500 focus:ring-red-500' : ''}`}
          placeholder={registrationType === 'business' ? '법인 계좌번호 (예: 기업은행 123-456-789012)' : '급여 지급 계좌 (예: 국민은행 123-456-789012)'}
          maxLength={100}
        />
        {errors.accountNumber && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.accountNumber.message}
          </p>
        )}
      </div>

      {/* Terms and Privacy Agreement */}
      <div className="space-y-4 border-t pt-6">
        <div className="space-y-3">
          {/* Terms Agreement */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={(e) => handleFieldChange('agreeToTerms', e.target.checked)}
              className={`mt-1 h-5 w-5 ${
                registrationType === 'business' 
                  ? 'text-purple-600 focus:ring-purple-500' 
                  : 'text-blue-600 focus:ring-blue-500'
              } border-gray-300 rounded`}
              required
            />
            <label htmlFor="agreeToTerms" className="text-sm">
              <span className="font-medium text-gray-900 font-korean">
                이용약관에 동의합니다 <span className="text-red-500">*</span>
              </span>
              <span className="block text-gray-500 mt-1 font-korean">
                {registrationType === 'business' 
                  ? '사업자 서비스 이용을 위해 약관 동의가 필요합니다'
                  : '서비스 이용을 위해 약관 동의가 필요합니다'
                }
              </span>
            </label>
          </div>

          {/* Privacy Agreement */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeToPrivacy"
              checked={formData.agreeToPrivacy}
              onChange={(e) => handleFieldChange('agreeToPrivacy', e.target.checked)}
              className={`mt-1 h-5 w-5 ${
                registrationType === 'business' 
                  ? 'text-purple-600 focus:ring-purple-500' 
                  : 'text-blue-600 focus:ring-blue-500'
              } border-gray-300 rounded`}
              required
            />
            <label htmlFor="agreeToPrivacy" className="text-sm">
              <span className="font-medium text-gray-900 font-korean">
                개인정보 처리방침에 동의합니다 <span className="text-red-500">*</span>
              </span>
              <span className="block text-gray-500 mt-1 font-korean">
                개인정보 수집 및 이용에 대한 동의가 필요합니다
              </span>
            </label>
          </div>

          {/* Marketing Agreement */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeToMarketing"
              checked={formData.agreeToMarketing}
              onChange={(e) => handleFieldChange('agreeToMarketing', e.target.checked)}
              className={`mt-1 h-5 w-5 ${
                registrationType === 'business' 
                  ? 'text-purple-600 focus:ring-purple-500' 
                  : 'text-blue-600 focus:ring-blue-500'
              } border-gray-300 rounded`}
            />
            <label htmlFor="agreeToMarketing" className="text-sm">
              <span className="font-medium text-gray-900 font-korean">
                마케팅 정보 수신에 동의합니다 <span className="text-gray-400">(선택)</span>
              </span>
              <span className="block text-gray-500 mt-1 font-korean">
                {registrationType === 'business' 
                  ? '새로운 기능, 업데이트 소식을 받아보실 수 있습니다'
                  : '이벤트, 혜택 정보 등을 받아보실 수 있습니다'
                }
              </span>
            </label>
          </div>
        </div>

        {/* Agreement Errors */}
        {(errors.agreeToTerms || errors.agreeToPrivacy) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.agreeToTerms.message}
              </p>
            )}
            {errors.agreeToPrivacy && (
              <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                <AlertCircle className="w-4 h-4" />
                {errors.agreeToPrivacy.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Submit Button - Enhanced with registration type */}
      <button
        type="submit"
        disabled={loading || isValidating}
        className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
          loading || isValidating
            ? 'bg-gray-400 cursor-not-allowed'
            : registrationType === 'business'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        }`}
      >
        {loading || isValidating ? (
          <span className="flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="font-korean">등록 중...</span>
          </span>
        ) : (
          <span className="flex items-center justify-center gap-3">
            {registrationType === 'business' ? (
              <Building2 className="w-6 h-6" />
            ) : (
              <CheckCircle className="w-6 h-6" />
            )}
            <span className="text-lg font-korean">
              {registrationType === 'business' ? '사업자 회원가입' : '개인 회원가입'}
            </span>
          </span>
        )}
      </button>

      {/* Form Footer - Enhanced */}
      <div className="text-center space-y-4">
        {/* Features Highlight */}
        {registrationType === 'business' && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
            <div className="text-center">
              <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <span className="text-xs text-purple-800 font-korean">직원 관리</span>
            </div>
            <div className="text-center">
              <Building2 className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <span className="text-xs text-purple-800 font-korean">조직 운영</span>
            </div>
          </div>
        )}
        
        {registrationType === 'individual' && (
          <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="text-center">
              <Clock className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="text-xs text-blue-800 font-korean">실시간 출근</span>
            </div>
            <div className="text-center">
              <MapPin className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="text-xs text-blue-800 font-korean">GPS 인증</span>
            </div>
            <div className="text-center">
              <Shield className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="text-xs text-blue-800 font-korean">보안 관리</span>
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-500 space-y-2 font-korean">
          <p>
            이미 계정이 있으시나요?{' '}
            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium">
              로그인
            </a>
          </p>
        </div>
      </div>
    </form>
  );
}