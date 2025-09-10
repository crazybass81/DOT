/**
 * Validation Utilities for API Endpoints
 * Centralized validation helpers for request/response processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Standard API response interfaces
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Validation result type
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: z.ZodError;
}

/**
 * Validate request body against Zod schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return { 
      success: false, 
      error: new z.ZodError([{
        code: 'custom',
        message: 'Invalid JSON in request body',
        path: []
      }])
    };
  }
}

/**
 * Validate search params against Zod schema
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    // Convert URLSearchParams to plain object
    const params: Record<string, any> = {};
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    const result = schema.safeParse(params);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    return { 
      success: false, 
      error: new z.ZodError([{
        code: 'custom',
        message: 'Invalid search parameters',
        path: []
      }])
    };
  }
}

/**
 * Create standardized validation error response
 */
export function createValidationErrorResponse(
  validation: ValidationResult,
  status = 400
): NextResponse<ApiErrorResponse> {
  if (!validation.error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
      }
    }, { status });
  }

  // Transform Zod errors into user-friendly format
  const errorDetails: Record<string, string> = {};
  validation.error.errors.forEach((err) => {
    const field = err.path.length > 0 ? err.path.join('.') : 'root';
    errorDetails[field] = err.message;
  });

  return NextResponse.json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: '입력 데이터가 올바르지 않습니다',
      details: errorDetails,
    }
  }, { status });
}

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  message: string,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  }, { status });
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  code: string,
  status = 400,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json({
    success: false,
    error: {
      code,
      message,
      details,
    }
  }, { status });
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate and format Korean phone number
 */
export function validateKoreanPhone(phone: string): {
  isValid: boolean;
  formatted: string;
  cleaned: string;
} {
  // Remove all non-digit characters
  const cleaned = phone.replace(/[^\d]/g, '');
  
  // Check if it's a valid Korean mobile number
  const isValid = /^010\d{8}$/.test(cleaned);
  
  // Format as XXX-XXXX-XXXX
  let formatted = phone;
  if (cleaned.length === 11 && cleaned.startsWith('010')) {
    formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  
  return {
    isValid,
    formatted,
    cleaned,
  };
}

/**
 * Validate Korean name
 */
export function validateKoreanName(name: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('이름을 입력해주세요');
  } else {
    const trimmed = name.trim();
    
    if (trimmed.length < 2) {
      errors.push('이름은 2글자 이상이어야 합니다');
    }
    
    if (trimmed.length > 20) {
      errors.push('이름은 20글자 이하여야 합니다');
    }
    
    // Korean (Hangul), English letters, and spaces only
    if (!/^[가-힣a-zA-Z\s]+$/.test(trimmed)) {
      errors.push('한글과 영문만 입력 가능합니다');
    }
    
    // No consecutive spaces
    if (/\s{2,}/.test(trimmed)) {
      errors.push('연속된 공백은 사용할 수 없습니다');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format with additional checks
 */
export function validateEmailExtended(email: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!email || email.trim().length === 0) {
    errors.push('이메일을 입력해주세요');
  } else {
    const trimmed = email.trim().toLowerCase();
    
    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      errors.push('올바른 이메일 형식이 아닙니다');
    } else {
      // Additional checks
      const [localPart, domain] = trimmed.split('@');
      
      // Local part checks
      if (localPart.length > 64) {
        errors.push('이메일 사용자명이 너무 깁니다');
      }
      
      if (localPart.startsWith('.') || localPart.endsWith('.')) {
        errors.push('이메일 사용자명에 점(.)을 처음이나 마지막에 사용할 수 없습니다');
      }
      
      if (localPart.includes('..')) {
        errors.push('이메일에 연속된 점(..)을 사용할 수 없습니다');
      }
      
      // Domain checks
      if (domain.length > 255) {
        errors.push('이메일 도메인이 너무 깁니다');
      }
      
      if (domain.startsWith('.') || domain.endsWith('.')) {
        errors.push('잘못된 이메일 도메인 형식입니다');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Global rate limiters
export const registrationLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 minutes
export const loginLimiter = new RateLimiter(10, 5 * 60 * 1000); // 10 requests per 5 minutes

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  // Fallback to connection remote address
  return 'unknown';
}