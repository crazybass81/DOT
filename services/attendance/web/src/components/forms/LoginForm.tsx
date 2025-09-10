/**
 * Login Form Component
 * Production-ready login form with validation and error handling
 */

'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { type LoginFormData, validateLoginForm } from '@/src/schemas/auth.schema';

interface LoginFormProps {
  onSuccess?: (redirectUrl: string) => void;
  className?: string;
  showRememberMe?: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginForm({ 
  onSuccess, 
  className = '',
  showRememberMe = true 
}: LoginFormProps) {
  const auth = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /**
   * Handle input changes
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear field-specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
    
    // Clear general error
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: undefined,
      }));
    }
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const validation = validateLoginForm(formData);
    
    if (!validation.success) {
      const newErrors: FormErrors = {};
      
      validation.error.errors.forEach(error => {
        const field = error.path[0] as keyof FormErrors;
        newErrors[field] = error.message;
      });
      
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    // Clear previous errors and success state
    setErrors({});
    setSubmitSuccess(false);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await auth.login(formData, rememberMe);
      
      if (result.success) {
        setSubmitSuccess(true);
        
        // Call success callback if provided
        if (onSuccess && result.redirectUrl) {
          onSuccess(result.redirectUrl);
        }
        
        // The auth context will handle the redirect
      } else if (result.error) {
        setErrors({ general: result.error.message });
      }
    } catch (error: any) {
      console.error('Login form error:', error);
      setErrors({ 
        general: '예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Toggle password visibility
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            이메일 주소
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="이메일을 입력하세요"
              className={`
                w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                disabled:bg-gray-50 disabled:text-gray-500
                ${errors.email ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
              `}
              disabled={isSubmitting}
              autoComplete="email"
              required
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {errors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            비밀번호
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호를 입력하세요"
              className={`
                w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                disabled:bg-gray-50 disabled:text-gray-500
                ${errors.password ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
              `}
              disabled={isSubmitting}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isSubmitting}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {errors.password}
            </p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        {showRememberMe && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700">
              로그인 상태 유지
            </label>
          </div>
        )}

        {/* General Error Message */}
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">로그인 성공! 잠시 후 페이지를 이동합니다...</p>
            </div>
          </div>
        )}

        {/* Submit Button - GitHub Style Large Button */}
        <button
          type="submit"
          disabled={isSubmitting || submitSuccess}
          className={`
            w-full flex justify-center items-center px-6 py-4 border border-transparent 
            rounded-xl shadow-lg text-base font-semibold text-white font-korean
            transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
            ${
              isSubmitting || submitSuccess
                ? 'bg-gray-400 cursor-not-allowed shadow-md'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-200 focus:outline-none shadow-blue-200/50'
            }
            min-h-[56px] touch-manipulation
          `}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
              <span className="font-korean">로그인 중...</span>
            </>
          ) : submitSuccess ? (
            <>
              <CheckCircle2 className="h-5 w-5 mr-3" />
              <span className="font-korean">로그인 완료</span>
            </>
          ) : (
            <span className="font-korean text-lg">로그인</span>
          )}
        </button>
      </form>

      {/* Additional Links */}
      <div className="mt-6 text-center space-y-2">
        <div className="text-sm">
          <button
            type="button"
            onClick={() => {
              // Handle password reset
              console.log('Password reset requested');
            }}
            className="text-indigo-600 hover:text-indigo-500 hover:underline"
            disabled={isSubmitting}
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>
        <div className="text-sm text-gray-600">
          계정이 없으신가요?{' '}
          <a 
            href="/register" 
            className="text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            회원가입
          </a>
        </div>
      </div>
    </div>
  );
}